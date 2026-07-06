import { APP_URL, MPP_PRICING, SITE } from "./site";

export const AGENT_SKILLS = [
  {
    id: "holdings.list",
    name: "List Institutions",
    description:
      "List curated institutional investors with latest 13F summary (100+ funds)",
    tags: ["13f", "sec", "holdings", "institutions"],
    examples: ["List top hedge funds with latest 13F filings"],
  },
  {
    id: "holdings.query",
    name: "Query Holdings",
    description: "Get 13F-HR holdings for a CIK and optional quarter period",
    tags: ["13f", "holdings", "portfolio"],
    examples: ["Get Berkshire Hathaway Q3 2025 holdings (CIK 1067983)"],
  },
  {
    id: "holdings.changes",
    name: "Quarter Changes",
    description: "Compare holdings changes between quarters for a CIK",
    tags: ["13f", "changes", "diff"],
    examples: ["Show Bridgewater quarter-over-quarter position changes"],
  },
  {
    id: "holdings.analyze",
    name: "AI Analysis",
    description:
      "Multi-turn DeepSeek analysis of institutional positioning and sector rotation",
    tags: ["13f", "ai", "analysis"],
    examples: ["Why did Renaissance increase tech holdings this quarter?"],
  },
] as const;

export const API_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/institutions",
    operationId: "listInstitutions",
    summary: "List institutions",
    mppPrice: MPP_PRICING.query,
  },
  {
    method: "GET",
    path: "/api/v1/institutions/{cik}/holdings",
    operationId: "getHoldings",
    summary: "Institution holdings",
    mppPrice: MPP_PRICING.query,
  },
  {
    method: "GET",
    path: "/api/v1/institutions/{cik}/changes",
    operationId: "getChanges",
    summary: "Quarter holding changes",
    mppPrice: MPP_PRICING.query,
  },
  {
    method: "POST",
    path: "/api/v1/analyze",
    operationId: "analyzeHoldings",
    summary: "AI analysis",
    mppPrice: MPP_PRICING.analyze,
  },
] as const;

export function buildAgentCard() {
  return {
    name: SITE.name,
    description:
      "Agent-first SEC Form 13F-HR institutional holdings API. Query holdings, quarter-over-quarter changes, and AI analysis. Primary payment: MPP (Machine Payments Protocol). Humans: Stripe Pro + API keys.",
    version: SITE.version,
    url: `${APP_URL}/api/a2a`,
    provider: {
      organization: SITE.name,
      url: SITE.github,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    skills: AGENT_SKILLS,
    authentication: {
      schemes: [
        {
          type: "mpp",
          description:
            "Machine Payments Protocol (HTTP 402) — primary for autonomous agents",
          docs: `${APP_URL}/docs#mpp`,
        },
        {
          type: "bearer",
          description: "API key from Stripe Pro subscription (humans & integrations)",
          docs: `${APP_URL}/docs#authentication`,
        },
      ],
    },
    pricing: {
      model: "pay-per-use",
      currency: MPP_PRICING.currency,
      tiers: [
        {
          skill: "holdings.list",
          price: MPP_PRICING.query,
          unit: "request",
        },
        {
          skill: "holdings.query",
          price: MPP_PRICING.query,
          unit: "request",
        },
        {
          skill: "holdings.changes",
          price: MPP_PRICING.query,
          unit: "request",
        },
        {
          skill: "holdings.analyze",
          price: MPP_PRICING.analyze,
          unit: "request",
        },
      ],
      humanPlans: `${APP_URL}/pricing`,
    },
    securitySchemes: {
      mpp: {
        type: "http",
        scheme: "payment",
        description: "Machine Payments Protocol (HTTP 402) — primary for agents",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key from Stripe Pro subscription",
      },
    },
    security: [{ mpp: [] }, { bearerAuth: [] }],
    documentationUrl: `${APP_URL}/docs`,
    openapiUrl: `${APP_URL}/openapi.json`,
    supportedInterfaces: [
      {
        url: `${APP_URL}/api/v1`,
        protocolBinding: "HTTP+JSON",
        protocolVersion: "1.0",
      },
    ],
  };
}

export function buildLlmsTxt() {
  return `# HoldingsKit

> Agent-first SEC Form 13F-HR institutional holdings API with MPP (Machine Payments Protocol) billing.

HoldingsKit ingests SEC EDGAR 13F-HR filings for 100+ curated institutions (Berkshire, Bridgewater, Renaissance, etc.), provides quarter-over-quarter diff, and AI analysis via DeepSeek.

## Key URLs

- Website: ${APP_URL}
- API base: ${APP_URL}/api/v1
- OpenAPI: ${APP_URL}/openapi.json
- Agent Card (A2A): ${APP_URL}/.well-known/agent-card.json
- Documentation: ${APP_URL}/docs
- Pricing: ${APP_URL}/pricing
- GitHub: ${SITE.github}

## API Endpoints

${API_ENDPOINTS.map((e) => `- ${e.method} ${e.path} — ${e.summary} ($${e.mppPrice} MPP)`).join("\n")}

## Authentication

- **Agents (primary):** MPP — HTTP 402 payment flow, ~$${MPP_PRICING.query}/query, ~$${MPP_PRICING.analyze}/analyze
- **Humans:** Bearer API key from Stripe Pro subscription

## Skills

${AGENT_SKILLS.map((s) => `- ${s.id}: ${s.description}`).join("\n")}

## Optional

- AI Plugin manifest: ${APP_URL}/.well-known/ai-plugin.json
- MCP info: ${APP_URL}/.well-known/mcp.json
`;
}
