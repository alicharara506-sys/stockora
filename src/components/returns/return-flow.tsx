"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findSaleForReturnAction, createReturnAction, type SaleForReturn } from "@/server/actions/returns";
import { ExchangeDialog } from "@/components/returns/exchange-dialog";

const REFUND_METHODS = [
  { key: "ORIGINAL", label: "Original payment method" },
  { key: "CASH", label: "Cash" },
  { key: "STORE_CREDIT", label: "Store credit" },
] as const;

export function ReturnFlow({
  variantOptions,
}: {
  variantOptions: { id: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saleNumber, setSaleNumber] = useState("");
  const [sale, setSale] = useState<SaleForReturn | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<(typeof REFUND_METHODS)[number]["key"]>("ORIGINAL");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function findSale() {
    setLookupError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await findSaleForReturnAction(saleNumber);
      if (!result.success) {
        setLookupError(result.error);
        setSale(null);
        return;
      }
      setSale(result.sale);
      setQuantities({});
    });
  }

  function reload() {
    if (sale) {
      startTransition(async () => {
        const result = await findSaleForReturnAction(sale.saleNumber);
        if (result.success) setSale(result.sale);
      });
    }
  }

  function submitReturn() {
    if (!sale) return;
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([saleItemId, quantity]) => {
        const item = sale.items.find((i) => i.saleItemId === saleItemId)!;
        return { saleItemId, variantId: item.variantId, quantity };
      });

    if (items.length === 0) {
      setSubmitError("Select at least one item to return.");
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      const result = await createReturnAction({ saleId: sale.id, items, reason, refundMethod });
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }
      setSuccess(true);
      setQuantities({});
      reload();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
        <Label htmlFor="saleNumber">Sale number</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="saleNumber"
            value={saleNumber}
            onChange={(e) => setSaleNumber(e.target.value)}
            placeholder="S-000001"
          />
          <Button onClick={findSale} disabled={isPending || !saleNumber}>
            <Search className="size-4" />
            Find sale
          </Button>
        </div>
        {lookupError && <p className="mt-2 text-sm text-brand-danger">{lookupError}</p>}
      </div>

      {sale && (
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-semibold text-brand-black">
              Sale {sale.saleNumber}
            </p>
            <span className="text-xs text-brand-muted">{sale.status.replace(/_/g, " ")}</span>
          </div>

          {success && (
            <p className="mt-3 rounded-xl border border-brand-purple-light bg-brand-purple-lightest px-4 py-2.5 text-sm text-brand-accent">
              Return processed.
            </p>
          )}
          {submitError && (
            <p className="mt-3 rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
              {submitError}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {sale.items.map((item) => {
              const remaining = item.quantitySold - item.quantityReturned;
              return (
                <div
                  key={item.saleItemId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-black">{item.productName}</p>
                    <p className="text-xs text-brand-muted">
                      {item.variantLabel} · sold {item.quantitySold} · already returned{" "}
                      {item.quantityReturned} · ${item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={quantities[item.saleItemId] ?? 0}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.saleItemId]: Math.max(0, Math.min(remaining, Number(e.target.value))),
                        }))
                      }
                      disabled={remaining === 0}
                      className="h-9 w-20"
                    />
                    {remaining > 0 && (
                      <ExchangeDialog
                        saleId={sale.id}
                        saleItemId={item.saleItemId}
                        oldVariantId={item.variantId}
                        maxQuantity={remaining}
                        variantOptions={variantOptions.filter((v) => v.id !== item.variantId)}
                        onDone={reload}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Refund method</Label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)}
                className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
              >
                {REFUND_METHODS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <Button className="mt-4" onClick={submitReturn} disabled={isPending}>
            {isPending ? "Processing…" : "Process return"}
          </Button>
        </div>
      )}
    </div>
  );
}
