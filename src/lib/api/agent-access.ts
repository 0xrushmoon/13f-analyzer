import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth-middleware";
import { isMppEnabled, type MppPriceTier } from "@/lib/billing/mpp";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/lib/db/schema";

type AgentContext = {
  userId: string;
  plan: string;
  db: DrizzleD1Database<typeof schema>;
  payment: "api_key" | "mpp";
};

/**
 * Agent-first access: MPP payment (primary) or Bearer API key (Stripe-backed).
 */
export async function withAgentAccess(
  request: NextRequest,
  tier: MppPriceTier,
  handler: (ctx: AgentContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const auth = await authenticateApiRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return handler({
      userId: auth.userId,
      plan: auth.plan,
      db: auth.db,
      payment: "api_key",
    });
  }

  if (!isMppEnabled()) {
    return NextResponse.json(
      {
        error: "Payment required",
        message:
          "Agents: pay via MPP (HTTP 402). Humans: use Bearer API key or Stripe Pro.",
        docs: "/docs",
      },
      {
        status: 402,
        headers: {
          "WWW-Authenticate": 'Payment realm="holdingskit"',
        },
      },
    );
  }

  const { getMppx, MPP_PRICES } = await import("@/lib/billing/mpp");
  const mppx = getMppx();
  const amount = MPP_PRICES[tier];
  const charged = await (
    mppx as unknown as {
      charge: (opts: { amount: string }) => (req: NextRequest) => Promise<{
        status: number;
        challenge?: NextResponse;
        withReceipt: (res: NextResponse) => NextResponse;
      }>;
    }
  ).charge({ amount })(request);

  if (charged.status === 402) {
    return charged.challenge as NextResponse;
  }

  const { getDb } = await import("@/lib/cloudflare");
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const result = await handler({
    userId: "mpp-agent",
    plan: "mpp",
    db,
    payment: "mpp",
  });

  return charged.withReceipt(result) as NextResponse;
}
