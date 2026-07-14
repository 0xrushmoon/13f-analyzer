#!/usr/bin/env node
/**
 * Remote cleanup: delete institutions outside seed and those without holdings.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(
  readFileSync(join(root, "src/data/institutions.seed.json"), "utf8")
);

function normalizeCik(cik) {
  return String(cik).replace(/^0+/, "").padStart(10, "0");
}

function d1(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  execSync(`pnpm wrangler d1 execute 13f-db --remote --command "${escaped}"`, {
    cwd: root,
    stdio: "inherit",
  });
}

function d1Json(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const out = execSync(
    `pnpm wrangler d1 execute 13f-db --remote --command "${escaped}"`,
    { cwd: root, encoding: "utf8" }
  );
  const m = out.match(/"results":\s*(\[[\s\S]*?\])\s*,\s*"success"/);
  return m ? JSON.parse(m[1]) : [];
}

async function main() {
  const seedCiks = seed.map((s) => normalizeCik(s.cik));
  const inList = seedCiks.map((c) => `'${c}'`).join(",");

  console.log("==> Delete institutions outside seed...");
  d1(
    `DELETE FROM holdings WHERE filing_id IN (SELECT f.id FROM filings f JOIN institutions i ON i.id = f.institution_id WHERE i.cik NOT IN (${inList}))`
  );
  d1(
    `DELETE FROM filings WHERE institution_id IN (SELECT id FROM institutions WHERE cik NOT IN (${inList}))`
  );
  d1(
    `DELETE FROM holding_changes WHERE institution_id IN (SELECT id FROM institutions WHERE cik NOT IN (${inList}))`
  );
  d1(`DELETE FROM institutions WHERE cik NOT IN (${inList})`);

  console.log("==> Delete failed filings (holdings first)...");
  d1(
    `DELETE FROM holdings WHERE filing_id IN (SELECT id FROM filings WHERE status = 'failed')`
  );
  d1(`DELETE FROM filings WHERE status = 'failed'`);

  console.log("==> Delete institutions with zero holdings...");
  d1(
    `DELETE FROM holdings WHERE filing_id IN (
      SELECT f.id FROM filings f
      LEFT JOIN (SELECT filing_id, COUNT(*) AS cnt FROM holdings GROUP BY filing_id) h ON h.filing_id = f.id
      WHERE COALESCE(h.cnt, 0) = 0
    )`
  );
  d1(
    `DELETE FROM filings WHERE id IN (
      SELECT f.id FROM filings f
      LEFT JOIN holdings h ON h.filing_id = f.id
      WHERE f.status != 'processing'
      GROUP BY f.id
      HAVING COUNT(h.id) = 0
    )`
  );
  d1(
    `DELETE FROM holding_changes WHERE institution_id IN (
      SELECT i.id FROM institutions i
      LEFT JOIN filings f ON f.institution_id = i.id AND f.status = 'completed'
      LEFT JOIN holdings h ON h.filing_id = f.id
      GROUP BY i.id
      HAVING COUNT(h.id) = 0
    )`
  );
  d1(
    `DELETE FROM institutions WHERE id IN (
      SELECT i.id FROM institutions i
      LEFT JOIN filings f ON f.institution_id = i.id AND f.status = 'completed'
      LEFT JOIN holdings h ON h.filing_id = f.id
      GROUP BY i.id
      HAVING COUNT(h.id) = 0
    )`
  );

  const stats = d1Json(
    `SELECT (SELECT COUNT(*) FROM institutions) AS total_inst,
            (SELECT COUNT(DISTINCT i.id) FROM institutions i
             JOIN filings f ON f.institution_id = i.id AND f.status = 'completed'
             JOIN holdings h ON h.filing_id = f.id) AS with_holdings`
  );
  console.log("Result:", stats[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
