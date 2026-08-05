"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerPicker, type PosCustomer } from "@/components/pos/customer-picker";
import type { CartLine } from "@/components/pos/types";

export function CartPanel({
  lines,
  discountTotal,
  onDiscountChange,
  onQuantityChange,
  onRemove,
  onCharge,
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: {
  lines: CartLine[];
  discountTotal: string;
  onDiscountChange: (value: string) => void;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onCharge: () => void;
  customers: PosCustomer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
}) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = Math.min(Number(discountTotal) || 0, subtotal);
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-brand-border bg-brand-surface">
      <div className="flex items-center justify-between border-b border-brand-border p-4">
        <h2 className="font-display text-base font-semibold text-brand-black">Cart</h2>
        <CustomerPicker customers={customers} selectedId={selectedCustomerId} onSelect={onSelectCustomer} />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {lines.length === 0 && (
          <p className="py-10 text-center text-sm text-brand-muted">Add products to start a sale.</p>
        )}
        {lines.map((line) => (
          <div key={line.variantId} className="rounded-xl border border-brand-border p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-brand-black">{line.productName}</p>
                <p className="text-xs text-brand-muted">{line.variantLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(line.variantId)}
                className="text-brand-muted hover:text-brand-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onQuantityChange(line.variantId, line.quantity - 1)}
                  className="flex size-7 items-center justify-center rounded-lg border border-brand-border hover:bg-brand-purple-lightest"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(line.variantId, line.quantity + 1)}
                  disabled={line.quantity >= line.maxStock}
                  className="flex size-7 items-center justify-center rounded-lg border border-brand-border hover:bg-brand-purple-lightest disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <span className="text-sm font-semibold text-brand-black">
                ${(line.unitPrice * line.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-brand-border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-muted">Subtotal</span>
          <span className="font-medium text-brand-black">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-brand-muted">Discount</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={discountTotal}
            onChange={(e) => onDiscountChange(e.target.value)}
            className="h-8 w-24 text-right"
          />
        </div>
        <div className="flex items-center justify-between border-t border-brand-border pt-2 text-base font-bold text-brand-black">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={lines.length === 0} onClick={onCharge}>
          Charge ${total.toFixed(2)}
        </Button>
      </div>
    </div>
  );
}
