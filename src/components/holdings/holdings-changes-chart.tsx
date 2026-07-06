"use client";

import {
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatUsd } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";
import { truncateName } from "./chart-colors";
import {
  HlChartShell,
  HlGrid,
  HlTooltip,
  HlXAxis,
  HlYAxis,
  useHlChartTheme,
} from "./hl-chart";

interface ChangeItem {
  cusip: string;
  issuerName: string;
  changeType: string;
  valueDelta: number;
}

function changeColor(
  type: string,
  hl: ReturnType<typeof useHlChartTheme>,
): string {
  if (type === "new" || type === "increased") return hl.marketUp;
  if (type === "closed" || type === "decreased") return hl.marketDown;
  return hl.series[hl.series.length - 1];
}

export function HoldingsChangesChart({ changes }: { changes: ChangeItem[] }) {
  const { dict } = useLocale();
  const { charts } = dict;
  const hl = useHlChartTheme();

  const significant = changes
    .filter((c) => c.changeType !== "unchanged")
    .slice(0, 12);

  if (significant.length === 0) {
    return (
      <p className="text-muted-foreground text-xs text-center py-8">
        {charts.noChanges}
      </p>
    );
  }

  const data = significant.map((c) => ({
    name: truncateName(c.issuerName, 18),
    delta: c.valueDelta,
    type: c.changeType,
    label:
      charts.changeTypes[c.changeType as keyof typeof charts.changeTypes] ??
      c.changeType,
  }));

  return (
    <HlChartShell>
      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 26)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          barCategoryGap="22%"
        >
          <HlGrid />
          <HlXAxis
            type="number"
            tickFormatter={(v) => formatUsd(Math.abs(v))}
          />
          <HlYAxis type="category" dataKey="name" width={112} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as (typeof data)[number];
              return (
                <div className="hl-chart-tooltip">
                  <p className="hl-chart-tooltip-label">{row.name}</p>
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="num text-foreground font-medium">
                      {formatUsd(Math.abs(row.delta))}
                    </span>
                  </div>
                </div>
              );
            }}
            cursor={{ fill: "hsl(var(--accent) / 0.2)", radius: 0 }}
          />
          <ReferenceLine
            x={0}
            stroke={hl.grid}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <Bar dataKey="delta" barSize={9} radius={0}>
            {data.map((entry, index) => (
              <Cell key={index} fill={changeColor(entry.type, hl)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-[hsl(var(--market-up))]" />
          {charts.changeTypes.increased} / {charts.changeTypes.new}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-[hsl(var(--market-down))]" />
          {charts.changeTypes.decreased} / {charts.changeTypes.closed}
        </span>
      </div>
    </HlChartShell>
  );
}
