"use client";

import { Trophy, TrendingUp, Target as TargetIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LeaderboardEntry, TargetMetric } from "@/lib/commission/calculate";

const METRIC_LABELS: Record<TargetMetric, string> = {
  REVENUE: "Revenue",
  PROFIT: "Profit",
  UNITS: "Units",
  TRANSACTIONS: "Sales",
};

function formatMetric(value: number, metric: TargetMetric) {
  if (metric === "UNITS" || metric === "TRANSACTIONS") return value.toLocaleString();
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Medal tint for the top three; everyone else gets the neutral chip.
 * Uses theme tokens with alpha so the medals stay legible on dark too. */
function rankStyle(rank: number) {
  if (rank === 1) return "bg-brand-warning/20 text-brand-warning";
  if (rank === 2) return "bg-brand-muted/20 text-brand-muted";
  if (rank === 3) return "bg-brand-warning/10 text-brand-warning";
  return "bg-brand-purple-lightest text-brand-accent";
}

export function Leaderboard({
  entries,
  rankMetric,
}: {
  entries: LeaderboardEntry[];
  rankMetric: TargetMetric;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
            <Trophy className="size-5" />
          </div>
          <p className="font-display text-sm font-semibold text-brand-black">No sales in this period</p>
          <p className="max-w-sm text-sm text-brand-muted">
            Rankings appear once your team starts recording sales.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
              <tr>
                <th className="px-6 py-3 font-medium">#</th>
                <th className="px-6 py-3 font-medium">Salesperson</th>
                <th className="px-6 py-3 font-medium text-right">{METRIC_LABELS[rankMetric]}</th>
                <th className="px-6 py-3 font-medium text-right">Units</th>
                <th className="px-6 py-3 font-medium text-right">Sales</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.userId} className="border-b border-brand-border last:border-0">
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${rankStyle(entry.rank)}`}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-brand-black">{entry.name}</td>
                  <td className="px-6 py-3 text-right font-medium text-brand-black">
                    {formatMetric(
                      rankMetric === "REVENUE"
                        ? entry.achievement.revenue
                        : rankMetric === "PROFIT"
                          ? entry.achievement.profit
                          : rankMetric === "UNITS"
                            ? entry.achievement.units
                            : entry.achievement.transactions,
                      rankMetric,
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-brand-muted">{entry.achievement.units}</td>
                  <td className="px-6 py-3 text-right text-brand-muted">
                    {entry.achievement.transactions}
                  </td>
                  <td className="px-6 py-3">
                    {entry.achievedPercent === null ? (
                      <span className="text-xs text-brand-muted">No target</span>
                    ) : (
                      <TargetProgress percent={entry.achievedPercent} />
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-brand-black">
                    ${entry.commission.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TargetProgress({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const tone = percent >= 100 ? "bg-brand-success" : percent >= 75 ? "bg-brand-warning" : "bg-brand-danger";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full bg-brand-border"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-medium text-brand-muted">{Math.round(percent)}%</span>
    </div>
  );
}

export function PerformanceSummary({
  totals,
}: {
  totals: { revenue: number; units: number; transactions: number; commission: number };
}) {
  const cards = [
    { label: "Revenue", value: `$${totals.revenue.toFixed(2)}`, icon: TrendingUp },
    { label: "Units sold", value: totals.units.toLocaleString(), icon: TargetIcon },
    { label: "Transactions", value: totals.transactions.toLocaleString(), icon: TargetIcon },
    { label: "Commission owed", value: `$${totals.commission.toFixed(2)}`, icon: Trophy },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                {card.label}
              </p>
              <card.icon className="size-4 text-brand-accent" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-brand-black">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
