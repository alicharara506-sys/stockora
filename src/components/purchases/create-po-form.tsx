"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchaseOrderAction } from "@/server/actions/purchases";

export function CreatePoForm({
  suppliers,
  locations,
  variants,
}: {
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  variants: { id: string; label: string; costPrice: number }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ variantId: string; quantity: string; unitCost: string }[]>([
    { variantId: variants[0]?.id ?? "", quantity: "1", unitCost: String(variants[0]?.costPrice ?? 0) },
  ]);

  function updateItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createPurchaseOrderAction({
        supplierId,
        locationId,
        expectedDate,
        notes,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      });
      if (result && !result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Receiving location</Label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Expected date</Label>
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Items</Label>
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={item.variantId}
              onChange={(e) => {
                const variant = variants.find((v) => v.id === e.target.value);
                updateItem(index, { variantId: e.target.value, unitCost: String(variant?.costPrice ?? 0) });
              }}
              className="h-10 flex-1 rounded-lg border border-brand-border bg-brand-surface px-2.5 text-xs"
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
              placeholder="Qty"
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.unitCost}
              onChange={(e) => updateItem(index, { unitCost: e.target.value })}
              className="h-10 w-24"
              placeholder="Unit cost"
            />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
              disabled={items.length === 1}
              className="flex size-10 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-danger/10 hover:text-brand-danger disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((prev) => [
              ...prev,
              { variantId: variants[0]?.id ?? "", quantity: "1", unitCost: String(variants[0]?.costPrice ?? 0) },
            ])
          }
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <Button onClick={onSubmit} disabled={isPending || !supplierId || !locationId}>
        {isPending ? "Creating…" : "Create purchase order"}
      </Button>
    </div>
  );
}
