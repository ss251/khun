import { SolanaSDK } from '8004-solana';
import { env } from '@khun/shared';
import { getIpfs } from './ipfs.js';
import { loadTreasury } from './wallet.js';

let cached: SolanaSDK | null = null;

/**
 * Build a singleton SolanaSDK configured for our cluster + treasury signer
 * + Pinata IPFS. The treasury pays for collection creation, agent
 * registration fees, and any reputation feedback writes.
 */
export function getSdk(): SolanaSDK {
  if (cached) return cached;
  cached = new SolanaSDK({
    cluster: env.agentRegistryCluster() as 'mainnet-beta' | 'devnet' | 'localnet',
    rpcUrl: env.solanaRpcUrl(),
    signer: loadTreasury(),
    ipfsClient: getIpfs(),
  });
  return cached;
}
