import type { KhunAgent } from '@khun/shared';
import { extractIntent } from './intent.js';
import { generateThaiConfirmation } from './reply.js';

interface OnboardInput {
  thaiMessage: string;
  lineUserId: string; // we keep the field name "lineUserId" for now — really it's
                      // the Telegram chat id. Block 5/6: rename to ownerChatId.
}

interface OnboardResult {
  agent: KhunAgent;
  thaiReply: string;
}

/**
 * Block 2 orchestrator. Stubs out the real on-chain registration so we can
 * exercise the Typhoon → Claude path end-to-end before Block 3 lands.
 * When Block 3 lands, replace the stub block below with:
 *   const agent = await createKhunAgent({ intent, ownerLineUserId: input.lineUserId });
 */
export async function onboardMerchant(input: OnboardInput): Promise<OnboardResult> {
  const intent = await extractIntent(input.thaiMessage);

  // --- Block 3 will replace this block ---
  const stubAgent: KhunAgent = {
    agentId: 'pending-block-3',
    ownerLineUserId: input.lineUserId,
    walletAddress: 'pending-block-3',
    endpointUrl: 'https://khun.app/agent/pending-block-3/order',
    intent,
    registeredAt: new Date().toISOString(),
    registryTxSignature: 'pending-block-3',
  };
  // ---------------------------------------

  const thaiReply = await generateThaiConfirmation(stubAgent);
  return { agent: stubAgent, thaiReply };
}
