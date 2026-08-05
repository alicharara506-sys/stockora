"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createTargetAction, deleteTargetAction } from "@/server/actions/commission";

const PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
const METRICS = ["REVENUE", "UNITS", "TRANSACTIONS", "PROFIT"] as const;

const METRIC_LABELS: Record<(typeof METRICS)[number], string> = {
  REVENUE: "Revenue ($)",
  UNITS: "Units sold",
  TRANSACTIONS: "Number of sales",
  PROFIT: "Profit ($)",
};

export interface TargetRow {
  id: string;
  userName: string | null;
  branchName: string | null;
  categoryName: string | null;
  productName: string | null;
  period: string;
  metric: string;
  targetValue: number;
  startsAt: string;
  endsAt: string;
}

export function TargetsManager({
  targets,
  members,
  branches,
  categories,
  canManage,
}: {
  targets: TargetRow[];
  members: { userId: string; name: string }[];
  branches: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [draft, setDraft] = useState({
    userId: "",
    branchId: "",
    categoryId: "",
    period: "MONTHLY" as (typeof PERIODS)[number],
    metric: "REVENUE" as (typeof METRICS)[number],
    targetValue: "",
    startsAt: today,
    endsAt: monthEnd,
    notes: "",
  });

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTargetAction(draft);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAdding(false);
      setDraft({ ...draft, targetValue: "", userId: "" });
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this target?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTargetAction(id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}

      {canManage && (
        <div className="flex justify-end">
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Set a target
            </Button>
          )}
        </div>
      )}

      {adding && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Who</Label>
                <select
                  value={draft.userId}
                  onChange={(e) => setDraft({ ...draft, userId: e.target.value })}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm"
                >
                  <option value="">Whole team</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Measured in</Label>
                <select
                  value={draft.metric}
                  onChange={(e) =>
                    setDraft({ ...draft, metric: e.target.value as (typeof METRICS)[number] })
                  }
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm"
                >
                  {METRICS.map((m) => (
                    <option key={m} value={m}>
                      {METRIC_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-value">Target</Label>
                <Input
                  id="target-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.targetValue}
                  onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period</Label>
                <select
                  value={draft.period}
                  onChange={(e) =>
                    setDraft({ ...draft, period: e.target.value as (typeof PERIODS)[number] })
                  }
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm"
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-start">Starts</Label>
                <Input
                  id="target-start"
                  type="date"
                  value={draft.startsAt}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-end">Ends</Label>
                <Input
                  id="target-end"
                  type="date"
                  value={draft.endsAt}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Branch (optional)</Label>
                <select
                  value={draft.branchId}
                  onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Category (optional)</Label>
                <select
                  value={draft.categoryId}
                  onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={isPending || !draft.targetValue}>
                {isPending ? "Saving…" : "Save target"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {targets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
              <Target className="size-5" />
            </div>
            <p className="font-display text-sm font-semibold text-brand-black">No targets set</p>
            <p className="max-w-sm text-sm text-brand-muted">
              Without a target, commission still pays but bonuses and penalties stay inactive.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {targets.map((target) => (
            <Card key={target.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-semibold text-brand-black">
                      {target.userName ?? "Whole team"}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {target.startsAt} → {target.endsAt}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => remove(target.id)}
                      disabled={isPending}
                      className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
                      aria-label="Delete target"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <p className="font-display text-xl font-bold text-brand-black">
                  {target.metric === "REVENUE" || target.metric === "PROFIT"
                    ? `$${target.targetValue.toLocaleString()}`
                    : target.targetValue.toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="purple">{target.metric}</Badge>
                  <Badge variant="outline">{target.period}</Badge>
                  {target.branchName && <Badge variant="outline">{target.branchName}</Badge>}
                  {target.categoryName && <Badge variant="outline">{target.categoryName}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
