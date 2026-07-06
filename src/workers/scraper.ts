import { createDb } from "@/lib/db";
import { prefetchHoldingPrices } from "@/lib/scrape/price-prefetch";
import { syncSecCompanyTickers } from "@/lib/scrape/sec-tickers";

export interface ScraperEnv {
  DB: D1Database;
  KV: KVNamespace;
  SEC_USER_AGENT?: string;
  ADMIN_SECRET?: string;
}

async function runAllScrapers(env: ScraperEnv) {
  const db = createDb(env.DB);
  const sec = await syncSecCompanyTickers(db, env.KV, env.SEC_USER_AGENT);
  const prices = await prefetchHoldingPrices(db, env.KV);
  return { sec, prices, ranAt: new Date().toISOString() };
}

export default {
  async fetch(request: Request, env: ScraperEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", worker: "holdingskit-scraper" });
    }

    if (url.pathname === "/admin/run" && request.method === "POST") {
      const secret = request.headers.get("X-Admin-Secret");
      if (!secret || secret !== env.ADMIN_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const result = await runAllScrapers(env);
      return Response.json(result);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: ScraperEnv
  ): Promise<void> {
    try {
      const result = await runAllScrapers(env);
      console.log("Scraper cron completed:", JSON.stringify(result));
    } catch (error) {
      console.error("Scraper cron failed:", error);
    }
  },
};
