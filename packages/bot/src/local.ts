import { Hono } from 'hono';
import { buildAgentApi } from '@khun/agent-creator';
import { handler } from './handler.js';
import { publicBaseUrl } from './config.js';
import { notifyMerchantOfPayment } from './notify.js';

const app = new Hono();

// --- Telegram webhook (LINE replacement) ---
app.post('/telegram/webhook', async (c) => {
  const body = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const result = await handler({
    body,
    headers,
    requestContext: {} as any,
    isBase64Encoded: false,
    routeKey: 'POST /telegram/webhook',
    rawPath: '/telegram/webhook',
    rawQueryString: '',
    version: '2.0',
  } as any);
  const r = result as { statusCode: number; body: string };
  return c.text(r.body, r.statusCode as any);
});

// --- Per-agent x402 endpoints ---
// Mounted at /agent/* so URLs match `${publicBaseUrl}/agent/{id}/order`.
app.route(
  '/agent',
  buildAgentApi({
    publicBaseUrl: publicBaseUrl(),
    onSettlementConfirmed: async ({ agent, receipt, buyerNote }) => {
      const amountUsdt = Number(receipt.amountAtomic) / 1_000_000;
      await notifyMerchantOfPayment({
        agent,
        amountUsdt,
        txSignature: receipt.txSignature,
        buyerNote,
      });
    },
  })
);

app.get('/', (c) =>
  c.text('Khun — Thai service-provider agents on Solana via x402. github.com/ss251/khun')
);

export default app;
// Bun auto-serves the default export.
