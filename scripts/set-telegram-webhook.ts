/**
 * Register the bot's webhook with Telegram.
 *
 * Usage:
 *   bun scripts/set-telegram-webhook.ts <public-https-url>
 *
 * The public URL is whatever ngrok/cloudflared/Lambda+API-Gateway gives us.
 * The webhook path is `/telegram/webhook` (matches src/local.ts route).
 */
import { env } from '@khun/shared';

async function main() {
  const publicBase = process.argv[2];
  if (!publicBase) {
    console.error('usage: bun scripts/set-telegram-webhook.ts <public-https-url>');
    process.exit(1);
  }
  if (!/^https:\/\//.test(publicBase)) {
    console.error('Telegram requires HTTPS. Pass an https:// URL.');
    process.exit(1);
  }

  const webhookUrl = publicBase.replace(/\/$/, '') + '/telegram/webhook';
  const secret = env.telegramSecretToken();
  if (!secret) {
    console.warn(
      '⚠  TELEGRAM_SECRET_TOKEN not set in env. Webhook will accept unauthenticated requests. ' +
        'Set a random 32+ char string in .env before going live.'
    );
  }

  const url = `https://api.telegram.org/bot${env.telegramBotToken()}/setWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret || undefined,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown };

  if (!data.ok) {
    console.error('Telegram setWebhook failed:', data);
    process.exit(1);
  }
  console.log('✓ webhook registered at', webhookUrl);

  // Sanity-check what Telegram now thinks the webhook is.
  const info = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken()}/getWebhookInfo`
  ).then((r) => r.json());
  console.log('getWebhookInfo:', JSON.stringify(info, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
