import { NextResponse } from "next/server";
import { APP_URL, MPP_PRICING, SITE } from "@/lib/seo/site";

export async function GET() {
  const manifest = {
    schema_version: "v1",
    name_for_human: SITE.name,
    name_for_model: "holdingskit",
    description_for_human:
      "Track US institutional smart money from SEC 13F-HR filings. Browse holdings, compare quarters, and get AI analysis.",
    description_for_model:
      "Agent-first SEC Form 13F-HR API. Query institutional holdings by CIK, get quarter-over-quarter changes, and run DeepSeek AI analysis. Pay via MPP (HTTP 402) or Bearer API key.",
    auth: {
      type: "service_http",
      authorization_type: "bearer",
      verification_tokens: {
        openai: process.env.OPENAI_PLUGIN_VERIFICATION ?? "",
      },
    },
    api: {
      type: "openapi",
      url: `${APP_URL}/openapi.json`,
      has_user_authentication: true,
    },
    logo_url: `${APP_URL}/favicon.ico`,
    contact_email: SITE.email,
    legal_info_url: `${APP_URL}/docs`,
    pricing: {
      model: "pay-per-use",
      query: `$${MPP_PRICING.query} USD`,
      analyze: `$${MPP_PRICING.analyze} USD`,
    },
  };

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
