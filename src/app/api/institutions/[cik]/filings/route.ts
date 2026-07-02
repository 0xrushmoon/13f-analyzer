import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import {
  getInstitutionByCik,
  getFilingsByInstitution,
} from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params;
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ filings: [] });
  }

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  const filings = await getFilingsByInstitution(db, institution.id);
  return NextResponse.json({ filings });
}
