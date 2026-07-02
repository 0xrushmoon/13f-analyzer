import { NextRequest, NextResponse } from "next/server";
import { getStripe, handleSubscriptionUpdate } from "@/lib/billing/stripe";
import { getDb } from "@/lib/cloudflare";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe 未配置" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret 未配置" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "缺少签名" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "签名验证失败" }, { status: 400 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId && session.customer) {
        await handleSubscriptionUpdate(db, {
          userId,
          customerId: String(session.customer),
          subscriptionId: String(session.subscription ?? ""),
          status: "active",
          plan: "pro",
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await handleSubscriptionUpdate(db, {
          userId,
          customerId: String(subscription.customer),
          subscriptionId: subscription.id,
          status: "cancelled",
          plan: "free",
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
