#!/usr/bin/env node
/**
 * Resync institutions from seed (remote D1 + Queue).
 * Requires wrangler auth and ADMIN_SECRET in environment.
 *
 * Usage:
 *   ADMIN_SECRET=xxx pnpm resync:seed
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(
  readFileSync(join(root, "src/data/institutions.seed.json"), "utf8")
);

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const INGEST_URL =
  process.env.INGEST_URL ?? "https://ingest.oktangle.com";
const API_URL = process.env.API_URL ?? "https://oktangle.com";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function post(url, path) {
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "X-Admin-Secret": ADMIN_SECRET ?? "" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function getCount(label) {
  const out = execSync(
    `pnpm wrangler d1 execute 13f-db --remote --command "SELECT COUNT(DISTINCT i.id) AS c FROM institutions i JOIN filings f ON f.institution_id = i.id AND f.status = 'completed' JOIN holdings h ON h.filing_id = f.id;"`,
    { cwd: root, encoding: "utf8" }
  );
  const match = out.match(/"c":\s*(\d+)/);
  const count = match ? Number(match[1]) : 0;
  console.log(`[poll] ${label}: ${count} institutions with holdings`);
  return count;
}

async function main() {
  console.log(`Seed institutions: ${seed.length}`);

  if (!ADMIN_SECRET) {
    console.error("Set ADMIN_SECRET to call admin endpoints.");
    process.exit(1);
  }

  console.log("\n==> Deploying ingestion worker...");
  execSync("pnpm run deploy:ingestion", { cwd: root, stdio: "inherit" });

  console.log("\n==> Deploying API worker (resync/cleanup routes)...");
  execSync("pnpm run deploy", { cwd: root, stdio: "inherit" });

  console.log("\n==> Trigger resync (purge non-seed + queue 3-quarter backfill)...");
  const resync = await post(API_URL, "/api/admin/resync");
  console.log(JSON.stringify(resync, null, 2));

  const expectedMin = seed.length * 0.5;
  let last = 0;
  for (let i = 0; i < 120; i++) {
    await sleep(30_000);
    last = await getCount(`attempt ${i + 1}/120`);
    if (last >= expectedMin) break;
  }

  console.log("\n==> Cleanup institutions without holdings...");
  const cleanup = await post(API_URL, "/api/admin/cleanup");
  console.log(JSON.stringify(cleanup, null, 2));

  const finalCount = await getCount("final");
  console.log(`\nDone. Institutions with holdings: ${finalCount}/${seed.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
