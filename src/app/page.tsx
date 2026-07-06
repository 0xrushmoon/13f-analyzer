import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@/lib/i18n";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);

  return (
    <div className="flex flex-col">
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-4">
            SEC 13F-HR · EDGAR · Agent API
          </p>
          <h1 className="text-3xl md:text-5xl font-medium tracking-tight max-w-3xl text-foreground">
            {dict.home.title}
            <span className="text-primary">{dict.home.titleHighlight}</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed">
            {dict.home.subtitle}
          </p>
          <div className="flex flex-wrap gap-2 mt-8">
            <Link href="/institutions" className="btn-terminal">
              {dict.home.ctaPrimary}
            </Link>
            <Link href="/docs" className="btn-terminal-ghost">
              {dict.home.ctaSecondary}
            </Link>
            <Link href="/pricing" className="btn-terminal-ghost">
              {dict.nav.deposit}
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <p className="panel-header mb-0 border border-b-0 border-border">
          {dict.home.featuresTitle}
        </p>
        <div className="terminal-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {dict.home.features.map((feature) => (
            <div key={feature.title} className="terminal-cell">
              <h3 className="text-xs font-medium text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section-muted">
        <div className="container mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-foreground font-medium">
              {dict.home.pricingTitle}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {dict.home.pricingSubtitle}
            </p>
          </div>
          <Link href="/pricing" className="btn-terminal shrink-0">
            {dict.home.viewPricing}
          </Link>
        </div>
      </section>
    </div>
  );
}
