"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { revokeQrAction } from "@/server/actions/qr";

export function RevokeQrButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Revoke this QR code? It will stop working immediately.")) return;
        startTransition(async () => {
          await revokeQrAction({ id });
        });
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-danger hover:bg-red-50 disabled:opacity-50"
    >
      <Ban className="size-3.5" />
      Revoke
    </button>
  );
}
