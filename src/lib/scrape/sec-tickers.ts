import { eq, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { institutions } from "@/lib/db/schema";
import { scrapeJson } from "./base";

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const KV_KEY = "scrape:sec:company_tickers";
const KV_TTL_SEC = 7 * 24 * 3600;

export interface SecCompanyTicker {
  cik: string;
  ticker: string;
  title: string;
}

type SecTickersRaw = Record<
  string,
  { cik_str: number; ticker: string; title: string }
>;

function parseSecTickers(raw: SecTickersRaw): SecCompanyTicker[] {
  return Object.values(raw).map((row) => ({
    cik: String(row.cik_str).padStart(10, "0"),
    ticker: row.ticker,
    title: row.title,
  }));
}

export async function fetchSecCompanyTickers(
  secUserAgent?: string
): Promise<SecCompanyTicker[]> {
  const raw = await scrapeJson<SecTickersRaw>(SEC_TICKERS_URL, {
    userAgent: secUserAgent,
    minIntervalMs: 100,
  });
  return parseSecTickers(raw);
}

export async function syncSecCompanyTickers(
  db: Database,
  kv: KVNamespace,
  secUserAgent?: string
): Promise<{ fetched: number; institutionsUpdated: number }> {
  const tickers = await fetchSecCompanyTickers(secUserAgent);

  await kv.put(KV_KEY, JSON.stringify(tickers), {
    expirationTtl: KV_TTL_SEC,
  });

  const byCik = new Map(tickers.map((t) => [t.cik, t.ticker]));
  const missingTicker = await db
    .select()
    .from(institutions)
    .where(isNull(institutions.ticker));

  let institutionsUpdated = 0;
  const updatedAt = new Date().toISOString();

  for (const inst of missingTicker) {
    const ticker = byCik.get(inst.cik);
    if (!ticker) continue;
    await db
      .update(institutions)
      .set({ ticker, updatedAt })
      .where(eq(institutions.id, inst.id));
    institutionsUpdated++;
  }

  return { fetched: tickers.length, institutionsUpdated };
}

export async function getCachedSecTickers(
  kv: KVNamespace
): Promise<SecCompanyTicker[] | null> {
  const cached = await kv.get(KV_KEY, "json");
  return (cached as SecCompanyTicker[] | null) ?? null;
}
