"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { changePlanAction } from "@/server/actions/billing";

interface PlanOption {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxBranches: number;
  maxUsers: number;
  aiMessageLimit: number;
  features: string[];
}

export function PlanPicker({
  plans,
  currentPlanKey,
  currentBillingCycle,
}: {
  plans: PlanOption[];
  currentPlanKey: string | null;
  currentBillingCycle: "MONTHLY" | "ANNUAL";
}) {
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">(currentBillingCycle);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  function switchPlan(planKey: string) {
    setError(null);
    setPendingKey(planKey);
    startTransition(async () => {
      const result = await changePlanAction({ planKey, billingCycle: cycle });
      if (!result.success) setError(result.error);
      setPendingKey(null);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}

      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-full border border-brand-border bg-white p-1">
          {(["MONTHLY", "ANNUAL"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                cycle === c ? "bg-brand-purple text-white" : "text-brand-muted"
              }`}
            >
              {c === "MONTHLY" ? "Monthly" : "Annual (save 17%)"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlanKey && cycle === currentBillingCycle;
          const price = cycle === "MONTHLY" ? plan.monthlyPrice : plan.annualPrice / 12;
          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-5 ${
                isCurrent ? "border-brand-purple bg-brand-purple-lightest/40" : "border-brand-border bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-brand-black">{plan.name}</p>
                {isCurrent && <Badge variant="purpleSolid">Current</Badge>}
              </div>
              <p className="mt-2">
                <span className="font-display text-2xl font-bold text-brand-black">${price.toFixed(0)}</span>
                <span className="text-sm text-brand-muted">/month</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-brand-muted">
                    <Check className="mt-0.5 size-3 shrink-0 text-brand-purple" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={isCurrent ? "outline" : "primary"}
                className="mt-4 w-full"
                disabled={isCurrent || isPending}
                onClick={() => switchPlan(plan.key)}
              >
                {isPending && pendingKey === plan.key
                  ? "Switching…"
                  : isCurrent
                    ? "Current plan"
                    : "Switch to this plan"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
