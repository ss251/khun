# Khun

**SEABW 2026 Vibe Coding Hackathon submission — ICONSIAM Bangkok, May 20–21 2026.**
Solo build by [@ss251](https://github.com/ss251), pair-programmed with Claude Opus 4.7.

A public Telegram bot. Any Thai service provider — tuk-tuk driver, market vendor, tour guide, freelancer — texts the bot in Thai. In ~10 seconds they become a Solana mainnet AI agent registered on `agent-registry-8004` with an x402-payable HTTP endpoint listed on Pay.sh. Foreign AI assistants (Claude Code, Codex, Gemini) discover the agent, pay in real Tether USDT on Solana mainnet over x402, and receive a booking. The merchant gets a Telegram push notification and a one-tap Bitkub off-ramp.

> One Thai message → one foreign AI assistant → real USDT settles in 400ms → THB lands in a Thai bank. No app installs. No middlemen.

**Note on the messaging layer:** the original plan was LINE (40M Thai users, SCBX-aligned distribution). LINE Official Account creation now requires Thai-issued SMS verification, which a foreign solo builder can't satisfy from inside a 19h hackathon window. The bot package is intentionally generic — Telegram is the live demo channel; the LINE adapter is ~30 lines of code (`telegram.ts` ↔ `line.ts` is the only file that differs) and the entire downstream stack is identical. Distribution target remains the Thai LINE user base; SCBX gets the same on-chain data layer regardless of input channel.

## Sponsor stack (every integration is real, not a deck slide)

| Sponsor | Real integration |
|---|---|
| **Solana Foundation** | `agent-registry-8004` mainnet program (Quantu Labs, ERC-8004 on Solana) + Pay.sh marketplace publish |
| **AWS** | Lambda (every endpoint) + Kiro (AI-co-authored commits) + Bedrock Claude 4.7 once model access approves; Anthropic API as the active fallback path |
| **SCBX / SCB 10X** | Typhoon API (`api.opentyphoon.ai/v1`) for native Thai LLM intent parsing |
| **Tether** | USDT-SPL mainnet mint `Es9vMFr…` — every x402 settlement is real Tether |
| **Bitkub** | Public ticker API + real on-chain SPL transfer to merchant's Solana-USDT deposit address |
| **Hashed / ShardLab** | Direct alignment with the 2026 Protocol Economy thesis (stablecoins as rails + autonomous AI agents + on-chain credit) |

## Architecture

```
[Thai person]
   ↓ Telegram message in Thai
[Telegram Bot API]
   ↓ webhook
[AWS Lambda  (packages/bot)]
   ↓ parse Thai → English structured intent
[Typhoon (SCB 10X) + Claude 4.7 (Anthropic API; Bedrock once approved)]
   ↓ wallet + register
[Turnkey embedded wallet + 8004-solana SDK on Solana mainnet]
   ↓ x402-payable endpoint
[AWS Lambda  (packages/agent-creator x402 factory)]
   ↓ publish provider spec
[Pay.sh pay-skills catalog]
                       │
        ┌──────────────┴──────────────┐
        │                             │
    discovery                     direct URL
        │                             │
[foreign AI assistant via `pay claude` or `pay curl`]
        │
   x402 challenge ← → SPL transfer of Tether USDT on Solana
        ↓
   webhook back to Lambda → Telegram push → merchant
        ↓
   "withdraw" button → SPL transfer to Bitkub Solana-USDT deposit
        ↓
   merchant sells in Bitkub → THB to Thai bank
```

## Repo layout

```
.
├── packages/
│   ├── shared/          types + env loader
│   ├── bot/             Lambda Telegram webhook + Typhoon + Claude
│   ├── agent-creator/   wallet + 8004 register + x402 + Bitkub
│   ├── customer-agent/  backup buyer (main path is `pay claude`)
│   └── dashboard/       Next.js live tx feed (optional polish)
├── PLAN.md              the no-faking integration plan
├── BUILD_PREP.md        AWS credit + Bedrock onboarding steps
└── .env.example         the env var spec
```

## Block 1 quickstart

```bash
bun install                # installs all workspace deps
bun packages/agent-creator/src/cli.ts   # sanity-check Bitkub ticker + treasury keypair
```

Required env vars (see `.env.example`):

```
# Claude — set EITHER of these (claude.ts auto-selects):
ANTHROPIC_API_KEY          # from console.anthropic.com (preferred — works immediately)
AWS_BEARER_TOKEN_BEDROCK   # from AWS Bedrock console (fallback once model access approved)

TYPHOON_API_KEY            # from playground.opentyphoon.ai
TELEGRAM_BOT_TOKEN         # from @BotFather on Telegram (no SMS required)
TELEGRAM_SECRET_TOKEN      # any random 32+ char string you choose
SOLANA_RPC_URL             # mainnet RPC (Helius / QuickNode / Triton)
TURNKEY_API_PUBLIC_KEY     # from turnkey.com
TURNKEY_API_PRIVATE_KEY    # from turnkey.com
TURNKEY_ORGANIZATION_ID    # from turnkey.com
PINATA_JWT                 # from pinata.cloud (IPFS for agent metadata)
```

## Demo

```bash
# Buyer side (judge's second laptop)
pay claude    # then ask Claude to pay our agent's URL — no extra wallet setup
```

```bash
# Merchant side
# 1. Open Telegram, search the bot by username, /start it.
# 2. Send any Thai message describing what you sell or do.
# 3. Get a Solana agent ID + x402 endpoint URL back in ~10s.
```

## Credits

- **Builder**: Sailesh (solo).
- **AI pair**: Claude Opus 4.7 via Claude Code. Every commit on this repo carries `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` per SEABW's AI-tool-attribution rule.
