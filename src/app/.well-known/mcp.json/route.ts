import { NextResponse } from "next/server";
import { APP_URL, MPP_PRICING, SITE } from "@/lib/seo/site";
import { API_ENDPOINTS } from "@/lib/seo/discovery";

export async function GET() {
  const info = {
    name: SITE.name,
    version: SITE.version,
    description:
      "HoldingsKit does not expose a native MCP server. Use the REST API via OpenAPI or integrate as an HTTP tool.",
    status: "rest-api-only",
    documentation: `${APP_URL}/docs`,
    openapi: `${APP_URL}/openapi.json`,
    agentCard: `${APP_URL}/.well-known/agent-card.json`,
    transport: "HTTP/JSON",
    baseUrl: `${APP_URL}/api/v1`,
    authentication: [
      {
        type: "mpp",
        description: "Machine Payments Protocol — HTTP 402, primary for agents",
      },
      {
        type: "bearer",
        description: "API key from Stripe Pro subscription",
      },
    ],
    tools: API_ENDPOINTS.map((e) => ({
      name: e.operationId,
      description: e.summary,
      method: e.method,
      path: e.path,
      mppPrice: `$${e.mppPrice}`,
    })),
    suggestedIntegration: {
      type: "openapi",
      url: `${APP_URL}/openapi.json`,
      note: "Import OpenAPI spec into MCP gateway or custom GPT Actions",
    },
  };

  return NextResponse.json(info, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
