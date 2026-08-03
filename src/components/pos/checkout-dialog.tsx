"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkoutAction } from "@/server/actions/sales";
import type { CartLine } from "@/components/pos/types";

const METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "MOBILE_WALLET", label: "Mobile Wallet" },
  { key: "BANK_TRANSFER", label: "Bank Transfer" },
  { key: "QR_PAY", label: "QR Pay" },
  { key: "STORE_CREDIT", label: "Store Credit" },
] as const;

export function CheckoutDialog({
  open,
  onOpenChange,
  lines,
  discountTotal,
  registerSessionId,
  branchId,
  customerId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  discountTotal: number;
  registerSessionId: string;
  branchId: string;
  customerId: string | null;
  onSuccess: (saleId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]["key"]>("CASH");
  const [tendered, setTendered] = useState("");

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discountTotal);
  const change = method === "CASH" ? Math.max(0, (Number(tendered) || 0) - total) : 0;

  function onComplete() {
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction({
        registerSessionId,
        branchId,
        customerId: customerId ?? undefined,
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
        discountTotal,
        paymentMethod: method,
        amountTendered: method === "CASH" ? Number(tendered) || undefined : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess(result.saleId);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Complete sale
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

          <p className="mt-2 font-display text-3xl font-bold text-brand-black">${total.toFixed(2)}</p>

          <div className="mt-4 space-y-4">
            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}

            <div>
              <Label>Payment method</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {METHODS.map((m) => {
                  const disabled = m.key === "STORE_CREDIT" && !customerId;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      disabled={disabled}
                      title={disabled ? "Select a customer to pay with store credit" : undefined}
                      className={
                        method === m.key
                          ? "rounded-xl bg-brand-purple px-3 py-2 text-xs font-medium text-white"
                          : "rounded-xl border border-brand-border px-3 py-2 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest disabled:cursor-not-allowed disabled:opacity-40"
                      }
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {method === "CASH" && (
              <div className="space-y-1.5">
                <Label htmlFor="tendered">Amount received</Label>
                <Input
                  id="tendered"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                />
                <p className="text-sm text-brand-muted">Change due: ${change.toFixed(2)}</p>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={onComplete}
              disabled={isPending || (method === "CASH" && Number(tendered) < total)}
            >
              {isPending ? "Completing…" : "Complete sale"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
