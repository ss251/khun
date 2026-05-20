import { env } from '@khun/shared';

const API_BASE = 'https://api.telegram.org';

/**
 * Telegram protects webhooks via a custom secret token passed in the
 * `X-Telegram-Bot-Api-Secret-Token` header. We set this when calling
 * setWebhook (see scripts/set-telegram-webhook.ts) and compare on receive.
 */
export function verifySecretToken(headerToken: string | undefined): boolean {
  const expected = env.telegramSecretToken();
  if (!expected) return true; // dev mode without secret
  if (!headerToken) return false;
  if (headerToken.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
}

export async function sendMessage(opts: {
  chatId: number;
  text: string;
  replyToMessageId?: number;
}): Promise<void> {
  const url = `${API_BASE}/bot${env.telegramBotToken()}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: opts.text,
      reply_to_message_id: opts.replyToMessageId,
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${res.status} ${await res.text()}`);
  }
}
