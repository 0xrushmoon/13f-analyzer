import { createJiti } from "jiti";
import path from "node:path";
import { fileURLToPath } from "node:url";

const jiti = createJiti(fileURLToPath(import.meta.url));
const root = path.join(import.meta.dirname, "..");

const en = jiti(path.join(root, "src/lib/i18n/dictionaries/en.ts")).default;
const zhCN = jiti(path.join(root, "src/lib/i18n/dictionaries/zh-CN.ts")).default;

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, keyPath));
    } else if (Array.isArray(v)) {
      keys.push(keyPath);
      for (let i = 0; i < v.length; i++) {
        const item = v[i];
        if (item && typeof item === "object") {
          keys.push(...flattenKeys(item, `${keyPath}[${i}]`));
        }
      }
    } else {
      keys.push(keyPath);
    }
  }
  return keys.sort();
}

const enKeys = flattenKeys(en);
const zhKeys = flattenKeys(zhCN);

const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
const missingInEn = zhKeys.filter((k) => !enKeys.includes(k));

if (missingInZh.length || missingInEn.length) {
  console.error("i18n key mismatch:");
  if (missingInZh.length) console.error("  Missing in zh-CN:", missingInZh);
  if (missingInEn.length) console.error("  Missing in en:", missingInEn);
  process.exit(1);
}

console.log(`✓ i18n parity OK (${enKeys.length} keys)`);
