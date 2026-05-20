import type { TelegramUpdate } from './telegram.js';
import { sendMessage } from './telegram.js';
import { parseThaiIntent } from './typhoon.js';

/**
 * Block 2 stub. Receives a Telegram Update, runs Thai intent parsing via
 * Typhoon, replies with a debug echo.
 * Block 3 will replace this with: wallet provisioning + 8004 register + x402
 * endpoint factory + final reply containing the agent card.
 */
export async function handleUpdate(update: unknown): Promise<void> {
  const u = update as TelegramUpdate;
  const msg = u.message;
  if (!msg?.text) return;

  const rawIntent = await parseThaiIntent(msg.text);
  await sendMessage({
    chatId: msg.chat.id,
    replyToMessageId: msg.message_id,
    text: `กำลังลงทะเบียน… (debug intent)\n<pre>${escapeHtml(rawIntent).slice(0, 1500)}</pre>`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
