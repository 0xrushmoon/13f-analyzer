import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/admin/auth";
import { getCloudflareEnv, getDb } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { institutions } from "@/lib/db/schema";
import {
  BACKFILL_QUARTER_COUNT,
  cleanupInstitutionsWithoutHoldings,
  deleteFailedFilings,
  deleteInstitutionsNotInSeed,
} from "@/lib/ingest/cleanup";
import { getRecentQuarterEnds } from "@/lib/sec/client";
import seedData from "@/data/institutions.seed.json";

function normalizeCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

async function seedInstitutions(db: ReturnType<typeof createDb>) {
  const seen = new Set<string>();
  for (const item of seedData) {
    const cik = normalizeCik(item.cik);
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
      .onConflictDoUpdate({
        target: institutions.cik,
        set: {
          name: item.name,
          ticker: item.ticker ?? undefined,
          isActive: true,
          updatedAt: sql`(datetime('now'))`,
        },
      });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = await getCloudflareEnv();
  const db = await getDb();

  if (!env?.DB || !env.INGEST_QUEUE || !db) {
    return NextResponse.json(
      { error: "Cloudflare D1 或 Queue 未配置" },
      { status: 503 }
    );
  }

  const seedCiks = seedData.map((item) => normalizeCik(item.cik));
  const removedOutsideSeed = await deleteInstitutionsNotInSeed(
    db,
    env.DB,
    seedCiks
  );
  await seedInstitutions(db);

  const allInstitutions = await db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true));

  const quarters = getRecentQuarterEnds(BACKFILL_QUARTER_COUNT);
  const messages: Array<{
    body: {
      cik: string;
      periodEnd: string;
      type: "backfill";
      force: true;
    };
  }> = [];

  for (const inst of allInstitutions) {
    for (const periodEnd of quarters) {
      messages.push({
        body: {
          cik: inst.cik,
          periodEnd,
          type: "backfill",
          force: true,
        },
      });
    }
  }

  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    await env.INGEST_QUEUE.sendBatch(messages.slice(i, i + batchSize));
  }

  return NextResponse.json({
    removedOutsideSeed,
    institutions: allInstitutions.length,
    queued: messages.length,
    quarters: quarters.length,
  });
}
