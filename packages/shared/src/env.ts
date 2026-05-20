import fs from 'node:fs';
import path from 'node:path';

/**
 * Load .env files into process.env with override semantics.
 *
 * Bun and dotenv both default to "shell wins over .env" — we want the
 * opposite, since a stale shell export bit us before. We also want a clean
 * way to switch clusters without rewriting .env every time.
 *
 * Loading order (later wins):
 *   1. .env                   — shared secrets (API keys, master seed, etc.)
 *   2. .env.<KHUN_ENV>        — cluster-specific overrides (devnet by default)
 *
 * Set KHUN_ENV=mainnet (in shell or a wrapper script) to load .env.mainnet
 * instead of .env.devnet for the live demo.
 */
function loadDotenvOverride(): void {
  // packages/shared/src/env.ts → repo root is three directories up.
  const repoRoot = path.resolve(import.meta.dirname, '../../..');
  const cluster = process.env.KHUN_ENV ?? 'devnet';
  const files = [
    path.resolve(repoRoot, '.env'),
    path.resolve(repoRoot, `.env.${cluster}`),
    // Fallback to cwd-relative paths if the repoRoot path doesn't exist
    // (e.g., when packaged into a Lambda zip with a flat layout).
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), `.env.${cluster}`),
  ];
  const seen = new Set<string>();
  for (const p of files) {
    if (seen.has(p) || !fs.existsSync(p)) continue;
    seen.add(p);
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value; // override
    }
  }
}

loadDotenvOverride();

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
  typhoonModelId: () => optional('TYPHOON_MODEL_ID', 'typhoon-v2.5-30b-a3b-instruct'),

  // Telegram (LINE pivoted away — see PLAN.md)
  telegramBotToken: () => required('TELEGRAM_BOT_TOKEN'),
  /** Optional but recommended. Random string set when we call setWebhook;
   *  Telegram echoes it in X-Telegram-Bot-Api-Secret-Token on each call. */
  telegramSecretToken: () => optional('TELEGRAM_SECRET_TOKEN'),

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

  // Khun master seed (HKDF root for per-merchant Ed25519 keypairs)
  khunMasterSeed: () => required('KHUN_MASTER_SEED'),

  // Pinata (used by 8004-solana SDK IPFSClient to upload agent metadata)
  pinataJwt: () => required('PINATA_JWT'),

  // Bitkub
  bitkubApiBase: () => optional('BITKUB_API_BASE', 'https://api.bitkub.com'),
};
