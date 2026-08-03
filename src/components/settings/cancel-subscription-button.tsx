"use client";

import { useTransition } from "react";
import { cancelSubscriptionAction } from "@/server/actions/billing";

export function CancelSubscriptionButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Cancel at the end of the current billing period?")) return;
        startTransition(async () => {
          await cancelSubscriptionAction();
        });
      }}
      className="text-xs font-medium text-brand-danger hover:underline disabled:opacity-50"
    >
      Cancel subscription
    </button>
  );
}
