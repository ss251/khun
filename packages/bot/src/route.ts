import type { TelegramUpdate } from './telegram.js';
import { sendMessage } from './telegram.js';
import { onboardMerchant } from './onboard.js';

/**
 * Block 2 wire-up: Telegram message in → Typhoon parse → Claude shape →
 * Thai reply with agent card. Block 3 will replace the stub agent inside
 * onboardMerchant() with a real 8004-solana register call.
 */
export async function handleUpdate(update: unknown): Promise<void> {
  const u = update as TelegramUpdate;
  const msg = u.message;
  if (!msg?.text) return;

  // /start gets a friendly intro instead of the full onboarding flow.
  if (msg.text.startsWith('/start') || msg.text === '/help') {
    await sendMessage({
      chatId: msg.chat.id,
      text:
        'สวัสดีครับ คุณเข้าสู่ Khun แล้ว 🪷\n' +
        'พิมพ์บอกผมว่าคุณขาย/ให้บริการอะไร ราคาเท่าไหร่ — ผมจะลงทะเบียนให้เป็น AI agent บน Solana ภายใน ~10 วินาที\n\n' +
        'ตัวอย่าง: "ผมเป็นไกด์เที่ยวกรุงเทพ พูดอังกฤษได้ 600 บาทต่อชั่วโมง"',
    });
    return;
  }

  try {
    const { thaiReply } = await onboardMerchant({
      thaiMessage: msg.text,
      lineUserId: String(msg.chat.id),
    });
    await sendMessage({
      chatId: msg.chat.id,
      replyToMessageId: msg.message_id,
      text: thaiReply,
    });
  } catch (err) {
    console.error('onboard error', err);
    await sendMessage({
      chatId: msg.chat.id,
      text: 'ขออภัยครับ ระบบเกิดข้อผิดพลาด — ลองส่งใหม่อีกครั้งครับ',
    });
  }
}
