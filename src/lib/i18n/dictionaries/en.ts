import type { Dictionary } from "../types";

const en: Dictionary = {
  meta: {
    title: "13F Intelligence Platform",
    description:
      "Track US institutional 13F holdings with AI-powered analysis of smart-money moves",
  },
  nav: {
    institutions: "Institutions",
    holdings: "Holdings Compare",
    analyze: "AI Analysis",
    pricing: "Pricing",
    docs: "API Docs",
    login: "Sign in",
    getStarted: "Get Started",
    tagline: "Intelligence Platform",
  },
  footer: {
    disclaimer:
      "13F Intelligence Platform · Data from SEC EDGAR · For research only, not investment advice",
    lagNotice:
      "Data reflects latest 13F-HR filings, typically published within 45 days after quarter end",
  },
  home: {
    badge: "Open Source · Cloudflare Edge",
    title: "Track ",
    titleHighlight: "Smart Money",
    subtitle:
      "Automatically ingest SEC 13F-HR filings, compare quarterly holdings, and get coherent AI analysis powered by DeepSeek.",
    ctaPrimary: "Browse Institutions",
    ctaSecondary: "View Pricing",
    featuresTitle: "Built for researchers & builders",
    features: [
      {
        title: "Curated Institutions",
        description:
          "100+ top funds including Berkshire, Bridgewater, and Renaissance — synced from SEC EDGAR",
      },
      {
        title: "Quarter-over-Quarter",
        description:
          "Visualize new positions, increases, decreases, and exits at a glance",
      },
      {
        title: "AI Deep Analysis",
        description:
          "Multi-turn DeepSeek analysis with thinking mode and cross-quarter reasoning",
      },
      {
        title: "Agent API",
        description:
          "REST API with metered billing for programmatic holdings and AI queries",
      },
    ],
    pricingTitle: "Simple, transparent pricing",
    pricingSubtitle: "Start free, scale with Pro or API usage",
    viewPricing: "See all plans",
  },
  common: {
    language: "Language",
  },
};

export default en;
