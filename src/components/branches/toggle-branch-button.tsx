"use client";

import { useState, useTransition } from "react";
import { toggleBranchActiveAction } from "@/server/actions/branches";

export function ToggleBranchButton({
  branchId,
  isActive,
  disabled,
}: {
  branchId: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBranchActiveAction(branchId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isPending}
        className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
      </button>
      {error && <span className="max-w-[180px] text-right text-[11px] text-brand-danger">{error}</span>}
    </div>
  );
}
