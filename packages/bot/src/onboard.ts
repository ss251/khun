import type { KhunAgent } from '@khun/shared';
import { recordAgent, registerKhunAgent } from '@khun/agent-creator';
import { extractIntent } from './intent.js';
import { generateThaiConfirmation } from './reply.js';
import { publicBaseUrl } from './config.js';

interface OnboardInput {
  thaiMessage: string;
  chatId: string; // Telegram chat id; used as the HKDF salt for the merchant wallet
}

interface OnboardResult {
  agent: KhunAgent;
  thaiReply: string;
}

/**
 * Block 3 orchestrator. Thai message in → MerchantIntent → register on
 * mainnet via 8004-solana → record in local store → Thai reply with the
 * real agent card.
 *
 * The endpointUrl is constructed before registration so the agent's
 * on-chain metadata advertises the same URL agents will dial.
 */
export async function onboardMerchant(input: OnboardInput): Promise<OnboardResult> {
  const intent = await extractIntent(input.thaiMessage);

  // We don't know the assetId yet (it's returned by registerAgent), so use a
  // placeholder. After registration we PUT the real assetId into the agent
  // record but the on-chain metadata still points at the placeholder URL
  // until v0 — addressing this in Block 4 with `setAgentUri`.
  const provisionalAssetId = 'pending';
  const endpointUrl = `${publicBaseUrl()}/agent/${provisionalAssetId}/order`;

  const agent = await registerKhunAgent({
    intent,
    endpointUrl,
    ownerChatId: input.chatId,
  });

  // Real assetId is now known. Update the endpoint URL so it's correct in
  // the locally-stored agent (the x402 server uses agentId from the URL
  // path; the metadata-URI gap is closed in Block 4 with `setAgentUri`).
  agent.endpointUrl = `${publicBaseUrl()}/agent/${agent.agentId}/order`;
  recordAgent(agent);

  const thaiReply = await generateThaiConfirmation(agent);
  return { agent, thaiReply };
}
