import { NextResponse } from "next/server";
import { getStripe, createCheckoutSession } from "@/lib/billing/stripe";
import { getDb } from "@/lib/cloudflare";

export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe 未配置" }, { status: 503 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "价格 ID 未配置" }, { status: 503 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  // Demo user — in production, get from session
  const userId = "demo-user";
  const email = "demo@example.com";

  try {
    const session = await createCheckoutSession(db, userId, email, priceId);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout 失败" },
      { status: 500 }
    );
  }
}
