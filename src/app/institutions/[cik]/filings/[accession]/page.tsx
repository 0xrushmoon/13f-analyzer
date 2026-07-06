import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getDb } from "@/lib/cloudflare";
import { getDictionary, resolveLocale } from "@/lib/i18n";
import {
  getInstitutionByCik,
  getFilingByAccession,
  getHoldingsByFiling,
} from "@/lib/db/queries";
import { formatUsd, formatShares, secFilingUrl } from "@/lib/utils";

export default async function FilingDetailPage({
  params,
}: {
  params: Promise<{ cik: string; accession: string }>;
}) {
  const { cik, accession } = await params;
  const accessionNumber = decodeURIComponent(accession);

  const cookieStore = await cookies();
  const dict = getDictionary(resolveLocale(cookieStore.get("locale")?.value));
  const t = dict.filingDetail;

  const db = await getDb();
  if (!db) notFound();

  const institution = await getInstitutionByCik(db, cik);
  if (!institution) notFound();

  const filing = await getFilingByAccession(
    db,
    institution.id,
    accessionNumber
  );
  if (!filing) notFound();

  const holdingsList = await getHoldingsByFiling(db, filing.id);
  const topHoldings = holdingsList.slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/institutions/${institution.cik}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t.backToInstitution}
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{institution.name}</p>
        </div>
        <Button variant="outline" asChild>
          <a
            href={secFilingUrl(institution.cik, filing.accessionNumber)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.viewOnSec}
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.accessionNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono break-all">{filing.accessionNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.periodEnd}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filing.periodEnd}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.filedAt}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {filing.filedAt ?? t.filedAtUnknown}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{filing.status}</Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {t.holdingsCount}: {holdingsList.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.topHoldings}</CardTitle>
        </CardHeader>
        <CardContent>
          {topHoldings.length === 0 ? (
            <p className="text-muted-foreground text-sm">{dict.charts.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4">{dict.holdingsTable.security}</th>
                    <th className="pb-3 pr-4">{dict.holdingsTable.cusip}</th>
                    <th className="pb-3 pr-4 text-right">
                      {dict.holdingsTable.shares}
                    </th>
                    <th className="pb-3 text-right">
                      {dict.holdingsTable.value}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topHoldings.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/institutions/${institution.cik}/holdings/${h.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {h.issuerName}
                        </Link>
                        {h.ticker && (
                          <div className="text-xs text-muted-foreground">
                            {h.ticker}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {h.cusip}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatShares(h.shares)}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatUsd(h.valueUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
