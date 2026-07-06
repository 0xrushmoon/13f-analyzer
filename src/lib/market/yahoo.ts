export interface PriceQuote {
  symbol: string;
  price: number;
  currency: string;
  asOf: string;
}

export interface HistoricalPrice {
  date: string;
  close: number;
}

function parseYahooChart(data: unknown): HistoricalPrice[] {
  const chart = (data as { chart?: { result?: Array<{
    timestamp?: number[];
    indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    meta?: { currency?: string };
  }> } })?.chart?.result?.[0];
  if (!chart?.timestamp?.length) return [];

  const closes = chart.indicators?.quote?.[0]?.close ?? [];
  const prices: HistoricalPrice[] = [];

  for (let i = 0; i < chart.timestamp.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    prices.push({
      date: new Date(chart.timestamp[i] * 1000).toISOString().slice(0, 10),
      close,
    });
  }
  return prices;
}

export async function fetchYahooHistorical(
  symbol: string,
  fromDate: string,
  toDate?: string
): Promise<HistoricalPrice[]> {
  const period1 = Math.floor(new Date(fromDate).getTime() / 1000);
  const period2 = Math.floor(
    (toDate ? new Date(toDate) : new Date()).getTime() / 1000
  ) + 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "HoldingsKit/1.0" },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return parseYahooChart(data);
}

export async function fetchYahooQuote(symbol: string): Promise<PriceQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "HoldingsKit/1.0" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const result = (data as { chart?: { result?: Array<{
    meta?: { regularMarketPrice?: number; currency?: string; regularMarketTime?: number };
  }> } })?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) return null;

  return {
    symbol,
    price: meta.regularMarketPrice,
    currency: meta.currency ?? "USD",
    asOf: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}

export function findClosestPrice(
  prices: HistoricalPrice[],
  targetDate: string
): number | null {
  if (prices.length === 0) return null;
  const target = new Date(targetDate).getTime();
  let best = prices[0];
  let bestDiff = Math.abs(new Date(best.date).getTime() - target);

  for (const p of prices) {
    const diff = Math.abs(new Date(p.date).getTime() - target);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.close;
}
