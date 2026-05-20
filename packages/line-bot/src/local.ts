import { Hono } from 'hono';
import { handler } from './handler.js';

const app = new Hono();

app.post('/line/webhook', async (c) => {
  const body = await c.req.text();
  const result = await handler({
    body,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    requestContext: {} as any,
    isBase64Encoded: false,
    routeKey: 'POST /line/webhook',
    rawPath: '/line/webhook',
    rawQueryString: '',
    version: '2.0',
  } as any);
  const r = result as { statusCode: number; body: string };
  return c.text(r.body, r.statusCode as any);
});

export default app;
// Bun auto-serves the default export.
