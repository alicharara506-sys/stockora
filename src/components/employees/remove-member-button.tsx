"use client";

import { useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { removeMemberAction } from "@/server/actions/employees";

export function RemoveMemberButton({ membershipId }: { membershipId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  function onClick() {
    if (!confirm("Remove this team member's access to this business?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction(membershipId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRemoved(true);
    });
  }

  if (removed) {
    return <span className="text-xs text-brand-muted">Removed</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-danger hover:bg-brand-danger/10 disabled:opacity-50"
      >
        <UserMinus className="size-3.5" />
        {isPending ? "Removing…" : "Remove"}
      </button>
      {error && <span className="max-w-[180px] text-right text-[11px] text-brand-danger">{error}</span>}
    </div>
  );
}
