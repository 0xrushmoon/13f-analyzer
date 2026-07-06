import Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { users, subscriptions, usageEvents } from "@/lib/db/schema";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export const PLANS = {
  free: { name: "免费版", price: 0, aiLimit: 3 },
  pro: { name: "专业版", price: 19, aiLimit: Infinity },
  api: { name: "API 版", price: 0, aiLimit: Infinity },
} as const;

export async function createCheckoutSession(
  db: Database,
  userId: string,
  email: string,
  priceId: string
) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe 未配置");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let customerId = user?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/account?success=1`,
    cancel_url: `${process.env.APP_URL}/pricing?cancelled=1`,
    metadata: { userId },
  });

  return session;
}

export async function reportApiUsage(
  db: Database,
  userId: string,
  type: "api_call" | "ai_analysis",
  tokens = 0
) {
  await db.insert(usageEvents).values({
    userId,
    type,
    tokens,
    stripeReported: false,
  });

  const stripe = getStripe();
  if (!stripe) return;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.stripeCustomerId) return;

  try {
    await stripe.billing.meterEvents.create({
      event_name: type === "api_call" ? "api_calls" : "ai_tokens",
      payload: {
        stripe_customer_id: user.stripeCustomerId,
        value: String(type === "api_call" ? 1 : tokens),
      },
    });
  } catch (error) {
    console.error("Stripe meter event failed:", error);
  }
}

export async function handleSubscriptionUpdate(
  db: Database,
  data: {
    userId: string;
    customerId: string;
    subscriptionId: string;
    status: string;
    plan: "free" | "pro" | "api";
    currentPeriodEnd?: string;
  }
) {
  await db.insert(subscriptions).values({
    userId: data.userId,
    stripeCustomerId: data.customerId,
    stripeSubscriptionId: data.subscriptionId,
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.currentPeriodEnd,
  });

  await db
    .update(users)
    .set({ plan: data.plan, updatedAt: new Date() })
    .where(eq(users.id, data.userId));
}

export async function checkAiUsageLimit(
  db: Database,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { allowed: false, remaining: 0 };

  const plan = user.plan as keyof typeof PLANS;
  const limit = PLANS[plan]?.aiLimit ?? 3;

  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity };
  }

  const now = new Date();
  const resetAt = user.aiUsageResetAt ? new Date(user.aiUsageResetAt) : null;
  let usage = user.aiUsageThisMonth;

  if (!resetAt || resetAt < now) {
    usage = 0;
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await db
      .update(users)
      .set({
        aiUsageThisMonth: 0,
        aiUsageResetAt: nextReset.toISOString(),
      })
      .where(eq(users.id, userId));
  }

  const remaining = Math.max(0, limit - usage);
  return { allowed: remaining > 0, remaining };
}

export async function incrementAiUsage(db: Database, userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return;

  await db
    .update(users)
    .set({
      aiUsageThisMonth: user.aiUsageThisMonth + 1,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
