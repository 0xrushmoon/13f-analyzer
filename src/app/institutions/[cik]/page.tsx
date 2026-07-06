import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { HoldingsTable } from "@/components/holdings/holdings-table";
import { TopHoldingsChart } from "@/components/holdings/top-holdings-chart";
import { QuarterTrendChart } from "@/components/holdings/quarter-trend-chart";
import { formatUsd } from "@/lib/utils";
import { getDb } from "@/lib/cloudflare";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import {
  getInstitutionByCik,
  getFilingsByInstitution,
  getLatestFiling,
  getHoldingsByFiling,
} from "@/lib/db/queries";

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ cik: string }>;
}) {
  const { cik } = await params;
  const cookieStore = await cookies();
  const dict = getDictionary(resolveLocale(cookieStore.get("locale")?.value));
  const t = dict.institutionDetail;
  const { charts } = dict;

  const db = await getDb();

  if (!db) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t.dbNotConnected}</p>
      </div>
    );
  }

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) notFound();

  const filings = await getFilingsByInstitution(db, institution.id);
  const latestFiling = await getLatestFiling(db, institution.id);
  const holdingsList = latestFiling
    ? await getHoldingsByFiling(db, latestFiling.id)
    : [];
  const totalValue = holdingsList.reduce((s, h) => s + h.valueUsd, 0);

  const recentFilings = filings.slice(0, 4).reverse();
  const quarterHoldings = await Promise.all(
    recentFilings.map(async (f) => ({
      period: f.periodEnd,
      holdings: (await getHoldingsByFiling(db, f.id)).map((h) => ({
        cusip: h.cusip,
        issuerName: h.issuerName,
        valueUsd: h.valueUsd,
      })),
    }))
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{institution.name}</h1>
          <p className="text-sm text-muted-foreground mt-1 num">
            CIK {institution.cik}
            {institution.ticker && ` · ${institution.ticker}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/holdings?cik=${institution.cik}`}>
              {dict.holdingsCompare.title}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/analyze?cik=${institution.cik}`}>{t.aiAnalyze}</Link>
          </Button>
        </div>
      </div>

      {latestFiling ? (
        <div className="grid grid-cols-3 gap-px bg-border border border-border mb-6">
          <div className="bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.totalValue}</p>
            <p className="stat-value mt-1">{formatUsd(totalValue)}</p>
          </div>
          <div className="bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.holdingsCount}</p>
            <p className="stat-value mt-1">{holdingsList.length}</p>
          </div>
          <div className="bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.reportPeriod}</p>
            <p className="stat-value mt-1 text-lg">{latestFiling.periodEnd}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.filedAt}: {latestFiling.filedAt ?? t.filedAtUnknown}
            </p>
          </div>
        </div>
      ) : (
        <div className="panel mb-6 py-12 text-center text-muted-foreground text-sm">
          {charts.noData}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {quarterHoldings.length >= 2 && (
          <div className="panel lg:col-span-2">
            <div className="panel-header">
              <h2 className="text-sm font-semibold">{charts.quarterTrend}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{charts.quarterTrendDesc}</p>
            </div>
            <div className="panel-body">
              <QuarterTrendChart quarters={quarterHoldings} />
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-header">
            <h2 className="text-sm font-semibold">{charts.topHoldings}</h2>
          </div>
          <div className="panel-body">
            <TopHoldingsChart
              holdings={holdingsList.slice(0, 10)}
              cik={institution.cik}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="text-sm font-semibold">{t.filingHistory}</h2>
          </div>
          <div className="panel-body p-0">
            {filings.length === 0 ? (
              <p className="text-muted-foreground text-sm p-4">{charts.noData}</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.reportPeriod}</th>
                    <th className="text-right">{t.filedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {filings.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <Link
                          href={`/institutions/${institution.cik}/filings/${encodeURIComponent(f.accessionNumber)}`}
                          className="font-medium hover:text-primary transition-colors num"
                        >
                          {f.periodEnd}
                        </Link>
                      </td>
                      <td className="text-right text-muted-foreground text-xs num">
                        {f.filedAt ?? t.filedAtUnknown}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="text-sm font-semibold">{t.allHoldings}</h2>
        </div>
        <div className="panel-body pt-2">
          <HoldingsTable holdings={holdingsList} cik={institution.cik} />
        </div>
      </div>
    </div>
  );
}
