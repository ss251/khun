import { IPFSClient } from '8004-solana';
import { env } from '@khun/shared';

let cached: IPFSClient | null = null;

export function getIpfs(): IPFSClient {
  if (cached) return cached;
  cached = new IPFSClient({ pinataEnabled: true, pinataJwt: env.pinataJwt() });
  return cached;
}
