function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Claude — either provider works. Auto-selection in line-bot/src/claude.ts:
  //   prefers ANTHROPIC_API_KEY if set, falls back to AWS_BEARER_TOKEN_BEDROCK.
  anthropicApiKey: () => optional('ANTHROPIC_API_KEY'),
  anthropicModelId: () => optional('ANTHROPIC_MODEL_ID', 'claude-opus-4-7'),
  awsBearerTokenBedrock: () => required('AWS_BEARER_TOKEN_BEDROCK'),
  awsRegion: () => optional('AWS_REGION', 'us-east-1'),
  bedrockRegion: () => optional('BEDROCK_REGION', 'us-east-1'),
  bedrockModelId: () =>
    optional('BEDROCK_MODEL_ID', 'us.anthropic.claude-opus-4-7-20250000-v1:0'),

  // Typhoon (SCB 10X)
  typhoonApiKey: () => required('TYPHOON_API_KEY'),
  typhoonBaseUrl: () => optional('TYPHOON_BASE_URL', 'https://api.opentyphoon.ai/v1'),
  typhoonModelId: () => optional('TYPHOON_MODEL_ID', 'typhoon-v2.1-12b-instruct'),

  // LINE
  lineChannelSecret: () => required('LINE_CHANNEL_SECRET'),
  lineChannelAccessToken: () => required('LINE_CHANNEL_ACCESS_TOKEN'),

  // Solana
  solanaRpcUrl: () => required('SOLANA_RPC_URL'),
  treasuryKeypairPath: () => optional('TREASURY_KEYPAIR_PATH', './.keys/treasury.json'),
  usdtSolanaMint: () =>
    optional('USDT_SOLANA_MINT', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),

  // agent-registry-8004
  agentRegistryIndexer: () =>
    optional('AGENT_REGISTRY_INDEXER', 'https://8004-indexer-main.qnt.sh/v2/graphql'),
  agentRegistryCluster: () => optional('AGENT_REGISTRY_CLUSTER', 'mainnet-beta') as
    | 'mainnet-beta'
    | 'devnet'
    | 'localnet',

  // Turnkey
  turnkeyApiPublicKey: () => required('TURNKEY_API_PUBLIC_KEY'),
  turnkeyApiPrivateKey: () => required('TURNKEY_API_PRIVATE_KEY'),
  turnkeyOrganizationId: () => required('TURNKEY_ORGANIZATION_ID'),

  // Pinata
  pinataJwt: () => required('PINATA_JWT'),

  // Bitkub
  bitkubApiBase: () => optional('BITKUB_API_BASE', 'https://api.bitkub.com'),
};
