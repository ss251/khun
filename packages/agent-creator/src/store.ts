import fs from 'node:fs';
import path from 'node:path';
import type { KhunAgent } from '@khun/shared';

const STORE_PATH = path.resolve(process.cwd(), '.keys/agents.json');

type StoreShape = Record<string, KhunAgent>;

function load(): StoreShape {
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as StoreShape;
  } catch {
    return {};
  }
}

function save(s: StoreShape): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(s, null, 2));
}

export function recordAgent(agent: KhunAgent): void {
  const s = load();
  s[agent.agentId] = agent;
  save(s);
}

export function getAgent(agentId: string): KhunAgent | null {
  return load()[agentId] ?? null;
}

export function listAgents(): KhunAgent[] {
  return Object.values(load());
}

export function getAgentByOwner(chatId: string): KhunAgent | null {
  const all = load();
  for (const a of Object.values(all)) {
    if (a.ownerChatId === chatId) return a;
  }
  return null;
}

export function updateAgentPrice(agentId: string, priceUsdt: number): KhunAgent | null {
  const s = load();
  const a = s[agentId];
  if (!a) return null;
  a.intent.priceUsdt = priceUsdt;
  save(s);
  return a;
}

export function setBitkubDepositAddress(
  agentId: string,
  address: string
): KhunAgent | null {
  const s = load();
  const a = s[agentId];
  if (!a) return null;
  a.bitkubDepositAddress = address;
  save(s);
  return a;
}
