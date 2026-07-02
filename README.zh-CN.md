<div align="center">

# 13F 智能分析平台

**追踪美国机构 SEC Form 13F-HR 持仓，AI 深度解读聪明钱动向**

[![CI](https://github.com/0xrushmoon/13f-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/0xrushmoon/13f-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-F38020)](https://workers.cloudflare.com/)
[![在线预览](https://img.shields.io/badge/在线预览-待配置-yellow)](https://github.com/0xrushmoon/13f-analyzer#预览)

[English](README.md) · [简体中文](README.zh-CN.md) · [贡献指南](CONTRIBUTING.zh-CN.md) · [API 文档](/docs)

</div>

---

## 预览

| 环境 | 地址 | 启动方式 |
|------|------|----------|
| **本地开发（最快）** | http://localhost:3000 | `pnpm install && pnpm dev` |
| **Cloudflare 本地** | http://localhost:8787 | `pnpm preview`（Workers 运行时 + 本地 D1） |
| **生产环境** | `https://13f-analyzer.<你的子域名>.workers.dev` | 见下方 [部署](#部署) |

> **生产地址尚未上线**，需一次性完成：
> 1. [注册 workers.dev 子域名](https://dash.cloudflare.com/51f97220012f6789ddb53f237d86b13c/workers/onboarding)
> 2. [启用 R2](https://dash.cloudflare.com/51f97220012f6789ddb53f237d86b13c/r2/overview)（有免费额度，见下文）
> 3. 运行 `pnpm run deploy`

**Cloudflare 控制台：** [13f-analyzer Worker](https://dash.cloudflare.com/51f97220012f6789ddb53f237d86b13c/workers/services/view/13f-analyzer/production)

---

### Cloudflare R2 要付费吗？

**对本项目来说，基本免费。** R2 有永久免费额度（[官方定价](https://developers.cloudflare.com/r2/pricing/)）：

| 项目 | 每月免费额度 |
|------|-------------|
| 存储空间 | 10 GB |
| 写入/列表（Class A） | 100 万次 |
| 读取（Class B） | 1000 万次 |
| 出站流量 | **永久免费** |

超出免费额度才计费。首次启用 R2 时 Cloudflare **可能要求绑定支付方式**，但在免费额度内不会产生费用。

`13f-raw` 桶用于存 SEC 原始 XML，正常使用远低于免费上限。

---

**13F 智能分析平台** 是开源 SaaS 项目，自动抓取 [SEC Form 13F-HR](https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets) 申报，将结构化持仓存入 **Cloudflare D1**，并提供：

- **机构浏览** — 100+ 精选基金（伯克希尔、桥水、文艺复兴等）
- **季度对比** — 预计算 `holding_changes` 加仓/减仓
- **AI 分析** — DeepSeek 多轮对话 + thinking 模式
- **Agent API** — `/api/v1/` REST 接口，API Key + Stripe 按量计费

面向研究者、量化开发者，以开源方式获取「聪明钱」持仓洞察。

## 功能亮点

| 功能 | 说明 |
|------|------|
| SEC 抓取 | 合规限速 EDGAR 客户端，原始 XML 存 R2，Queue 异步回填 |
| 边缘部署 | Next.js 15 + OpenNext 运行于 Cloudflare Workers |
| 国际化 | 英文 + 简体中文，页头一键切换 |
| 认证 | Better Auth（邮箱 / Google OAuth） |
| 商业化 | Stripe 订阅 + Billing Meters |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15、React 19、Tailwind、shadcn/ui、Recharts |
| 运行时 | Cloudflare Workers、D1、R2、KV、Queues、Cron |
| ORM | Drizzle |
| AI | DeepSeek API（`deepseek-v4-pro`） |
| 支付 | Stripe |

## 快速开始

### 环境要求

- Node.js 22+
- [pnpm](https://pnpm.io/) 9+
- [Cloudflare 账号](https://dash.cloudflare.com/)（需启用 Workers、D1、**R2**）

### 1. 克隆与安装

```bash
git clone https://github.com/0xrushmoon/13f-analyzer.git
cd 13f-analyzer
pnpm install
```

### 2. 环境变量

```bash
cp .env.example .env
# 按注释填写各项密钥
```

### 3. Cloudflare 资源

```bash
pnpm exec wrangler login
pnpm run setup:cf
```

> **注意**：须先在 Cloudflare 控制台启用 R2（免费套餐含 10GB），否则部署会失败。

### 4. 本地开发

```bash
pnpm db:migrate
pnpm dev
```

访问 http://localhost:3000 ，使用页头 **English / 简体中文** 切换语言。

### 5. 历史数据回填

```bash
curl -X POST http://localhost:3000/api/admin/backfill \
  -H "X-Admin-Secret: $ADMIN_SECRET"
```

## 部署

```bash
pnpm run deploy              # Next.js 主应用
pnpm run deploy:ingestion      # 抓取 Worker + 定时任务
```

生产环境 Secrets：

```bash
pnpm exec wrangler secret put DEEPSEEK_API_KEY
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put STRIPE_SECRET_KEY
# 完整列表见 .env.example
```

也可在 GitHub 配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 后，手动触发 **Deploy** workflow。

## API

| 端点 | 说明 |
|------|------|
| `GET /api/v1/institutions` | 机构列表 |
| `GET /api/v1/institutions/:cik/holdings?period=2025-Q3` | 持仓 |
| `GET /api/v1/institutions/:cik/changes?period=2025-Q3` | 季度变化 |
| `POST /api/v1/analyze` | AI 分析 |

认证：`Authorization: Bearer sk-13f-xxx`

## 项目结构

```
src/
├── app/              # 页面与 API
├── workers/          # 抓取 Worker（Queue + Cron）
├── lib/
│   ├── sec/          # EDGAR 客户端
│   ├── parser/       # 13F XML 解析
│   ├── db/           # Drizzle Schema
│   ├── ai/           # DeepSeek 集成
│   ├── i18n/         # 中英文文案
│   └── billing/      # Stripe & API Key
└── data/             # 精选机构种子数据
```

## 参与贡献

欢迎贡献代码与文档！请参阅 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)。

- [行为准则](./CODE_OF_CONDUCT.md)
- [安全政策](./SECURITY.md)
- [更新日志](./CHANGELOG.md)

## 免责声明

数据来源于 SEC EDGAR，相对季度末可能滞后最多 **45 天**。本软件仅供 **研究参考**，不构成投资建议。

## 许可证

[MIT](./LICENSE) © 13F Intelligence Platform Contributors
