"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { receiveGoodsAction } from "@/server/actions/purchases";

interface ReceivableItem {
  poItemId: string;
  variantId: string;
  label: string;
  remaining: number;
  unitCost: number;
}

export function ReceiveGoodsForm({
  purchaseOrderId,
  items,
}: {
  purchaseOrderId: string;
  items: ReceivableItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [rows, setRows] = useState(
    items.map((item) => ({
      poItemId: item.poItemId,
      variantId: item.variantId,
      quantity: String(item.remaining),
      unitCost: String(item.unitCost),
      updateCostPrice: false,
    })),
  );

  function updateRow(poItemId: string, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((row) => (row.poItemId === poItemId ? { ...row, ...patch } : row)));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await receiveGoodsAction({
        purchaseOrderId,
        invoiceNumber,
        items: rows.map((row) => ({
          poItemId: row.poItemId,
          variantId: row.variantId,
          quantity: row.quantity,
          unitCost: row.unitCost,
          updateCostPrice: row.updateCostPrice,
        })),
      });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-border bg-white p-6">
      <p className="font-display text-base font-semibold text-brand-black">Receive goods</p>
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="space-y-2">
        {items.map((item) => {
          const row = rows.find((r) => r.poItemId === item.poItemId)!;
          return (
            <div key={item.poItemId} className="rounded-xl border border-brand-border p-3">
              <p className="text-sm font-medium text-brand-black">{item.label}</p>
              <p className="text-xs text-brand-muted">Remaining to receive: {item.remaining}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={item.remaining}
                  value={row.quantity}
                  onChange={(e) => updateRow(item.poItemId, { quantity: e.target.value })}
                  className="h-9 w-24"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.unitCost}
                  onChange={(e) => updateRow(item.poItemId, { unitCost: e.target.value })}
                  className="h-9 w-24"
                />
                <label className="flex items-center gap-1.5 text-xs text-brand-black">
                  <input
                    type="checkbox"
                    checked={row.updateCostPrice}
                    onChange={(e) => updateRow(item.poItemId, { updateCostPrice: e.target.checked })}
                    className="size-3.5 rounded border-brand-border text-brand-purple"
                  />
                  Update product cost price
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invoiceNumber">Supplier invoice number</Label>
        <Input
          id="invoiceNumber"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <Button onClick={onSubmit} disabled={isPending}>
        {isPending ? "Receiving…" : "Receive goods"}
      </Button>
    </div>
  );
}
