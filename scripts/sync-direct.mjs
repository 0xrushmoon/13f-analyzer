#!/usr/bin/env node
/**
 * Direct ingest for seed institutions (bypasses queue).
 * Uses remote D1/R2 bindings via wrangler getPlatformProxy.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { getPlatformProxy } from "wrangler";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(
  readFileSync(join(root, "src/data/institutions.seed.json"), "utf8")
);
const QUARTERS = 3;

function normalizeCik(cik) {
  return String(cik).replace(/^0+/, "").padStart(10, "0");
}

function getRecentQuarterEnds(count) {
  const quarters = [];
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3);
  for (let i = 0; i < count; i++) {
    if (quarter === 0) {
      quarter = 3;
      year -= 1;
    } else {
      quarter -= 1;
    }
    const month = quarter * 3 + 3;
    const lastDay = new Date(year, month, 0).getDate();
    quarters.push(
      `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    );
  }
  return quarters;
}

function remoteHaveCiks() {
  const out = execSync(
    `pnpm wrangler d1 execute 13f-db --remote --command "SELECT i.cik FROM institutions i JOIN filings f ON f.institution_id=i.id AND f.status='completed' JOIN holdings h ON h.filing_id=f.id GROUP BY i.cik;"`,
    { cwd: root, encoding: "utf8" }
  );
  return new Set([...out.matchAll(/"cik":\s*"(\d+)"/g)].map((m) => m[1]));
}

async function main() {
  process.env.SEC_USER_AGENT =
    process.env.SEC_USER_AGENT ?? "HoldingsKit contact@oktangle.com";

  const { env, dispose } = await getPlatformProxy({
    configPath: join(root, "wrangler.ingestion.jsonc"),
    remoteBindings: true,
  });

  const { createDb } = await import(pathToFileURL(join(root, "src/lib/db/index.ts")).href);
  const { processFilingIngest } = await import(
    pathToFileURL(join(root, "src/lib/ingest/processor.ts")).href
  );
  const { SecEdgarClient } = await import(
    pathToFileURL(join(root, "src/lib/sec/client.ts")).href
  );

  const db = createDb(env.DB);
  const secClient = new SecEdgarClient(env.SEC_USER_AGENT);
  const have = remoteHaveCiks();
  const quarters = getRecentQuarterEnds(QUARTERS);
  const targets = seed.filter((s) => !have.has(normalizeCik(s.cik)));

  console.log(`Sync ${targets.length} institutions x ${quarters.length} quarters`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const inst of targets) {
    const cik = normalizeCik(inst.cik);
    console.log(`\n>> ${inst.name} (${cik})`);
    for (const periodEnd of quarters) {
      try {
        const result = await processFilingIngest(
          db,
          env.DB,
          env.R2,
          secClient,
          { cik, periodEnd, type: "backfill", force: true }
        );
        if (result?.skipped) {
          console.log(`  ${periodEnd}: skipped (${result.reason ?? "done"})`);
          skip++;
        } else {
          console.log(`  ${periodEnd}: ok`);
          ok++;
        }
      } catch (e) {
        console.log(`  ${periodEnd}: FAIL ${e.message?.slice(0, 100)}`);
        fail++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\nSummary: ok=${ok} skip=${skip} fail=${fail}`);
  await dispose();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
