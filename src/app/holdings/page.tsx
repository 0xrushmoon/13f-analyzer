"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatUsd, formatShares } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";
import { HoldingsChangesChart } from "@/components/holdings/holdings-changes-chart";
import {
  QuarterTrendChart,
  type QuarterHoldings,
} from "@/components/holdings/quarter-trend-chart";

interface ChangeItem {
  cusip: string;
  issuerName: string;
  changeType: string;
  sharesDelta: number;
  valueDelta: number;
  valueCurrent: number;
}

function CompareContent() {
  const { dict } = useLocale();
  const { holdingsCompare: t, charts } = dict;

  const searchParams = useSearchParams();
  const initialCik = searchParams.get("cik") ?? "";
  const [cik, setCik] = useState(initialCik);
  const [fromPeriod, setFromPeriod] = useState("");
  const [toPeriod, setToPeriod] = useState("");
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [quarterHoldings, setQuarterHoldings] = useState<QuarterHoldings[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cik) return;
    fetch(`/api/institutions/${cik}/filings`)
      .then((r) => r.json())
      .then(async (raw: unknown) => {
        const data = raw as { filings?: { periodEnd: string }[] };
        const periods = (data.filings ?? []).map((f) => f.periodEnd);
        if (periods.length >= 2) {
          setFromPeriod(periods[1]);
          setToPeriod(periods[0]);
        } else if (periods.length === 1) {
          setToPeriod(periods[0]);
        }

        const recent = periods.slice(0, 4).reverse();
        const quarters = await Promise.all(
          recent.map(async (period) => {
            const res = await fetch(
              `/api/institutions/${cik}/holdings?period=${encodeURIComponent(period)}`
            );
            const body = (await res.json()) as {
              holdings?: Array<{
                cusip: string;
                issuerName: string;
                valueUsd: number;
              }>;
            };
            return {
              period,
              holdings: body.holdings ?? [],
            };
          })
        );
        setQuarterHoldings(quarters);
      });
  }, [cik]);

  const loadChanges = () => {
    if (!cik || !toPeriod) return;
    setLoading(true);
    fetch(
      `/api/institutions/${cik}/changes?period=${encodeURIComponent(toPeriod)}`
    )
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data = raw as { changes?: ChangeItem[] };
        setChanges(data.changes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (cik && toPeriod) loadChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cik, toPeriod]);

  const changeColor = (type: string) => {
    if (type === "new" || type === "increased") return "text-market-up";
    if (type === "closed" || type === "decreased") return "text-market-down";
    return "text-muted-foreground";
  };

  const changeLabel = (type: string) =>
    charts.changeTypes[type as keyof typeof charts.changeTypes] ?? type;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
      <p className="text-muted-foreground mb-8">{t.subtitle}</p>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cik">{t.cikLabel}</Label>
              <Input
                id="cik"
                value={cik}
                onChange={(e) => setCik(e.target.value)}
                placeholder="0001067983"
              />
            </div>
            <div>
              <Label htmlFor="from">{t.fromPeriod}</Label>
              <Input
                id="from"
                value={fromPeriod}
                onChange={(e) => setFromPeriod(e.target.value)}
                placeholder="2024-06-30"
              />
            </div>
            <div>
              <Label htmlFor="to">{t.toPeriod}</Label>
              <Input
                id="to"
                value={toPeriod}
                onChange={(e) => setToPeriod(e.target.value)}
                placeholder="2024-09-30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">{t.loading}</p>
      ) : changes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.emptyState}
          </CardContent>
        </Card>
      ) : (
        <>
          {quarterHoldings.length >= 2 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t.quarterTrend}</CardTitle>
                <CardDescription>{charts.quarterTrendDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <QuarterTrendChart quarters={quarterHoldings} />
              </CardContent>
            </Card>
          )}

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t.changesChart}</CardTitle>
            </CardHeader>
            <CardContent>
              <HoldingsChangesChart changes={changes} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t.changesTitle} ({changes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4">{t.security}</th>
                      <th className="pb-3 pr-4">{t.changeType}</th>
                      <th className="pb-3 pr-4 text-right">{t.sharesDelta}</th>
                      <th className="pb-3 text-right">{t.valueDelta}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.cusip} className="border-b">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{c.issuerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.cusip}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              c.changeType === "new" ||
                              c.changeType === "increased"
                                ? "success"
                                : c.changeType === "closed" ||
                                    c.changeType === "decreased"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {changeLabel(c.changeType)}
                          </Badge>
                        </td>
                        <td
                          className={`py-3 pr-4 text-right ${changeColor(c.changeType)}`}
                        >
                          {c.sharesDelta > 0 ? "+" : ""}
                          {formatShares(c.sharesDelta)}
                        </td>
                        <td
                          className={`py-3 text-right ${changeColor(c.changeType)}`}
                        >
                          {c.valueDelta > 0 ? "+" : ""}
                          {formatUsd(Math.abs(c.valueDelta))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function HoldingsComparePage() {
  const { dict } = useLocale();

  return (
    <Suspense
      fallback={
        <p className="p-8 text-muted-foreground">
          {dict.holdingsCompare.loading}
        </p>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
