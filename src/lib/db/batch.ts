/** D1/SQLite bound-parameter limit per statement (conservative). */
const D1_MAX_VARIABLES = 100;

/** Max prepared statements per D1Database.batch() call. */
const D1_BATCH_STATEMENT_LIMIT = 50;

export function insertBatchSize(
  columnCount: number,
  maxBatch = 20
): number {
  return Math.min(
    maxBatch,
    Math.max(1, Math.floor((D1_MAX_VARIABLES - 1) / columnCount))
  );
}

export interface HoldingRow {
  filingId: number;
  cusip: string;
  issuerName: string;
  ticker?: string | null;
  shares: number;
  valueUsd: number;
  putCall?: string | null;
}

const HOLDINGS_COLUMNS = 7;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Bulk-insert holdings via multi-row INSERT + D1.batch(). */
export async function insertHoldingsInBatches(
  d1: D1Database,
  rows: HoldingRow[]
): Promise<void> {
  if (rows.length === 0) return;

  const rowsPerStatement = insertBatchSize(HOLDINGS_COLUMNS, 12);
  const rowGroups = chunk(rows, rowsPerStatement);
  let batch: D1PreparedStatement[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await d1.batch(batch);
    batch = [];
  };

  for (const group of rowGroups) {
    const placeholders = group.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
    const sql = `INSERT INTO holdings (filing_id, cusip, issuer_name, ticker, shares, value_usd, put_call) VALUES ${placeholders}`;
    const values: Array<string | number | null> = [];
    for (const row of group) {
      values.push(
        row.filingId,
        row.cusip,
        row.issuerName,
        row.ticker ?? null,
        row.shares,
        row.valueUsd,
        row.putCall ?? null
      );
    }
    batch.push(d1.prepare(sql).bind(...values));
    if (batch.length >= D1_BATCH_STATEMENT_LIMIT) {
      await flush();
    }
  }

  await flush();
}

export interface HoldingChangeRow {
  institutionId: number;
  periodEnd: string;
  prevPeriodEnd: string;
  cusip: string;
  issuerName: string;
  ticker?: string | null;
  changeType: string;
  sharesDelta: number;
  valueDelta: number;
  sharesCurrent: number;
  sharesPrevious: number;
  valueCurrent: number;
  valuePrevious: number;
}

const HOLDING_CHANGES_COLUMNS = 13;

/** Bulk-insert holding changes via multi-row INSERT + D1.batch(). */
export async function insertHoldingChangesInBatches(
  d1: D1Database,
  rows: HoldingChangeRow[]
): Promise<void> {
  if (rows.length === 0) return;

  const rowsPerStatement = insertBatchSize(HOLDING_CHANGES_COLUMNS, 7);
  const rowGroups = chunk(rows, rowsPerStatement);
  let batch: D1PreparedStatement[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await d1.batch(batch);
    batch = [];
  };

  for (const group of rowGroups) {
    const placeholders = group
      .map(
        () => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .join(", ");
    const sql = `INSERT INTO holding_changes (
      institution_id, period_end, prev_period_end, cusip, issuer_name, ticker,
      change_type, shares_delta, value_delta, shares_current, shares_previous,
      value_current, value_previous
    ) VALUES ${placeholders}`;
    const values: Array<string | number | null> = [];
    for (const row of group) {
      values.push(
        row.institutionId,
        row.periodEnd,
        row.prevPeriodEnd,
        row.cusip,
        row.issuerName,
        row.ticker ?? null,
        row.changeType,
        row.sharesDelta,
        row.valueDelta,
        row.sharesCurrent,
        row.sharesPrevious,
        row.valueCurrent,
        row.valuePrevious
      );
    }
    batch.push(d1.prepare(sql).bind(...values));
    if (batch.length >= D1_BATCH_STATEMENT_LIMIT) {
      await flush();
    }
  }

  await flush();
}
