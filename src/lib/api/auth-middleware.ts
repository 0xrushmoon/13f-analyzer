import { NextRequest } from "next/server";
import { getDb, getCloudflareEnv } from "@/lib/cloudflare";
import { validateApiKey, checkRateLimit, type RateLimitTier } from "@/lib/billing/api-keys";
import { reportApiUsage } from "@/lib/billing/stripe";

export async function authenticateApiRequest(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "缺少 Authorization Bearer token", status: 401 as const };
  }

  const key = authHeader.slice(7);
  const db = await getDb();
  if (!db) {
    return { error: "数据库未配置", status: 503 as const };
  }

  const auth = await validateApiKey(db, key);
  if (!auth) {
    return { error: "无效的 API 密钥", status: 401 as const };
  }

  const env = await getCloudflareEnv();
  if (env?.KV) {
    const tier = (auth.plan as RateLimitTier) ?? "free";
    const rateLimit = await checkRateLimit(env.KV, auth.userId, tier);
    if (!rateLimit.allowed) {
      return { error: "请求过于频繁，请稍后重试", status: 429 as const };
    }
  }

  await reportApiUsage(db, auth.userId, "api_call");

  return { userId: auth.userId, plan: auth.plan, db };
}
