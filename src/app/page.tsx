import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Brain, Building2, Zap } from "lucide-react";
import { getDictionary, resolveLocale } from "@/lib/i18n";

const featureIcons = [Building2, BarChart3, Brain, Zap];

const pricingPreview = {
  en: [
    { name: "Free", price: "$0", features: ["Browse holdings", "3 AI analyses / month"] },
    { name: "Pro", price: "$19/mo", features: ["Unlimited AI", "Compare holdings", "1-year history"] },
    { name: "API", price: "Usage-based", features: ["$0.01 / query", "$0.002 / 1K tokens"] },
  ],
  "zh-CN": [
    { name: "免费版", price: "¥0", features: ["浏览持仓", "每月 3 次 AI 分析"] },
    { name: "专业版", price: "$19/月", features: ["无限 AI 分析", "持仓对比", "1 年历史"] },
    { name: "API 版", price: "按量", features: ["$0.01/次查询", "$0.002/1K tokens"] },
  ],
} as const;

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const plans = pricingPreview[locale];

  return (
    <div className="flex flex-col">
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">
          {dict.home.badge}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          {dict.home.title}
          <span className="text-primary">{dict.home.titleHighlight}</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          {dict.home.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/institutions">{dict.home.ctaPrimary}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">{dict.home.ctaSecondary}</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">{dict.home.featuresTitle}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dict.home.features.map((feature, i) => {
            const Icon = featureIcons[i] ?? Building2;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <Icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">{dict.home.pricingTitle}</h2>
            <p className="text-muted-foreground">{dict.home.pricingSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.name}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground">
                    {plan.price}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/pricing">{dict.home.viewPricing}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
