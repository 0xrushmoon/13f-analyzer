"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatUsd } from "@/lib/utils";

interface Holding {
  issuerName: string;
  valueUsd: number;
}

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#c026d3",
  "#d97706",
  "#059669",
];

export function TopHoldingsChart({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">暂无数据</p>
    );
  }

  const data = holdings.map((h) => ({
    name:
      h.issuerName.length > 20
        ? h.issuerName.slice(0, 20) + "..."
        : h.issuerName,
    value: h.valueUsd,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatUsd(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
