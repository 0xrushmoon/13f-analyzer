"use client";

import Link from "next/link";
import { formatUsd, formatShares } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

interface Holding {
  id: number;
  issuerName: string;
  cusip: string;
  ticker: string | null;
  shares: number;
  valueUsd: number;
  putCall: string | null;
}

export function HoldingsTable({
  holdings,
  cik,
}: {
  holdings: Holding[];
  cik: string;
}) {
  const { dict } = useLocale();
  const t = dict.holdingsTable;

  if (holdings.length === 0) {
    return <p className="text-muted-foreground text-sm py-6">{t.noData}</p>;
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="data-table min-w-[640px]">
        <thead>
          <tr>
            <th>{t.security}</th>
            <th>{t.cusip}</th>
            <th className="text-right">{t.shares}</th>
            <th className="text-right">{t.value}</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id}>
              <td>
                <Link
                  href={`/institutions/${cik}/holdings/${h.id}`}
                  className="block hover:text-primary transition-colors"
                >
                  <div className="font-medium">{h.issuerName}</div>
                  {h.ticker && (
                    <div className="text-xs text-muted-foreground">{h.ticker}</div>
                  )}
                </Link>
              </td>
              <td className="num text-muted-foreground text-xs">{h.cusip}</td>
              <td className="num text-right">{formatShares(h.shares)}</td>
              <td className="num text-right font-medium">{formatUsd(h.valueUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
