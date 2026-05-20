import { Hono } from 'hono';
import { getAgent, listAgents } from './store.js';
import { buildUsdtRequirements, buildX402Challenge } from './x402.js';
import { verifyAndSettle, X402SettleError, type SettlementReceipt } from './x402-settle.js';
import type { KhunAgent } from '@khun/shared';

export interface BuildAgentApiOptions {
  publicBaseUrl: string;
  /**
   * Optional hook fired AFTER on-chain settlement confirms.
   * The bot wires this to push a Telegram message to the merchant.
   * Errors are caught + logged — they don't fail the buyer's request.
   */
  onSettlementConfirmed?: (ctx: {
    agent: KhunAgent;
    receipt: SettlementReceipt;
    buyerNote?: string;
  }) => Promise<void>;
}

/**
 * Per-agent Hono routes.
 *   GET  /:id        public agent JSON (dashboard convenience)
 *   GET  /:id/order  → 402 challenge with USDT-SPL PaymentRequirements
 *   POST /:id/order  → verify X-Payment, settle on Solana, return receipt
 */
export function buildAgentApi(opts: BuildAgentApiOptions): Hono {
  const app = new Hono();

  // --- Discovery (free, used by Pay.sh + dashboard) ---
  // GET /search?q=&category=&location=&languages=th,en&limit=20
  app.get('/search', (c) => {
    const q = (c.req.query('q') ?? '').toLowerCase();
    const category = c.req.query('category');
    const location = (c.req.query('location') ?? '').toLowerCase();
    const langsParam = c.req.query('languages');
    const wantedLangs = langsParam ? langsParam.split(',').map((s) => s.trim().toLowerCase()) : null;
    const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);

    const matches = listAgents().filter((a) => {
      if (category && a.intent.category !== category) return false;
      if (location && !(a.intent.location ?? '').toLowerCase().includes(location)) return false;
      if (wantedLangs && wantedLangs.length > 0) {
        const have = (a.intent.languages ?? []).map((l) => l.toLowerCase());
        if (!wantedLangs.some((l) => have.includes(l))) return false;
      }
      if (q) {
        const hay = (
          a.intent.serviceDescriptionEnglish +
          ' ' +
          a.intent.serviceDescriptionThai +
          ' ' +
          (a.intent.location ?? '')
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return c.json({
      count: matches.length,
      results: matches.slice(0, limit).map((a) => ({
        agentId: a.agentId,
        endpointUrl: a.endpointUrl,
        priceUsdt: a.intent.priceUsdt,
        category: a.intent.category,
        location: a.intent.location,
        languages: a.intent.languages,
        descriptionEn: a.intent.serviceDescriptionEnglish,
        descriptionTh: a.intent.serviceDescriptionThai,
      })),
    });
  });

  app.get('/:agentId', (c) => {
    const agent = getAgent(c.req.param('agentId'));
    if (!agent) return c.json({ error: 'unknown agent' }, 404);
    return c.json(agent);
  });

  app.get('/:agentId/order', (c) => {
    const id = c.req.param('agentId');
    const agent = getAgent(id);
    if (!agent) return c.json({ error: 'unknown agent' }, 404);

    const reqs = buildUsdtRequirements({
      payTo: agent.walletAddress,
      amountUsdt: agent.intent.priceUsdt,
      resource: `${opts.publicBaseUrl}/agent/${id}/order`,
      description:
        agent.intent.serviceDescriptionEnglish ||
        `Order from Khun agent ${id.slice(0, 8)}…`,
    });
    return c.json(buildX402Challenge(reqs), 402);
  });

  app.post('/:agentId/order', async (c) => {
    const id = c.req.param('agentId');
    const agent = getAgent(id);
    if (!agent) return c.json({ error: 'unknown agent' }, 404);

    const reqs = buildUsdtRequirements({
      payTo: agent.walletAddress,
      amountUsdt: agent.intent.priceUsdt,
      resource: `${opts.publicBaseUrl}/agent/${id}/order`,
      description:
        agent.intent.serviceDescriptionEnglish ||
        `Order from Khun agent ${id.slice(0, 8)}…`,
    });

    let buyerNote: string | undefined;
    try {
      const body = await c.req.json().catch(() => null);
      if (body && typeof body.note === 'string') buyerNote = body.note.slice(0, 280);
    } catch {
      // body is optional
    }

    try {
      const receipt = await verifyAndSettle({
        xPaymentHeader: c.req.header('x-payment'),
        requirements: reqs,
      });
      if (opts.onSettlementConfirmed) {
        opts
          .onSettlementConfirmed({ agent, receipt, buyerNote })
          .catch((err) => console.error('settlement notify failed', err));
      }
      return c.json({
        status: 'paid',
        agentId: id,
        receipt,
        order: { buyerNote },
      });
    } catch (err) {
      if (err instanceof X402SettleError) {
        return c.json({ error: err.code, message: err.message }, 402);
      }
      console.error('settle error', err);
      return c.json({ error: 'unexpected_settle_error', message: String(err) }, 500);
    }
  });

  return app;
}
