"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustStockAction } from "@/server/actions/inventory";

export function AdjustStockDialog({
  locationId,
  variantId,
  variantLabel,
  currentQuantity,
}: {
  locationId: string;
  variantId: string;
  variantLabel: string;
  currentQuantity: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await adjustStockAction({
        locationId,
        variantId,
        delta,
        reason,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setDelta("");
      setReason("");
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
        >
          <SlidersHorizontal className="size-3.5" />
          Adjust
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Adjust stock
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
          <p className="mt-1 text-sm text-brand-muted">
            {variantLabel} · currently {currentQuantity} on hand
          </p>

          <div className="mt-4 space-y-4">
            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="delta">Quantity change</Label>
              <Input
                id="delta"
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. -2 or 5"
              />
              <p className="text-xs text-brand-muted">
                Use a negative number to remove stock, positive to add.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Damaged in storage"
              />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={isPending}>
              {isPending ? "Saving…" : "Save adjustment"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
