# HoldingsKit 生产部署指南

## 一键部署

```bash
pnpm deploy:all
```

依次部署：主 API → Ingestion Worker → Scraper Worker → 远程 D1 迁移。

## 分步部署

```bash
pnpm run deploy              # holdingskit-api
pnpm run deploy:ingestion    # 13F 抓取 + Cron + Queue
pnpm run deploy:scraper      # SEC ticker + 股价预热
pnpm db:migrate:prod         # D1 迁移
```

## 环境变量（Wrangler Secrets）

```bash
pnpm exec wrangler secret put DEEPSEEK_API_KEY
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put SEC_USER_AGENT
pnpm exec wrangler secret put ADMIN_SECRET
pnpm exec wrangler secret put STRIPE_SECRET_KEY
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put EMAIL_FROM
```

Ingestion / Scraper Worker 同样需要 `ADMIN_SECRET`、`SEC_USER_AGENT`。

## 健康检查

- API：`GET /api/health` — 返回 D1/KV/R2/Queue 绑定状态
- Ingestion：`GET /health` on `holdingskit-ingestion.*.workers.dev`

## 监控

- **Cloudflare Dashboard** → Workers → Analytics（请求量、错误率、P99）
- **Wrangler tail**：`pnpm exec wrangler tail holdingskit-api`
- **D1 状态**：`/admin` 面板或 `GET /api/admin/status`（需 `X-Admin-Secret`）

## 自定义域名（oktangle.com）

| 域名 | Worker | 用途 |
|------|--------|------|
| `oktangle.com` / `www.oktangle.com` / `app.oktangle.com` | holdingskit-api | 网站 + API |
| `ingest.oktangle.com` | holdingskit-ingestion | 13F 抓取（Cron + Queue） |
| `scraper.oktangle.com` | holdingskit-scraper | Ticker / 股价预热 |

`wrangler.jsonc` 中 `APP_URL`、`BETTER_AUTH_URL` 已指向 `https://oktangle.com`。部署后 Cloudflare 会自动创建 DNS 与证书。

## 自定义域名（旧流程）

1. Cloudflare Dashboard → Workers → holdingskit-api → Custom Domains
2. 更新 `wrangler.jsonc` 中 `APP_URL`、`BETTER_AUTH_URL`
3. 重新 `pnpm run deploy`

## Stripe Webhook

生产 Webhook URL：

```
https://oktangle.com/api/webhooks/stripe
```

订阅事件：`checkout.session.completed`、`invoice.paid`、`customer.subscription.deleted`

## 邮箱验证（Resend）

1. 在 [Resend](https://resend.com) 创建 API Key 并验证发信域名
2. 配置 Secrets：

```bash
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put EMAIL_FROM   # 例：HoldingsKit <noreply@oktangle.com>
```

3. 注册流程：用户注册 → 收验证邮件 → 点击链接 → 前往 `/pricing` 订阅 Pro/API → 方可使用 AI 与 API

## AI 按次计费

默认 MPP 分析单价 `$0.00001/次`，可在 `wrangler.jsonc` 的 `vars` 中设置 `MPP_PRICE_ANALYZE`，或通过 Secret 覆盖。

## 数据初始化

```bash
# 回填近 4 季度 13F 数据
curl -X POST https://oktangle.com/api/admin/backfill \
  -H "X-Admin-Secret: <your-secret>"

# 修复 2023 年后市值单位（如需要）
curl -X POST https://oktangle.com/api/admin/repair-values \
  -H "X-Admin-Secret: <your-secret>" \
  -H "Content-Type: application/json" \
  -d '{"recomputeChanges":true}'
```

## Cron 调度（UTC）

| Worker | 调度 | 行为 |
|--------|------|------|
| ingestion | `0 6 * * *` | 每日 sync 最新 13F |
| ingestion | `0 6 15,30 1,4,7,10 *` | 季度 backfill |
| scraper | `0 7 * * *` | SEC ticker + 股价预热 |

北京时间 = UTC + 8 小时。
