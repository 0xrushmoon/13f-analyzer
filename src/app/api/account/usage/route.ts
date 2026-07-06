import { eq, and, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/cloudflare";
import { usageEvents, users } from "@/lib/db/schema";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [apiCalls] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, user.id),
        eq(usageEvents.type, "api_call"),
        gte(usageEvents.createdAt, monthStart.toISOString())
      )
    );

  const [aiAnalyses] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, user.id),
        eq(usageEvents.type, "ai_analysis"),
        gte(usageEvents.createdAt, monthStart.toISOString())
      )
    );

  const [dbUser] = await db
    .select({ plan: users.plan, aiUsageThisMonth: users.aiUsageThisMonth })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json({
    plan: dbUser?.plan ?? "free",
    apiCalls: apiCalls?.count ?? 0,
    aiAnalyses: aiAnalyses?.count ?? 0,
    aiUsageThisMonth: dbUser?.aiUsageThisMonth ?? 0,
  });
}
