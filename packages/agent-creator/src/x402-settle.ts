/**
 * x402 settlement for the Solana SVM "exact" scheme.
 *
 * Buyer flow:
 *   1. GET /agent/:id/order  → 402 + PaymentRequirements
 *   2. Buyer constructs a signed VersionedTransaction with one SPL
 *      TransferChecked instruction matching the requirements.
 *   3. Buyer POSTs the same URL with header:
 *        X-Payment: base64(JSON({ x402Version:1, scheme:'exact',
 *                                 network:'solana'|'solana-devnet',
 *                                 payload:{ transaction: base64Tx } }))
 *   4. We verify the tx matches the requirements, submit it, wait for
 *      confirmation, and return a JSON receipt.
 *
 * Spec: https://docs.x402.org
 */
import {
  Connection,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import type { PaymentRequirements } from 'x402/types';
import { env } from '@khun/shared';

export interface PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: 'solana' | 'solana-devnet';
  payload: { transaction: string };
}

export interface SettlementReceipt {
  success: true;
  network: 'solana' | 'solana-devnet';
  txSignature: string;
  amountAtomic: string;
  payTo: string;
  asset: string;
  confirmedAt: string;
}

export class X402SettleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Decode the X-Payment header into a typed PaymentPayload.
 * Header is base64-encoded JSON (per the x402 spec).
 */
export function decodeXPayment(header: string | undefined): PaymentPayload {
  if (!header) {
    throw new X402SettleError('invalid_payment', 'missing X-Payment header');
  }
  let json: string;
  try {
    json = Buffer.from(header, 'base64').toString('utf8');
  } catch {
    throw new X402SettleError('invalid_payment', 'X-Payment is not valid base64');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new X402SettleError('invalid_payment', 'X-Payment is not valid JSON');
  }
  const p = parsed as Partial<PaymentPayload>;
  if (
    !p ||
    typeof p !== 'object' ||
    p.scheme !== 'exact' ||
    (p.network !== 'solana' && p.network !== 'solana-devnet') ||
    !p.payload ||
    typeof p.payload.transaction !== 'string'
  ) {
    throw new X402SettleError('invalid_payment', 'X-Payment shape mismatch');
  }
  return p as PaymentPayload;
}

/**
 * Verify the signed transaction satisfies the PaymentRequirements:
 *   • exactly one SPL transfer-checked (or token-2022 transfer-checked) instr
 *   • amount matches maxAmountRequired (atomic units)
 *   • mint matches PaymentRequirements.asset
 *   • destination ATA equals ATA(merchantWallet, mint)
 *
 * Returns the parsed VersionedTransaction (ready to submit).
 */
export function verifyTransaction(
  tx: VersionedTransaction,
  reqs: PaymentRequirements
): void {
  const message = tx.message;
  const accountKeys = message.staticAccountKeys;

  const programIds = message.compiledInstructions.map((ix) => accountKeys[ix.programIdIndex]);
  const tokenIxs = message.compiledInstructions.filter((_, i) => {
    const programId = programIds[i];
    return (
      programId !== undefined &&
      (programId.equals(TOKEN_PROGRAM_ID) || programId.equals(TOKEN_2022_PROGRAM_ID))
    );
  });

  if (tokenIxs.length !== 1) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction_instructions',
      `expected exactly one SPL token instruction; got ${tokenIxs.length}`
    );
  }
  const ix = tokenIxs[0]!;

  // SPL TransferChecked (TOKEN_PROGRAM_ID & TOKEN_2022_PROGRAM_ID) discriminator is 12.
  const TRANSFER_CHECKED_DISCRIMINATOR = 12;
  const data = ix.data;
  if (data.length < 1 + 8 + 1) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction',
      'instruction data too short for TransferChecked'
    );
  }
  if (data[0] !== TRANSFER_CHECKED_DISCRIMINATOR) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction_instruction_not_spl_token_transfer_checked',
      `instruction discriminator ${data[0]} is not TransferChecked`
    );
  }

  // Amount is little-endian u64 at offset 1
  const amountAtomic = Buffer.from(data.slice(1, 9)).readBigUInt64LE();
  const expected = BigInt(reqs.maxAmountRequired);
  if (amountAtomic !== expected) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction_amount_mismatch',
      `amount ${amountAtomic} != required ${expected}`
    );
  }

  // TransferChecked accounts: [source_ata, mint, destination_ata, owner, ...]
  if (ix.accountKeyIndexes.length < 4) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction',
      'TransferChecked needs ≥4 accounts'
    );
  }
  const mintIx = accountKeys[ix.accountKeyIndexes[1]!]!;
  const destAta = accountKeys[ix.accountKeyIndexes[2]!]!;

  if (mintIx.toBase58() !== reqs.asset) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction',
      `mint ${mintIx.toBase58()} != required ${reqs.asset}`
    );
  }

  const expectedDest = getAssociatedTokenAddressSync(
    new PublicKey(reqs.asset),
    new PublicKey(reqs.payTo),
    true,
    programIds.find((p) => p?.equals(TOKEN_2022_PROGRAM_ID)) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
  );
  if (!destAta.equals(expectedDest)) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_transaction_transfer_to_incorrect_ata',
      `destination ATA ${destAta.toBase58()} != expected ${expectedDest.toBase58()} for payTo ${reqs.payTo}`
    );
  }

  // Signature sanity: VersionedTransaction has signatures aligned with required signer keys.
  // We don't fully verify cryptographically here — RPC will reject if invalid.
  if (tx.signatures.every((s) => s.every((b) => b === 0))) {
    throw new X402SettleError(
      'invalid_exact_svm_payload_signature',
      'no signatures attached'
    );
  }
}

/**
 * Verify + submit the signed tx, return a typed receipt once confirmed.
 */
export async function verifyAndSettle(opts: {
  xPaymentHeader: string | undefined;
  requirements: PaymentRequirements;
}): Promise<SettlementReceipt> {
  const payment = decodeXPayment(opts.xPaymentHeader);

  if (payment.network !== opts.requirements.network) {
    throw new X402SettleError(
      'invalid_network',
      `payment network ${payment.network} != requirements ${opts.requirements.network}`
    );
  }

  const txBytes = Buffer.from(payment.payload.transaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBytes);
  verifyTransaction(tx, opts.requirements);

  const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
  const sig = await conn.sendRawTransaction(txBytes, {
    skipPreflight: false,
    maxRetries: 3,
  });
  const status = await conn.confirmTransaction(sig, 'confirmed');
  if (status.value.err) {
    throw new X402SettleError(
      'invalid_transaction_state',
      `tx ${sig} failed on-chain: ${JSON.stringify(status.value.err)}`
    );
  }

  return {
    success: true,
    network: payment.network,
    txSignature: sig,
    amountAtomic: opts.requirements.maxAmountRequired,
    payTo: opts.requirements.payTo,
    asset: opts.requirements.asset,
    confirmedAt: new Date().toISOString(),
  };
}
