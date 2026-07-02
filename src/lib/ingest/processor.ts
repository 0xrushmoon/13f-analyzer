import { eq, and } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { filings, holdings, holdingChanges } from "@/lib/db/schema";
import { getFilingByPeriod } from "@/lib/db/queries";
import type { ParsedHolding } from "@/lib/parser/infotable";

export async function computeHoldingChanges(
  db: Database,
  institutionId: number,
  currentPeriodEnd: string,
  prevPeriodEnd: string
) {
  const currentFiling = await getFilingByPeriod(
    db,
    institutionId,
    currentPeriodEnd
  );
  const prevFiling = await getFilingByPeriod(
    db,
    institutionId,
    prevPeriodEnd
  );

  if (!currentFiling || !prevFiling) return;

  const currentHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.filingId, currentFiling.id));
  const prevHoldings = await db
    .select()
    .from(holdings)
    .where(eq(holdings.filingId, prevFiling.id));

  const prevMap = new Map(prevHoldings.map((h) => [h.cusip, h]));
  const currentMap = new Map(currentHoldings.map((h) => [h.cusip, h]));

  await db
    .delete(holdingChanges)
    .where(
      and(
        eq(holdingChanges.institutionId, institutionId),
        eq(holdingChanges.periodEnd, currentPeriodEnd)
      )
    );

  const changes: Array<typeof holdingChanges.$inferInsert> = [];

  for (const [cusip, current] of currentMap) {
    const prev = prevMap.get(cusip);
    if (!prev) {
      changes.push({
        institutionId,
        periodEnd: currentPeriodEnd,
        prevPeriodEnd,
        cusip,
        issuerName: current.issuerName,
        ticker: current.ticker,
        changeType: "new",
        sharesDelta: current.shares,
        valueDelta: current.valueUsd,
        sharesCurrent: current.shares,
        sharesPrevious: 0,
        valueCurrent: current.valueUsd,
        valuePrevious: 0,
      });
    } else {
      const sharesDelta = current.shares - prev.shares;
      const valueDelta = current.valueUsd - prev.valueUsd;
      let changeType: "increased" | "decreased" | "unchanged" = "unchanged";
      if (Math.abs(sharesDelta) > 0.01) {
        changeType = sharesDelta > 0 ? "increased" : "decreased";
      }
      changes.push({
        institutionId,
        periodEnd: currentPeriodEnd,
        prevPeriodEnd,
        cusip,
        issuerName: current.issuerName,
        ticker: current.ticker,
        changeType,
        sharesDelta,
        valueDelta,
        sharesCurrent: current.shares,
        sharesPrevious: prev.shares,
        valueCurrent: current.valueUsd,
        valuePrevious: prev.valueUsd,
      });
    }
  }

  for (const [cusip, prev] of prevMap) {
    if (!currentMap.has(cusip)) {
      changes.push({
        institutionId,
        periodEnd: currentPeriodEnd,
        prevPeriodEnd,
        cusip,
        issuerName: prev.issuerName,
        ticker: prev.ticker,
        changeType: "closed",
        sharesDelta: -prev.shares,
        valueDelta: -prev.valueUsd,
        sharesCurrent: 0,
        sharesPrevious: prev.shares,
        valueCurrent: 0,
        valuePrevious: prev.valueUsd,
      });
    }
  }

  if (changes.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < changes.length; i += batchSize) {
      await db.insert(holdingChanges).values(changes.slice(i, i + batchSize));
    }
  }
}

export interface IngestMessage {
  cik: string;
  periodEnd?: string;
  accessionNumber?: string;
  type: "sync" | "backfill" | "single";
}

export async function processFilingIngest(
  db: Database,
  r2: R2Bucket,
  secClient: import("@/lib/sec/client").SecEdgarClient,
  message: IngestMessage
) {
  const { SecEdgarClient } = await import("@/lib/sec/client");
  const { parseInfotableXml } = await import("@/lib/parser/infotable");
  const { upsertInstitution } = await import("@/lib/db/queries");

  const client = secClient ?? new SecEdgarClient();
  const cik = message.cik.replace(/^0+/, "").padStart(10, "0");

  const submissions = await client.getSubmissions(cik);
  const allFilings = client.get13FFilings(submissions);

  let targetFiling = allFilings[0];
  if (message.accessionNumber) {
    targetFiling =
      allFilings.find((f) => f.accessionNumber === message.accessionNumber) ??
      targetFiling;
  } else if (message.periodEnd) {
    targetFiling =
      allFilings.find((f) => f.reportDate === message.periodEnd) ??
      allFilings.find((f) => f.reportDate.startsWith(message.periodEnd!.slice(0, 7))) ??
      targetFiling;
  }

  if (!targetFiling) {
    throw new Error(`No 13F filing found for CIK ${cik}`);
  }

  const institution = await upsertInstitution(db, {
    cik,
    name: submissions.name,
  });

  const existing = await db
    .select()
    .from(filings)
    .where(eq(filings.accessionNumber, targetFiling.accessionNumber))
    .limit(1);

  let filingId: number;
  const r2Key = client.buildR2Key(cik, targetFiling.accessionNumber);

  if (existing.length > 0 && existing[0].status === "completed") {
    return { skipped: true, filingId: existing[0].id };
  }

  if (existing.length > 0) {
    filingId = existing[0].id;
    await db
      .update(filings)
      .set({ status: "processing", updatedAt: new Date().toISOString() })
      .where(eq(filings.id, filingId));
  } else {
    const [inserted] = await db
      .insert(filings)
      .values({
        institutionId: institution.id,
        accessionNumber: targetFiling.accessionNumber,
        periodEnd: targetFiling.reportDate,
        filedAt: targetFiling.filingDate,
        r2Key,
        status: "processing",
      })
      .returning();
    filingId = inserted.id;
  }

  try {
    const xml = await client.downloadInfotable(cik, targetFiling.accessionNumber);
    await r2.put(r2Key, xml, {
      httpMetadata: { contentType: "application/xml" },
    });

    const parsed: ParsedHolding[] = parseInfotableXml(xml);

    await db.delete(holdings).where(eq(holdings.filingId, filingId));

    const batchSize = 50;
    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize).map((h) => ({
        filingId,
        cusip: h.cusip,
        issuerName: h.issuerName,
        ticker: h.ticker,
        shares: h.shares,
        valueUsd: h.valueUsd,
        putCall: h.putCall,
      }));
      await db.insert(holdings).values(batch);
    }

    await db
      .update(filings)
      .set({
        status: "completed",
        r2Key,
        periodEnd: targetFiling.reportDate,
        filedAt: targetFiling.filingDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(filings.id, filingId));

    const completedFilings = await db
      .select()
      .from(filings)
      .where(
        and(
          eq(filings.institutionId, institution.id),
          eq(filings.status, "completed")
        )
      )
      .orderBy(filings.periodEnd);

    if (completedFilings.length >= 2) {
      const current = completedFilings[completedFilings.length - 1];
      const prev = completedFilings[completedFilings.length - 2];
      await computeHoldingChanges(
        db,
        institution.id,
        current.periodEnd,
        prev.periodEnd
      );
    }

    return { skipped: false, filingId };
  } catch (error) {
    await db
      .update(filings)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(filings.id, filingId));
    throw error;
  }
}
