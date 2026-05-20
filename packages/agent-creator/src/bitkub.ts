import { env } from '@khun/shared';

interface BitkubTicker {
  symbol: string;
  last: string;
  highest_bid: string;
  lowest_ask: string;
}

/**
 * Public Bitkub ticker for live THB rate. Confirmed symbol: USDT_THB (NOT THB_USDT).
 * Used in the LINE onboarding confirmation + "withdraw" preview.
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

/**
 * Block 6 stub: real off-ramp = SPL transfer from agent wallet to merchant's
 * Bitkub Solana-USDT deposit address. The THB conversion + bank withdrawal
 * happens inside Bitkub (out of scope for v0; surface as a link/QR).
 */
export async function offrampToBitkub(_opts: {
  fromAgentWallet: string;
  amountUsdt: number;
  toBitkubDepositAddress: string;
}): Promise<{ txSignature: string }> {
  throw new Error('TODO Block 6: real SPL transfer to merchant Bitkub deposit address');
}
