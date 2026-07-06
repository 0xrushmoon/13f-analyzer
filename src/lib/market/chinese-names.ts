import { getCloudflareEnv } from "@/lib/cloudflare";

const CACHE_TTL_SEC = 7 * 24 * 3600;
const KV_PREFIX = "cnname:";

/** Fallback for top 13F holdings when GBK decode is unavailable (e.g. edge runtime). */
const COMMON_CN: Record<string, string> = {
  AAPL: "苹果",
  MSFT: "微软",
  GOOGL: "谷歌-A",
  GOOG: "谷歌-C",
  AMZN: "亚马逊",
  NVDA: "英伟达",
  META: "Meta Platforms",
  TSLA: "特斯拉",
  BRK: "伯克希尔",
  JPM: "摩根大通",
  V: "Visa",
  MA: "万事达",
  UNH: "联合健康",
  JNJ: "强生",
  WMT: "沃尔玛",
  PG: "宝洁",
  HD: "家得宝",
  BAC: "美国银行",
  KO: "可口可乐",
  PEP: "百事",
  COST: "好市多",
  AMD: "AMD",
  NFLX: "奈飞",
  DIS: "迪士尼",
  CRM: "赛富时",
  ORCL: "甲骨文",
  INTC: "英特尔",
  CSCO: "思科",
  AVGO: "博通",
  LLY: "礼来",
  MRK: "默沙东",
  ABBV: "艾伯维",
  TMO: "赛默飞世尔",
  ACN: "埃森哲",
  MCD: "麦当劳",
  ABT: "雅培",
  DHR: "丹纳赫",
  TXN: "德州仪器",
  QCOM: "高通",
  NKE: "耐克",
  UPS: "联合包裹",
  BA: "波音",
  GS: "高盛",
  MS: "摩根士丹利",
  C: "花旗",
  BLK: "贝莱德",
  SCHW: "嘉信理财",
  AXP: "美国运通",
  OXY: "西方石油",
};

/**
 * Fetch Chinese display name for a US ticker via Tencent Finance (qt.gtimg.cn).
 * Format: v_usAAPL="200~苹果~AAPL.OQ~..."
 * No API key required; works for most NYSE/NASDAQ symbols.
 */
export async function getChineseName(symbol: string): Promise<string | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym || !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(sym)) return null;

  const env = await getCloudflareEnv();
  const cacheKey = `${KV_PREFIX}${sym}`;

  if (env?.KV) {
    const cached = await env.KV.get(cacheKey);
    if (cached) return cached === "__none__" ? null : cached;
  }

  const name = await fetchTencentChineseName(sym);

  if (env?.KV) {
    await env.KV.put(cacheKey, name ?? "__none__", {
      expirationTtl: CACHE_TTL_SEC,
    });
  }

  return name;
}

async function fetchTencentChineseName(symbol: string): Promise<string | null> {
  const fallback = COMMON_CN[symbol] ?? null;
  try {
    const url = `https://qt.gtimg.cn/q=us${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: { Referer: "https://finance.qq.com" },
    });
    if (!res.ok) return fallback;

    const buf = await res.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("gbk").decode(buf);
    } catch {
      text = new TextDecoder("utf-8").decode(buf);
    }
    // v_usAAPL="200~苹果~AAPL.OQ~..."
    const match = text.match(/="[^"]*~([^~]+)~/);
    const name = match?.[1]?.trim();
    if (!name || name === symbol || /^[A-Z0-9.]+$/.test(name)) return fallback;
    return name;
  } catch {
    return fallback;
  }
}
