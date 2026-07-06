import { NextRequest, NextResponse } from "next/server";
import { withAgentAccess } from "@/lib/api/agent-access";
import { getInstitutions, getInstitutionSummary } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  return withAgentAccess(request, "query", async ({ db }) => {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const list = await getInstitutions(db, search);

    const institutions = await Promise.all(
      list.map(async (inst) => {
        const summary = await getInstitutionSummary(db, inst.id);
        return {
          cik: inst.cik,
          name: inst.name,
          ticker: inst.ticker,
          latest_period: summary?.latestFiling.periodEnd ?? null,
          total_value_usd: summary?.totalValue ?? null,
        };
      }),
    );

    return NextResponse.json({ institutions });
  });
}
