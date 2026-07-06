import { getCloudflareEnv } from "@/lib/cloudflare";
import { getKnownSymbol } from "./symbols";
import {
  fetchYahooHistorical,
  fetchYahooQuote,
  findClosestPrice,
  type PriceQuote,
} from "./yahoo";

const CACHE_TTL_SEC = 3600;

export interface HoldingPriceContext {
  symbol: string | null;
  impliedPriceAtFiling: number | null;
  priceAtFiling: number | null;
  currentPrice: number | null;
  gainSinceFilingPct: number | null;
  currentAsOf: string | null;
}

export async function getHoldingPriceContext(
  cusip: string,
  shares: number,
  valueUsd: number,
  periodEnd: string
): Promise<HoldingPriceContext> {
  const impliedPriceAtFiling =
    shares > 0 ? valueUsd / shares : null;

  const symbol = getKnownSymbol(cusip);
  if (!symbol) {
    return {
      symbol: null,
      impliedPriceAtFiling,
      priceAtFiling: null,
      currentPrice: null,
      gainSinceFilingPct: null,
      currentAsOf: null,
    };
  }

  const env = await getCloudflareEnv();
  const cacheKey = `price:${symbol}:${periodEnd}`;

  let historicalClose: number | null = null;
  let current: PriceQuote | null = null;

  if (env?.KV) {
    const cached = await env.KV.get(cacheKey, "json") as {
      historicalClose?: number;
      current?: PriceQuote;
    } | null;
    if (cached?.historicalClose != null) {
      historicalClose = cached.historicalClose;
      current = cached.current ?? null;
    }
  }

  if (historicalClose == null) {
    const from = new Date(periodEnd);
    from.setMonth(from.getMonth() - 1);
    const historical = await fetchYahooHistorical(
      symbol,
      from.toISOString().slice(0, 10),
      periodEnd
    );
    historicalClose = findClosestPrice(historical, periodEnd);
  }

  if (!current) {
    current = await fetchYahooQuote(symbol);
  }

  if (env?.KV && (historicalClose != null || current)) {
    await env.KV.put(
      cacheKey,
      JSON.stringify({ historicalClose, current }),
      { expirationTtl: CACHE_TTL_SEC }
    );
  }

  const priceAtFiling = historicalClose ?? impliedPriceAtFiling;
  const currentPrice = current?.price ?? null;
  const gainSinceFilingPct =
    priceAtFiling && currentPrice
      ? ((currentPrice - priceAtFiling) / priceAtFiling) * 100
      : null;

  return {
    symbol,
    impliedPriceAtFiling,
    priceAtFiling: historicalClose,
    currentPrice,
    gainSinceFilingPct,
    currentAsOf: current?.asOf ?? null,
  };
}
