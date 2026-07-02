import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth-middleware";
import {
  getInstitutionByCik,
  getFilingByPeriod,
  getHoldingsByFiling,
  getLatestFiling,
} from "@/lib/db/queries";
import {
  quarterLabelToPeriodEnd,
  periodToQuarterLabel,
} from "@/lib/sec/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { cik } = await params;
  const periodParam = request.nextUrl.searchParams.get("period");

  const institution = await getInstitutionByCik(auth.db, cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  let filing;
  if (periodParam) {
    const periodEnd =
      quarterLabelToPeriodEnd(periodParam) ?? periodParam;
    filing = await getFilingByPeriod(auth.db, institution.id, periodEnd);
  } else {
    filing = await getLatestFiling(auth.db, institution.id);
  }

  if (!filing) {
    return NextResponse.json({ error: "暂无持仓数据" }, { status: 404 });
  }

  const holdingsList = await getHoldingsByFiling(auth.db, filing.id);

  return NextResponse.json({
    institution: {
      cik: institution.cik,
      name: institution.name,
    },
    period: periodToQuarterLabel(filing.periodEnd),
    period_end: filing.periodEnd,
    filed_at: filing.filedAt,
    holdings: holdingsList.map((h) => ({
      cusip: h.cusip,
      issuer_name: h.issuerName,
      ticker: h.ticker,
      shares: h.shares,
      value_usd: h.valueUsd,
      put_call: h.putCall,
    })),
  });
}
