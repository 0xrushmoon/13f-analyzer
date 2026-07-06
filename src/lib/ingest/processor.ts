import { eq, and } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  insertHoldingChangesInBatches,
  insertHoldingsInBatches,
  type HoldingChangeRow,
} from "@/lib/db/batch";
import { filings, holdings, holdingChanges } from "@/lib/db/schema";
import { getFilingByPeriod } from "@/lib/db/queries";
import type { ParsedHolding } from "@/lib/parser/infotable";

/** Skip inline change computation for very large filings (avoids worker timeout). */
const HOLDING_CHANGES_INLINE_LIMIT = 2500;

export async function computeHoldingChanges(
  db: Database,
  d1: D1Database,
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
    await insertHoldingChangesInBatches(d1, changes as HoldingChangeRow[]);
  }
}

export interface IngestMessage {
  cik: string;
  periodEnd?: string;
  accessionNumber?: string;
  type: "sync" | "backfill" | "single" | "repair";
  /** Re-process filings even when status is completed. */
  force?: boolean;
}

export async function processFilingIngest(
  db: Database,
  d1: D1Database,
  r2: R2Bucket,
  secClient: import("@/lib/sec/client").SecEdgarClient,
  message: IngestMessage
) {
  const { SecEdgarClient } = await import("@/lib/sec/client");
  const { parseInfotableXml } = await import("@/lib/parser/infotable");
  const { upsertInstitution } = await import("@/lib/db/queries");

  const client = secClient ?? new SecEdgarClient();
  const cik = message.cik.replace(/^0+/, "").padStart(10, "0");
  let filingId: number | undefined;
  let accessionNumber: string | undefined;

  const markFailed = async (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const updatedAt = new Date().toISOString();
    if (filingId !== undefined) {
      await db
        .update(filings)
        .set({ status: "failed", errorMessage, updatedAt })
        .where(eq(filings.id, filingId));
      return;
    }
    if (accessionNumber) {
      await db
        .update(filings)
        .set({ status: "failed", errorMessage, updatedAt })
        .where(eq(filings.accessionNumber, accessionNumber));
    }
  };

  try {
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
        allFilings.find((f) =>
          f.reportDate.startsWith(message.periodEnd!.slice(0, 7))
        ) ??
        targetFiling;
    }

    if (!targetFiling) {
      throw new Error(`No 13F filing found for CIK ${cik}`);
    }

    accessionNumber = targetFiling.accessionNumber;

    const institution = await upsertInstitution(db, {
      cik,
      name: submissions.name,
    });

    const existing = await db
      .select()
      .from(filings)
      .where(eq(filings.accessionNumber, targetFiling.accessionNumber))
      .limit(1);

    const r2Key = client.buildR2Key(cik, targetFiling.accessionNumber);

    if (
      existing.length > 0 &&
      existing[0].status === "completed" &&
      !message.force
    ) {
      return { skipped: true, filingId: existing[0].id };
    }

    if (existing.length > 0) {
      filingId = existing[0].id;
      await db
        .update(filings)
        .set({
          status: "processing",
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        })
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

    const xml = await client.downloadInfotable(cik, targetFiling.accessionNumber);
    await r2.put(r2Key, xml, {
      httpMetadata: { contentType: "application/xml" },
    });

    const parsed: ParsedHolding[] = parseInfotableXml(xml, {
      filedAt: targetFiling.filingDate,
    });
    const activeFilingId = filingId;

    await db.delete(holdings).where(eq(holdings.filingId, activeFilingId));

    await insertHoldingsInBatches(
      d1,
      parsed.map((h) => ({
        filingId: activeFilingId,
        cusip: h.cusip,
        issuerName: h.issuerName,
        ticker: h.ticker,
        shares: h.shares,
        valueUsd: h.valueUsd,
        putCall: h.putCall,
      }))
    );

    await db
      .update(filings)
      .set({
        status: "completed",
        r2Key,
        periodEnd: targetFiling.reportDate,
        filedAt: targetFiling.filingDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(filings.id, activeFilingId));

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

    if (completedFilings.length >= 2 && parsed.length <= HOLDING_CHANGES_INLINE_LIMIT) {
      try {
        const current = completedFilings[completedFilings.length - 1];
        const prev = completedFilings[completedFilings.length - 2];
        await computeHoldingChanges(
          db,
          d1,
          institution.id,
          current.periodEnd,
          prev.periodEnd
        );
      } catch (error) {
        console.error("Holding changes computation failed:", error);
      }
    }

    return { skipped: false, filingId };
  } catch (error) {
    await markFailed(error);
    throw error;
  }
}
