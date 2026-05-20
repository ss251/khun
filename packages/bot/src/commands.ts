import { Connection, PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  getAgentByOwner,
  getUsdtThbRate,
  OffRampError,
  offrampToBitkub,
  parseSolanaAddress,
  setBitkubDepositAddress,
  updateAgentPrice,
} from '@khun/agent-creator';
import { env } from '@khun/shared';
import { sendMessage } from './telegram.js';

const HELP = [
  'คำสั่งที่ใช้ได้:',
  '/start  — เริ่มต้น',
  '/me     — ดูบัตร agent ของคุณ',
  '/price <USDT>  — เปลี่ยนราคา เช่น /price 25',
  '/setbitkub <address>  — บันทึก deposit address ของ Bitkub (Solana USDT)',
  '/withdraw [USDT]  — ถอน USDT ไปที่ Bitkub (ใส่จำนวน หรือถอนทั้งหมด)',
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

export async function handleSetBitkub(chatId: number, args: string): Promise<void> {
  const address = args.trim();
  if (!address) {
    await sendMessage({
      chatId,
      text:
        'ตัวอย่าง: /setbitkub 5YuANWZb...\n' +
        'หา deposit address: เปิดแอป Bitkub → ฝาก → USDT → เลือกเครือข่าย Solana → คัดลอก',
    });
    return;
  }
  try {
    parseSolanaAddress(address);
  } catch (err) {
    const message = err instanceof OffRampError ? err.message : String(err);
    await sendMessage({ chatId, text: `address ไม่ถูกต้องครับ: ${message}` });
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
  setBitkubDepositAddress(agent.agentId, address);
  await sendMessage({
    chatId,
    text:
      `บันทึก Bitkub deposit address แล้วครับ ✅\n` +
      `address: ${address}\n` +
      `พิมพ์ /withdraw เพื่อถอน USDT ไปที่ Bitkub`,
  });
}

export async function handleWithdraw(chatId: number, args: string): Promise<void> {
  const agent = getAgentByOwner(String(chatId));
  if (!agent) {
    await sendMessage({
      chatId,
      text: 'ยังไม่มี agent ครับ — ลงทะเบียนก่อนโดยพิมพ์บริการของคุณ',
    });
    return;
  }
  if (!agent.bitkubDepositAddress) {
    await sendMessage({
      chatId,
      text:
        'ยังไม่ได้บันทึก Bitkub deposit address ครับ\n' +
        'เปิดแอป Bitkub → ฝาก → USDT → เลือกเครือข่าย Solana → คัดลอก address\n' +
        'จากนั้นพิมพ์: /setbitkub <address>',
    });
    return;
  }

  let usdtBalance = 0;
  try {
    const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
    const mint = new PublicKey(env.usdtSolanaMint());
    const wallet = new PublicKey(agent.walletAddress);
    const ata = getAssociatedTokenAddressSync(mint, wallet);
    const acct = await getAccount(conn, ata, undefined, TOKEN_PROGRAM_ID);
    usdtBalance = Number(acct.amount) / 1_000_000;
  } catch {
    /* no ATA yet */
  }
  if (usdtBalance <= 0) {
    await sendMessage({ chatId, text: 'ยอด USDT เป็น 0 ครับ — ยังไม่มีอะไรให้ถอน' });
    return;
  }

  // Parse amount; default to full balance.
  let amount = usdtBalance;
  const requestedRaw = args.trim().replace(/[^\d.]/g, '');
  if (requestedRaw) {
    const requested = Number(requestedRaw);
    if (!Number.isFinite(requested) || requested <= 0) {
      await sendMessage({ chatId, text: `จำนวนไม่ถูกต้อง: ${args}` });
      return;
    }
    if (requested > usdtBalance) {
      await sendMessage({
        chatId,
        text: `ขอ ${requested} USDT แต่มีแค่ ${usdtBalance.toFixed(2)} USDT`,
      });
      return;
    }
    amount = requested;
  }

  await sendMessage({
    chatId,
    text: `กำลังส่ง ${amount.toFixed(2)} USDT ไปยัง ${agent.bitkubDepositAddress.slice(0, 8)}…`,
  });

  try {
    const receipt = await offrampToBitkub({
      ownerChatId: String(chatId),
      toBitkubAddress: agent.bitkubDepositAddress,
      amountUsdt: amount,
    });
    const explorerSuffix =
      env.agentRegistryCluster() === 'mainnet-beta' ? '' : '?cluster=devnet';

    let thbLine = '';
    try {
      const rate = await getUsdtThbRate();
      thbLine = `≈ ฿${(amount * rate).toFixed(2)} (Bitkub rate ${rate.toFixed(2)})\n`;
    } catch {
      /* best-effort */
    }

    await sendMessage({
      chatId,
      text:
        `เบิกเข้า Bitkub สำเร็จ ✅\n` +
        `จำนวน: ${amount.toFixed(2)} USDT\n` +
        thbLine +
        `ไปยัง: ${receipt.toAddress}\n` +
        `Tx: https://explorer.solana.com/tx/${receipt.txSignature}${explorerSuffix}\n\n` +
        `ขั้นตอนสุดท้าย: เปิดแอป Bitkub → ดูยอด USDT → ขายเป็น THB → ถอนเข้าบัญชีไทย`,
    });
  } catch (err) {
    const code = err instanceof OffRampError ? err.code : 'unexpected';
    const message = err instanceof Error ? err.message : String(err);
    console.error('offramp failed', err);
    await sendMessage({
      chatId,
      text: `ถอนไม่สำเร็จ (${code}): ${message}`,
    });
  }
}
