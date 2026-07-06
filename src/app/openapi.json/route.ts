import { NextResponse } from "next/server";
import { APP_URL, MPP_PRICING, SITE } from "@/lib/seo/site";

const mppEnabled = Boolean(
  process.env.MPP_SECRET_KEY && process.env.MPP_RECIPIENT,
);

function mppExtension(price: string) {
  if (!mppEnabled) return {};
  return {
    "x-mpp-price": price,
    "x-mpp-currency": MPP_PRICING.currency,
    "x-payment-required": {
      protocol: "mpp",
      amount: price,
      currency: MPP_PRICING.currency,
    },
  };
}

export async function GET() {
  const queryPrice = MPP_PRICING.query;
  const analyzePrice = MPP_PRICING.analyze;

  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "HoldingsKit API",
        version: SITE.version,
        description:
          "Agent-first SEC 13F-HR holdings API. Pay with MPP (primary) or Bearer API key (Stripe).",
        contact: {
          name: SITE.name,
          url: APP_URL,
        },
        "x-agent-card": `${APP_URL}/.well-known/agent-card.json`,
        "x-llms-txt": `${APP_URL}/llms.txt`,
      },
      servers: [{ url: `${APP_URL}/api/v1` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description: "API key from Stripe Pro subscription",
          },
          mpp: {
            type: "apiKey",
            in: "header",
            name: "Payment",
            description: "Machine Payments Protocol (HTTP 402)",
          },
        },
      },
      security: [{ mpp: [] }, { bearerAuth: [] }],
      paths: {
        "/institutions": {
          get: {
            operationId: "listInstitutions",
            summary: "List institutions",
            tags: ["holdings"],
            parameters: [
              { name: "search", in: "query", schema: { type: "string" } },
            ],
            responses: {
              "200": { description: "OK" },
              "402": { description: "MPP payment required" },
            },
            ...mppExtension(queryPrice),
          },
        },
        "/institutions/{cik}/holdings": {
          get: {
            operationId: "getHoldings",
            summary: "Institution holdings",
            tags: ["holdings"],
            parameters: [
              {
                name: "cik",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "period",
                in: "query",
                schema: { type: "string", example: "2025-Q3" },
              },
            ],
            responses: {
              "200": { description: "OK" },
              "402": { description: "MPP payment required" },
            },
            ...mppExtension(queryPrice),
          },
        },
        "/institutions/{cik}/changes": {
          get: {
            operationId: "getChanges",
            summary: "Quarter holding changes",
            tags: ["holdings"],
            parameters: [
              {
                name: "cik",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "period",
                in: "query",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { description: "OK" },
              "402": { description: "MPP payment required" },
            },
            ...mppExtension(queryPrice),
          },
        },
        "/analyze": {
          post: {
            operationId: "analyzeHoldings",
            summary: "AI analysis",
            tags: ["ai"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["cik", "question"],
                    properties: {
                      cik: { type: "string" },
                      question: { type: "string" },
                      session_id: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "200": { description: "OK" },
              "402": { description: "MPP payment required" },
            },
            ...mppExtension(analyzePrice),
          },
        },
      },
    },
    {
      headers: { "Cache-Control": "public, max-age=300" },
    },
  );
}
