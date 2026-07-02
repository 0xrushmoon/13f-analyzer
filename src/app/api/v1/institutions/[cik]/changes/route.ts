import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth-middleware";
import {
  getInstitutionByCik,
  getHoldingChanges,
} from "@/lib/db/queries";
import { quarterLabelToPeriodEnd } from "@/lib/sec/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { cik } = await params;
  const periodParam =
    request.nextUrl.searchParams.get("period") ??
    request.nextUrl.searchParams.get("to");

  if (!periodParam) {
    return NextResponse.json(
      { error: "请提供 period 或 to 参数" },
      { status: 400 }
    );
  }

  const institution = await getInstitutionByCik(auth.db, cik);
  if (!institution) {
    return NextResponse.json({ error: "机构未找到" }, { status: 404 });
  }

  const periodEnd = quarterLabelToPeriodEnd(periodParam) ?? periodParam;
  const changes = await getHoldingChanges(auth.db, institution.id, periodEnd);

  return NextResponse.json({
    institution: { cik: institution.cik, name: institution.name },
    period: periodParam,
    changes: changes.map((c) => ({
      cusip: c.cusip,
      issuer_name: c.issuerName,
      change_type: c.changeType,
      shares_delta: c.sharesDelta,
      value_delta: c.valueDelta,
      value_current: c.valueCurrent,
      value_previous: c.valuePrevious,
    })),
  });
}
