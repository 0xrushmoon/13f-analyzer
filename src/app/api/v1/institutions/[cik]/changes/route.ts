import { NextRequest, NextResponse } from "next/server";
import { withAgentAccess } from "@/lib/api/agent-access";
import { getInstitutionByCik, getHoldingChanges } from "@/lib/db/queries";
import { quarterLabelToPeriodEnd } from "@/lib/sec/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cik: string }> },
) {
  return withAgentAccess(request, "query", async ({ db }) => {
    const { cik } = await params;
    const periodParam =
      request.nextUrl.searchParams.get("period") ??
      request.nextUrl.searchParams.get("to");

    if (!periodParam) {
      return NextResponse.json(
        { error: "Missing period or to query parameter" },
        { status: 400 },
      );
    }

    const institution = await getInstitutionByCik(db, cik);
    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    const periodEnd = quarterLabelToPeriodEnd(periodParam) ?? periodParam;
    const changes = await getHoldingChanges(db, institution.id, periodEnd);

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
  });
}
