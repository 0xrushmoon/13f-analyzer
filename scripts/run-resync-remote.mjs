#!/usr/bin/env node
/**
 * Resync seed institutions to remote D1 and process ingest queue locally
 * using Cloudflare remote bindings (no ADMIN_SECRET required).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(
  readFileSync(join(root, "src/data/institutions.seed.json"), "utf8")
);

const BACKFILL_QUARTERS = 3;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function countWithHoldings(db) {
  const { results } = await db
    .prepare(
      `SELECT COUNT(DISTINCT i.id) AS c
       FROM institutions i
       JOIN filings f ON f.institution_id = i.id AND f.status = 'completed'
       JOIN holdings h ON h.filing_id = f.id`
    )
    .all();
  return results?.[0]?.c ?? 0;
}

async function deleteOutsideSeed(db, seedCiks) {
  const placeholders = seedCiks.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT id, cik FROM institutions WHERE cik NOT IN (${placeholders})`)
    .bind(...seedCiks)
    .all();

  let deleted = 0;
  for (const row of results ?? []) {
    const filingRows = await db
      .prepare(`SELECT id FROM filings WHERE institution_id = ?`)
      .bind(row.id)
      .all();
    const filingIds = (filingRows.results ?? []).map((f) => f.id);
    if (filingIds.length > 0) {
      const ph = filingIds.map(() => "?").join(",");
      await db
        .prepare(`DELETE FROM holdings WHERE filing_id IN (${ph})`)
        .bind(...filingIds)
        .run();
      await db
        .prepare(`DELETE FROM filings WHERE institution_id = ?`)
        .bind(row.id)
        .run();
    }
    await db
      .prepare(`DELETE FROM holding_changes WHERE institution_id = ?`)
      .bind(row.id)
      .run();
    await db.prepare(`DELETE FROM institutions WHERE id = ?`).bind(row.id).run();
    deleted++;
  }
  return deleted;
}

async function upsertSeed(db) {
  for (const item of seed) {
    const cik = normalizeCik(item.cik);
    await db
      .prepare(
        `INSERT INTO institutions (cik, name, ticker, tier, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 'curated', 1, datetime('now'), datetime('now'))
         ON CONFLICT(cik) DO UPDATE SET
           name = excluded.name,
           ticker = excluded.ticker,
           is_active = 1,
           updated_at = datetime('now')`
      )
      .bind(cik, item.name, item.ticker ?? null)
      .run();
  }
}

async function cleanupEmpty(db) {
  const { results } = await db
    .prepare(
      `SELECT i.id, i.cik,
              COUNT(h.id) AS holding_rows
       FROM institutions i
       LEFT JOIN filings f ON f.institution_id = i.id AND f.status = 'completed'
       LEFT JOIN holdings h ON h.filing_id = f.id
       GROUP BY i.id
       HAVING holding_rows = 0`
    )
    .all();

  const deleted = [];
  for (const row of results ?? []) {
    const filingRows = await db
      .prepare(`SELECT id FROM filings WHERE institution_id = ?`)
      .bind(row.id)
      .all();
    const filingIds = (filingRows.results ?? []).map((f) => f.id);
    if (filingIds.length > 0) {
      const ph = filingIds.map(() => "?").join(",");
      await db
        .prepare(`DELETE FROM holdings WHERE filing_id IN (${ph})`)
        .bind(...filingIds)
        .run();
      await db
        .prepare(`DELETE FROM filings WHERE institution_id = ?`)
        .bind(row.id)
        .run();
    }
    await db
      .prepare(`DELETE FROM holding_changes WHERE institution_id = ?`)
      .bind(row.id)
      .run();
    await db.prepare(`DELETE FROM institutions WHERE id = ?`).bind(row.id).run();
    deleted.push(row.cik);
  }
  await db.prepare(`DELETE FROM filings WHERE status = 'failed'`).run();
  return deleted;
}

async function main() {
  console.log(`Seed: ${seed.length} institutions, ${BACKFILL_QUARTERS} quarters each`);

  const { env, dispose } = await getPlatformProxy({
    configPath: join(root, "wrangler.ingestion.jsonc"),
    remoteBindings: true,
  });

  try {
    const db = env.DB;
    const queue = env.INGEST_QUEUE;
    const seedCiks = seed.map((s) => normalizeCik(s.cik));

    console.log("\n==> Remove institutions outside seed...");
    const removed = await deleteOutsideSeed(db, seedCiks);
    console.log(`Removed ${removed} stale institutions`);

    console.log("\n==> Upsert seed institutions...");
    await upsertSeed(db);

    const { results: instRows } = await db
      .prepare(`SELECT cik FROM institutions WHERE is_active = 1`)
      .all();
    const ciks = (instRows ?? []).map((r) => r.cik);
    const quarters = getRecentQuarterEnds(BACKFILL_QUARTERS);
    const messages = [];
    for (const cik of ciks) {
      for (const periodEnd of quarters) {
        messages.push({ cik, periodEnd, type: "backfill", force: true });
      }
    }

    console.log(`\n==> Enqueue ${messages.length} ingest messages...`);
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      await queue.sendBatch(
        messages.slice(i, i + batchSize).map((body) => ({ body }))
      );
    }

    console.log("\n==> Waiting for queue consumer (poll every 30s)...");
    let last = 0;
    for (let i = 0; i < 180; i++) {
      await sleep(30_000);
      const count = await countWithHoldings(db);
      process.stdout.write(
        `\r[${i + 1}/180] institutions with holdings: ${count}/${seed.length}`
      );
      if (count >= seed.length * 0.85 && count === last && i > 5) break;
      if (count >= seed.length * 0.95) break;
      last = count;
    }
    console.log("");

    console.log("\n==> Cleanup institutions without holdings...");
    const deletedCiks = await cleanupEmpty(db);
    console.log(`Deleted ${deletedCiks.length} empty institutions`);
    if (deletedCiks.length) {
      console.log(deletedCiks.join(", "));
    }

    const final = await countWithHoldings(db);
    const { results: instCountRows } = await db
      .prepare(`SELECT COUNT(*) AS c FROM institutions`)
      .all();
    console.log(
      `\nDone: ${final} institutions with holdings, ${instCountRows?.[0]?.c ?? 0} institutions remain in DB`
    );
  } finally {
    await dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
