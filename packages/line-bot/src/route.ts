import { reply } from './line.js';
import { parseThaiIntent } from './typhoon.js';

/**
 * Block 2 stub: receives a LINE event, parses Thai intent via Typhoon, replies.
 * Block 3 will add wallet provisioning + agent-registry-8004 register call.
 */
export async function handleMessageEvent(event: any): Promise<void> {
  if (event.type !== 'message' || event.message?.type !== 'text') return;

  const text = event.message.text as string;
  const replyToken = event.replyToken as string;

  const rawIntent = await parseThaiIntent(text);
  // TODO Block 3: wallet + register + x402 endpoint, then reply with full agent card.
  await reply(
    replyToken,
    `กำลังลงทะเบียน… (debug intent)\n${rawIntent.slice(0, 400)}`
  );
}
