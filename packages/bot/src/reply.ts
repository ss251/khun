import type { KhunAgent } from '@khun/shared';
import { claude } from './claude.js';

const THAI_REPLY_SYSTEM = `You are Khun (คุณ), a polite Thai bot that has just registered \
a Thai service provider as an on-chain AI agent. Reply in natural conversational Thai \
(formal but warm — use "ครับ" / "ค่ะ" where appropriate). Tell them:
1. Confirm what we registered (one short line).
2. Their agent ID (Solana NFT asset address).
3. Their Solana wallet address.
4. The x402 endpoint URL where foreign AI assistants can pay them.
5. One short line saying that any AI assistant (Claude, Gemini, etc.) can now find and \
pay them in USDT on Solana, and they'll get a notification here.

Keep it under 12 lines total. Do not use markdown. Do not invent fields. Echo the \
addresses/URLs exactly as given.`;

export async function generateThaiConfirmation(agent: KhunAgent): Promise<string> {
  const userMsg = [
    `Service (Thai): ${agent.intent.serviceDescriptionThai}`,
    `Service (English): ${agent.intent.serviceDescriptionEnglish}`,
    `Price: ${agent.intent.priceUsdt} USDT${
      agent.intent.priceThbReference ? ` (~฿${agent.intent.priceThbReference})` : ''
    }`,
    `Agent ID: ${agent.agentId}`,
    `Solana address: ${agent.walletAddress}`,
    `x402 endpoint: ${agent.endpointUrl}`,
  ].join('\n');

  return claude({
    system: THAI_REPLY_SYSTEM,
    userMessage: userMsg,
    maxTokens: 600,
  });
}
