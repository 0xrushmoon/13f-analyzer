import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLANS } from "@/lib/billing/stripe";

const plans = [
  {
    id: "free",
    name: PLANS.free.name,
    price: "¥0",
    period: "永久免费",
    features: [
      "浏览全部机构持仓",
      "每月 3 次 AI 分析",
      "基础季度对比",
      "API 10 次/分钟",
    ],
    cta: "免费注册",
    highlighted: false,
  },
  {
    id: "pro",
    name: PLANS.pro.name,
    price: "$19",
    period: "/月",
    features: [
      "无限 AI 分析",
      "完整持仓对比",
      "近 1 年历史数据",
      "优先数据同步",
      "API 60 次/分钟",
    ],
    cta: "升级专业版",
    highlighted: true,
  },
  {
    id: "api",
    name: PLANS.api.name,
    price: "按量",
    period: "计费",
    features: [
      "$0.01 / API 查询",
      "$0.002 / 1K AI tokens",
      "Stripe Billing Meters",
      "API 300 次/分钟",
      "完整 REST API 访问",
    ],
    cta: "开通 API",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">定价方案</h1>
        <p className="text-xl text-muted-foreground">
          从免费浏览到专业 AI 分析，按需选择适合您的方案
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.highlighted ? "border-primary shadow-lg scale-105" : ""}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription>
                {plan.id === "pro" && "最受欢迎"}
                {plan.id === "api" && "开发者首选"}
                {plan.id === "free" && "入门体验"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href={plan.id === "free" ? "/login" : "/account"}>
                  {plan.cta}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
