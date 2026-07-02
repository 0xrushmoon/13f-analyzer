#!/usr/bin/env node
/**
 * Patch placeholder D1 / KV IDs in wrangler*.jsonc files.
 * Usage: node scripts/update-wrangler-ids.mjs <d1_database_id> <kv_namespace_id>
 */
import fs from "node:fs";
import path from "node:path";

const [d1Id, kvId] = process.argv.slice(2);
if (!d1Id || !kvId) {
  console.error("Usage: update-wrangler-ids.mjs <d1_database_id> <kv_namespace_id>");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const files = ["wrangler.jsonc", "wrangler.ingestion.jsonc"];

for (const file of files) {
  const filePath = path.join(root, file);
  let text = fs.readFileSync(filePath, "utf8");
  text = text.replace(
    /"database_id":\s*"[^"]*"/g,
    `"database_id": "${d1Id}"`,
  );
  text = text.replace(/"id":\s*"00000000000000000000000000000001"/g, `"id": "${kvId}"`);
  fs.writeFileSync(filePath, text);
  console.log(`Updated ${file}`);
}
