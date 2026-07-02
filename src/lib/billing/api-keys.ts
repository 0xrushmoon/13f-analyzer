import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const random =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");
  const key = `sk-13f-${random.slice(0, 32)}`;
  const prefix = key.slice(0, 12);
  const hash = await hashApiKey(key);
  return { key, hash, prefix };
}

export async function validateApiKey(
  db: Database,
  key: string
): Promise<{ userId: string; plan: string } | null> {
  const hash = await hashApiKey(key);
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  if (!apiKey) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, apiKey.userId))
    .limit(1);

  if (!user) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, apiKey.id));

  return { userId: user.id, plan: user.plan };
}

export async function createApiKeyRecord(
  db: Database,
  userId: string,
  name: string
) {
  const { key, hash, prefix } = await generateApiKey();
  await db.insert(apiKeys).values({
    userId,
    keyHash: hash,
    keyPrefix: prefix,
    name,
  });
  return key;
}

export type RateLimitTier = "free" | "pro" | "api";

const RATE_LIMITS: Record<RateLimitTier, { limit: number; windowSec: number }> = {
  free: { limit: 10, windowSec: 60 },
  pro: { limit: 60, windowSec: 60 },
  api: { limit: 300, windowSec: 60 },
};

export async function checkRateLimit(
  kv: KVNamespace,
  userId: string,
  tier: RateLimitTier
): Promise<{ allowed: boolean; remaining: number }> {
  const config = RATE_LIMITS[tier] ?? RATE_LIMITS.free;
  const key = `ratelimit:${userId}:${Math.floor(Date.now() / (config.windowSec * 1000))}`;
  const current = parseInt((await kv.get(key)) ?? "0", 10);

  if (current >= config.limit) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, String(current + 1), {
    expirationTtl: config.windowSec * 2,
  });
  return { allowed: true, remaining: config.limit - current - 1 };
}
