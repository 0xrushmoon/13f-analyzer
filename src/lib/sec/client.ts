export interface SecFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
}

export interface SecSubmissions {
  cik: string;
  name: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}

const RATE_LIMIT_MS = 150;
const MAX_RETRIES = 4;
const RETRYABLE_STATUS = new Set([403, 429, 500, 502, 503, 504]);

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getUserAgent(): string {
  return (
    process.env.SEC_USER_AGENT ??
    "13F-Analyzer contact@example.com"
  );
}

function padCik(cik: string): string {
  const stripped = cik.replace(/^0+/, "");
  return stripped.padStart(10, "0");
}

export function formatCikForUrl(cik: string): string {
  return padCik(cik);
}

export class SecEdgarClient {
  private userAgent: string;

  constructor(userAgent?: string) {
    this.userAgent = userAgent ?? getUserAgent();
  }

  private async fetch(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await rateLimit();
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json, application/xml, text/xml, */*",
          "Accept-Encoding": "gzip, deflate",
        },
      });

      if (response.ok) {
        return response;
      }

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES - 1) {
        await sleep(400 * 2 ** attempt);
        continue;
      }

      lastError = new Error(`SEC request failed: ${response.status} ${url}`);
      break;
    }

    throw lastError ?? new Error(`SEC request failed: ${url}`);
  }

  async getSubmissions(cik: string): Promise<SecSubmissions> {
    const padded = padCik(cik);
    const url = `https://data.sec.gov/submissions/CIK${padded}.json`;
    const response = await this.fetch(url);
    const data = (await response.json()) as {
      cik: string;
      name: string;
      filings: SecSubmissions["filings"];
    };
    return {
      cik: data.cik,
      name: data.name,
      filings: data.filings,
    };
  }

  get13FFilings(submissions: SecSubmissions): SecFiling[] {
    const { recent } = submissions.filings;
    const filings: SecFiling[] = [];

    for (let i = 0; i < recent.form.length; i++) {
      const form = recent.form[i];
      if (form !== "13F-HR" && form !== "13F-HR/A") continue;

      filings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate[i],
        form,
        primaryDocument: recent.primaryDocument[i],
      });
    }

    return filings;
  }

  private isIndexArtifact(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.includes("-index") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".html") ||
      lower === "primary_doc.xml"
    );
  }

  private looksLikeInfotableFilename(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.endsWith(".xml") &&
      (lower.includes("infotable") ||
        lower.includes("informationtable") ||
        lower.includes("form13f") ||
        /^13f[_-]/.test(lower) ||
        /[_-]13f[_-]/.test(lower))
    );
  }

  private findInfotableFromIndex(
    items: Array<{ name: string; type?: string; description?: string }>
  ): string | null {
    const byName = items.find((item) =>
      this.looksLikeInfotableFilename(item.name)
    );
    if (byName) return byName.name;

    const byType = items.find((item) => {
      const type = (item.type ?? "").toUpperCase();
      const desc = (item.description ?? "").toUpperCase();
      return (
        item.name.toLowerCase().endsWith(".xml") &&
        (type.includes("INFORMATION TABLE") ||
          desc.includes("INFORMATION TABLE"))
      );
    });
    if (byType) return byType.name;

    const xmlCandidates = items.filter(
      (item) =>
        item.name.toLowerCase().endsWith(".xml") &&
        !this.isIndexArtifact(item.name)
    );
    if (xmlCandidates.length === 1) return xmlCandidates[0].name;

    return null;
  }

  private async parseInfotableFilenameFromSubmission(
    baseUrl: string,
    accessionNumber: string
  ): Promise<string | null> {
    try {
      const response = await this.fetch(`${baseUrl}/${accessionNumber}.txt`);
      const text = await response.text();
      const matches = [
        ...text.matchAll(
          /<TYPE>\s*INFORMATION\s+TABLE[\s\S]*?<FILENAME>\s*([^\s<]+)/gi
        ),
      ];
      return matches.at(-1)?.[1]?.trim() ?? null;
    } catch {
      return null;
    }
  }

  private async probeXmlForInfotable(
    baseUrl: string,
    filenames: string[]
  ): Promise<string | null> {
    for (const name of filenames) {
      try {
        const response = await this.fetch(`${baseUrl}/${name}`);
        const head = (await response.text()).slice(0, 4000);
        if (/informationTable|infoTable/i.test(head)) return name;
      } catch {
        continue;
      }
    }
    return null;
  }

  async downloadInfotable(
    cik: string,
    accessionNumber: string
  ): Promise<string> {
    const paddedCik = padCik(cik).replace(/^0+/, "");
    const accessionPath = accessionNumber.replace(/-/g, "");
    const baseUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionPath}`;

    const fromSubmission = await this.parseInfotableFilenameFromSubmission(
      baseUrl,
      accessionNumber
    );
    if (fromSubmission) {
      const xmlResponse = await this.fetch(`${baseUrl}/${fromSubmission}`);
      return xmlResponse.text();
    }

    let items: Array<{ name: string; type?: string; description?: string }> =
      [];
    try {
      const indexResponse = await this.fetch(`${baseUrl}/index.json`);
      const indexData = (await indexResponse.json()) as {
        directory: {
          item: Array<{ name: string; type?: string; description?: string }>;
        };
      };
      items = indexData.directory?.item ?? [];
      const fromIndex = this.findInfotableFromIndex(items);
      if (fromIndex) {
        const xmlResponse = await this.fetch(`${baseUrl}/${fromIndex}`);
        return xmlResponse.text();
      }
    } catch {
      // fall through to content probing
    }

    const xmlCandidates = items
      .filter(
        (item) =>
          item.name.toLowerCase().endsWith(".xml") &&
          !this.isIndexArtifact(item.name)
      )
      .map((item) => item.name);
    const probed = await this.probeXmlForInfotable(baseUrl, xmlCandidates);
    if (probed) {
      const xmlResponse = await this.fetch(`${baseUrl}/${probed}`);
      return xmlResponse.text();
    }

    const candidates = [
      "infotable.xml",
      "Form13FInfoTable.xml",
      "form13fInfoTable.xml",
    ];
    for (const filename of candidates) {
      try {
        const response = await this.fetch(`${baseUrl}/${filename}`);
        return response.text();
      } catch {
        continue;
      }
    }

    throw new Error(
      `Could not find infotable XML for ${cik} ${accessionNumber}`
    );
  }

  buildR2Key(cik: string, accessionNumber: string): string {
    const padded = padCik(cik);
    const accessionPath = accessionNumber.replace(/-/g, "");
    return `${padded}/${accessionPath}/infotable.xml`;
  }
}

/** Default backfill depth — last 3 completed quarters. */
export const DEFAULT_BACKFILL_QUARTERS = 3;

export function getRecentQuarterEnds(count = DEFAULT_BACKFILL_QUARTERS): string[] {
  const quarters: string[] = [];
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

export function periodToQuarterLabel(periodEnd: string): string {
  const [year, month] = periodEnd.split("-").map(Number);
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}

export function quarterLabelToPeriodEnd(label: string): string | null {
  const match = label.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const q = parseInt(match[2], 10);
  const month = q * 3;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
