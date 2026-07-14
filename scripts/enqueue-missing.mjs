#!/usr/bin/env node
/** Enqueue backfill for seed institutions missing completed holdings. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

function remoteCount() {
  const out = execSync(
    `pnpm wrangler d1 execute 13f-db --remote --command "SELECT COUNT(DISTINCT i.id) AS c FROM institutions i JOIN filings f ON f.institution_id=i.id AND f.status='completed' JOIN holdings h ON h.filing_id=f.id;"`,
    { cwd: root, encoding: "utf8" }
  );
  const m = out.match(/"c":\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

async function main() {
  const { env, dispose } = await getPlatformProxy({
    configPath: join(root, "wrangler.ingestion.jsonc"),
    remoteBindings: true,
  });

  try {
    for (const item of seed) {
      const cik = normalizeCik(item.cik);
      await env.DB.prepare(
        `INSERT INTO institutions (cik, name, ticker, tier, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 'curated', 1, datetime('now'), datetime('now'))
         ON CONFLICT(cik) DO UPDATE SET name=excluded.name, ticker=excluded.ticker, is_active=1, updated_at=datetime('now')`
      )
        .bind(cik, item.name, item.ticker ?? null)
        .run();
    }

    const out = execSync(
      `pnpm wrangler d1 execute 13f-db --remote --command "SELECT i.cik FROM institutions i JOIN filings f ON f.institution_id=i.id AND f.status='completed' JOIN holdings h ON h.filing_id=f.id GROUP BY i.cik;"`,
      { cwd: root, encoding: "utf8" }
    );
    const ciks = [...out.matchAll(/"cik":\s*"(\d+)"/g)].map((m) => m[1]);
    const have = new Set(ciks);
    const missing = seed.filter((s) => !have.has(normalizeCik(s.cik)));
    const quarters = getRecentQuarterEnds(QUARTERS);
    const messages = [];
    for (const item of missing) {
      for (const periodEnd of quarters) {
        messages.push({
          cik: normalizeCik(item.cik),
          periodEnd,
          type: "backfill",
          force: true,
        });
      }
    }

    console.log(`Existing with holdings: ${have.size}/${seed.length}`);
    console.log(`Enqueue ${messages.length} messages for ${missing.length} institutions`);

    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      await env.INGEST_QUEUE.sendBatch(
        messages.slice(i, i + batchSize).map((body) => ({ body }))
      );
    }

    console.log("Polling remote progress...");
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 30_000));
      const c = remoteCount();
      process.stdout.write(`\r[${i + 1}/90] with holdings: ${c}/${seed.length}`);
      if (c >= seed.length) break;
    }
    console.log("\nFinal:", remoteCount(), "with holdings");
  } finally {
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
