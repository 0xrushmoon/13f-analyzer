import { getCloudflareEnv } from "@/lib/cloudflare";

const HL_INFO_URL = "https://api.hyperliquid.xyz/info";
const KV_KEY = "hl:xyz:symbols";
const CACHE_TTL_SEC = 6 * 3600;

/** Default HIP-3 equity perp deployer — TradeXYZ, deepest liquidity. */
const DEFAULT_DEPLOYER = "xyz";

export function hyperliquidTradeUrl(symbol: string, deployer = DEFAULT_DEPLOYER): string {
  const sym = symbol.trim().toUpperCase();
  return `https://app.hyperliquid.xyz/trade/${deployer}:${sym}`;
}

export async function isHyperliquidListed(symbol: string): Promise<boolean> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return false;
  const listed = await getXyzListedSymbols();
  return listed.has(sym);
}

export async function getHyperliquidLink(
  symbol: string,
): Promise<{ url: string; market: string } | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  const listed = await getXyzListedSymbols();
  if (!listed.has(sym)) return null;
  return {
    url: hyperliquidTradeUrl(sym),
    market: `${DEFAULT_DEPLOYER}:${sym}`,
  };
}

async function getXyzListedSymbols(): Promise<Set<string>> {
  const env = await getCloudflareEnv();
  if (env?.KV) {
    const cached = await env.KV.get(KV_KEY, "json") as string[] | null;
    if (cached?.length) return new Set(cached);
  }

  const symbols = await fetchXyzSymbols();

  if (env?.KV && symbols.size > 0) {
    await env.KV.put(KV_KEY, JSON.stringify([...symbols]), {
      expirationTtl: CACHE_TTL_SEC,
    });
  }

  return symbols;
}

async function fetchXyzSymbols(): Promise<Set<string>> {
  try {
    const res = await fetch(HL_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allPerpMetas" }),
    });
    if (!res.ok) return new Set();

    const metas = (await res.json()) as Array<{ universe?: Array<{ name: string }> }>;
    const out = new Set<string>();

    for (const meta of metas) {
      for (const asset of meta.universe ?? []) {
        const m = asset.name.match(/^xyz:([A-Z0-9.\-]+)$/);
        if (m) out.add(m[1]);
      }
    }

    return out;
  } catch {
    return new Set();
  }
}
