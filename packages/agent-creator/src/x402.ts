import { env } from '@khun/shared';
import type { PaymentRequirements } from 'x402/types';

/**
 * Build the canonical x402 PaymentRequirements payload returned with HTTP 402.
 * Network values match the x402 spec enum ('solana' for mainnet, 'solana-devnet' for devnet).
 */
export function buildUsdtRequirements(opts: {
  payTo: string;
  amountUsdt: number;
  resource: string;
  description: string;
}): PaymentRequirements {
  const cluster = env.agentRegistryCluster();
  const network: PaymentRequirements['network'] =
    cluster === 'mainnet-beta' ? 'solana' : 'solana-devnet';
  const atomic = Math.round(opts.amountUsdt * 1_000_000); // USDT has 6 decimals on Solana.

  return {
    scheme: 'exact',
    network,
    maxAmountRequired: atomic.toString(),
    resource: opts.resource,
    description: opts.description,
    mimeType: 'application/json',
    payTo: opts.payTo,
    maxTimeoutSeconds: 60,
    asset: env.usdtSolanaMint(),
  };
}

/**
 * The body shape x402 clients expect when a server returns HTTP 402.
 * Spec: https://docs.x402.org/core-concepts/lifecycle
 */
export interface X402ChallengeBody {
  x402Version: 1;
  accepts: PaymentRequirements[];
  error?: string;
}

export function buildX402Challenge(reqs: PaymentRequirements): X402ChallengeBody {
  return { x402Version: 1, accepts: [reqs] };
}
