import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import { createApiKeyRecord } from "@/lib/billing/api-keys";

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库未配置" }, { status: 503 });
  }

  const body = (await request.json()) as { name: string };
  if (!body.name) {
    return NextResponse.json({ error: "请提供密钥名称" }, { status: 400 });
  }

  // Demo user — in production, get from auth session
  const userId = "demo-user";
  const key = await createApiKeyRecord(db, userId, body.name);

  return NextResponse.json({ key });
}
