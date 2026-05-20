/**
 * Seed a small set of diverse Khun agents for the browse-dashboard demo.
 * Run only on devnet (refuses on mainnet).
 *
 *   bun scripts/seed-demo-agents.ts
 *
 * Each call appends new agents; the script is idempotent in spirit but every
 * run registers fresh ones (we use unique fake chat ids per agent so the
 * HKDF-derived wallets differ).
 */
import { env } from '../packages/shared/src/env.js';
import {
  recordAgent,
  registerKhunAgent,
} from '../packages/agent-creator/src/index.js';
import type { MerchantIntent } from '../packages/shared/src/types.js';

interface Seed {
  chatId: string;
  intent: MerchantIntent;
}

const SEEDS: Seed[] = [
  {
    chatId: 'demo-tuktuk-9001',
    intent: {
      serviceDescriptionThai: 'รับส่งสนามบินสุวรรณภูมิ ตุ๊กตุ๊ก 600 บาท',
      serviceDescriptionEnglish: 'Suvarnabhumi airport pickup by tuk-tuk',
      priceUsdt: 18,
      priceThbReference: 600,
      category: 'transport',
      hours: '04:00-23:00',
      location: 'Suvarnabhumi → Sukhumvit',
      languages: ['th'],
    },
  },
  {
    chatId: 'demo-somtam-9002',
    intent: {
      serviceDescriptionThai: 'ส้มตำไทย ส้มตำปู ส้มตำปลาร้า ราคา 60 บาท',
      serviceDescriptionEnglish: 'Som tam (papaya salad) — Thai / crab / pla ra',
      priceUsdt: 2,
      priceThbReference: 60,
      category: 'food',
      hours: '11:00-22:00',
      location: 'Khlong Toei market',
      languages: ['th'],
    },
  },
];

async function main() {
  if (env.agentRegistryCluster() === 'mainnet-beta') {
    throw new Error('Refusing to seed on mainnet. KHUN_ENV=devnet.');
  }
  for (const seed of SEEDS) {
    console.log('Seeding', seed.intent.category, '/', seed.intent.serviceDescriptionEnglish);
    const agent = await registerKhunAgent({
      intent: seed.intent,
      endpointUrl: 'http://localhost:3000/agent/pending/order',
      ownerChatId: seed.chatId,
    });
    agent.endpointUrl = `http://localhost:3000/agent/${agent.agentId}/order`;
    recordAgent(agent);
    console.log('  →', agent.agentId, 'tx', agent.registryTxSignature);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
