# HoldingsKit 爬虫架构（Cloudflare Workers）

## 可行性结论

在 Cloudflare 平台上做**轻量爬虫 / 数据抓取**完全可行，且与现有 `holdingskit-ingestion` 架构一致。

| 能力 | Workers 支持 | 说明 |
|------|-------------|------|
| `fetch()` + JSON/XML 解析 | ✅ | 已用于 SEC EDGAR；`fast-xml-parser` 已在项目中 |
| Cron 定时任务 | ✅ | ingestion 已有 cron；scraper 每日 07:00 UTC |
| Queue 批处理 | ✅ | 可扩展大批量 symbol 回填 |
| R2 存原始响应 | ✅ | 适合存档 HTML/JSON 快照 |
| KV + TTL 缓存 | ✅ | 股价、SEC ticker 列表已用 KV |
| Browser Rendering (Puppeteer) | ⚠️ 付费 | 仅 JS 重度站点需要；Stooq/Finviz 等需考虑 |

**Workers 不适合：** 无头浏览器（除非 Browser Rendering）、强反爬站点、长时间 CPU 密集解析。

## 推荐抓取目标（价值 / 成本排序）

| 优先级 | 数据源 | 价值 | 难度 | 合规 |
|--------|--------|------|------|------|
| 1 | **SEC EDGAR** | 13F 核心数据 | 已有 | ✅ 官方允许，需 User-Agent |
| 2 | **SEC company_tickers.json** | CIK↔Ticker，补全机构代码 | 低 | ✅ 官方公开 |
| 3 | **Yahoo Finance chart API** | 历史/现价，算 filing 后涨跌 | 中 | ⚠️ 非官方 API，灰色地带 |
| 4 | **CUSIP→Ticker 映射** | 大幅提升持仓可搜索性 | 高 | 视数据源而定 |
| 5 | Finviz institutional | 机构持仓交叉验证 | 中 | HTML 爬取，ToS 限制 |
| 6 | ETF holdings mirror | 被动基金持仓参考 | 中 | 各站点不同 |
| 7 | 新闻标题 RSS | AI 分析上下文 | 低 | 注意版权 |
| 8 | Wikipedia 公司信息 | 行业/简介 | 低 | CC 许可，结构不稳定 |

## 架构（文本图）

```
                    ┌─────────────────────────┐
                    │   Cron (每日 07:00 UTC)  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
   ┌──────────────────────┐          ┌──────────────────────┐
   │ holdingskit-ingestion │          │ holdingskit-scraper   │
   │ Queue → SEC 13F XML   │          │ src/lib/scrape/*      │
   └──────────┬───────────┘          └──────────┬───────────┘
              │                                  │
              ▼                                  ▼
        ┌──────────┐                      ┌──────────┐
        │ R2 原始XML│                      │ KV 缓存   │
        └────┬─────┘                      └────┬─────┘
             │                                 │
             └────────────┬────────────────────┘
                          ▼
                   ┌─────────────┐
                   │  D1 13f-db  │
                   │ institutions│
                   │ filings     │
                   │ holdings    │
                   └──────┬──────┘
                          ▼
                   ┌─────────────┐
                   │holdingskit-api│
                   │ (Next.js)    │
                   └─────────────┘
```

### 模块目录

```
src/lib/scrape/
  base.ts           # 限速 fetch、通用工具
  sec-tickers.ts    # SEC company_tickers.json
  price-prefetch.ts # Yahoo 股价预热 → KV
src/lib/market/     # 运行时按需读 KV（已有）
src/workers/scraper.ts
```

## 法律 / ToS 提示

- **SEC EDGAR**：须设置含联系方式的 User-Agent，遵守 [fair access](https://www.sec.gov/os/webmaster-faq#developers) 限速。
- **Yahoo Finance**：非公开 API，可能限流或变更；仅作增值功能，勿作为唯一数据源。
- **Stooq / Finviz**：有 Cloudflare 挑战或反爬，Workers `fetch` 难以直接使用。
- **CUSIP**：CUSIP 数据库有版权，优先用 SEC 申报内字段或开源映射。

## 已实现 vs 路线图

### ✅ 已实现（MVP）

- 独立 Worker：`holdingskit-scraper`（`wrangler.scraper.jsonc`）
- `syncSecCompanyTickers`：拉取 SEC ticker 列表 → KV，并补全 `institutions.ticker`
- `prefetchHoldingPrices`：对已知 CUSIP 映射的标的预热 Yahoo 股价到 KV
- 手动触发：`POST /admin/run` + `X-Admin-Secret`

### 🔜 路线图

- [ ] CUSIP→Ticker 扩展映射（openFIGI / SEC bulk）
- [ ] Queue 驱动的 symbol 批量回填
- [ ] R2 存档 scrape 原始 JSON
- [ ] 持仓详情页展示 `getHoldingPriceContext` 涨跌
- [ ] 新闻 RSS 抓取供 AI 上下文
- [ ] Browser Rendering（仅必要时）处理 JS 站点

## 部署

```bash
pnpm run deploy:scraper
# 设置密钥（与 ingestion 共用 SEC User-Agent / Admin Secret）
wrangler secret put SEC_USER_AGENT --config wrangler.scraper.jsonc
wrangler secret put ADMIN_SECRET --config wrangler.scraper.jsonc
```

手动运行：

```bash
curl -X POST https://holdingskit-scraper.<account>.workers.dev/admin/run \
  -H "X-Admin-Secret: $ADMIN_SECRET"
```
