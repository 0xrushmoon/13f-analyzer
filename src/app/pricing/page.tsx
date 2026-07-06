import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import { MPP_PRICING } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

const plansByLocale = {
  en: [
    {
      id: "free",
      name: "Free",
      price: "$0",
      periodKey: "freePeriod" as const,
      features: [
        "Browse all institutions & holdings",
        "Quarter-over-quarter compare",
        "Email verification required",
        "API 10 req/min",
      ],
      ctaKey: "freeCta" as const,
      highlighted: false,
      tag: "Starter",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$19",
      periodKey: "perMonth" as const,
      features: [
        "Unlimited AI analysis",
        "Full holdings history (1yr)",
        "Priority data sync",
        "API 60 req/min",
      ],
      ctaKey: "proCta" as const,
      highlighted: true,
      tag: "Most popular",
    },
    {
      id: "api",
      name: "API",
      price: "Usage",
      periodKey: "usageBased" as const,
      features: [
        `$${MPP_PRICING.query} / API query`,
        `$${MPP_PRICING.analyze} / AI analyze`,
        "Stripe billing meters",
        "API 300 req/min",
      ],
      ctaKey: "apiCta" as const,
      highlighted: false,
      tag: "Developers",
    },
  ],
  "zh-CN": [
    {
      id: "free",
      name: "免费版",
      price: "¥0",
      periodKey: "freePeriod" as const,
      features: [
        "浏览全部机构与持仓",
        "季度持仓对比",
        "需邮箱验证注册",
        "API 10 次/分钟",
      ],
      ctaKey: "freeCta" as const,
      highlighted: false,
      tag: "入门体验",
    },
    {
      id: "pro",
      name: "专业版",
      price: "$19",
      periodKey: "perMonth" as const,
      features: [
        "无限 AI 分析",
        "近 1 年历史数据",
        "优先数据同步",
        "API 60 次/分钟",
      ],
      ctaKey: "proCta" as const,
      highlighted: true,
      tag: "最受欢迎",
    },
    {
      id: "api",
      name: "API 版",
      price: "按量",
      periodKey: "usageBased" as const,
      features: [
        `$${MPP_PRICING.query} / 次查询`,
        `$${MPP_PRICING.analyze} / 次 AI 分析`,
        "Stripe 用量计费",
        "API 300 次/分钟",
      ],
      ctaKey: "apiCta" as const,
      highlighted: false,
      tag: "开发者",
    },
  ],
} as const;

const compareRows = {
  en: [
    { feature: "Browse 13F holdings", free: "✓", pro: "✓", api: "✓" },
    { feature: "Quarter compare", free: "✓", pro: "✓", api: "✓" },
    { feature: "AI analysis", free: "—", pro: "Unlimited", api: "Pay per call" },
    { feature: "REST API", free: "—", pro: "✓", api: "✓" },
    { feature: "Rate limit", free: "10/min", pro: "60/min", api: "300/min" },
    { feature: "MPP agent payments", free: "—", pro: "—", api: "✓" },
  ],
  "zh-CN": [
    { feature: "浏览 13F 持仓", free: "✓", pro: "✓", api: "✓" },
    { feature: "季度对比", free: "✓", pro: "✓", api: "✓" },
    { feature: "AI 分析", free: "—", pro: "无限", api: "按次付费" },
    { feature: "REST API", free: "—", pro: "✓", api: "✓" },
    { feature: "速率限制", free: "10/分钟", pro: "60/分钟", api: "300/分钟" },
    { feature: "MPP Agent 支付", free: "—", pro: "—", api: "✓" },
  ],
};

export default async function PricingPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const t = dict.pricing;
  const plans = plansByLocale[locale];
  const compare = compareRows[locale];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-8">
        <p className="page-eyebrow">Plans · Stripe · MPP</p>
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>
      </div>

      <div className="terminal-grid grid-cols-1 md:grid-cols-3 mb-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "terminal-cell flex flex-col relative",
              plan.highlighted && "ring-1 ring-inset ring-primary/50 bg-primary/[0.03]",
            )}
          >
            {plan.highlighted && (
              <span className="absolute top-3 right-3 text-[9px] uppercase tracking-wider text-primary border border-primary/40 px-1.5 py-0.5 rounded-sm">
                {t.recommended}
              </span>
            )}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">{plan.name}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{plan.tag}</p>
            </div>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-2xl font-medium num text-foreground">{plan.price}</span>
              <span className="text-[10px] text-muted-foreground">{t[plan.periodKey]}</span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed"
                >
                  <span className="text-primary shrink-0 mt-px">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full h-8 text-xs"
              variant={plan.highlighted ? "default" : "outline"}
              asChild
            >
              <Link href={plan.id === "free" ? "/login" : "/account"}>
                {t[plan.ctaKey]}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="panel mb-6 overflow-hidden">
        <div className="panel-header">{t.compareTitle}</div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[480px]">
            <thead>
              <tr>
                <th>{t.colFeature}</th>
                <th className="text-center w-24">{t.colFree}</th>
                <th className="text-center w-24">{t.colPro}</th>
                <th className="text-center w-24">{t.colApi}</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((row) => (
                <tr key={row.feature}>
                  <td className="text-foreground">{row.feature}</td>
                  <td className="text-center text-muted-foreground num text-[11px]">
                    {row.free}
                  </td>
                  <td className="text-center text-muted-foreground num text-[11px]">
                    {row.pro}
                  </td>
                  <td className="text-center text-muted-foreground num text-[11px]">
                    {row.api}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">{t.mppTitle}</div>
        <div className="panel-body">
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t.mppDesc}</p>
          <div className="terminal-grid grid-cols-1 sm:grid-cols-3">
            <div className="terminal-cell">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {locale === "zh-CN" ? "查询" : "Query"}
              </p>
              <p className="num text-lg text-primary">
                ${MPP_PRICING.query}
                <span className="text-xs text-muted-foreground ml-1">/ req</span>
              </p>
            </div>
            <div className="terminal-cell">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {locale === "zh-CN" ? "AI 分析" : "Analyze"}
              </p>
              <p className="num text-lg text-primary">
                ${MPP_PRICING.analyze}
                <span className="text-xs text-muted-foreground ml-1">/ call</span>
              </p>
            </div>
            <div className="terminal-cell flex flex-col justify-center">
              <Link href="/docs#mpp" className="btn-terminal-ghost text-center text-[11px]">
                {locale === "zh-CN" ? "查看 API 文档" : "View API docs"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
