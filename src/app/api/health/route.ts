import { NextResponse } from "next/server";
import { getCloudflareEnv, getDb } from "@/lib/cloudflare";
import { institutions } from "@/lib/db/schema";

export async function GET() {
  const env = await getCloudflareEnv();
  const db = await getDb();

  let dbOk = false;
  if (db) {
    try {
      await db.select({ id: institutions.id }).from(institutions).limit(1);
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }

  const status = dbOk ? "ok" : "degraded";
  return NextResponse.json(
    {
      status,
      service: "holdingskit-api",
      timestamp: new Date().toISOString(),
      bindings: {
        d1: dbOk,
        kv: Boolean(env?.KV),
        r2: Boolean(env?.R2),
        queue: Boolean(env?.INGEST_QUEUE),
      },
    },
    { status: dbOk ? 200 : 503 }
  );
}
