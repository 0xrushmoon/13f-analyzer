import { desc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { filings, holdings } from "@/lib/db/schema";
import { getKnownSymbol } from "@/lib/market/symbols";
import {
  fetchYahooHistorical,
  fetchYahooQuote,
  findClosestPrice,
} from "@/lib/market/yahoo";

const CACHE_TTL_SEC = 24 * 3600;
const MAX_SYMBOLS_PER_RUN = 40;

export interface PricePrefetchResult {
  symbolsProcessed: number;
  cacheWrites: number;
  skipped: number;
}

interface SymbolJob {
  symbol: string;
  periodEnd: string;
}

export async function collectPricePrefetchJobs(
  db: Database,
  limit = MAX_SYMBOLS_PER_RUN
): Promise<SymbolJob[]> {
  const rows = await db
    .select({
      cusip: holdings.cusip,
      periodEnd: filings.periodEnd,
      valueUsd: holdings.valueUsd,
    })
    .from(holdings)
    .innerJoin(filings, eq(holdings.filingId, filings.id))
    .where(eq(filings.status, "completed"))
    .orderBy(desc(holdings.valueUsd))
    .limit(500);

  const seen = new Set<string>();
  const jobs: SymbolJob[] = [];

  for (const row of rows) {
    const symbol = getKnownSymbol(row.cusip);
    if (!symbol) continue;
    const key = `${symbol}:${row.periodEnd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push({ symbol, periodEnd: row.periodEnd });
    if (jobs.length >= limit) break;
  }

  return jobs;
}

export async function prefetchHoldingPrices(
  db: Database,
  kv: KVNamespace
): Promise<PricePrefetchResult> {
  const jobs = await collectPricePrefetchJobs(db);
  let cacheWrites = 0;
  let skipped = 0;

  for (const job of jobs) {
    const cacheKey = `price:${job.symbol}:${job.periodEnd}`;
    const existing = await kv.get(cacheKey);
    if (existing) {
      skipped++;
      continue;
    }

    const from = new Date(job.periodEnd);
    from.setMonth(from.getMonth() - 1);

    const [historical, current] = await Promise.all([
      fetchYahooHistorical(
        job.symbol,
        from.toISOString().slice(0, 10),
        job.periodEnd
      ),
      fetchYahooQuote(job.symbol),
    ]);

    const historicalClose = findClosestPrice(historical, job.periodEnd);
    if (historicalClose == null && !current) {
      skipped++;
      continue;
    }

    await kv.put(
      cacheKey,
      JSON.stringify({ historicalClose, current }),
      { expirationTtl: CACHE_TTL_SEC }
    );
    cacheWrites++;
  }

  return {
    symbolsProcessed: jobs.length,
    cacheWrites,
    skipped,
  };
}
