import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/admin/auth";
import { getCloudflareEnv, getDb } from "@/lib/cloudflare";

/** Placeholder CIKs that were removed from seed — never filed valid 13F data. */
const PLACEHOLDER_CIKS = [
  "0002001234",
  "0002012345",
  "0002023456",
  "0002034567",
  "0002045678",
  "0002056789",
  "0002067890",
  "0002078901",
  "0002089012",
  "0002090123",
  "0002101234",
  "0002112345",
  "0002123456",
  "0002134567",
  "0002145678",
  "0002156789",
  "0002167890",
  "0002178901",
  "0002189012",
  "0002190123",
  "0002201234",
  "0002212345",
  "0002223456",
  "0002234567",
  "0002245678",
  "0002256789",
  "0002267890",
  "0002278901",
  "0002289012",
  "0002290123",
  "0002301234",
  "0002312345",
  "0002323456",
  "0002334567",
  "0002345678",
  "0002356789",
  "0002367890",
];

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

  const body = (await request.json().catch(() => ({}))) as {
    unstickProcessing?: boolean;
    requeueFailed?: boolean;
    requeueStuck?: boolean;
    deactivatePlaceholders?: boolean;
    triggerBackfill?: boolean;
  };

  const unstickProcessing = body.unstickProcessing !== false;
  const requeueFailed = body.requeueFailed !== false;
  const requeueStuck = body.requeueStuck !== false;
  const deactivatePlaceholders = body.deactivatePlaceholders !== false;
  const triggerBackfill = body.triggerBackfill === true;

  try {
    let deactivated = 0;
    if (deactivatePlaceholders) {
      for (const cik of PLACEHOLDER_CIKS) {
        const result = await env.DB.prepare(
          `UPDATE institutions SET is_active = 0, updated_at = datetime('now') WHERE cik = ? AND is_active = 1`
        )
          .bind(cik)
          .run();
        deactivated += result.meta?.changes ?? 0;
      }
    }

    let unstuck = 0;
    if (unstickProcessing) {
      const result = await env.DB.prepare(
        `UPDATE filings
         SET status = 'failed',
             error_message = 'Processing timed out — reset by repair-pipeline',
             updated_at = datetime('now')
         WHERE status = 'processing'
           AND updated_at < datetime('now', '-30 minutes')`
      ).run();
      unstuck = result.meta?.changes ?? 0;
    }

    const messages: Array<{
      body: {
        cik: string;
        periodEnd?: string;
        accessionNumber?: string;
        type: "backfill";
        force: true;
      };
    }> = [];

    if (requeueFailed) {
      const { results } = await env.DB.prepare(
        `SELECT i.cik, f.period_end AS periodEnd, f.accession_number AS accessionNumber
         FROM filings f
         JOIN institutions i ON i.id = f.institution_id
         WHERE f.status = 'failed' AND i.is_active = 1`
      ).all<{
        cik: string;
        periodEnd: string;
        accessionNumber: string;
      }>();

      for (const row of results ?? []) {
        messages.push({
          body: {
            cik: row.cik,
            periodEnd: row.periodEnd,
            accessionNumber: row.accessionNumber,
            type: "backfill",
            force: true,
          },
        });
      }
    }

    if (requeueStuck) {
      const { results } = await env.DB.prepare(
        `SELECT i.cik, f.period_end AS periodEnd, f.accession_number AS accessionNumber
         FROM filings f
         JOIN institutions i ON i.id = f.institution_id
         WHERE f.status = 'processing' AND i.is_active = 1`
      ).all<{
        cik: string;
        periodEnd: string;
        accessionNumber: string;
      }>();

      for (const row of results ?? []) {
        messages.push({
          body: {
            cik: row.cik,
            periodEnd: row.periodEnd,
            accessionNumber: row.accessionNumber,
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

    let backfillQueued = 0;
    if (triggerBackfill) {
      const origin = request.nextUrl.origin;
      const backfillRes = await fetch(`${origin}/api/admin/backfill`, {
        method: "POST",
        headers: {
          "X-Admin-Secret": request.headers.get("X-Admin-Secret") ?? "",
        },
      });
      if (backfillRes.ok) {
        const data = (await backfillRes.json()) as { queued?: number };
        backfillQueued = data.queued ?? 0;
      }
    }

    const { results: statusRows } = await env.DB.prepare(
      `SELECT status, COUNT(*) AS cnt FROM filings GROUP BY status`
    ).all<{ status: string; cnt: number }>();

    const filingStatus = Object.fromEntries(
      (statusRows ?? []).map((row) => [row.status, row.cnt])
    );

    const { results: instRows } = await env.DB.prepare(
      `SELECT COUNT(DISTINCT institution_id) AS cnt FROM filings WHERE status = 'completed'`
    ).all<{ cnt: number }>();

    return NextResponse.json({
      deactivated,
      unstuck,
      requeued: messages.length,
      backfillQueued,
      filingStatus,
      institutionsWithCompleted: instRows?.[0]?.cnt ?? 0,
    });
  } catch (error) {
    console.error("repair-pipeline failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Repair pipeline failed",
      },
      { status: 500 }
    );
  }
}
