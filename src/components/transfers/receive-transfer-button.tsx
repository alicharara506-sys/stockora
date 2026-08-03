"use client";

import { useState, useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { receiveTransferAction } from "@/server/actions/transfers";

export function ReceiveTransferButton({ transferId }: { transferId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await receiveTransferAction(transferId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-purple-bright disabled:opacity-50"
      >
        <PackageCheck className="size-3.5" />
        {isPending ? "Receiving…" : "Receive"}
      </button>
      {error && <span className="text-[11px] text-brand-danger">{error}</span>}
    </div>
  );
}
