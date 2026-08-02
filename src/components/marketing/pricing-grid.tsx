"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PricingPlan {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

export function PricingGrid({ plans }: { plans: PricingPlan[] }) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div>
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-brand-border bg-white p-1">
        {(["monthly", "annual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCycle(option)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              cycle === option
                ? "bg-brand-purple text-white"
                : "text-brand-muted hover:text-brand-black",
            )}
          >
            {option}
            {option === "annual" && (
              <span className="ml-1.5 text-xs font-semibold text-brand-success">Save ~17%</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isPopular = plan.key === "BUSINESS";
          const price = cycle === "monthly" ? plan.monthlyPrice : plan.annualPrice / 12;

          return (
            <div
              key={plan.key}
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-7 shadow-card",
                isPopular ? "border-brand-purple shadow-glow-purple ring-1 ring-brand-purple" : "border-brand-border",
              )}
            >
              {isPopular && (
                <Badge variant="purpleSolid" className="mb-4 w-fit">
                  Most Popular
                </Badge>
              )}
              {plan.key === "PREMIUM" && (
                <Badge variant="outline" className="mb-4 w-fit">
                  14-Day Free Trial
                </Badge>
              )}
              <h3 className="font-display text-lg font-bold text-brand-black">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-display text-3xl font-bold text-brand-black">
                  ${price.toFixed(0)}
                </span>
                <span className="text-sm text-brand-muted"> /month</span>
              </p>
              {cycle === "annual" && (
                <p className="mt-1 text-xs text-brand-muted">billed annually</p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-brand-black">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-purple" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button asChild className="mt-7" variant={isPopular ? "primary" : "outline"}>
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
