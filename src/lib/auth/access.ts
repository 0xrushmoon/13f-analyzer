import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/cloudflare";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";

export type PaidPlan = "pro" | "api";

export function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "pro" || plan === "api";
}

export async function requireVerifiedSession() {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "请先登录" }, { status: 401 }),
    } as const;
  }

  if (!user.emailVerified) {
    return {
      error: NextResponse.json(
        { error: "请先验证邮箱后再使用服务", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 },
      ),
    } as const;
  }

  const db = await getDb();
  if (!db) {
    return {
      error: NextResponse.json({ error: "数据库未配置" }, { status: 503 }),
    } as const;
  }

  const [row] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return { user, plan: row?.plan ?? "free", db };
}

export async function requirePaidSession() {
  const session = await requireVerifiedSession();
  if ("error" in session) return session;

  if (!isPaidPlan(session.plan)) {
    return {
      error: NextResponse.json(
        {
          error: "请先订阅专业版后使用此功能",
          code: "PAYMENT_REQUIRED",
          upgradeUrl: "/pricing",
        },
        { status: 402 },
      ),
    } as const;
  }

  return session;
}
