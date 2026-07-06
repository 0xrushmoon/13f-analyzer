const DEFAULT_UA = "HoldingsKit/1.0 (contact@holdingskit.dev)";

let lastFetchAt = 0;

export interface ScrapeFetchOptions {
  userAgent?: string;
  minIntervalMs?: number;
  headers?: Record<string, string>;
}

export async function scrapeFetch(
  url: string,
  options: ScrapeFetchOptions = {}
): Promise<Response> {
  const minIntervalMs = options.minIntervalMs ?? 200;
  const now = Date.now();
  const elapsed = now - lastFetchAt;
  if (elapsed < minIntervalMs) {
    await new Promise((r) => setTimeout(r, minIntervalMs - elapsed));
  }
  lastFetchAt = Date.now();

  return fetch(url, {
    headers: {
      "User-Agent": options.userAgent ?? DEFAULT_UA,
      Accept: "application/json, text/html, text/csv, */*",
      ...options.headers,
    },
  });
}

export async function scrapeJson<T>(
  url: string,
  options?: ScrapeFetchOptions
): Promise<T> {
  const res = await scrapeFetch(url, options);
  if (!res.ok) {
    throw new Error(`Scrape failed ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function scrapeText(
  url: string,
  options?: ScrapeFetchOptions
): Promise<string> {
  const res = await scrapeFetch(url, options);
  if (!res.ok) {
    throw new Error(`Scrape failed ${res.status}: ${url}`);
  }
  return res.text();
}
