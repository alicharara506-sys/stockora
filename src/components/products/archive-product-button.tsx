"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
import { archiveProductAction } from "@/server/actions/products";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm("Archive this product? It will be hidden from POS and active listings.")) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveProductAction(productId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-danger hover:bg-brand-danger/10 disabled:opacity-50"
      >
        <Archive className="size-3.5" />
        {isPending ? "Archiving…" : "Archive"}
      </button>
      {error && <span className="text-[11px] text-brand-danger">{error}</span>}
    </div>
  );
}
