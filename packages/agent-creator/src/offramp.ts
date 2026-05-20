/**
 * Bitkub off-ramp leg.
 *
 * The merchant stores their Bitkub Solana-USDT deposit address (one-time,
 * via the Telegram /setbitkub command). On /withdraw, we:
 *   1. Re-derive the merchant's signing keypair from chatId (HKDF).
 *   2. Build an SPL TransferChecked from their ATA → the Bitkub deposit ATA.
 *   3. Sign + broadcast.
 *   4. Once Bitkub credits the deposit (a few minutes later), the merchant
 *      sells USDT for THB and withdraws to their Thai bank inside the
 *      Bitkub app. v0 stops at step 3 — automating Bitkub's internal flow
 *      would need authenticated Bitkub API keys per-merchant and is out of
 *      scope for the hackathon.
 *
 * Solscan tx serves as proof that the off-ramp leg works.
 */
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { env } from '@khun/shared';
import { deriveMerchantKeypair, loadTreasury } from './wallet.js';

export interface OffRampInput {
  ownerChatId: string;        // we re-derive the merchant signing keypair
  toBitkubAddress: string;    // merchant's Bitkub Solana-USDT deposit address
  amountUsdt: number;         // how much to send
}

export interface OffRampReceipt {
  txSignature: string;
  amountAtomic: string;
  fromWallet: string;
  toAddress: string;
}

export class OffRampError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Validate a Solana address string. Returns the PublicKey or throws.
 */
export function parseSolanaAddress(s: string): PublicKey {
  let key: PublicKey;
  try {
    key = new PublicKey(s.trim());
  } catch {
    throw new OffRampError('invalid_address', `not a valid Solana address: ${s}`);
  }
  if (!PublicKey.isOnCurve(key.toBytes())) {
    throw new OffRampError('invalid_address', `address ${s} is off-curve (PDA?) — Bitkub deposit addresses are on-curve`);
  }
  return key;
}

/**
 * Build + send a SPL TransferChecked from the merchant's HKDF wallet to
 * their Bitkub deposit address. The treasury pays SOL fees + ATA-creation
 * rent so the merchant never has to think about SOL — they just see USDT
 * land at Bitkub.
 */
export async function offrampToBitkub(input: OffRampInput): Promise<OffRampReceipt> {
  const merchant = deriveMerchantKeypair(input.ownerChatId);
  const treasury = loadTreasury();
  const toAddress = parseSolanaAddress(input.toBitkubAddress);
  const mint = new PublicKey(env.usdtSolanaMint());

  const sourceAta = getAssociatedTokenAddressSync(mint, merchant.publicKey);
  const destAta = getAssociatedTokenAddressSync(mint, toAddress);

  const conn = new Connection(env.solanaRpcUrl(), 'confirmed');

  // Sanity check: merchant has enough USDT.
  let balance = 0;
  try {
    const acct = await getAccount(conn, sourceAta, undefined, TOKEN_PROGRAM_ID);
    balance = Number(acct.amount);
  } catch {
    throw new OffRampError(
      'no_balance',
      'merchant ATA does not exist yet — they have not received any USDT'
    );
  }
  const atomic = Math.round(input.amountUsdt * 1_000_000);
  if (atomic <= 0) throw new OffRampError('invalid_amount', 'amount must be > 0');
  if (atomic > balance) {
    throw new OffRampError(
      'insufficient_balance',
      `requested ${atomic} but ATA holds ${balance}`
    );
  }

  const transferIx = createTransferCheckedInstruction(
    sourceAta,
    mint,
    destAta,
    merchant.publicKey,
    BigInt(atomic),
    6, // USDT-SPL decimals
    [],
    TOKEN_PROGRAM_ID
  );

  // Idempotent ATA creation in case the Bitkub deposit address hasn't seen
  // this mint yet. Treasury pays the rent so the merchant never needs SOL.
  const createDestIx = createAssociatedTokenAccountIdempotentInstruction(
    treasury.publicKey, // payer
    destAta,
    toAddress,
    mint,
    TOKEN_PROGRAM_ID
  );

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: treasury.publicKey, // treasury pays SOL fees
    recentBlockhash: blockhash,
    instructions: [createDestIx, transferIx],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([treasury, merchant]); // treasury = fee payer, merchant = ATA owner authority

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const result = await conn.confirmTransaction(sig, 'confirmed');
  if (result.value.err) {
    throw new OffRampError(
      'tx_failed',
      `off-ramp tx ${sig} failed: ${JSON.stringify(result.value.err)}`
    );
  }

  return {
    txSignature: sig,
    amountAtomic: atomic.toString(),
    fromWallet: merchant.publicKey.toBase58(),
    toAddress: toAddress.toBase58(),
  };
}
