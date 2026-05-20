/**
 * Block 2 credential smoke test. Pings every provider with the smallest
 * possible request and surfaces a per-provider pass/fail line.
 *
 *   bun scripts/smoke-test.ts
 *
 * Side-effect import of @khun/shared overrides process.env with .env values,
 * so a stale shell `export` can't shadow our real credentials.
 */
import '../packages/shared/src/env.js';

interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

async function testAnthropic(): Promise<Result> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name: 'anthropic', ok: false, detail: 'ANTHROPIC_API_KEY not set' };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_ID ?? 'claude-opus-4-7',
      max_tokens: 8,
      messages: [{ role: 'user', content: 'reply ok' }],
    }),
  });
  const body = await res.text();
  if (!res.ok) return { name: 'anthropic', ok: false, detail: `${res.status} ${body.slice(0, 200)}` };
  const parsed = JSON.parse(body) as { content: { text: string }[] };
  return { name: 'anthropic', ok: true, detail: parsed.content?.[0]?.text ?? '' };
}

async function testTyphoon(): Promise<Result> {
  const key = process.env.TYPHOON_API_KEY;
  if (!key) return { name: 'typhoon', ok: false, detail: 'TYPHOON_API_KEY not set' };

  const base = process.env.TYPHOON_BASE_URL ?? 'https://api.opentyphoon.ai/v1';
  const model = process.env.TYPHOON_MODEL_ID ?? 'typhoon-v2.1-12b-instruct';

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'พิมพ์คำว่า ok' }],
    }),
  });
  const body = await res.text();
  if (!res.ok) return { name: 'typhoon', ok: false, detail: `${res.status} ${body.slice(0, 200)}` };
  const parsed = JSON.parse(body) as { choices: { message: { content: string } }[] };
  return { name: 'typhoon', ok: true, detail: parsed.choices?.[0]?.message?.content ?? '' };
}

async function testTelegram(): Promise<Result> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { name: 'telegram', ok: false, detail: 'TELEGRAM_BOT_TOKEN not set' };

  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const body = await res.text();
  if (!res.ok) return { name: 'telegram', ok: false, detail: `${res.status} ${body.slice(0, 200)}` };
  const parsed = JSON.parse(body) as { ok: boolean; result: { username: string; first_name: string } };
  if (!parsed.ok)
    return { name: 'telegram', ok: false, detail: JSON.stringify(parsed).slice(0, 200) };
  return {
    name: 'telegram',
    ok: true,
    detail: `@${parsed.result.username} (${parsed.result.first_name})`,
  };
}

async function testSolanaRpc(): Promise<Result> {
  const url = process.env.SOLANA_RPC_URL;
  if (!url) return { name: 'solana-rpc', ok: false, detail: 'SOLANA_RPC_URL not set' };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getVersion' }),
  });
  const body = await res.text();
  if (!res.ok) return { name: 'solana-rpc', ok: false, detail: `${res.status}` };
  const parsed = JSON.parse(body) as { result?: { 'solana-core': string } };
  return {
    name: 'solana-rpc',
    ok: !!parsed.result,
    detail: parsed.result ? `solana-core ${parsed.result['solana-core']}` : body.slice(0, 200),
  };
}

const tests = [testAnthropic, testTyphoon, testTelegram, testSolanaRpc];

async function main() {
  const results = await Promise.all(tests.map((t) => t().catch((e) => ({ name: t.name, ok: false, detail: String(e) }))));
  let bad = 0;
  for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    console.log(`${mark} ${r.name.padEnd(12)} ${r.detail}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}

main();
