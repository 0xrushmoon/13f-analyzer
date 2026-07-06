"use client";

import type { TooltipProps } from "recharts";
import { CartesianGrid, XAxis, YAxis } from "recharts";
import { useTheme } from "@/contexts/theme-context";
import { formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Teal-centric palette — Hyperliquid terminal aesthetic */
const HL_SERIES_DARK = [
  "#4fc5b5",
  "#3db5a6",
  "#2e9d92",
  "#26857c",
  "#1f6e67",
  "#1a5c56",
  "#3d8a82",
  "#5a9e96",
  "#64748b",
];

const HL_SERIES_LIGHT = [
  "#0d9488",
  "#0f766e",
  "#115e59",
  "#134e4a",
  "#14706a",
  "#1a8580",
  "#2d9d96",
  "#64748b",
  "#94a3b8",
];

export function useHlChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    isDark,
    series: isDark ? HL_SERIES_DARK : HL_SERIES_LIGHT,
    primary: isDark ? "#4fc5b5" : "#0d9488",
    axis: isDark ? "hsl(200 6% 52%)" : "hsl(200 10% 42%)",
    grid: isDark ? "hsl(216 14% 20%)" : "hsl(214 22% 88%)",
    tooltipBg: "hsl(var(--card))",
    tooltipBorder: "hsl(var(--border))",
    marketUp: isDark ? "#4fc5b5" : "#0d9488",
    marketDown: isDark ? "#ef6461" : "#dc2626",
    barFill: (index: number, total: number) => {
      const palette = isDark ? HL_SERIES_DARK : HL_SERIES_LIGHT;
      if (index < palette.length - 1) return palette[index % (palette.length - 1)];
      return palette[palette.length - 1];
    },
    barOpacity: (index: number, total: number) =>
      Math.max(0.45, 1 - (index / Math.max(total, 1)) * 0.45),
  };
}

export function seriesColor(index: number, isDark: boolean): string {
  const palette = isDark ? HL_SERIES_DARK : HL_SERIES_LIGHT;
  return palette[index % palette.length];
}

const TICK = { fontSize: 10, fontFamily: "var(--font-mono), ui-monospace, monospace" };

export function HlXAxis(props: React.ComponentProps<typeof XAxis>) {
  const t = useHlChartTheme();
  return (
    <XAxis
      axisLine={false}
      tickLine={false}
      tick={{ ...TICK, fill: t.axis }}
      {...props}
    />
  );
}

export function HlYAxis(props: React.ComponentProps<typeof YAxis>) {
  const t = useHlChartTheme();
  return (
    <YAxis
      axisLine={false}
      tickLine={false}
      tick={{ ...TICK, fill: t.axis }}
      {...props}
    />
  );
}

export function HlGrid() {
  const t = useHlChartTheme();
  return (
    <CartesianGrid
      stroke={t.grid}
      strokeDasharray="3 3"
      vertical={false}
      horizontal
    />
  );
}

type HlTooltipPayload = { name?: string; value?: number; color?: string };

export function HlTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & {
  formatter?: (value: number, name: string) => [string, string];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="hl-chart-tooltip">
      {label != null && label !== "" && (
        <p className="hl-chart-tooltip-label">{String(label)}</p>
      )}
      <div className="space-y-1">
        {(payload as HlTooltipPayload[]).map((entry, i) => {
          const name = String(entry.name ?? "");
          const raw = Number(entry.value ?? 0);
          const [display, sub] = formatter
            ? formatter(raw, name)
            : [formatUsd(raw), name];
          return (
            <div key={i} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                {entry.color && (
                  <span
                    className="w-1.5 h-1.5 rounded-sm shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                )}
                <span className="truncate">{sub}</span>
              </span>
              <span className="num text-foreground font-medium shrink-0">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HlLegend({
  items,
  className,
}: {
  items: Array<{ color: string; label: string; value?: string }>;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
        >
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="truncate max-w-[120px]">{item.label}</span>
          {item.value && (
            <span className="num text-foreground/80">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function HlChartShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("hl-chart w-full", className)}>{children}</div>;
}

export function HlViewToggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex border border-border rounded-sm p-0.5 mb-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors rounded-sm",
            value === opt.value
              ? "bg-accent text-primary font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
