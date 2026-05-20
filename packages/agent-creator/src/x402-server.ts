import { Hono } from 'hono';
import { getAgent } from './store.js';
import { buildUsdtRequirements, buildX402Challenge } from './x402.js';

/**
 * Hono sub-app exposing per-agent x402 endpoints. Mounts under any prefix.
 * Block 3 scope: GET /:agentId/order returns HTTP 402 with PaymentRequirements
 * pointing at the merchant's wallet. Block 4 will add POST settlement
 * verification using the Coinbase x402 facilitator.
 */
export function buildAgentApi(opts: { publicBaseUrl: string }): Hono {
  const app = new Hono();

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

  // Public-ish read-only inspection (handy for the dashboard slide).
  app.get('/:agentId', (c) => {
    const id = c.req.param('agentId');
    const agent = getAgent(id);
    if (!agent) return c.json({ error: 'unknown agent' }, 404);
    return c.json(agent);
  });

  return app;
}
