"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExchangeAction } from "@/server/actions/returns";

export function ExchangeDialog({
  saleId,
  saleItemId,
  oldVariantId,
  maxQuantity,
  variantOptions,
  onDone,
}: {
  saleId: string;
  saleItemId: string;
  oldVariantId: string;
  maxQuantity: number;
  variantOptions: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newVariantId, setNewVariantId] = useState(variantOptions[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createExchangeAction({
        saleId,
        saleItemId,
        oldVariantId,
        newVariantId,
        quantity: Number(quantity),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onDone();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
        >
          <Repeat className="size-3.5" />
          Exchange
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-brand-surface p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Exchange item
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
              <Label>Replacement item</Label>
              <select
                value={newVariantId}
                onChange={(e) => setNewVariantId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
              >
                {variantOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={isPending || !newVariantId}>
              {isPending ? "Processing…" : "Complete exchange"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
