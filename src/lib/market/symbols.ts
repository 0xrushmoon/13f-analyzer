/** Common CUSIP → Yahoo Finance symbol mappings for major US equities. */
const CUSIP_SYMBOL: Record<string, string> = {
  "037833100": "AAPL",
  "594918104": "MSFT",
  "02079K305": "GOOGL",
  "02079K107": "GOOG",
  "023135106": "AMZN",
  "67066G104": "NVDA",
  "30303M102": "META",
  "88160R101": "TSLA",
  "46625H100": "JPM",
  "060505104": "BAC",
  "191216100": "KO",
  "166764100": "CVX",
  "025816109": "AXP",
  "674599105": "OXY",
  "92826C839": "V",
  "742718109": "PG",
  "478160104": "JNJ",
  "931142103": "WMT",
  "58933Y105": "MRK",
  "713448108": "PEP",
  "172967424": "C",
  "615369105": "MCO",
  "500754106": "KHC",
  "92840M102": "VZ",
  "H1467J104": "CB",
  "829933100": "SIRI",
  "23918K108": "DVA",
  "92343E102": "VRSN",
  "501044101": "KR",
  "247361702": "DAL",
};

export function resolveSymbol(
  cusip: string,
  issuerName?: string
): string | null {
  const mapped = CUSIP_SYMBOL[cusip];
  if (mapped) return mapped;

  if (!issuerName) return null;
  const cleaned = issuerName
    .replace(/\s+(INC|CORP|CO|LTD|PLC|SA|NV|AG)\.?$/i, "")
    .trim();
  if (cleaned.length < 2) return null;
  return null;
}

export function getKnownSymbol(cusip: string): string | null {
  return CUSIP_SYMBOL[cusip] ?? null;
}
