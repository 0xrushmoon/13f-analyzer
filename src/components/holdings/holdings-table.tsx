import { formatUsd, formatShares } from "@/lib/utils";

interface Holding {
  issuerName: string;
  cusip: string;
  ticker: string | null;
  shares: number;
  valueUsd: number;
  putCall: string | null;
}

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无持仓数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-3 pr-4">标的</th>
            <th className="pb-3 pr-4">CUSIP</th>
            <th className="pb-3 pr-4 text-right">股数</th>
            <th className="pb-3 text-right">市值 (USD)</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.cusip + h.putCall} className="border-b">
              <td className="py-3 pr-4">
                <div className="font-medium">{h.issuerName}</div>
                {h.ticker && (
                  <div className="text-xs text-muted-foreground">{h.ticker}</div>
                )}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{h.cusip}</td>
              <td className="py-3 pr-4 text-right">{formatShares(h.shares)}</td>
              <td className="py-3 text-right font-medium">
                {formatUsd(h.valueUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
