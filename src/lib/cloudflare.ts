import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  INGEST_QUEUE: Queue;
  ASSETS?: Fetcher;
}

export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env as unknown as CloudflareEnv;
  } catch {
    return null;
  }
}

export async function getDb() {
  const { createDb } = await import("@/lib/db");
  const env = await getCloudflareEnv();
  if (env?.DB) {
    return createDb(env.DB);
  }
  return null;
}
