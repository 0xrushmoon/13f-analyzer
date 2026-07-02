/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  INGEST_QUEUE: Queue;
  ASSETS?: Fetcher;
}

declare module "@opennextjs/cloudflare" {
  interface CloudflareEnvBindings extends CloudflareEnv {}
}
