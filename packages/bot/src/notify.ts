import type { KhunAgent } from '@khun/shared';
import { sendMessage } from './telegram.js';
import { getUsdtThbRate } from '@khun/agent-creator';

/**
 * Push a Thai-language settlement notification to the merchant who owns the
 * agent. Includes the live Bitkub THB rate so the merchant immediately sees
 * what the payment is worth in baht.
 */
export async function notifyMerchantOfPayment(opts: {
  agent: KhunAgent;
  amountUsdt: number;
  txSignature: string;
  buyerNote?: string;
}): Promise<void> {
  let thbLine = '';
  try {
    const rate = await getUsdtThbRate();
    const thb = (opts.amountUsdt * rate).toFixed(2);
    thbLine = `≈ ฿${thb} (Bitkub rate ${rate.toFixed(2)})\n`;
  } catch {
    // Bitkub ticker is best-effort.
  }

  const cluster = process.env.AGENT_REGISTRY_CLUSTER === 'mainnet-beta' ? '' : '?cluster=devnet';
  const explorerUrl = `https://explorer.solana.com/tx/${opts.txSignature}${cluster}`;

  const text =
    `🎉 มีคำสั่งซื้อใหม่ ${opts.amountUsdt} USDT\n` +
    thbLine +
    (opts.buyerNote ? `📝 ${opts.buyerNote}\n` : '') +
    `\nบริการ: ${opts.agent.intent.serviceDescriptionThai}\n` +
    `Tx: ${explorerUrl}`;

  await sendMessage({
    chatId: Number(opts.agent.ownerChatId),
    text,
  });
}
