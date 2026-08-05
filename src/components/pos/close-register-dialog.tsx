"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeRegisterAction } from "@/server/actions/register";

export function CloseRegisterDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await closeRegisterAction({ sessionId, actualCash, notes });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
        >
          <Lock className="size-3.5" />
          Close register
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-brand-surface p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Close register
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-purple-lightest"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            {error && (
              <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="actualCash">Counted cash</Label>
              <Input
                id="actualCash"
                type="number"
                min={0}
                step="0.01"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={isPending || !actualCash}>
              {isPending ? "Closing…" : "Close register"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
