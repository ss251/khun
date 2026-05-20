# Khun — No-Faking Integration Plan

**Rule for this doc:** every sponsor named in the pitch maps to a real, verifiable API call we make from the demo. No "story slides." No deck-only sponsors. If we mention them, we call them.

**Status:** GO. Grok PM review (2 rounds) signed off on the cuts below. Block 1 ready to start.

---

## Cuts locked after Grok PM review

| # | Cut | Reason |
|---|---|---|
| A | **Drop reputation/feedback CPI in v1.** Register only. | Each feedback write is ~$0.80 + extra build time + adds confirmation variance to the demo timing window. Show reputation as v2. |
| B | **Drop Pay.sh discovery as a load-bearing demo dependency.** Submit the `pay-skills` PR during the build; demo uses `pay curl <our direct URL>` from Claude Code. Pay.sh listing becomes a "shipped to catalog, PR live" slide. | Verified at pay.sh/docs/pay-for-apis/call-paid-apis: `pay curl <URL>` handles 402 on any endpoint, no catalog required. Removes PR-merge-timing risk entirely while preserving the Pay.sh integration optic (we still publish; we just don't depend on it being live for the demo). |
| C | **Use SDK (`8004-solana` npm), not raw CPI.** | SDK has `cluster: 'mainnet-beta'` "fully configured by default" per github.com/QuantuLabs/8004-solana-ts — no program ID hunt, much less write code. |
| D | **Keep Bedrock + Typhoon dual-LLM, with Typhoon-only fallback if Block 2 slips.** | Sponsor optics (AWS + SCB 10X both real). Fallback is single-call rewrite, low risk. |
| E | **Bitkub: SPL transfer to deposit address only.** Tighten deck to drop any "auto-THB" language; show ticker + on-chain receipt + "withdraw via Bitkub app" link. | Auto-THB conversion would need merchant Bitkub API keys + signed orders — out of scope. |

## The new dragons Grok flagged (mitigations)

1. **Mainnet register tx confirmation variance** — could push past the 8s reply target. **Mitigation:** kick off register tx in parallel with LINE reply generation; show "registering…" in initial Thai reply, follow up with confirmation as soon as tx confirms.
2. **USDT-SPL settle reliability from Claude Code wallet on mainnet** — facilitator timing under demo conditions. **Mitigation:** Block 7 dry runs × 2 with real $0.10 settlements; measure p95.
3. **Dual-LLM latency** eats the 8s budget. **Mitigation:** Typhoon-only fallback flag pre-wired; one-line switch if B2 dry run shows >8s.
4. **Lambda cold starts** on the x402 endpoint. **Mitigation:** provisioned concurrency = 1 on the customer-facing endpoint; warm it 60s before demo.
5. **Pay.sh PR validation format** — must be clean to submit cleanly in B5. **Mitigation:** `pay skills validate` locally before opening PR.

---

## Real integration matrix

| Sponsor | Real integration (verified May 2026) | Where in demo |
|---|---|---|
| **Solana Foundation** | `agent-registry-8004` program (Quantu Labs, ERC-8004 on Solana, Metaplex Core asset-based IDs) — **mainnet, live, 1,441 agents registered + 7,740 feedback events as of 2026-05-20**. Mainnet indexer: `https://8004-indexer-main.qnt.sh/v2/graphql`. We call `register()` + `set_agent_uri()` per merchant (Khun becomes agent #1442+). + **Pay.sh** (Solana Foundation × Google Cloud, launched May 5 2026) — we publish a `pay-skills` provider entry so Claude Code can discover our endpoints. | Live Solscan tab + live indexer GraphQL panel projected: register tx + each x402 settlement |
| **AWS** | **Bedrock Claude 4.7** for English/cross-lingual reasoning + agent persona. **Lambda** for LINE webhook, agent provisioning, x402 endpoint, and Bitkub off-ramp trigger. **Kiro** for AI-co-authored commits (sponsor requirement). Credits redeemed via the steps in `BUILD_PREP.md`. | Onboarding message → Bedrock invoke → response in <2s |
| **SCBX / SCB 10X** | **Typhoon API** (`https://api.opentyphoon.ai/v1/chat/completions`, OpenAI-compatible, free key) — Thai-native LLM built by SCB 10X. We use `typhoon-v2.1-12b-instruct` for the Thai LINE message parsing (intent extraction in Thai), and `typhoon-ocr` if we accept a photo of a handwritten menu. | Every Thai-language onboarding goes through Typhoon |
| **Tether** | **USDT-on-Solana SPL mainnet** — Tether-issued mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`. x402 spec: "Any SPL or Token-2022 token" on Solana. We set Tether USDT as the **primary** settlement token in our x402 PaymentRequirements. USDC not used. | Every customer payment is a real Tether SPL transfer on mainnet, visible on Solscan |
| **Bitkub** | (1) **Public market API** (`GET /api/v3/market/ticker?sym=THB_USDT`) — show live THB rate inside the merchant's LINE onboarding confirmation. (2) **Real off-ramp** — merchant pastes their personal Bitkub USDT-Solana deposit address once during LINE onboarding (Bitkub supports USDT-on-Solana deposits, reactivated Oct 2025). When merchant taps "Withdraw THB", backend issues a real Solana SPL transfer from agent wallet → Bitkub deposit address. Solscan tx proves it. Final THB withdrawal completes inside Bitkub (Fiat v4 API documented but acceptable to leave to merchant). | Demo: judge taps "Withdraw" → real SPL transfer fires, Solscan tab updates |
| **Hashed / ShardLab** | Thesis-aligned ("Protocol Economy" — stablecoins as rails + AI agents + on-chain credit). Not a tech integration target — they're the VC + organizer. **Verifiable proof of alignment**: our entire stack is x402 + Solana + USDT + agent identity, which IS their thesis. | Pitch frame, not API call |
| **TokenX / InnovestX** | Roadmap-only — tokenizing merchant reputation as RWA. Will not be a real integration in v0; if mentioned in pitch, must be framed as "next step" not "currently integrated." | Roadmap slide, called out as future |

**Sponsors removed from the deck:** SOOHO.IO, Xapo Bank, Bitazza, AriqoX, Tiger Research, StayGold. No real integration available in 19h — leave them off rather than fake.

---

## The product (sharpened, post-research)

**Khun** — a public LINE bot. Any Thai person texts what they sell or do, in Thai. In ~10 seconds they get back a Solana agent (devnet) with:

1. A wallet (embedded via Turnkey/Privy)
2. An on-chain identity on Solana via `agent-registry-8004` (Metaplex Core asset)
3. An x402-payable HTTP endpoint hosted on AWS Lambda
4. A live listing on Pay.sh's `pay-skills` catalog → discoverable by Claude Code / Codex / Gemini

Foreign agents — **specifically Claude Code, since it's an official Pay.sh client** — discover the agent via `pay skills search` or Pay MCP, hit the endpoint, x402-pay in USDT on Solana, get a real answer. The Thai vendor gets a LINE ping + a "Withdraw THB" button that fires a real SPL transfer to their Bitkub Solana-USDT deposit address.

---

## The demo (every step real, no faking)

| # | Action | Real artifact judges see |
|---|---|---|
| 1 | Judge texts LINE bot in Thai: e.g. *"ผมเป็นไกด์เที่ยวกรุงเทพ พูดอังกฤษได้ 600 บาทต่อชั่วโมง"* | LINE chat on judge's phone (projected via Reflector) |
| 2 | Lambda webhook fires → **Typhoon** parses Thai intent → **Bedrock Claude 4.7** generates English service description + agent persona | CloudWatch tab can be open showing both API calls |
| 3 | Turnkey creates Solana wallet → `agent-registry-8004` register tx fires on devnet | **Solscan tab #1**: tx hash projected, agent NFT visible |
| 4 | Lambda registers x402 endpoint at `khun.app/agent/{id}/*`, publishes Pay.sh provider entry | Pay.sh catalog URL projected; `pay skills search "Bangkok tour guide"` finds new agent |
| 5 | Bot replies in Thai with agent ID, Solana address, Pay.sh listing URL, x402 endpoint | Reply visible on phone |
| 6 | On second laptop: **Claude Code on stage** runs `pay skills search "Bangkok English tour guide"`, finds the agent, hits its endpoint to book a tour | Terminal projected |
| 7 | Endpoint returns HTTP 402 with payment requirement (USDT-SPL on Solana). Claude Code's Pay MCP signs payment, broadcasts SPL transfer | **Solscan tab #2**: USDT transfer settles in ~400ms |
| 8 | Endpoint accepts payment, fires LINE notification to judge | Judge's LINE pings: *"จองสำเร็จ ✅ ลูกค้าจ่ายแล้ว 1.85 USDT"* |
| 9 | Judge taps "เบิกเป็นบาท" (Withdraw to THB) in LINE | LINE bot shows live Bitkub THB_USDT rate (real Bitkub API call), confirms |
| 10 | Backend fires SPL transfer from agent wallet → judge's Bitkub Solana-USDT deposit address (pasted during onboarding) | **Solscan tab #3**: off-ramp tx hash visible, USDT lands at Bitkub address |

Every tab on the screen is a **real public explorer or product UI**. There's no custom CLI script written by us doing the buyer side — Claude Code is the buyer and judges can verify by running the same command themselves.

---

## Build order (compressed, 19h-realistic)

| Block | Time (GMT+7) | Concrete deliverable | Real dependency |
|---|---|---|---|
| 1 | 16:30 → 18:00 (1.5h) | Repo + commit signing + AWS credits redeemed + Bedrock Claude 4.7 access requested + LINE Channel + treasury **mainnet** wallet funded ($10 USDT + SOL) + Typhoon API key + Bitkub public ticker verified + `pay` CLI installed on demo laptop | All sponsor-side accounts |
| 2 | 18:00 → 21:00 (3h) | LINE webhook on Lambda → Typhoon Thai parsing → Bedrock English shaping → reply in Thai with agent ID + direct x402 URL. **<8s p95 target.** If misses, Typhoon-only fallback. | Typhoon API + Bedrock |
| 3 | 21:00 → 00:00 (3h) | `8004-solana` SDK `registerAgent({ cluster: 'mainnet-beta' })` + Turnkey-embedded wallet provisioning + `x402-next` endpoint factory deployed to Lambda with provisioned concurrency = 1 | `8004-solana` SDK + x402-next |
| 4 | 00:00 → 02:00 (2h) | x402 endpoint serves 402 + verifies + settles **real USDT-SPL** payment + fires LINE notification. **No reputation CPI** (cut A). | Tether USDT mainnet mint + Coinbase facilitator |
| 5 | 02:00 → 03:00 (1h) | `pay skills validate` locally → submit `pay-skills` PR upstream → screenshot the live PR for deck. Demo path uses **`pay curl <direct URL>`** from Claude Code, not catalog discovery (cut B). | Pay.sh `pay` CLI |
| 6 | 03:00 → 04:00 (1h) | Bitkub real off-ramp leg: capture merchant's Bitkub Solana-USDT deposit address during onboarding + Bitkub public ticker integration in LINE confirmation + "withdraw" button fires real SPL transfer from agent wallet → Bitkub deposit address (cut E: no auto-THB) | Bitkub public API |
| 7 | 04:00 → 08:00 (4h) | **MANDATORY SLEEP** | — |
| 8 | 08:00 → 11:00 (3h) | 2× full E2E mainnet dry runs (tiny $0.10 payments, measure p95 + Lambda cold start), warm endpoint, polish, pitch deck with real tx hashes + Solscan screenshots + PR link, submission | — |
| Pitch | 11:00 → 12:00 | Final dry-run + on-deck | — |

Net: ~12h build + 4h sleep + 3h dry-runs/polish. **~2.5h slack** for the dragons.

---

## What's NOT in v0 (call this out before judges ask)

- Multi-turn agent negotiation (single-shot x402 only)
- (Removed: original draft said "devnet only" — we are running fully on **Solana mainnet**. Treasury budget: **$10** in real USDT + SOL. Constraints to stay in budget: see "Budget" section below.)

---

## Budget — $10 mainnet (locked 2026-05-20)

| Bucket | Spend | What it buys |
|---|---|---|
| SOL for gas + agent registrations | ~$4 | 3 dry-run agent registrations + 1 live-demo registration (~$1 each via `agent-registry-8004` at 0.0058 SOL) + reputation writes + headroom |
| USDT working capital | ~$5 | floats between Claude Code's Pay.sh buyer wallet and merchant agent wallet — cycles back each settlement |
| Buffer | ~$1 | for one unexpected re-register or Pay.sh facilitator microfee |

**Net real burn: ~$5–6.** Remaining $4–5 is recoverable USDT sitting in wallets at the end.

**Constraints to hit the budget:**
1. **Limit to 4 fresh agent registrations total** across the build (≤3 dry runs reuse the same merchant agent; 1 fresh agent created live for the judge).
2. **Demo payment amounts at $0.10–$0.50 per x402 settlement**, not $1.85. Same Solscan tx, lower working capital.
3. **Recycle USDT** — sweep merchant wallet back to buyer treasury between dry runs.
4. If Pay.sh facilitator microfees turn out to be material (>$0.10 each), flag in Block 4 and top up by a few dollars — but spec-level there's no reason it should exceed standard SPL transfer cost.
- Auto-arbitrage between USDT and USDC (USDT primary, no fallback)
- Mobile app (LINE is the app)
- TokenX RWA tokenization (roadmap)
- Foreigner-side fiat onramp (Pay.sh handles this via wallet of choice, not us)

---

## Open questions to lock NOW

1. **Pay.sh listing latency**: does a fresh `pay-skills` PR surface for Claude Code within minutes, or only after Foundation merges? If the latter, we either need to land the PR before demo OR install the skills entry locally on the demo laptop's Pay.sh CLI. → **Resolve by Block 5.**
2. **Bedrock region**: Bedrock Claude 4.7 may not be in `ap-southeast-1` (Singapore). If not, deploy Lambda in `us-east-1` and accept ~200ms latency, or use AWS Bangkok edge if available. → **Resolve in Block 1.**
3. **LINE Messaging API webhook verification**: production webhook needs HTTPS + signature verify. Lambda + API Gateway handles this; signature is HMAC-SHA256 over body with channel secret. → **Resolve in Block 2.**
4. ~~**Devnet USDT mint**~~ **RESOLVED 2026-05-20:** Going **full mainnet**. Live mainnet `agent-registry-8004` indexer confirmed (1,441 agents at the time of writing); Tether USDT-SPL mainnet mint is the real settlement token; Pay.sh production mode handles mainnet. Treasury budget: ~$30 in USDT + SOL covers the demo loop with margin. **No devnet anywhere in the demo path.**

---

## Tech list (concrete versions to pin)

```
@solana-agent-kit/core            v2.x
@solana/web3.js                   v1.95+
@metaplex-foundation/mpl-core     latest (for agent-registry-8004 asset IDs)
x402-next                         latest (Coinbase Developer Platform official)
@coinbase/x402                    typescript core
pay (CLI)                         latest (Pay.sh)
@line/bot-sdk                     latest
@aws-sdk/client-bedrock-runtime   latest (Claude 4.7 via Bedrock)
openai                            (used against Typhoon's OpenAI-compatible endpoint)
turnkey                           (embedded wallet)
```

Env vars (no secrets in repo, all in `.env` ignored by gitignore):

```
AWS_REGION
BEDROCK_REGION
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
TYPHOON_API_KEY
SOLANA_RPC_URL                # Helius/QuickNode mainnet
TREASURY_KEYPAIR_PATH
TURNKEY_API_PUBLIC_KEY
TURNKEY_API_PRIVATE_KEY
USDT_SOLANA_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
AGENT_REGISTRY_PROGRAM_ID     # mainnet program id, fetch from QuantuLabs/8004-solana
AGENT_REGISTRY_INDEXER=https://8004-indexer-main.qnt.sh/v2/graphql
BITKUB_API_KEY                # for ticker calls (public endpoints don't strictly need auth)
PAY_SH_SKILLS_DIR             # local pay-skills repo for our provider spec
```
