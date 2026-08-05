"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RankedBarChartProps {
  data: { name: string; value: number }[];
  valuePrefix?: string;
  emptyLabel?: string;
}

function formatValue(value: number, prefix?: string) {
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return prefix ? `${prefix}${formatted}` : formatted;
}

function BarTooltip({
  active,
  payload,
  valuePrefix,
}: {
  active?: boolean;
  payload?: { payload: { name: string; value: number } }[];
  valuePrefix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 shadow-card-lg">
      <p className="text-xs text-brand-muted">{item.name}</p>
      <p className="mt-0.5 text-sm font-semibold text-brand-black">{formatValue(item.value, valuePrefix)}</p>
    </div>
  );
}

export function RankedBarChart({ data, valuePrefix = "$", emptyLabel = "No data in this period." }: RankedBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-brand-muted">{emptyLabel}</div>
    );
  }

  const rowHeight = 40;
  const height = Math.max(120, data.length * rowHeight);

  return (
      // dir="ltr": Recharts lays its SVG out with absolute coordinates that
      // ignore text direction, so an RTL page collides bars with labels.
      // Numeric axes conventionally read left-to-right regardless of locale.
    <div className="w-full" dir="ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke="#e5e7eb" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#0a0a0a", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip content={<BarTooltip valuePrefix={valuePrefix} />} cursor={{ fill: "#f5f3ff" }} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            label={{
              position: "right",
              fill: "#0a0a0a",
              fontSize: 12,
              formatter: (v: unknown) => formatValue(Number(v), valuePrefix),
            }}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill="#6d28d9" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
