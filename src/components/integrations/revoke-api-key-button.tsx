"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { revokeApiKeyAction } from "@/server/actions/api-keys";

export function RevokeApiKeyButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Revoke this API key? Requests using it will start failing immediately.")) return;
        startTransition(async () => {
          await revokeApiKeyAction({ id });
        });
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-danger hover:bg-brand-danger/10 disabled:opacity-50"
    >
      <Ban className="size-3.5" />
      Revoke
    </button>
  );
}
