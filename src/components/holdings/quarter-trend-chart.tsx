"use client";

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatUsd } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";
import { truncateName } from "./chart-colors";
import {
  HlChartShell,
  HlGrid,
  HlLegend,
  HlTooltip,
  HlXAxis,
  HlYAxis,
  seriesColor,
  useHlChartTheme,
} from "./hl-chart";
import { periodToQuarterLabel } from "@/lib/sec/client";

export interface QuarterHoldings {
  period: string;
  holdings: Array<{
    cusip: string;
    issuerName: string;
    valueUsd: number;
  }>;
}

const TOP_N = 8;

function buildChartData(quarters: QuarterHoldings[], othersLabel: string) {
  if (quarters.length === 0) return { data: [], keys: [] as string[] };

  const latest = quarters[quarters.length - 1];
  const topCusips = latest.holdings.slice(0, TOP_N).map((h) => h.cusip);

  const cusipToName = new Map<string, string>();
  for (const q of quarters) {
    for (const h of q.holdings) {
      if (topCusips.includes(h.cusip)) {
        cusipToName.set(h.cusip, truncateName(h.issuerName, 12));
      }
    }
  }

  const keys = topCusips.map((c) => cusipToName.get(c) ?? c);

  const data = quarters.map((q) => {
    const row: Record<string, string | number> = {
      period: periodToQuarterLabel(q.period),
    };
    let others = 0;
    const holdingsMap = new Map(q.holdings.map((h) => [h.cusip, h.valueUsd]));

    for (const cusip of topCusips) {
      const name = cusipToName.get(cusip) ?? cusip;
      row[name] = holdingsMap.get(cusip) ?? 0;
    }

    for (const h of q.holdings) {
      if (!topCusips.includes(h.cusip)) {
        others += h.valueUsd;
      }
    }
    row[othersLabel] = others;

    return row;
  });

  return { data, keys: [...keys, othersLabel] };
}

export function QuarterTrendChart({
  quarters,
}: {
  quarters: QuarterHoldings[];
}) {
  const { dict } = useLocale();
  const { charts } = dict;
  const hl = useHlChartTheme();

  if (quarters.length < 2) {
    return (
      <p className="text-muted-foreground text-xs text-center py-8">
        {charts.needMultipleQuarters}
      </p>
    );
  }

  const { data, keys } = buildChartData(quarters, charts.others);

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-xs text-center py-8">
        {charts.noData}
      </p>
    );
  }

  const legendItems = keys.map((key, index) => ({
    color: seriesColor(index, hl.isDark),
    label: key,
  }));

  return (
    <HlChartShell>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="18%"
        >
          <HlGrid />
          <HlXAxis dataKey="period" />
          <HlYAxis tickFormatter={(v) => formatUsd(v)} width={52} />
          <Tooltip
            content={<HlTooltip formatter={(v, name) => [formatUsd(v), name]} />}
            cursor={{ fill: "hsl(var(--accent) / 0.25)", radius: 0 }}
          />
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="portfolio"
              fill={seriesColor(index, hl.isDark)}
              barSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <HlLegend items={legendItems} />
    </HlChartShell>
  );
}
