import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/admin/auth";
import { getCloudflareEnv, getDb } from "@/lib/cloudflare";
import { institutions } from "@/lib/db/schema";
import { getRecentQuarterEnds } from "@/lib/sec/client";
import seedData from "@/data/institutions.seed.json";

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = await getCloudflareEnv();
  const db = await getDb();

  if (!env?.INGEST_QUEUE || !db) {
    return NextResponse.json(
      { error: "Cloudflare Queue 或 D1 未配置" },
      { status: 503 }
    );
  }

  const seen = new Set<string>();
  for (const item of seedData) {
    const cik = item.cik.replace(/^0+/, "").padStart(10, "0");
    if (seen.has(cik)) continue;
    seen.add(cik);
    await db
      .insert(institutions)
      .values({
        cik,
        name: item.name,
        ticker: item.ticker ?? undefined,
        tier: "curated",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  const allInstitutions = await db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true));

  const quarters = getRecentQuarterEnds(4);
  const messages: Array<{ body: { cik: string; periodEnd: string; type: string } }> = [];

  for (const inst of allInstitutions) {
    for (const periodEnd of quarters) {
      messages.push({
        body: { cik: inst.cik, periodEnd, type: "backfill" },
      });
    }
  }

  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    await env.INGEST_QUEUE.sendBatch(messages.slice(i, i + batchSize));
  }

  return NextResponse.json({
    queued: messages.length,
    institutions: allInstitutions.length,
    quarters: quarters.length,
  });
}
