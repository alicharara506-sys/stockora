"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Percent, Gift, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  createCommissionRuleAction,
  deleteCommissionRuleAction,
  toggleCommissionRuleAction,
} from "@/server/actions/commission";

type CommissionKind = "COMMISSION" | "BONUS" | "PENALTY";
const BASES = [
  "PERCENT_OF_REVENUE",
  "PERCENT_OF_PROFIT",
  "FIXED_PER_SALE",
  "FIXED_PER_UNIT",
  "FIXED_AMOUNT",
] as const;

const BASIS_LABELS: Record<(typeof BASES)[number], string> = {
  PERCENT_OF_REVENUE: "% of revenue",
  PERCENT_OF_PROFIT: "% of profit",
  FIXED_PER_SALE: "Fixed per sale",
  FIXED_PER_UNIT: "Fixed per unit",
  FIXED_AMOUNT: "Fixed amount",
};

const KIND_ICONS = { COMMISSION: Percent, BONUS: Gift, PENALTY: AlertTriangle } as const;

export interface RuleRow {
  id: string;
  name: string;
  kind: CommissionKind;
  basis: (typeof BASES)[number];
  value: number;
  userName: string | null;
  thresholdPercent: number | null;
  isActive: boolean;
}

export function RulesManager({
  rules,
  members,
  canManage,
}: {
  rules: RuleRow[];
  members: { userId: string; name: string }[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: "",
    kind: "COMMISSION" as CommissionKind,
    basis: "PERCENT_OF_REVENUE" as (typeof BASES)[number],
    value: "",
    userId: "",
    thresholdPercent: "",
    isActive: true,
  });

  const needsThreshold = draft.kind !== "COMMISSION";

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createCommissionRuleAction({
        ...draft,
        value: Number(draft.value || 0),
        thresholdPercent: draft.thresholdPercent === "" ? null : Number(draft.thresholdPercent),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAdding(false);
      setDraft({ ...draft, name: "", value: "", thresholdPercent: "" });
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete the "${name}" rule?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCommissionRuleAction(id);
      if (!result.success) setError(result.error);
    });
  }

  function toggle(id: string, isActive: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleCommissionRuleAction(id, isActive);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}

      {canManage && !adding && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add rule
          </Button>
        </div>
      )}

      {adding && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rule-name">Name</Label>
                <Input
                  id="rule-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. 5% of revenue"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft({ ...draft, kind: e.target.value as CommissionKind })
                  }
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm"
                >
                  <option value="COMMISSION">Commission — earned on sales</option>
                  <option value="BONUS">Bonus — paid when a target is met</option>
                  <option value="PENALTY">Penalty — deducted when a target is missed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Calculated as</Label>
                <select
                  value={draft.basis}
                  onChange={(e) =>
                    setDraft({ ...draft, basis: e.target.value as (typeof BASES)[number] })
                  }
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm"
                >
                  {BASES.map((b) => (
                    <option key={b} value={b}>
                      {BASIS_LABELS[b]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-value">
                  {draft.basis.startsWith("PERCENT_") ? "Percentage" : "Amount"}
                </Label>
                <Input
                  id="rule-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                  placeholder={draft.basis.startsWith("PERCENT_") ? "5" : "100"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Applies to</Label>
                <select
                  value={draft.userId}
                  onChange={(e) => setDraft({ ...draft, userId: e.target.value })}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm"
                >
                  <option value="">Everyone</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-brand-muted">
                  A rule for one person replaces the general rules for them.
                </p>
              </div>
              {needsThreshold && (
                <div className="space-y-1.5">
                  <Label htmlFor="rule-threshold">Target threshold (%)</Label>
                  <Input
                    id="rule-threshold"
                    type="number"
                    min={0}
                    step="1"
                    value={draft.thresholdPercent}
                    onChange={(e) => setDraft({ ...draft, thresholdPercent: e.target.value })}
                    placeholder={draft.kind === "BONUS" ? "100" : "80"}
                  />
                  <p className="text-xs text-brand-muted">
                    {draft.kind === "BONUS"
                      ? "Paid once achievement reaches this share of target."
                      : "Deducted when achievement falls below this share of target."}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={isPending || !draft.name.trim() || !draft.value}>
                {isPending ? "Saving…" : "Add rule"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
              <Percent className="size-5" />
            </div>
            <p className="font-display text-sm font-semibold text-brand-black">No commission rules</p>
            <p className="max-w-sm text-sm text-brand-muted">
              Until a rule exists, commission stays at zero for everyone.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rules.map((rule) => {
            const Icon = KIND_ICONS[rule.kind];
            return (
              <Card key={rule.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold text-brand-black">
                          {rule.name}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {rule.basis.startsWith("PERCENT_") ? `${rule.value}%` : `$${rule.value}`} ·{" "}
                          {BASIS_LABELS[rule.basis]}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => remove(rule.id, rule.name)}
                        disabled={isPending}
                        className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
                        aria-label={`Delete ${rule.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={
                        rule.kind === "COMMISSION" ? "purple" : rule.kind === "BONUS" ? "success" : "danger"
                      }
                    >
                      {rule.kind}
                    </Badge>
                    <Badge variant="outline">{rule.userName ?? "Everyone"}</Badge>
                    {rule.thresholdPercent !== null && (
                      <Badge variant="outline">
                        {rule.kind === "BONUS" ? "≥" : "<"} {rule.thresholdPercent}% of target
                      </Badge>
                    )}
                    {canManage && (
                      <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-brand-muted">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          disabled={isPending}
                          onChange={(e) => toggle(rule.id, e.target.checked)}
                          className="size-3.5 rounded border-brand-border"
                        />
                        Active
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
