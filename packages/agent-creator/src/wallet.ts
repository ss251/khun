import fs from 'node:fs';
import path from 'node:path';
import { hkdfSync } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { env } from '@khun/shared';

/**
 * Load (or generate-and-save) the treasury keypair that pays for agent
 * registration fees + gas. This is the "Khun protocol" wallet, not any
 * merchant's wallet.
 */
export function loadTreasury(): Keypair {
  const p = env.treasuryKeypairPath();
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const kp = Keypair.generate();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey)));
  console.error(`Generated new treasury keypair at ${p}: ${kp.publicKey.toBase58()}`);
  console.error('FUND THIS WALLET on Solana mainnet (~$5 SOL + ~$5 USDT-SPL) before registering agents.');
  return kp;
}

/**
 * Per-merchant Ed25519 keypair derived deterministically from KHUN_MASTER_SEED
 * + the Telegram chat id. No database needed; same chat id always yields the
 * same wallet. Don't change KHUN_MASTER_SEED after any agent registers — it
 * would orphan every existing merchant wallet.
 *
 * Turnkey would be the production path; HKDF is the right hackathon trade-off.
 */
export function deriveMerchantKeypair(chatId: string): Keypair {
  const hex = env.khunMasterSeed().trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('KHUN_MASTER_SEED must be 32-byte hex (64 hex chars). Run: openssl rand -hex 32');
  }
  const master = Buffer.from(hex, 'hex');
  const info = Buffer.from('khun-agent-seed/v1');
  const salt = Buffer.from(chatId, 'utf8');
  const seed = hkdfSync('sha256', master, salt, info, 32);
  return Keypair.fromSeed(new Uint8Array(seed));
}
