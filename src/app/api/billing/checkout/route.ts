import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { getDb } from "@/lib/cloudflare";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "价格 ID 未配置" }, { status: 503 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  try {
    const session = await createCheckoutSession(
      db,
      user.id,
      user.email,
      priceId
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout 失败" },
      { status: 500 }
    );
  }
}
