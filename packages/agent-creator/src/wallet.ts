import fs from 'node:fs';
import { Keypair } from '@solana/web3.js';
import { env } from '@khun/shared';

/**
 * Block 1 stub: loads or generates the demo treasury keypair.
 * Block 3 will swap this for Turnkey-embedded wallets per merchant.
 */
export function loadTreasury(): Keypair {
  const path = env.treasuryKeypairPath();
  if (fs.existsSync(path)) {
    const raw = JSON.parse(fs.readFileSync(path, 'utf8')) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const kp = Keypair.generate();
  fs.mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)));
  console.error(`Generated new treasury keypair at ${path}: ${kp.publicKey.toBase58()}`);
  console.error('FUND THIS WALLET on Solana mainnet before continuing.');
  return kp;
}
