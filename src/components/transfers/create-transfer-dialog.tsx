"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransferAction } from "@/server/actions/transfers";

interface VariantOption {
  id: string;
  label: string;
}

export function CreateTransferDialog({
  locations,
  variants,
}: {
  locations: { id: string; name: string }[];
  variants: VariantOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fromLocationId, setFromLocationId] = useState(locations[0]?.id ?? "");
  const [toLocationId, setToLocationId] = useState(locations[1]?.id ?? locations[0]?.id ?? "");
  const [items, setItems] = useState<{ variantId: string; quantity: string }[]>([
    { variantId: variants[0]?.id ?? "", quantity: "1" },
  ]);

  function updateItem(index: number, patch: Partial<{ variantId: string; quantity: string }>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createTransferAction({
        fromLocationId,
        toLocationId,
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setItems([{ variantId: variants[0]?.id ?? "", quantity: "1" }]);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New transfer
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              New stock transfer
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
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From branch</Label>
                <select
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>To branch</Label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={item.variantId}
                    onChange={(e) => updateItem(index, { variantId: e.target.value })}
                    className="h-10 flex-1 rounded-lg border border-brand-border bg-white px-2.5 text-xs"
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    className="h-10 w-20"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                    className="flex size-10 items-center justify-center rounded-lg text-brand-muted hover:bg-red-50 hover:text-brand-danger disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, { variantId: variants[0]?.id ?? "", quantity: "1" }])}
              >
                <Plus className="size-4" />
                Add item
              </Button>
            </div>

            <Button className="w-full" onClick={onSubmit} disabled={isPending || !fromLocationId || !toLocationId}>
              {isPending ? "Creating…" : "Create transfer"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
