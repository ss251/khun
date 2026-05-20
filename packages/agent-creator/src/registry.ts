import { ServiceType, buildRegistrationFileJson } from '8004-solana';
import type { KhunAgent, MerchantIntent } from '@khun/shared';
import { ensureKhunCollection } from './collection.js';
import { getIpfs } from './ipfs.js';
import { getSdk } from './sdk.js';
import { deriveMerchantKeypair } from './wallet.js';

export interface RegisterKhunAgentInput {
  intent: MerchantIntent;
  endpointUrl: string;       // x402-payable URL we'll serve on Lambda
  ownerChatId: string;       // Telegram chat id (used for HKDF wallet derivation + notification routing)
}

/**
 * Real Block 3 implementation: builds the agent metadata, pins it to IPFS
 * via Pinata, calls 8004-solana `registerAgent` against mainnet, then
 * `setAgentWallet` so the merchant's HKDF-derived keypair signs feedback
 * for this agent.
 */
export async function registerKhunAgent(input: RegisterKhunAgentInput): Promise<KhunAgent> {
  const { intent, endpointUrl, ownerChatId } = input;

  const sdk = getSdk();
  const ipfs = getIpfs();
  const collection = await ensureKhunCollection();
  const merchantKp = deriveMerchantKeypair(ownerChatId);

  const agentMeta = buildRegistrationFileJson({
    name: intent.serviceDescriptionEnglish || 'Thai service provider',
    description: intent.serviceDescriptionThai,
    services: [
      { type: ServiceType.A2A, value: endpointUrl },
    ],
    walletAddress: merchantKp.publicKey.toBase58(),
    active: true,
    x402Support: true,
    trustModels: ['reputation'],
    metadata: {
      khun_version: '0.1.0',
      price_usdt: intent.priceUsdt,
      price_thb_reference: intent.priceThbReference,
      category: intent.category,
      hours: intent.hours,
      location: intent.location,
      languages: intent.languages,
    },
  });

  const metadataCid = await ipfs.addJson(agentMeta);
  const metadataUri = `ipfs://${metadataCid}`;

  const result = await sdk.registerAgent(metadataUri, {
    collectionPointer: collection.pointer,
  });

  if (!('asset' in result) || !result.asset) {
    throw new Error('registerAgent returned no asset address');
  }
  const assetAddress = result.asset.toBase58();
  const sig =
    'signatures' in result && Array.isArray(result.signatures) && result.signatures[0]
      ? result.signatures[0]
      : 'unknown';

  // Bind the merchant's operational wallet so it can sign future feedback
  // / endpoint actions for this agent without the treasury key.
  await sdk.setAgentWallet(result.asset, merchantKp);

  return {
    agentId: assetAddress,
    ownerChatId,
    walletAddress: merchantKp.publicKey.toBase58(),
    endpointUrl,
    intent,
    registeredAt: new Date().toISOString(),
    registryTxSignature: sig,
  };
}
