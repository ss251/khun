import { listAgents } from './store.js';

/**
 * Tiny server-rendered browse page for Khun agents. Lives at GET /browse on
 * the bot Lambda. Reads from the local agent store, no JS, no build step.
 * Good enough as a pitch-deck visual + lets non-AI buyers see the catalog.
 */
export function buildBrowsePage(opts: { publicBaseUrl: string; cluster: string }): string {
  const agents = listAgents();
  const cluster = opts.cluster;
  const explorerSuffix = cluster === 'mainnet-beta' ? '' : '?cluster=devnet';

  const cards = agents
    .map((a) => {
      const langs = (a.intent.languages ?? []).map((l) => `<span class="tag">${esc(l)}</span>`).join(' ');
      const loc = a.intent.location ? `📍 ${esc(a.intent.location)}` : '';
      const category = `<span class="cat cat-${esc(a.intent.category)}">${esc(a.intent.category)}</span>`;
      return `
        <article class="card">
          <header>
            ${category}
            <h2>${esc(a.intent.serviceDescriptionEnglish || 'Thai service')}</h2>
            <p class="th">${esc(a.intent.serviceDescriptionThai)}</p>
          </header>
          <div class="meta">
            <span class="price">${a.intent.priceUsdt} USDT</span>
            ${a.intent.priceThbReference ? `<span class="thb">≈ ฿${a.intent.priceThbReference}</span>` : ''}
            ${loc ? `<span>${loc}</span>` : ''}
          </div>
          <div class="tags">${langs}</div>
          <footer>
            <code class="agent-id" title="${esc(a.agentId)}">${esc(a.agentId.slice(0, 12))}…</code>
            <a href="https://explorer.solana.com/address/${esc(a.walletAddress)}${explorerSuffix}" target="_blank">wallet ↗</a>
            <a href="${esc(a.endpointUrl)}" target="_blank">GET /order ↗</a>
          </footer>
        </article>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Khun — Thai service-provider agents</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Sarabun:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0d1117;
      --panel: #161b22;
      --border: #30363d;
      --fg: #c9d1d9;
      --muted: #8b949e;
      --accent: #58a6ff;
      --price: #56d364;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.5;
    }
    .th { font-family: 'Sarabun', sans-serif; }
    header.top {
      padding: 32px 32px 16px;
      border-bottom: 1px solid var(--border);
    }
    header.top h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.02em; }
    header.top p { margin: 0; color: var(--muted); font-size: 14px; }
    main {
      padding: 32px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card h2 { margin: 6px 0 4px; font-size: 16px; font-weight: 600; }
    .card .th { color: var(--muted); font-size: 14px; margin: 0; }
    .meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 14px; }
    .price { color: var(--price); font-weight: 600; }
    .thb { color: var(--muted); }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag {
      background: #21262d;
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cat {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: #1f6feb33;
      color: #58a6ff;
    }
    .cat-food      { background: #d2922633; color: #d29226; }
    .cat-transport { background: #1f6feb33; color: #58a6ff; }
    .cat-guide     { background: #56d36433; color: #56d364; }
    .cat-service   { background: #db61a233; color: #db61a2; }
    footer {
      display: flex;
      gap: 12px;
      font-size: 12px;
      align-items: center;
      border-top: 1px solid var(--border);
      padding-top: 10px;
      flex-wrap: wrap;
    }
    code.agent-id { background: #21262d; padding: 2px 6px; border-radius: 4px; color: var(--muted); }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .empty {
      text-align: center;
      padding: 64px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <header class="top">
    <h1>Khun · ${agents.length} agent${agents.length === 1 ? '' : 's'} on Solana ${cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'}</h1>
    <p>Thai service providers, payable in USDT via x402. Onboard yourself: open Telegram → <a href="https://t.me/khunseabwbot">@khunseabwbot</a> → send a Thai message.</p>
  </header>
  ${agents.length === 0 ? `<main><div class="empty">No agents registered yet. Be the first — DM @khunseabwbot.</div></main>` : `<main>${cards}</main>`}
</body>
</html>
`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
