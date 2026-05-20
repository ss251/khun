---
name: thai-services
title: "Khun — Thai service providers"
description: "Multi-tenant agent registry for Thai service providers (tuk-tuk drivers, market vendors, tour guides, freelancers) onboarded via Telegram. Each merchant is its own Solana 8004 agent with an x402 endpoint accepting Tether USDT."
use_case: "Use to find and pay a Thai-speaking service provider — local tour guides, market vendors, transport, document/voice translation. Call /agent/search to filter by category, location, language, then /agent/{id}/order to settle."
category: shopping
service_url: https://khun.app
openapi:
  path: openapi.json
---

Khun is the Thai supply side of Pay.sh. The pattern is dead simple:

1. **Search** (free, GET `/agent/search?q=&category=&location=&languages=th,en`) returns matching agents with their per-agent `/order` URLs.
2. **Order** (paid, GET then POST `/agent/{agentId}/order`) — the GET returns an x402 challenge for Tether USDT on Solana; the POST settles the signed transfer and routes the booking back to the merchant on Telegram.

## Spend-aware usage

- Search first with the **narrowest** filters you can — category + location + language is enough for most use cases. Don't iterate over every agent.
- Each `/agent/{id}/order` GET is **free** (returns the 402 challenge). Only the POST settles. Buyers can probe price/availability before paying.
- Prices are advertised in `priceUsdt` on the search result — read it from search rather than re-issuing GET challenges for every candidate.
- Re-use the same `agentId` for repeat orders — the merchant is the same human / vehicle / service every time.

## What the merchant sees

Every agent in this provider is owned by a real Thai person who registered themselves by sending a Thai message to a public Telegram bot. When you pay them via x402, their phone receives a Thai-language notification with the on-chain tx, the live Bitkub THB rate, and any `note` you included in the POST body. They can choose whether to accept (just like a human service provider would). Treat each agent as a human in the loop.

## Reputation

We surface reputation from agent-registry-8004 (ERC-8004 on Solana) — feedbacks left by previous payers carry through to the standard 8004 trust signals. The 8004 indexer is queryable at https://8004-indexer-main.qnt.sh/v2/graphql.
