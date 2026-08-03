"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generatePaymentQrAction,
  generateProductQrAction,
  generateStoreQrAction,
} from "@/server/actions/qr";

type QrKind = "STORE" | "PRODUCT" | "PAYMENT";

const KIND_LABELS: Record<QrKind, string> = {
  STORE: "Store",
  PRODUCT: "Product",
  PAYMENT: "Payment",
};

export function GenerateQrDialog({
  variants,
  hasStoreQr,
}: {
  variants: { id: string; label: string }[];
  hasStoreQr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QrKind>(hasStoreQr ? "PRODUCT" : "STORE");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "STORE"
          ? await generateStoreQrAction()
          : kind === "PRODUCT"
            ? await generateProductQrAction({ variantId })
            : await generatePaymentQrAction({
                amount: formData.get("amount"),
                note: formData.get("note") || undefined,
              });

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
        <Button size="sm">
          <Plus className="size-4" />
          Generate QR
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Generate QR code
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

          <div className="mt-4 flex gap-1 rounded-full border border-brand-border bg-brand-bg p-1">
            {(Object.keys(KIND_LABELS) as QrKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                disabled={k === "STORE" && hasStoreQr}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  kind === k ? "bg-brand-purple text-white" : "text-brand-muted"
                }`}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>

          <form action={onSubmit} className="mt-4 space-y-4">
            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}

            {kind === "STORE" && (
              <p className="text-sm text-brand-muted">
                Generates a single store QR that links to your storefront info. Only one active
                store QR is needed at a time.
              </p>
            )}

            {kind === "PRODUCT" && (
              <div className="space-y-1.5">
                <Label htmlFor="variantId">Product variant</Label>
                <select
                  id="variantId"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm"
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {kind === "PAYMENT" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Input id="note" name="note" placeholder="e.g. Invoice #1042" />
                </div>
                <p className="text-xs text-brand-muted">Payment QRs expire after 24 hours.</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || (kind === "PRODUCT" && variants.length === 0)}
            >
              {isPending ? "Generating…" : "Generate"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
