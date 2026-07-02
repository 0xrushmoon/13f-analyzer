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

const RATE_LIMIT_MS = 100;

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
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
    await rateLimit();
    const response = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json, application/xml, text/xml, */*",
      },
    });
    if (!response.ok) {
      throw new Error(`SEC request failed: ${response.status} ${url}`);
    }
    return response;
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

  async downloadInfotable(
    cik: string,
    accessionNumber: string
  ): Promise<string> {
    const paddedCik = padCik(cik).replace(/^0+/, "");
    const accessionPath = accessionNumber.replace(/-/g, "");
    const baseUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionPath}`;

    const indexUrl = `${baseUrl}/index.json`;
    try {
      const indexResponse = await this.fetch(indexUrl);
      const indexData = (await indexResponse.json()) as {
        directory: { item: Array<{ name: string }> };
      };
      const items = indexData.directory?.item ?? [];
      const infotableFile = items.find(
        (item) =>
          item.name.toLowerCase().includes("infotable") &&
          item.name.endsWith(".xml")
      );
      if (infotableFile) {
        const xmlResponse = await this.fetch(`${baseUrl}/${infotableFile.name}`);
        return xmlResponse.text();
      }
    } catch {
      // fall through to common filenames
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

export function getRecentQuarterEnds(count = 4): string[] {
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
