/**
 * Diagnostic CLI for the agent-creator package.
 *
 * Usage:
 *   bun packages/agent-creator/src/cli.ts                 # status (default)
 *   bun packages/agent-creator/src/cli.ts register-test   # register one demo agent on the active cluster
 *
 * Side-effect import of @khun/shared loads .env with override.
 */
import '@khun/shared';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { MerchantIntent } from '@khun/shared';
import { env } from '@khun/shared';
import { getUsdtThbRate } from './bitkub.js';
import { ensureKhunCollection } from './collection.js';
import { registerKhunAgent } from './registry.js';
import { loadTreasury } from './wallet.js';

async function showStatus(): Promise<void> {
  const kp = loadTreasury();
  console.log('Treasury pubkey:', kp.publicKey.toBase58());

  const conn = new Connection(env.solanaRpcUrl(), 'confirmed');
  const lamports = await conn.getBalance(kp.publicKey);
  console.log(`  SOL balance: ${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  // USDT-SPL associated token account balance (mainnet mint).
  try {
    const mint = new PublicKey(env.usdtSolanaMint());
    const ata = getAssociatedTokenAddressSync(mint, kp.publicKey);
    const acct = await getAccount(conn, ata, undefined, TOKEN_PROGRAM_ID);
    const usdt = Number(acct.amount) / 1_000_000;
    console.log(`  USDT balance: ${usdt.toFixed(2)} USDT`);
  } catch {
    console.log('  USDT balance: 0 (no ATA — send any USDT-SPL to the treasury pubkey to create it)');
  }

  const rate = await getUsdtThbRate();
  console.log(`Bitkub live rate: 1 USDT = ฿${rate}`);

  console.log(`Registry cluster: ${env.agentRegistryCluster()}`);
  console.log(`Indexer:          ${env.agentRegistryIndexer()}`);
}

async function registerTest(): Promise<void> {
  console.log('Ensuring Khun collection exists…');
  const collection = await ensureKhunCollection();
  console.log('  collection pointer:', collection.pointer);
  console.log('  collection uri:', collection.uri);

  const intent: MerchantIntent = {
    serviceDescriptionThai: 'ผมเป็นไกด์เที่ยวกรุงเทพ พูดอังกฤษได้ 600 บาทต่อชั่วโมง',
    serviceDescriptionEnglish: 'English-speaking Bangkok tour guide, 600 THB / hour.',
    priceUsdt: 18,
    priceThbReference: 600,
    category: 'guide',
    hours: '08:00-20:00',
    location: 'Sukhumvit',
    languages: ['th', 'en'],
  };

  const fakeChatId = 'cli-test-' + Date.now();
  const endpointUrl = `http://localhost:3000/agent/pending/order`;
  console.log('Registering test agent with chat id', fakeChatId, '…');
  const agent = await registerKhunAgent({ intent, endpointUrl, ownerChatId: fakeChatId });
  console.log('REGISTERED:');
  console.log('  agentId:', agent.agentId);
  console.log('  wallet :', agent.walletAddress);
  console.log('  tx sig :', agent.registryTxSignature);
}

async function main() {
  const cmd = process.argv[2] ?? 'status';
  if (cmd === 'status') return showStatus();
  if (cmd === 'register-test') return registerTest();
  console.error(`unknown command: ${cmd}. valid: status | register-test`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
