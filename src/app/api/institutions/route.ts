import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import { getInstitutions, getInstitutionSummary } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ institutions: [] });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const list = await getInstitutions(db, search);

  const institutions = await Promise.all(
    list.map(async (inst) => {
      const summary = await getInstitutionSummary(db, inst.id);
      return {
        ...inst,
        summary: summary
          ? {
              totalValue: summary.totalValue,
              periodEnd: summary.latestFiling.periodEnd,
              holdingsCount: summary.holdingsCount,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ institutions });
}
