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
    case "invoice.paid": {
      const invoice = event.data.object;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      const userId = invoice.metadata?.userId ?? invoice.subscription_details?.metadata?.userId;
      if (userId && invoice.customer) {
        await handleSubscriptionUpdate(db, {
          userId,
          customerId: String(invoice.customer),
          subscriptionId: subscriptionId ?? "",
          status: "active",
          plan: "pro",
          currentPeriodEnd: invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
            : undefined,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
