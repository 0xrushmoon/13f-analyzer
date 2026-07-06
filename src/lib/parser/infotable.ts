import { XMLParser } from "fast-xml-parser";
import { parseSecValueUsd } from "./value-units";

export interface ParsedHolding {
  cusip: string;
  issuerName: string;
  ticker?: string;
  shares: number;
  valueUsd: number;
  putCall?: string;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as { "#text": string })["#text"]).trim();
  }
  return "";
}

export interface ParseInfotableOptions {
  /** Filing date (YYYY-MM-DD) — determines pre/post 2023 value unit. */
  filedAt?: string | null;
}

export function parseInfotableXml(
  xml: string,
  options: ParseInfotableOptions = {}
): ParsedHolding[] {
  const { filedAt } = options;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
    parseTagValue: false,
  });

  const parsed = parser.parse(xml);
  const root =
    parsed.informationTable ??
    parsed.InformationTable ??
    parsed.infoTable ??
    parsed;

  const table =
    root?.infoTable ??
    root?.InfoTable ??
    (root &&
    typeof root === "object" &&
    ("cusip" in root || "CUSIP" in root || "nameOfIssuer" in root)
      ? root
      : null);
  const entries = normalizeArray(table);

  const holdings: ParsedHolding[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const e = entry as Record<string, unknown>;
    const cusip = extractText(e.cusip ?? e.CUSIP ?? e.cusipNumber);
    const issuerName = extractText(
      e.nameOfIssuer ?? e.NameOfIssuer ?? e.issuerName
    );
    const ticker = extractText(e.titleOfClass ?? e.TitleOfClass) || undefined;
    const shares = parseNumber(
      (e.shrsOrPrnAmt as Record<string, unknown>)?.sshPrnamt ??
        (e.shrsOrPrnAmt as Record<string, unknown>)?.SshPrnamt ??
        e.sshPrnamt
    );
    const valueUsd = parseSecValueUsd(
      parseNumber(e.value ?? e.Value),
      filedAt
    );
    const putCall =
      extractText(e.putCall ?? e.PutCall) || undefined;

    if (!cusip || !issuerName) continue;

    holdings.push({
      cusip,
      issuerName,
      ticker: ticker || undefined,
      shares,
      valueUsd,
      putCall: putCall || undefined,
    });
  }

  return holdings;
}
