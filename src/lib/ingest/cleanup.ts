import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  filings,
  holdingChanges,
  holdings,
  institutions,
} from "@/lib/db/schema";

/** Number of recent quarters to backfill during seed resync. */
export const BACKFILL_QUARTER_COUNT = 3;

export async function deleteInstitutionCascade(
  db: Database,
  d1: D1Database,
  institutionId: number
): Promise<void> {
  const instFilings = await db
    .select({ id: filings.id })
    .from(filings)
    .where(eq(filings.institutionId, institutionId));

  const filingIds = instFilings.map((f) => f.id);
  if (filingIds.length > 0) {
    await d1
      .prepare(
        `DELETE FROM holdings WHERE filing_id IN (${filingIds.map(() => "?").join(",")})`
      )
      .bind(...filingIds)
      .run();
    await db.delete(filings).where(eq(filings.institutionId, institutionId));
  }

  await db
    .delete(holdingChanges)
    .where(eq(holdingChanges.institutionId, institutionId));
  await db.delete(institutions).where(eq(institutions.id, institutionId));
}

export async function deleteInstitutionsNotInSeed(
  db: Database,
  d1: D1Database,
  seedCiks: string[]
): Promise<number> {
  const normalized = seedCiks.map((c) => c.replace(/^0+/, "").padStart(10, "0"));
  const all = await db.select({ id: institutions.id, cik: institutions.cik }).from(institutions);

  let deleted = 0;
  for (const inst of all) {
    if (!normalized.includes(inst.cik)) {
      await deleteInstitutionCascade(db, d1, inst.id);
      deleted++;
    }
  }
  return deleted;
}

/** Remove institutions with no completed filing that has at least one holding. */
export async function cleanupInstitutionsWithoutHoldings(
  db: Database,
  d1: D1Database
): Promise<{ deleted: number; ciks: string[] }> {
  const { results } = await d1
    .prepare(
      `SELECT i.id, i.cik, i.name,
              COUNT(DISTINCT CASE WHEN f.status = 'completed' THEN h.id END) AS holding_rows
       FROM institutions i
       LEFT JOIN filings f ON f.institution_id = i.id
       LEFT JOIN holdings h ON h.filing_id = f.id
       GROUP BY i.id`
    )
    .all<{ id: number; cik: string; name: string; holding_rows: number }>();

  const toDelete = (results ?? []).filter((r) => (r.holding_rows ?? 0) === 0);
  const ciks: string[] = [];

  for (const row of toDelete) {
    await deleteInstitutionCascade(db, d1, row.id);
    ciks.push(row.cik);
  }

  return { deleted: toDelete.length, ciks };
}

/** Remove failed filings for institutions we are keeping (housekeeping). */
export async function deleteFailedFilings(d1: D1Database): Promise<number> {
  const result = await d1
    .prepare(`DELETE FROM filings WHERE status = 'failed'`)
    .run();
  return result.meta?.changes ?? 0;
}

export async function countInstitutionsWithHoldings(
  d1: D1Database
): Promise<number> {
  const { results } = await d1
    .prepare(
      `SELECT COUNT(DISTINCT i.id) AS cnt
       FROM institutions i
       JOIN filings f ON f.institution_id = i.id AND f.status = 'completed'
       JOIN holdings h ON h.filing_id = f.id`
    )
    .all<{ cnt: number }>();
  return results?.[0]?.cnt ?? 0;
}
