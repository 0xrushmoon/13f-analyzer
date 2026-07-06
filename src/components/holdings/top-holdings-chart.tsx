"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Cell,
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
  useHlChartTheme,
} from "./hl-chart";

interface Holding {
  id?: number;
  issuerName: string;
  valueUsd: number;
}

const TOP_DISPLAY = 12;

export function TopHoldingsChart({
  holdings,
  cik,
}: {
  holdings: Holding[];
  cik?: string;
}) {
  const router = useRouter();
  const { dict } = useLocale();
  const { charts } = dict;
  const hl = useHlChartTheme();

  if (holdings.length === 0) {
    return (
      <p className="text-muted-foreground text-xs text-center py-8">
        {charts.noData}
      </p>
    );
  }

  const total = holdings.reduce((s, h) => s + h.valueUsd, 0);
  const data = holdings.slice(0, TOP_DISPLAY).map((h, index) => ({
    name: truncateName(h.issuerName, 20),
    value: h.valueUsd,
    pct: total > 0 ? (h.valueUsd / total) * 100 : 0,
    id: h.id,
    index,
  }));

  const handleBarClick = (index: number) => {
    const holding = holdings[index];
    if (cik && holding?.id) {
      router.push(`/institutions/${cik}/holdings/${holding.id}`);
    }
  };

  const legendItems = data.map((d, i) => ({
    color: hl.barFill(i, data.length),
    label: d.name,
    value: `${d.pct.toFixed(1)}%`,
  }));

  return (
    <HlChartShell>
      <ResponsiveContainer width="100%" height={Math.max(240, data.length * 28)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
          barCategoryGap="20%"
        >
          <HlGrid />
          <HlXAxis
            type="number"
            tickFormatter={(v) => formatUsd(v)}
            domain={[0, "dataMax"]}
          />
          <HlYAxis type="category" dataKey="name" width={108} />
          <Tooltip
            content={<HlTooltip formatter={(v, name) => [formatUsd(v), name]} />}
            cursor={{ fill: "hsl(var(--accent) / 0.35)", radius: 0 }}
          />
          <Bar
            dataKey="value"
            barSize={10}
            radius={0}
            className={cik ? "cursor-pointer" : undefined}
            onClick={(_, index) => handleBarClick(index)}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={hl.barFill(index, data.length)}
                fillOpacity={hl.barOpacity(index, data.length)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <HlLegend items={legendItems} />
    </HlChartShell>
  );
}
