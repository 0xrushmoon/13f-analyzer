import { NextRequest, NextResponse } from "next/server";
import { withAgentAccess } from "@/lib/api/agent-access";
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
  { params }: { params: Promise<{ cik: string }> },
) {
  return withAgentAccess(request, "query", async ({ db }) => {
    const { cik } = await params;
    const periodParam = request.nextUrl.searchParams.get("period");

    const institution = await getInstitutionByCik(db, cik);
    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    let filing;
    if (periodParam) {
      const periodEnd = quarterLabelToPeriodEnd(periodParam) ?? periodParam;
      filing = await getFilingByPeriod(db, institution.id, periodEnd);
    } else {
      filing = await getLatestFiling(db, institution.id);
    }

    if (!filing) {
      return NextResponse.json({ error: "No holdings data" }, { status: 404 });
    }

    const holdingsList = await getHoldingsByFiling(db, filing.id);

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
  });
}
