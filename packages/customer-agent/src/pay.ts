/**
 * Khun customer-agent buyer.
 *
 *   bun packages/customer-agent/src/pay.ts <agent-endpoint-url> [--note "msg"]
 *
 * Flow:
 *   1. GET the agent endpoint, expect HTTP 402 + PaymentRequirements.
 *   2. Build a SPL TransferChecked from .keys/devnet-buyer.json → merchant ATA.
 *   3. Sign as a VersionedTransaction, base64 encode.
 *   4. POST same URL with X-Payment header containing
 *      { x402Version:1, scheme:'exact', network, payload:{transaction:b64} }
 *   5. Print the on-chain receipt.
 *
 * For mainnet flows where the buyer is Claude Code via `pay claude`, this
 * script is the fallback — the real buyer is Pay.sh's wrapper.
 */
import '../../../packages/shared/src/env.js';
import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { env } from '@khun/shared';

interface PaymentRequirements {
  scheme: string;
  network: 'solana' | 'solana-devnet';
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

function loadKeypair(p: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function parseArgs(): { url: string; note?: string } {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith('--'));
  if (!url) {
    console.error('usage: bun packages/customer-agent/src/pay.ts <agent-endpoint-url> [--note "msg"]');
    process.exit(1);
  }
  const noteIdx = args.indexOf('--note');
  const note = noteIdx >= 0 ? args[noteIdx + 1] : undefined;
  return { url, note };
}

async function main() {
  const { url, note } = parseArgs();
  const buyer = loadKeypair(path.resolve(process.cwd(), '.keys/devnet-buyer.json'));
  console.log('Buyer  :', buyer.publicKey.toBase58());

  const challengeRes = await fetch(url);
  if (challengeRes.status !== 402) {
    console.error('expected 402, got', challengeRes.status, await challengeRes.text());
    process.exit(1);
  }
  const challenge = (await challengeRes.json()) as { accepts: PaymentRequirements[] };
  const reqs = challenge.accepts[0]!;
  console.log('Got 402:');
  console.log('  payTo :', reqs.payTo);
  console.log('  amount:', reqs.maxAmountRequired, '(atomic)');
  console.log('  mint  :', reqs.asset);
  console.log('  net   :', reqs.network);

  const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
  const mint = new PublicKey(reqs.asset);
  const merchant = new PublicKey(reqs.payTo);

  const sourceAta = getAssociatedTokenAddressSync(mint, buyer.publicKey);
  const destAta = getAssociatedTokenAddressSync(mint, merchant);

  const transferIx = createTransferCheckedInstruction(
    sourceAta,
    mint,
    destAta,
    buyer.publicKey,
    BigInt(reqs.maxAmountRequired),
    6, // USDT decimals
    [],
    TOKEN_PROGRAM_ID
  );

  // Idempotently create the destination ATA in case the merchant hasn't received this mint before.
  const createDestAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    buyer.publicKey, // payer
    destAta,
    merchant,
    mint,
    TOKEN_PROGRAM_ID
  );

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: buyer.publicKey,
    recentBlockhash: blockhash,
    instructions: [createDestAtaIx, transferIx],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([buyer]);

  // ── x402 header construction ──
  const payment = {
    x402Version: 1 as const,
    scheme: 'exact' as const,
    network: reqs.network,
    payload: { transaction: Buffer.from(tx.serialize()).toString('base64') },
  };
  const xPayment = Buffer.from(JSON.stringify(payment)).toString('base64');

  console.log('POSTing with X-Payment…');
  const settleRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': xPayment,
    },
    body: JSON.stringify({ note }),
  });
  const settleBody = await settleRes.text();
  console.log('status', settleRes.status);
  try {
    console.log(JSON.stringify(JSON.parse(settleBody), null, 2));
  } catch {
    console.log(settleBody);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
