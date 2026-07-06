# HoldingsKit Distribution Guide

Actionable checklist for search engines, AI agent directories, and developer platforms.

**Production URL:** https://holdingskit-api.rushmoon.workers.dev

## Discovery Endpoints (live after deploy)

| Resource | URL |
|----------|-----|
| Sitemap | https://holdingskit-api.rushmoon.workers.dev/sitemap.xml |
| Robots | https://holdingskit-api.rushmoon.workers.dev/robots.txt |
| LLMs.txt | https://holdingskit-api.rushmoon.workers.dev/llms.txt |
| Agent Card (A2A) | https://holdingskit-api.rushmoon.workers.dev/.well-known/agent-card.json |
| OpenAPI 3.1 | https://holdingskit-api.rushmoon.workers.dev/openapi.json |
| AI Plugin manifest | https://holdingskit-api.rushmoon.workers.dev/.well-known/ai-plugin.json |
| MCP info | https://holdingskit-api.rushmoon.workers.dev/.well-known/mcp.json |
| Security.txt | https://holdingskit-api.rushmoon.workers.dev/.well-known/security.txt |
| Web App Manifest | https://holdingskit-api.rushmoon.workers.dev/manifest.webmanifest |

---

## 1. Search Engines

### Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://holdingskit-api.rushmoon.workers.dev`
3. Choose **HTML tag** verification → copy the `content` value
4. Set Wrangler secret or env: `GOOGLE_SITE_VERIFICATION=<content-value>`
5. Redeploy, then click Verify
6. Submit sitemap: `https://holdingskit-api.rushmoon.workers.dev/sitemap.xml`

### Bing Webmaster Tools

1. Go to [Bing Webmaster](https://www.bing.com/webmasters)
2. Add site, choose meta tag verification
3. Set `BING_SITE_VERIFICATION=<content-value>` and redeploy
4. Submit sitemap URL (same as above)

---

## 2. AI Agent Directories

### agents.json / Agent Registry

Submit to registries that accept A2A agent cards:

```json
{
  "name": "HoldingsKit",
  "description": "Agent-first SEC 13F-HR institutional holdings API with MPP billing",
  "url": "https://holdingskit-api.rushmoon.workers.dev",
  "agentCard": "https://holdingskit-api.rushmoon.workers.dev/.well-known/agent-card.json",
  "openapi": "https://holdingskit-api.rushmoon.workers.dev/openapi.json",
  "categories": ["finance", "data", "sec", "13f"],
  "pricing": "pay-per-use ($0.01/query, $0.00001/analyze)"
}
```

**Directories to submit:**

- [agent.ai](https://agent.ai/) — AI agent marketplace
- [There's An AI For That](https://theresanaiforthat.com/) — AI tool directory
- [FutureTools](https://www.futuretools.io/) — AI tools collection
- [Awesome Agents](https://github.com/e2b-dev/awesome-ai-agents) — PR template below
- MCP registries (note: REST-only, link OpenAPI): [PulseMCP](https://www.pulsemcp.com/), [mcp.so](https://mcp.so/)

### Awesome List PR Template

```markdown
### HoldingsKit

Agent-first SEC Form 13F-HR API for institutional holdings intelligence. Query 100+ curated funds (Berkshire, Bridgewater, Renaissance), compare quarter-over-quarter changes, and run DeepSeek AI analysis. Primary payment via MPP (Machine Payments Protocol); humans use Stripe Pro + API keys.

- [Website](https://holdingskit-api.rushmoon.workers.dev)
- [Agent Card](https://holdingskit-api.rushmoon.workers.dev/.well-known/agent-card.json)
- [OpenAPI](https://holdingskit-api.rushmoon.workers.dev/openapi.json)
- [GitHub](https://github.com/0xrushmoon/13f-analyzer)
```

---

## 3. Product Hunt Launch Copy

**Tagline:** Track smart money — Agent API for SEC 13F holdings

**Description:**

HoldingsKit is an open-source, agent-first API for US institutional holdings from SEC Form 13F-HR. Browse 100+ curated funds, compare quarter-over-quarter portfolio changes, and get AI-powered analysis via DeepSeek.

Built for researchers, quant developers, and autonomous agents. Agents pay per request via MPP (Machine Payments Protocol); humans get a free tier and Stripe Pro subscription.

**Topics:** Developer Tools, Fintech, Open Source, AI

---

## 4. Hacker News — Show HN Template

**Title:** Show HN: HoldingsKit – Agent-first SEC 13F API with MPP pay-per-use

**Body:**

I built HoldingsKit, an open-source platform that ingests SEC Form 13F-HR filings and exposes institutional holdings via a REST API designed for AI agents.

- 100+ curated institutions (Berkshire, Bridgewater, Renaissance, etc.)
- Quarter-over-quarter diff with precomputed changes
- DeepSeek multi-turn AI analysis
- Agent Card + OpenAPI 3.1 with MPP pricing annotations
- Deployed on Cloudflare Workers (D1, R2, Queues)

Agents pay ~$0.01/query via MPP (HTTP 402). Humans get free tier + Stripe Pro.

Live: https://holdingskit-api.rushmoon.workers.dev
GitHub: https://github.com/0xrushmoon/13f-analyzer
Agent Card: https://holdingskit-api.rushmoon.workers.dev/.well-known/agent-card.json

Would love feedback on the API design and agent discovery approach.

---

## 5. OpenAI GPT Store / Custom GPT

**Instructions snippet:**

```
You are a financial research assistant with access to HoldingsKit, an SEC 13F institutional holdings API.

Use the OpenAPI spec at https://holdingskit-api.rushmoon.workers.dev/openapi.json

Capabilities:
- List institutions: GET /api/v1/institutions
- Get holdings: GET /api/v1/institutions/{cik}/holdings?period=2025-Q3
- Quarter changes: GET /api/v1/institutions/{cik}/changes?period=2025-Q3
- AI analysis: POST /api/v1/analyze with {cik, question}

Auth: Bearer API key in Authorization header.
Pricing: $0.01/query, $0.00001/analyze via API key billing.
```

---

## 6. Anthropic / Claude Tool Use

**Tool description for Claude:**

```
Name: holdingskit
Description: Query US institutional investor holdings from SEC Form 13F-HR filings. List funds, get portfolio holdings by CIK, compare quarter-over-quarter changes, and run AI analysis on positioning trends.
Base URL: https://holdingskit-api.rushmoon.workers.dev/api/v1
Auth: Bearer token (API key)
OpenAPI: https://holdingskit-api.rushmoon.workers.dev/openapi.json
```

---

## 7. Developer Platforms

### GitHub Topics

Add to repository settings → Topics:

```
13f, sec-edgar, institutional-holdings, hedge-fund, smart-money, agent-api, mpp, openapi, cloudflare-workers, nextjs, fintech, deepseek, ai-agents
```

### npm (if publishing)

```json
{
  "description": "HoldingsKit — Agent-first SEC Form 13F-HR API client with MPP payments",
  "keywords": ["13f", "sec", "holdings", "agent-api", "mpp", "fintech"]
}
```

### Dev.to / Hashnode Article Outline

1. **Hook:** Why 13F data matters for tracking smart money
2. **Problem:** Expensive data vendors, no agent-native APIs
3. **Solution:** HoldingsKit architecture (Cloudflare edge, D1, MPP)
4. **Demo:** curl examples for institutions, holdings, analyze
5. **Agent integration:** Agent Card, OpenAPI, llms.txt
6. **Open source:** How to self-host and contribute
7. **CTA:** Live demo + GitHub link

---

## 8. Manual Checklist

- [ ] Google Search Console verified + sitemap submitted
- [ ] Bing Webmaster verified + sitemap submitted
- [ ] GitHub topics added
- [ ] Submit to agent.ai / TAAFT / FutureTools
- [ ] Awesome AI Agents PR
- [ ] Product Hunt launch scheduled
- [ ] Show HN post
- [ ] Custom GPT / Claude tool configured with OpenAPI
- [ ] Monitor `llms.txt` and Agent Card in AI crawler logs
