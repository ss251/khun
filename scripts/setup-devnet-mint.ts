/**
 * One-shot devnet setup: create a USDT-stand-in SPL mint + a funded buyer
 * keypair so we can run the full x402 settle loop without depending on
 * Circle's USDC-devnet faucet.
 *
 *   bun scripts/setup-devnet-mint.ts
 *
 * Outputs:
 *   .keys/devnet-mint.json   — the mint pubkey
 *   .keys/devnet-buyer.json  — the buyer keypair (Solana CLI format)
 *
 * After running, paste the mint pubkey into .env.devnet as USDT_SOLANA_MINT.
 * The treasury keypair is set as the mint authority and mints an initial
 * 10,000 token balance to the buyer.
 */
import '../packages/shared/src/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { env } from '@khun/shared';

const KEYS_DIR = path.resolve(process.cwd(), '.keys');
const MINT_FILE = path.join(KEYS_DIR, 'devnet-mint.json');
const BUYER_FILE = path.join(KEYS_DIR, 'devnet-buyer.json');

function loadOrCreateKeypair(file: string): Keypair {
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function main() {
  if (env.agentRegistryCluster() === 'mainnet-beta') {
    throw new Error('Refusing to run on mainnet. Use KHUN_ENV=devnet.');
  }

  const treasuryRaw = JSON.parse(fs.readFileSync(env.treasuryKeypairPath(), 'utf8')) as number[];
  const treasury = Keypair.fromSecretKey(Uint8Array.from(treasuryRaw));
  const buyer = loadOrCreateKeypair(BUYER_FILE);

  const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
  console.log('Treasury :', treasury.publicKey.toBase58());
  console.log('Buyer    :', buyer.publicKey.toBase58());

  // Reuse the existing mint if we've created one before.
  let mint: PublicKey;
  if (fs.existsSync(MINT_FILE)) {
    const stored = JSON.parse(fs.readFileSync(MINT_FILE, 'utf8')) as { mint: string };
    mint = new PublicKey(stored.mint);
    console.log('Reusing existing mint:', mint.toBase58());
  } else {
    console.log('Creating new SPL mint (decimals=6, authority=treasury)…');
    mint = await createMint(conn, treasury, treasury.publicKey, null, 6);
    fs.writeFileSync(MINT_FILE, JSON.stringify({ mint: mint.toBase58() }, null, 2));
    console.log('Created mint:', mint.toBase58());
  }

  const buyerSol = await conn.getBalance(buyer.publicKey);
  if (buyerSol < 0.1 * LAMPORTS_PER_SOL) {
    console.log(
      `\n⚠  Buyer balance: ${buyerSol / LAMPORTS_PER_SOL} SOL. Fund from the faucet:`
    );
    console.log(`   https://faucet.solana.com  → ${buyer.publicKey.toBase58()}\n`);
  }

  console.log('Ensuring buyer ATA + minting 10,000 USDT-stand-in…');
  const buyerAta = await getOrCreateAssociatedTokenAccount(
    conn,
    treasury,
    mint,
    buyer.publicKey
  );
  await mintTo(conn, treasury, mint, buyerAta.address, treasury, 10_000_000_000); // 10,000 × 1e6

  console.log('\n--- DONE ---');
  console.log('Mint           :', mint.toBase58());
  console.log('Buyer pubkey   :', buyer.publicKey.toBase58());
  console.log('Buyer USDT ATA :', buyerAta.address.toBase58());
  console.log('\nAdd to .env.devnet:');
  console.log(`USDT_SOLANA_MINT=${mint.toBase58()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
