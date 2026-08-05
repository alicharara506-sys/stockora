"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkoutAction } from "@/server/actions/sales";
import type { CartLine } from "@/components/pos/types";
import {
  CustomerCaptureForm,
  EMPTY_CAPTURED_CUSTOMER,
  isCaptureComplete,
  type CapturedCustomer,
  type CaptureRequirements,
} from "@/components/pos/customer-capture-form";

const METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "MOBILE_WALLET", label: "Mobile Wallet" },
  { key: "BANK_TRANSFER", label: "Bank Transfer" },
  { key: "QR_PAY", label: "QR Pay" },
  { key: "STORE_CREDIT", label: "Store Credit" },
] as const;

type Step = "payment" | "customer";

export function CheckoutDialog({
  open,
  onOpenChange,
  lines,
  discountTotal,
  registerSessionId,
  branchId,
  customerId,
  requireCustomer,
  captureRequirements,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  discountTotal: number;
  registerSessionId: string;
  branchId: string;
  customerId: string | null;
  /** When true, a sale can't be completed without a customer on it. */
  requireCustomer: boolean;
  captureRequirements: CaptureRequirements;
  onSuccess: (saleId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]["key"]>("CASH");
  const [tendered, setTendered] = useState("");
  const [step, setStep] = useState<Step>("payment");
  const [captured, setCaptured] = useState<CapturedCustomer>(EMPTY_CAPTURED_CUSTOMER);
  /** Set when the cashier opts to record details for an otherwise walk-in sale. */
  const [addingOptionalCustomer, setAddingOptionalCustomer] = useState(false);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discountTotal);
  const change = method === "CASH" ? Math.max(0, (Number(tendered) || 0) - total) : 0;

  // Details are only needed when the business requires them and no existing
  // customer is already attached to the sale.
  const needsCapture = requireCustomer && !customerId;
  const captureReady = isCaptureComplete(captured, captureRequirements);

  function reset() {
    setStep("payment");
    setCaptured(EMPTY_CAPTURED_CUSTOMER);
    setAddingOptionalCustomer(false);
    setError(null);
  }

  function submit(withCustomer: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction({
        registerSessionId,
        branchId,
        customerId: customerId ?? undefined,
        newCustomer: withCustomer
          ? {
              name: captured.name.trim(),
              phone: captured.phone.trim(),
              email: captured.email.trim(),
              // Falling back to the phone matches what cashiers expect when
              // they leave WhatsApp blank for a mobile number.
              whatsapp: (captured.whatsapp || captured.phone).trim(),
              company: captured.company.trim(),
              notes: captured.notes.trim(),
              marketingConsent: captured.marketingConsent,
            }
          : undefined,
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
        discountTotal,
        paymentMethod: method,
        amountTendered: method === "CASH" ? Number(tendered) || undefined : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      reset();
      onSuccess(result.saleId);
    });
  }

  /** Payment is taken first; details are collected before the sale is written. */
  function onTakePayment() {
    if (needsCapture) {
      setError(null);
      setStep("customer");
      return;
    }
    submit(addingOptionalCustomer && captureReady);
  }

  const cashShort = method === "CASH" && Number(tendered) < total;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step === "customer" && (
                <button
                  type="button"
                  onClick={() => setStep("payment")}
                  disabled={isPending}
                  aria-label="Back to payment"
                  className="flex size-7 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-purple-lightest"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
                {step === "payment" ? "Complete sale" : "Customer details"}
              </Dialog.Title>
            </div>
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

            {step === "payment" ? (
              <>
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

                {needsCapture && (
                  <p className="rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-xs text-brand-muted">
                    Customer details are required before this sale can be finalized.
                  </p>
                )}

                {/* Optional capture when details aren't mandatory. */}
                {!needsCapture && !customerId && (
                  <div>
                    {addingOptionalCustomer ? (
                      <div className="space-y-3 rounded-xl border border-brand-border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-brand-black">Customer details</p>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingOptionalCustomer(false);
                              setCaptured(EMPTY_CAPTURED_CUSTOMER);
                            }}
                            className="text-xs text-brand-muted hover:text-brand-danger"
                          >
                            Skip
                          </button>
                        </div>
                        <CustomerCaptureForm
                          value={captured}
                          onChange={setCaptured}
                          requirements={captureRequirements}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingOptionalCustomer(true)}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-purple hover:underline"
                      >
                        <UserPlus className="size-3.5" />
                        Add customer details
                      </button>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={onTakePayment}
                  disabled={
                    isPending ||
                    cashShort ||
                    (addingOptionalCustomer && !captureReady)
                  }
                >
                  {isPending ? "Completing…" : needsCapture ? "Continue" : "Complete sale"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-brand-muted">
                  Payment of ${total.toFixed(2)} by{" "}
                  {METHODS.find((m) => m.key === method)?.label.toLowerCase()}. Enter the
                  customer&apos;s details to finalize.
                </p>
                <CustomerCaptureForm
                  value={captured}
                  onChange={setCaptured}
                  requirements={captureRequirements}
                />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => submit(true)}
                  disabled={isPending || !captureReady}
                >
                  {isPending ? "Completing…" : "Finalize sale"}
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
