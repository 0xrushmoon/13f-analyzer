import { eq, desc, and, sql, like, or } from "drizzle-orm";
import type { Database } from "./index";
import {
  institutions,
  filings,
  holdings,
  holdingChanges,
  analysisSessions,
} from "./schema";

export async function getInstitutions(db: Database, search?: string) {
  if (search) {
    return db
      .select()
      .from(institutions)
      .where(
        and(
          eq(institutions.isActive, true),
          or(
            like(institutions.name, `%${search}%`),
            like(institutions.cik, `%${search}%`),
            like(institutions.ticker, `%${search}%`)
          )
        )
      )
      .orderBy(institutions.name);
  }
  return db
    .select()
    .from(institutions)
    .where(eq(institutions.isActive, true))
    .orderBy(institutions.name);
}

export async function getInstitutionByCik(db: Database, cik: string) {
  const normalized = cik.replace(/^0+/, "").padStart(10, "0");
  const [inst] = await db
    .select()
    .from(institutions)
    .where(eq(institutions.cik, normalized))
    .limit(1);
  return inst ?? null;
}

export async function getLatestFiling(db: Database, institutionId: number) {
  const [filing] = await db
    .select()
    .from(filings)
    .where(
      and(
        eq(filings.institutionId, institutionId),
        eq(filings.status, "completed")
      )
    )
    .orderBy(desc(filings.periodEnd))
    .limit(1);
  return filing ?? null;
}

export async function getFilingsByInstitution(
  db: Database,
  institutionId: number
) {
  return db
    .select()
    .from(filings)
    .where(
      and(
        eq(filings.institutionId, institutionId),
        eq(filings.status, "completed")
      )
    )
    .orderBy(desc(filings.periodEnd));
}

export async function getHoldingsByFiling(db: Database, filingId: number) {
  return db
    .select()
    .from(holdings)
    .where(eq(holdings.filingId, filingId))
    .orderBy(desc(holdings.valueUsd));
}

export async function getFilingByPeriod(
  db: Database,
  institutionId: number,
  periodEnd: string
) {
  const [filing] = await db
    .select()
    .from(filings)
    .where(
      and(
        eq(filings.institutionId, institutionId),
        eq(filings.periodEnd, periodEnd),
        eq(filings.status, "completed")
      )
    )
    .limit(1);
  return filing ?? null;
}

export async function getHoldingChanges(
  db: Database,
  institutionId: number,
  periodEnd: string
) {
  return db
    .select()
    .from(holdingChanges)
    .where(
      and(
        eq(holdingChanges.institutionId, institutionId),
        eq(holdingChanges.periodEnd, periodEnd)
      )
    )
    .orderBy(desc(sql`abs(${holdingChanges.valueDelta})`));
}

export async function getInstitutionSummary(db: Database, institutionId: number) {
  const latest = await getLatestFiling(db, institutionId);
  if (!latest) return null;

  const topHoldings = await getHoldingsByFiling(db, latest.id);
  const totalValue = topHoldings.reduce((sum, h) => sum + h.valueUsd, 0);

  return {
    latestFiling: latest,
    topHoldings: topHoldings.slice(0, 10),
    totalValue,
    holdingsCount: topHoldings.length,
  };
}

export async function getAnalysisSession(db: Database, sessionId: string) {
  const [session] = await db
    .select()
    .from(analysisSessions)
    .where(eq(analysisSessions.id, sessionId))
    .limit(1);
  return session ?? null;
}

export async function getUserAnalysisSessions(
  db: Database,
  userId: string
) {
  return db
    .select()
    .from(analysisSessions)
    .where(eq(analysisSessions.userId, userId))
    .orderBy(desc(analysisSessions.updatedAt));
}

export async function upsertInstitution(
  db: Database,
  data: { cik: string; name: string; ticker?: string; tier?: "curated" | "expanded" }
) {
  const normalized = data.cik.replace(/^0+/, "").padStart(10, "0");
  const existing = await getInstitutionByCik(db, normalized);
  if (existing) return existing;

  const [inserted] = await db
    .insert(institutions)
    .values({
      cik: normalized,
      name: data.name,
      ticker: data.ticker,
      tier: data.tier ?? "curated",
    })
    .returning();
  return inserted;
}
