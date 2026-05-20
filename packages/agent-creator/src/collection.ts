import fs from 'node:fs';
import path from 'node:path';
import { getSdk } from './sdk.js';

const CACHE_PATH = path.resolve(process.cwd(), '.keys/collection.json');

interface CollectionCache {
  cid: string;
  uri: string;
  pointer: string; // c1:<payload> — format we pass to registerAgent
  cluster: string;
  createdAt: string;
}

function loadCache(): CollectionCache | null {
  if (!fs.existsSync(CACHE_PATH)) return null;
  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as CollectionCache;
}

function saveCache(c: CollectionCache): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2));
}

/**
 * Idempotent. Returns the cached collection pointer if one exists for this
 * cluster, else creates a new Khun collection on IPFS + caches it locally.
 *
 * The collection groups all Khun-registered merchant agents under one
 * Metaplex Core collection so they're queryable as a set.
 */
export async function ensureKhunCollection(): Promise<CollectionCache> {
  const existing = loadCache();
  if (existing) return existing;

  const sdk = getSdk();
  const result = await sdk.createCollection({
    name: 'Khun Agents',
    symbol: 'KHUN',
    description:
      'Thai service-provider AI agents — registered via the Khun Telegram bot, ' +
      'discoverable on Pay.sh, payable in Tether USDT via x402 on Solana.',
    socials: {
      website: 'https://github.com/ss251/khun',
    },
  });
  if (!result.pointer || !result.cid || !result.uri) {
    throw new Error(
      `createCollection returned incomplete result (pointer=${result.pointer}, cid=${result.cid}, uri=${result.uri}). ` +
        'IPFS upload probably failed — check PINATA_JWT.'
    );
  }
  const cache: CollectionCache = {
    cid: result.cid,
    uri: result.uri,
    pointer: result.pointer,
    cluster: process.env.AGENT_REGISTRY_CLUSTER ?? 'mainnet-beta',
    createdAt: new Date().toISOString(),
  };
  saveCache(cache);
  return cache;
}
