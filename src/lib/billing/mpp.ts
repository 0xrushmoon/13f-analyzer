import { Mppx, tempo } from "mppx/server";

/** pathUSD on Tempo mainnet — configure per environment */
const TEMPO_PATH_USD =
  process.env.MPP_CURRENCY ??
  "0x20c0000000000000000000000000000000000000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mppxInstance: any = null;

export function isMppEnabled(): boolean {
  return Boolean(process.env.MPP_SECRET_KEY && process.env.MPP_RECIPIENT);
}

export function getMppx() {
  if (!isMppEnabled()) {
    throw new Error("MPP is not configured");
  }
  if (!mppxInstance) {
    mppxInstance = Mppx.create({
      methods: [
        ...tempo({
          currency: TEMPO_PATH_USD,
          recipient: process.env.MPP_RECIPIENT as `0x${string}`,
        }),
      ],
      secretKey: process.env.MPP_SECRET_KEY!,
      realm: "holdingskit",
    });
  }
  return mppxInstance;
}

export type MppPriceTier = "query" | "analyze";

export const MPP_PRICES: Record<MppPriceTier, string> = {
  query: process.env.MPP_PRICE_QUERY ?? "0.01",
  analyze: process.env.MPP_PRICE_ANALYZE ?? "0.00001",
};
