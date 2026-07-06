"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

interface Institution {
  id: number;
  cik: string;
  name: string;
  ticker: string | null;
  tier: string;
  summary?: {
    totalValue: number;
    periodEnd: string;
    holdingsCount: number;
  } | null;
}

export default function InstitutionsPage() {
  const { dict } = useLocale();
  const t = dict.institutions;

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/institutions${params}`)
      .then((r) => r.json())
      .then((raw: unknown) => {
        const data = raw as { institutions?: Institution[] };
        setInstitutions(data.institutions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9 text-sm"
        />
      </div>

      {!loading && institutions.length > 0 && institutions.every((i) => !i.summary) && (
        <div className="alert-banner">
          {t.backfillHint.replace("{count}", String(institutions.length))}{" "}
          <Link href="/admin" className="underline font-medium text-foreground">
            {t.adminLink}
          </Link>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm py-8">{t.loading}</p>
      ) : institutions.length === 0 ? (
        <div className="panel py-12 text-center text-muted-foreground text-sm">
          {t.emptyState}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.colName}</th>
                  <th>CIK</th>
                  <th className="text-right">{t.totalValue}</th>
                  <th className="text-right">{t.holdingsCount}</th>
                  <th className="text-right">{t.asOf}</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <Link
                        href={`/institutions/${inst.cik}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {inst.name}
                      </Link>
                      {inst.ticker && (
                        <span className="ml-2 text-xs text-muted-foreground num">
                          {inst.ticker}
                        </span>
                      )}
                    </td>
                    <td className="num text-xs text-muted-foreground">{inst.cik}</td>
                    <td className="num text-right font-medium">
                      {inst.summary ? formatUsd(inst.summary.totalValue) : "—"}
                    </td>
                    <td className="num text-right text-muted-foreground">
                      {inst.summary?.holdingsCount ?? "—"}
                    </td>
                    <td className="num text-right text-xs text-muted-foreground">
                      {inst.summary?.periodEnd ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
