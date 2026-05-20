import { env } from '@khun/shared';

interface BitkubTicker {
  symbol: string;
  last: string;
  highest_bid: string;
  lowest_ask: string;
}

/**
 * Public Bitkub ticker for live THB rate. Confirmed symbol: USDT_THB.
 * Used in the Telegram onboarding confirmation + /withdraw + /me replies.
 */
export async function getUsdtThbRate(): Promise<number> {
  const url = `${env.bitkubApiBase()}/api/v3/market/ticker?sym=USDT_THB`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bitkub ticker failed: ${res.status}`);
  const data = (await res.json()) as BitkubTicker[];
  const row = data[0];
  if (!row) throw new Error('Bitkub ticker: empty response');
  return parseFloat(row.last);
}

// The real Bitkub off-ramp lives in offramp.ts (offrampToBitkub).
