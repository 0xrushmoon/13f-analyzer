import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import {
  getInstitutionByCik,
  getHoldingChanges,
} from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params;
  const period = request.nextUrl.searchParams.get("period");

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ changes: [] });
  }

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  if (!period) {
    return NextResponse.json(
      { error: "请提供 period 参数" },
      { status: 400 }
    );
  }

  const changes = await getHoldingChanges(db, institution.id, period);
  return NextResponse.json({ changes });
}
