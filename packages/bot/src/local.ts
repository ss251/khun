import { Hono } from 'hono';
import { handler } from './handler.js';

const app = new Hono();

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

export default app;
// Bun auto-serves the default export.
