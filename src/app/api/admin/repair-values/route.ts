import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/admin/auth";
import { getCloudflareEnv, getDb } from "@/lib/cloudflare";
import { computeHoldingChanges } from "@/lib/ingest/processor";
import { filings, holdingChanges, institutions } from "@/lib/db/schema";
import { SEC_VALUE_DOLLAR_CUTOFF } from "@/lib/parser/value-units";

/**
 * Repair holdings ingested with incorrect *1000 on post-2023 filings.
 * SEC reports dollars (not thousands) for filings on/after 2023-01-03.
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = await getCloudflareEnv();
  const db = await getDb();
  if (!env?.DB || !db) {
    return NextResponse.json({ error: "D1 未配置" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    recomputeChanges?: boolean;
    requeue?: boolean;
  };
  const recomputeChanges = body.recomputeChanges !== false;
  const requeue = body.requeue === true;

  try {
    const holdingsResult = await env.DB.prepare(
      `UPDATE holdings
       SET value_usd = value_usd / 1000.0
       WHERE filing_id IN (
         SELECT id FROM filings WHERE filed_at >= ?
       )
       AND shares > 0
       AND value_usd / shares > 10000`
    )
      .bind(SEC_VALUE_DOLLAR_CUTOFF)
      .run();

    let recomputed = 0;
    if (recomputeChanges) {
      await db.delete(holdingChanges);

      const allInstitutions = await db.select().from(institutions);
      for (const inst of allInstitutions) {
        const completed = await db
          .select()
          .from(filings)
          .where(
            and(
              eq(filings.institutionId, inst.id),
              eq(filings.status, "completed")
            )
          )
          .orderBy(filings.periodEnd);

        if (completed.length >= 2) {
          const current = completed[completed.length - 1];
          const prev = completed[completed.length - 2];
          try {
            await computeHoldingChanges(
              db,
              env.DB,
              inst.id,
              current.periodEnd,
              prev.periodEnd
            );
            recomputed++;
          } catch (error) {
            console.error(`Recompute failed for ${inst.cik}:`, error);
          }
        }
      }
    }

    let queued = 0;
    if (requeue && env.INGEST_QUEUE) {
      const { results } = await env.DB.prepare(
        `SELECT i.cik, f.period_end AS periodEnd
         FROM filings f
         JOIN institutions i ON i.id = f.institution_id
         WHERE f.filed_at >= ?`
      )
        .bind(SEC_VALUE_DOLLAR_CUTOFF)
        .all<{ cik: string; periodEnd: string }>();

      const messages = (results ?? []).map((row) => ({
        body: {
          cik: row.cik,
          periodEnd: row.periodEnd,
          type: "repair" as const,
          force: true,
        },
      }));

      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        await env.INGEST_QUEUE.sendBatch(messages.slice(i, i + batchSize));
      }
      queued = messages.length;
    }

    return NextResponse.json({
      holdingsFixed: holdingsResult.meta?.changes ?? 0,
      institutionsRecomputed: recomputed,
      requeued: queued,
    });
  } catch (error) {
    console.error("repair-values failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Repair failed",
      },
      { status: 500 }
    );
  }
}
