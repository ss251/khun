import { Keypair } from '@solana/web3.js';
import type { MerchantIntent } from '@khun/shared';
import { env } from '@khun/shared';

/**
 * Block 3 implementation. Stubbed to keep Block 1 fast.
 *
 * Live API per `npm 8004-solana` README (verified github.com/QuantuLabs/8004-solana-ts):
 *   const { SolanaSDK, IPFSClient, buildRegistrationFileJson, ServiceType } = await import('8004-solana');
 *   const sdk = new SolanaSDK({ cluster: env.agentRegistryCluster(), signer, ipfsClient });
 *   const collection = await sdk.createCollection({ name: 'Khun', symbol: 'KHUN', description: '...', image: 'ipfs://...' });
 *   const agentMeta = buildRegistrationFileJson({
 *     name: intent.serviceDescriptionEnglish,
 *     description: intent.serviceDescriptionThai,
 *     services: [{ type: ServiceType.A2A, value: endpointUrl }],
 *     skills: [...],
 *   });
 *   const metadataUri = `ipfs://${await ipfsClient.addJson(agentMeta)}`;
 *   const agent = await sdk.registerAgent(metadataUri, { collectionPointer: collection.pointer });
 *   return agent.asset.toBase58();
 */
export async function registerKhunAgent(opts: {
  signer: Keypair;
  intent: MerchantIntent;
  endpointUrl: string;
}): Promise<{ agentId: string; txSignature: string }> {
  void opts;
  void env.agentRegistryCluster();
  throw new Error('TODO Block 3: integrate 8004-solana SDK registerAgent');
}
