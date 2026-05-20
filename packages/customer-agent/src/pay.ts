/**
 * Backup buyer script — the demo uses `pay claude <url>` (Pay.sh wraps Claude Code natively).
 * This script exists as a safety net if Pay MCP misbehaves on stage.
 *
 * Block 4 will implement: GET endpoint → parse 402 → sign USDT-SPL transfer → re-POST with proof.
 */
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: bun src/pay.ts <agent-endpoint-url>');
    process.exit(1);
  }
  const res = await fetch(url);
  if (res.status !== 402) {
    console.log('Resource returned', res.status, await res.text());
    return;
  }
  const payment = await res.json();
  console.log('Payment requirements:', JSON.stringify(payment, null, 2));
  console.log('TODO Block 4: sign SPL transfer + retry with X-PAYMENT proof header');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
