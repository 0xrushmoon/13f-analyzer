import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import { APP_URL, MPP_PRICING, SITE } from "@/lib/seo/site";

const endpointsData = {
  en: [
    {
      method: "GET" as const,
      path: "/api/v1/institutions",
      description: "List curated institutions",
    },
    {
      method: "GET" as const,
      path: "/api/v1/institutions/:cik/holdings",
      description: "Holdings for a period (?period=2025-Q3)",
    },
    {
      method: "GET" as const,
      path: "/api/v1/institutions/:cik/changes",
      description: "Quarter-over-quarter changes",
    },
    {
      method: "POST" as const,
      path: "/api/v1/analyze",
      description: "AI analysis — body: { cik, question, session_id? }",
    },
  ],
  "zh-CN": [
    {
      method: "GET" as const,
      path: "/api/v1/institutions",
      description: "获取机构列表",
    },
    {
      method: "GET" as const,
      path: "/api/v1/institutions/:cik/holdings",
      description: "指定季度持仓 (?period=2025-Q3)",
    },
    {
      method: "GET" as const,
      path: "/api/v1/institutions/:cik/changes",
      description: "季度持仓变化",
    },
    {
      method: "POST" as const,
      path: "/api/v1/analyze",
      description: "AI 分析 — body: { cik, question, session_id? }",
    },
  ],
};

const rateLimitsData = {
  en: [
    { plan: "Free", limit: "10 req/min" },
    { plan: "Pro", limit: "60 req/min" },
    { plan: "API", limit: "300 req/min" },
  ],
  "zh-CN": [
    { plan: "免费版", limit: "10 次/分钟" },
    { plan: "专业版", limit: "60 次/分钟" },
    { plan: "API 版", limit: "300 次/分钟" },
  ],
};

const agentLinks = [
  { href: "/openapi.json", label: "OpenAPI 3.1" },
  { href: "/.well-known/agent-card.json", label: "Agent Card (A2A)" },
  { href: "/.well-known/mcp.json", label: "MCP" },
  { href: "/llms.txt", label: "llms.txt" },
];

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span className={method === "GET" ? "method-get" : "method-post"}>
      {method}
    </span>
  );
}

export default async function DocsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const t = dict.docs;
  const endpoints = endpointsData[locale];
  const rateLimits = rateLimitsData[locale];

  const nav = [
    { href: "#base-url", label: t.baseUrlTitle },
    { href: "#auth", label: t.navAuth },
    { href: "#endpoints", label: t.navEndpoints },
    { href: "#rate-limits", label: t.rateLimitsTitle },
    { href: "#mpp", label: t.navMpp },
    { href: "#agents", label: t.navAgents },
    { href: "#example", label: t.navExample },
  ];

  const exampleCurl = `curl -s -H "Authorization: Bearer sk-13f-xxx" \\
  "${APP_URL}/api/v1/institutions/0001067983/holdings?period=2025-Q3"`;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-8">
        <p className="page-eyebrow">REST · v1 · {SITE.version}</p>
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>
      </div>

      <div className="grid lg:grid-cols-[200px_minmax(0,1fr)] gap-8 items-start">
        <aside className="hidden lg:block sticky top-14">
          <p className="panel-header mb-0 border border-b-0 border-border rounded-t-sm">
            {locale === "zh-CN" ? "目录" : "Contents"}
          </p>
          <nav className="panel border-t-0 rounded-t-none">
            <ul className="py-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block px-4 py-2 text-[11px] text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-4 min-w-0">
          <section id="base-url" className="panel scroll-mt-20">
            <div className="panel-header">{t.baseUrlTitle}</div>
            <div className="panel-body">
              <code className="code-block">{APP_URL}/api/v1</code>
            </div>
          </section>

          <section id="auth" className="panel scroll-mt-20">
            <div className="panel-header">{t.authTitle}</div>
            <div className="panel-body space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{t.authDesc}</p>
              <code className="code-block">Authorization: Bearer sk-13f-xxxxxxxx</code>
            </div>
          </section>

          <section id="endpoints" className="panel scroll-mt-20 overflow-hidden">
            <div className="panel-header">{t.endpointsTitle}</div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[520px]">
                <thead>
                  <tr>
                    <th className="w-16">{t.colMethod}</th>
                    <th>{t.colEndpoint}</th>
                    <th>{t.colDescription}</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep) => (
                    <tr key={ep.path + ep.method}>
                      <td>
                        <MethodBadge method={ep.method} />
                      </td>
                      <td className="num text-[11px] text-foreground">{ep.path}</td>
                      <td className="text-muted-foreground">{ep.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="rate-limits" className="panel scroll-mt-20 overflow-hidden">
            <div className="panel-header">{t.rateLimitsTitle}</div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{locale === "zh-CN" ? "套餐" : "Plan"}</th>
                    <th className="text-right">{locale === "zh-CN" ? "限制" : "Limit"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.map((row) => (
                    <tr key={row.plan}>
                      <td className="font-medium text-foreground">{row.plan}</td>
                      <td className="num text-right">{row.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="mpp" className="panel scroll-mt-20">
            <div className="panel-header">{t.mppTitle}</div>
            <div className="panel-body space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{t.mppDesc}</p>
              <div className="terminal-grid grid-cols-1 sm:grid-cols-2">
                <div className="terminal-cell">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Query
                  </p>
                  <p className="num text-sm text-primary">
                    ${MPP_PRICING.query} {MPP_PRICING.currency}
                  </p>
                </div>
                <div className="terminal-cell">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Analyze
                  </p>
                  <p className="num text-sm text-primary">
                    ${MPP_PRICING.analyze} {MPP_PRICING.currency}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="agents" className="panel scroll-mt-20">
            <div className="panel-header">{t.agentsTitle}</div>
            <div className="panel-body space-y-3">
              <p className="text-xs text-muted-foreground">{t.agentsDesc}</p>
              <ul className="space-y-2">
                {agentLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-primary hover:underline num"
                    >
                      {APP_URL}
                      {link.href}
                    </Link>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {link.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="example" className="panel scroll-mt-20">
            <div className="panel-header">{t.exampleTitle}</div>
            <div className="panel-body">
              <pre className="code-block whitespace-pre-wrap">{exampleCurl}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
