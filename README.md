<div align="center">

# 13F Intelligence Platform

**Track US institutional holdings from SEC Form 13F-HR with AI-powered analysis**

[![CI](https://github.com/0xrushmoon/13f-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/0xrushmoon/13f-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-F38020)](https://workers.cloudflare.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-holdingskit--api.rushmoon.workers.dev-22c55e)](https://holdingskit-api.rushmoon.workers.dev)

[English](README.md) · [简体中文](README.zh-CN.md) · [Contributing](CONTRIBUTING.md) · [API Docs](/docs)

</div>

---

## Preview

| Environment | URL | How to run |
|-------------|-----|------------|
| **Local (fastest)** | http://localhost:3000 | `pnpm install && pnpm dev` |
| **Cloudflare local** | http://localhost:8787 | `pnpm preview` (Workers runtime + D1 local) |
| **Production** | https://holdingskit-api.rushmoon.workers.dev | `pnpm run deploy` |

> **Live at** https://holdingskit-api.rushmoon.workers.dev  
> Agent Card: `/.well-known/agent-card.json` · OpenAPI: `/openapi.json`

**Cloudflare Dashboard:** [13f-analyzer Worker](https://dash.cloudflare.com/51f97220012f6789ddb53f237d86b13c/workers/services/view/13f-analyzer/production)

---

### Cloudflare R2 — is it paid?

**Mostly free for this project.** R2 has a permanent free tier ([official pricing](https://developers.cloudflare.com/r2/pricing/)):

| Item | Free allowance / month |
|------|------------------------|
| Storage | 10 GB |
| Writes / lists (Class A) | 1 million ops |
| Reads (Class B) | 10 million ops |
| Egress (download) | **$0 always** |

You only pay if you exceed these limits. Cloudflare may ask for a **payment method when enabling R2** — you are not charged until usage goes beyond the free tier.

Our `13f-raw` bucket stores raw SEC XML; typical usage stays well within the free tier.

---

**13F Intelligence Platform** is an open-source SaaS that ingests [SEC Form 13F-HR](https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets) filings, stores structured holdings in **Cloudflare D1**, and provides:

- **Institution browser** — 100+ curated funds (Berkshire, Bridgewater, Renaissance, etc.)
- **Quarter-over-quarter diff** — precomputed `holding_changes`
- **AI analysis** — multi-turn DeepSeek chat with thinking mode
- **Agent REST API** — `/api/v1/` with API keys and Stripe metered billing

Built for researchers, quant builders, and teams who want **smart-money visibility** without expensive data vendors.

## Features

| Feature | Description |
|---------|-------------|
| SEC ingestion | Rate-limited EDGAR client, raw XML in R2, Queue-based backfill |
| Edge deployment | Next.js 15 on Cloudflare Workers via OpenNext |
| i18n | English + 简体中文 (header language switcher) |
| Auth | Better Auth (email / Google OAuth) |
| Billing | Stripe Checkout + Billing Meters |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind, shadcn/ui, Recharts |
| Runtime | Cloudflare Workers, D1, R2, KV, Queues, Cron |
| ORM | Drizzle |
| AI | DeepSeek API (`deepseek-v4-flash`) |
| Payments | Stripe |

## Quick Start

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/) 9+
- [Cloudflare account](https://dash.cloudflare.com/) with Workers, D1, R2 enabled

### 1. Clone & install

```bash
git clone https://github.com/0xrushmoon/13f-analyzer.git
cd 13f-analyzer
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env — see comments for each variable
```

### 3. Cloudflare resources

```bash
pnpm exec wrangler login
pnpm run setup:cf
```

Or follow the manual steps in [README.zh-CN.md](./README.zh-CN.md#部署).

### 4. Local development

```bash
pnpm db:migrate
pnpm dev
```

### 5. Backfill historical data

```bash
curl -X POST http://localhost:3000/api/admin/backfill \
  -H "X-Admin-Secret: $ADMIN_SECRET"
```

## Deploy

```bash
pnpm run deploy              # Next.js worker
pnpm run deploy:ingestion      # Ingestion worker + cron
```

Set production secrets:

```bash
pnpm exec wrangler secret put DEEPSEEK_API_KEY
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put STRIPE_SECRET_KEY
# ... see .env.example
```

GitHub Actions deploy: configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets, then run the **Deploy** workflow.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/institutions` | List institutions |
| `GET /api/v1/institutions/:cik/holdings?period=2025-Q3` | Holdings |
| `GET /api/v1/institutions/:cik/changes?period=2025-Q3` | Quarter changes |
| `POST /api/v1/analyze` | AI analysis |

Auth: `Authorization: Bearer sk-13f-xxx`

## Project Structure

```
src/
├── app/              # Pages & API routes
├── workers/          # Ingestion worker (Queue + Cron)
├── lib/
│   ├── sec/          # EDGAR client
│   ├── parser/       # 13F XML parser
│   ├── db/           # Drizzle schema
│   ├── ai/           # DeepSeek integration
│   ├── i18n/         # en + zh-CN dictionaries
│   └── billing/      # Stripe & API keys
└── data/             # Curated institution seeds
```

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md).

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security policy](./SECURITY.md)
- [Changelog](./CHANGELOG.md)

## Disclaimer

Data is sourced from SEC EDGAR and may lag quarter-end by up to **45 days**. This software is for **research only** — not investment advice.

## Discoverability

HoldingsKit is optimized for search engines and AI agent discovery:

| Resource | URL |
|----------|-----|
| Sitemap | `/sitemap.xml` |
| Robots | `/robots.txt` |
| LLMs.txt | `/llms.txt` |
| Agent Card (A2A) | `/.well-known/agent-card.json` |
| OpenAPI 3.1 | `/openapi.json` |
| AI Plugin manifest | `/.well-known/ai-plugin.json` |
| MCP info | `/.well-known/mcp.json` |

See [DISTRIBUTION.md](./DISTRIBUTION.md) for submission checklists (Google Search Console, Bing, agent directories, Product Hunt, Show HN).

**GitHub topics:** `13f`, `sec-edgar`, `institutional-holdings`, `agent-api`, `mpp`, `openapi`, `cloudflare-workers`, `fintech`, `ai-agents`

## License

[MIT](./LICENSE) © 13F Intelligence Platform Contributors
