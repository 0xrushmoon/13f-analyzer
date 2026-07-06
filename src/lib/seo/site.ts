export const APP_URL =
  process.env.APP_URL ?? "https://oktangle.com";

export const SITE = {
  name: "HoldingsKit",
  tagline: "Agent-first SEC 13F institutional holdings API",
  github: "https://github.com/0xrushmoon/13f-analyzer",
  email: "security@holdingskit.dev",
  version: "0.2.0",
} as const;

export const SEO_KEYWORDS = [
  "13F",
  "SEC EDGAR",
  "institutional holdings",
  "smart money",
  "hedge fund holdings",
  "Berkshire Hathaway 13F",
  "agent API",
  "MPP",
  "machine payments",
  "OpenAPI",
  "A2A agent",
  "HoldingsKit",
] as const;

export const PUBLIC_PAGES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/institutions", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/holdings", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/analyze", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/docs", priority: 0.8, changeFrequency: "weekly" as const },
] as const;

export const MPP_PRICING = {
  query: process.env.MPP_PRICE_QUERY ?? "0.01",
  analyze: process.env.MPP_PRICE_ANALYZE ?? "0.00001",
  currency: "USD",
} as const;
