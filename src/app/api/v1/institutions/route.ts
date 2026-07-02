import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth-middleware";
import { getInstitutions, getInstitutionSummary } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const list = await getInstitutions(auth.db, search);

  const institutions = await Promise.all(
    list.map(async (inst) => {
      const summary = await getInstitutionSummary(auth.db, inst.id);
      return {
        cik: inst.cik,
        name: inst.name,
        ticker: inst.ticker,
        latest_period: summary?.latestFiling.periodEnd ?? null,
        total_value_usd: summary?.totalValue ?? null,
      };
    })
  );

  return NextResponse.json({ institutions });
}
