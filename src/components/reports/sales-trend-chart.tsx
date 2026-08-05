"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SalesTrendChartProps {
  data: { date: string; total: number }[];
}

function formatShortDate(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 shadow-card-lg">
      <p className="text-xs text-brand-muted">{label ? formatShortDate(label) : ""}</p>
      <p className="mt-0.5 text-sm font-semibold text-brand-black">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-brand-muted">
        No sales in this period.
      </div>
    );
  }

  return (
      // dir="ltr": Recharts lays its SVG out with absolute coordinates that
      // ignore text direction, so an RTL page collides bars with labels.
      // Numeric axes conventionally read left-to-right regardless of locale.
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#6d28d9", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#6d28d9"
            strokeWidth={2}
            fill="url(#salesTrendFill)"
            dot={false}
            activeDot={{ r: 4, fill: "#6d28d9", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
