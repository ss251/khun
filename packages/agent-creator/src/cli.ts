/**
 * One-off registration test. Run from repo root:
 *   bun packages/agent-creator/src/cli.ts
 */
import { getUsdtThbRate } from './bitkub.js';
import { loadTreasury } from './wallet.js';

async function main() {
  const kp = loadTreasury();
  console.log('Treasury pubkey:', kp.publicKey.toBase58());

  const rate = await getUsdtThbRate();
  console.log(`Live Bitkub rate: 1 USDT = ${rate} THB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
