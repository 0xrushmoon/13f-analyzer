import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import {
  getInstitutionByCik,
  getFilingByPeriod,
  getHoldingsByFiling,
  getLatestFiling,
} from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params;
  const period = request.nextUrl.searchParams.get("period");

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ holdings: [] });
  }

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  const filing = period
    ? await getFilingByPeriod(db, institution.id, period)
    : await getLatestFiling(db, institution.id);

  if (!filing) {
    return NextResponse.json({ holdings: [], periodEnd: null });
  }

  const holdingsList = await getHoldingsByFiling(db, filing.id);

  return NextResponse.json({
    periodEnd: filing.periodEnd,
    holdings: holdingsList.map((h) => ({
      cusip: h.cusip,
      issuerName: h.issuerName,
      ticker: h.ticker,
      shares: h.shares,
      valueUsd: h.valueUsd,
      putCall: h.putCall,
    })),
  });
}
