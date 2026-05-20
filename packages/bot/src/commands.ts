import { Connection, PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  getAgentByOwner,
  getUsdtThbRate,
  updateAgentPrice,
} from '@khun/agent-creator';
import { env } from '@khun/shared';
import { sendMessage } from './telegram.js';

const HELP = [
  'คำสั่งที่ใช้ได้:',
  '/start  — เริ่มต้น',
  '/me     — ดูบัตร agent ของคุณ',
  '/price <USDT>  — เปลี่ยนราคา เช่น /price 25',
  '/withdraw  — ดูยอด USDT และวิธีถอนเป็น THB (เร็วๆ นี้)',
  '/help   — ดูคำสั่งทั้งหมด',
  '',
  'ลงทะเบียนใหม่: พิมพ์บอกผมว่าคุณขาย/ให้บริการอะไรเป็นภาษาไทย',
].join('\n');

export async function handleStart(chatId: number): Promise<void> {
  await sendMessage({
    chatId,
    text:
      'สวัสดีครับ คุณเข้าสู่ Khun แล้ว 🪷\n' +
      'พิมพ์บอกผมว่าคุณขาย/ให้บริการอะไร ราคาเท่าไหร่ — ผมจะลงทะเบียนให้เป็น AI agent บน Solana ภายใน ~10 วินาที\n\n' +
      'ตัวอย่าง: "ผมเป็นไกด์เที่ยวกรุงเทพ พูดอังกฤษได้ 600 บาทต่อชั่วโมง"\n\n' +
      'พิมพ์ /help เพื่อดูคำสั่งทั้งหมด',
  });
}

export async function handleHelp(chatId: number): Promise<void> {
  await sendMessage({ chatId, text: HELP });
}

export async function handleMe(chatId: number): Promise<void> {
  const agent = getAgentByOwner(String(chatId));
  if (!agent) {
    await sendMessage({
      chatId,
      text:
        'ยังไม่มี agent ครับ — พิมพ์บอกผมว่าคุณขาย/ให้บริการอะไรเป็นภาษาไทย ' +
        'แล้วผมจะลงทะเบียนให้',
    });
    return;
  }

  let balanceLine = '';
  try {
    const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
    const mint = new PublicKey(env.usdtSolanaMint());
    const wallet = new PublicKey(agent.walletAddress);
    const ata = getAssociatedTokenAddressSync(mint, wallet);
    const acct = await getAccount(conn, ata, undefined, TOKEN_PROGRAM_ID);
    const usdt = Number(acct.amount) / 1_000_000;
    let thbLine = '';
    try {
      const rate = await getUsdtThbRate();
      thbLine = ` (≈ ฿${(usdt * rate).toFixed(2)})`;
    } catch {
      /* best-effort */
    }
    balanceLine = `\nยอดคงเหลือ: ${usdt.toFixed(2)} USDT${thbLine}`;
  } catch {
    balanceLine = '\nยอดคงเหลือ: 0.00 USDT (ยังไม่มียอดเข้าครับ)';
  }

  const explorerSuffix =
    env.agentRegistryCluster() === 'mainnet-beta' ? '' : '?cluster=devnet';
  await sendMessage({
    chatId,
    text:
      `บัตร agent ของคุณ 🪷\n` +
      `บริการ: ${agent.intent.serviceDescriptionThai}\n` +
      `ราคา: ${agent.intent.priceUsdt} USDT\n` +
      `Agent ID: ${agent.agentId}\n` +
      `Wallet:   ${agent.walletAddress}\n` +
      `Endpoint: ${agent.endpointUrl}` +
      balanceLine +
      `\nดูบนเครือข่าย: https://explorer.solana.com/address/${agent.walletAddress}${explorerSuffix}`,
  });
}

export async function handlePrice(chatId: number, args: string): Promise<void> {
  const num = Number(args.trim().replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) {
    await sendMessage({
      chatId,
      text: 'ตัวอย่างการใช้: /price 25  (หน่วยเป็น USDT)',
    });
    return;
  }
  const agent = getAgentByOwner(String(chatId));
  if (!agent) {
    await sendMessage({
      chatId,
      text: 'ยังไม่มี agent ครับ — ลงทะเบียนก่อนโดยพิมพ์บริการของคุณ',
    });
    return;
  }
  const updated = updateAgentPrice(agent.agentId, num);
  if (!updated) {
    await sendMessage({ chatId, text: 'อัปเดตไม่สำเร็จ ลองใหม่อีกครั้งครับ' });
    return;
  }
  await sendMessage({
    chatId,
    text: `อัปเดตราคาเป็น ${num} USDT แล้วครับ ✅\n(หมายเหตุ: ข้อมูล on-chain จะอัปเดตในเวอร์ชันถัดไป)`,
  });
}

export async function handleWithdraw(chatId: number): Promise<void> {
  const agent = getAgentByOwner(String(chatId));
  if (!agent) {
    await sendMessage({
      chatId,
      text: 'ยังไม่มี agent ครับ — ลงทะเบียนก่อนโดยพิมพ์บริการของคุณ',
    });
    return;
  }
  let balanceLine = '';
  try {
    const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
    const mint = new PublicKey(env.usdtSolanaMint());
    const wallet = new PublicKey(agent.walletAddress);
    const ata = getAssociatedTokenAddressSync(mint, wallet);
    const acct = await getAccount(conn, ata, undefined, TOKEN_PROGRAM_ID);
    const usdt = Number(acct.amount) / 1_000_000;
    balanceLine = `ยอดคงเหลือ: ${usdt.toFixed(2)} USDT\n`;
  } catch {
    balanceLine = 'ยอดคงเหลือ: 0.00 USDT\n';
  }
  await sendMessage({
    chatId,
    text:
      `เบิก USDT เข้า Bitkub 🏦\n` +
      balanceLine +
      `\nวิธี (เร็วๆ นี้ — Block 6):\n` +
      `1. ลงทะเบียน Bitkub แล้วไปที่ "ฝาก USDT" เลือกเครือข่าย Solana\n` +
      `2. ส่ง USDT จาก ${agent.walletAddress} ไปที่ deposit address ของคุณ\n` +
      `3. ขาย USDT → ถอนเป็น THB เข้าบัญชีไทย\n\n` +
      `(ระบบจะทำขั้นตอน 2 ให้คุณอัตโนมัติเมื่อเปิดใช้)`,
  });
}
