import { env } from '@khun/shared';

/**
 * x402 PaymentRequirements payload — returned with HTTP 402 to signal payment terms.
 * Spec: https://docs.x402.org/core-concepts/network-and-token-support
 */
export interface X402PaymentRequirements {
  scheme: 'exact';
  network: string;                 // CAIP-2: 'solana:<genesisHash>' for mainnet
  payTo: string;                   // recipient wallet (agent's mainnet address)
  asset: { address: string };      // SPL mint — Tether USDT
  amountInAtomicUnits: string;     // string-encoded integer
  maxTimeoutSeconds?: number;
  resource: string;                // URL of the protected resource
  description?: string;
  outputSchema?: unknown;
}

const SOLANA_MAINNET_CAIP2 =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'; // mainnet-beta genesis prefix

export function buildUsdtRequirements(opts: {
  payTo: string;
  amountUsdt: number;
  resource: string;
  description?: string;
}): X402PaymentRequirements {
  const atomic = Math.round(opts.amountUsdt * 1_000_000); // USDT has 6 decimals
  return {
    scheme: 'exact',
    network: SOLANA_MAINNET_CAIP2,
    payTo: opts.payTo,
    asset: { address: env.usdtSolanaMint() },
    amountInAtomicUnits: atomic.toString(),
    maxTimeoutSeconds: 60,
    resource: opts.resource,
    description: opts.description,
  };
}
