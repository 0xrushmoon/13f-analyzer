import { count, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/admin/auth";
import { getDb } from "@/lib/cloudflare";
import {
  filings,
  holdingChanges,
  holdings,
  institutions,
  users,
} from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json(
      { error: "D1 数据库未连接" },
      { status: 503 }
    );
  }

  const [institutionCount] = await db
    .select({ count: count() })
    .from(institutions);
  const [filingCount] = await db.select({ count: count() }).from(filings);
  const [holdingCount] = await db.select({ count: count() }).from(holdings);
  const [changeCount] = await db
    .select({ count: count() })
    .from(holdingChanges);
  const [userCount] = await db.select({ count: count() }).from(users);

  const institutionsTotal = institutionCount?.count ?? 0;
  const filingsTotal = filingCount?.count ?? 0;

  const [activeInstitutionCount] = await db
    .select({ count: count() })
    .from(institutions)
    .where(eq(institutions.isActive, true));

  const filingStatusRows = await db
    .select({
      status: filings.status,
      count: count(),
    })
    .from(filings)
    .groupBy(filings.status);

  const filingStatus = Object.fromEntries(
    filingStatusRows.map((row) => [row.status, row.count])
  );

  const [institutionsWithCompleted] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${filings.institutionId})`,
    })
    .from(filings)
    .where(eq(filings.status, "completed"));

  const [institutionsWithAnyFiling] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${filings.institutionId})`,
    })
    .from(filings);

  return NextResponse.json({
    counts: {
      institutions: institutionsTotal,
      activeInstitutions: activeInstitutionCount?.count ?? 0,
      filings: filingsTotal,
      holdings: holdingCount?.count ?? 0,
      holdingChanges: changeCount?.count ?? 0,
      users: userCount?.count ?? 0,
    },
    filingStatus,
    pipeline: {
      institutionsWithCompleted: institutionsWithCompleted?.count ?? 0,
      institutionsWithAnyFiling: institutionsWithAnyFiling?.count ?? 0,
      institutionsSeeded: institutionsTotal > 0,
      backfillComplete: filingsTotal > 0,
      ingestionWorker: "holdingskit-ingestion",
      ingestQueue: "13f-ingest",
    },
    secrets: {
      deepseekApiKey: Boolean(process.env.DEEPSEEK_API_KEY),
      betterAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET),
      adminSecret: Boolean(process.env.ADMIN_SECRET),
      secUserAgent: Boolean(process.env.SEC_USER_AGENT),
      googleOAuth: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
  });
}
