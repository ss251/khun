import type { TelegramUpdate } from './telegram.js';
import { sendMessage } from './telegram.js';
import { onboardMerchant } from './onboard.js';
import {
  handleHelp,
  handleMe,
  handlePrice,
  handleStart,
  handleWithdraw,
} from './commands.js';

interface ParsedCommand {
  cmd: string;
  args: string;
}

function parseCommand(text: string): ParsedCommand | null {
  if (!text.startsWith('/')) return null;
  const rest = text.slice(1);
  const space = rest.indexOf(' ');
  let cmd: string;
  let args: string;
  if (space < 0) {
    cmd = rest;
    args = '';
  } else {
    cmd = rest.slice(0, space);
    args = rest.slice(space + 1);
  }
  // Telegram bot commands can be suffixed with @botname — strip it.
  const at = cmd.indexOf('@');
  if (at >= 0) cmd = cmd.slice(0, at);
  return { cmd: cmd.toLowerCase(), args };
}

/**
 * Top-level routing for inbound Telegram updates.
 * Slash-commands dispatch to handlers in commands.ts.
 * Plain text triggers onboardMerchant (Block 3 chain).
 */
export async function handleUpdate(update: unknown): Promise<void> {
  const u = update as TelegramUpdate;
  const msg = u.message;
  if (!msg?.text) return;

  const cmd = parseCommand(msg.text);
  if (cmd) {
    switch (cmd.cmd) {
      case 'start':
        return handleStart(msg.chat.id);
      case 'help':
        return handleHelp(msg.chat.id);
      case 'me':
        return handleMe(msg.chat.id);
      case 'price':
        return handlePrice(msg.chat.id, cmd.args);
      case 'withdraw':
        return handleWithdraw(msg.chat.id);
      default:
        await sendMessage({
          chatId: msg.chat.id,
          text: `ไม่รู้จักคำสั่ง /${cmd.cmd} — พิมพ์ /help เพื่อดูคำสั่งที่ใช้ได้`,
        });
        return;
    }
  }

  // Free-form Thai message → onboard a new agent (or re-register if they already have one).
  try {
    const { thaiReply } = await onboardMerchant({
      thaiMessage: msg.text,
      chatId: String(msg.chat.id),
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
