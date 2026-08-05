"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";
import { CloseRegisterDialog } from "@/components/pos/close-register-dialog";
import type { PosCustomer } from "@/components/pos/customer-picker";
import type { CaptureRequirements } from "@/components/pos/customer-capture-form";
import type { CartLine, PosVariant } from "@/components/pos/types";

export function PosClient({
  variants,
  customers,
  registerSessionId,
  branchId,
  openingCash,
  requireCustomer,
  captureRequirements,
}: {
  variants: PosVariant[];
  customers: PosCustomer[];
  registerSessionId: string;
  branchId: string;
  openingCash: number;
  requireCustomer: boolean;
  captureRequirements: CaptureRequirements;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountTotal, setDiscountTotal] = useState("0");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  function addVariant(variant: PosVariant) {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) return prev;
        return prev.map((l) =>
          l.variantId === variant.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: variant.productName,
          variantLabel: variant.variantLabel,
          sku: variant.sku,
          unitPrice: variant.price,
          quantity: 1,
          maxStock: variant.stock,
        },
      ];
    });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.variantId !== variantId);
      return prev.map((l) =>
        l.variantId === variantId ? { ...l, quantity: Math.min(quantity, l.maxStock) } : l,
      );
    });
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  function onSaleComplete(saleId: string) {
    setLines([]);
    setDiscountTotal("0");
    setCheckoutOpen(false);
    setCustomerId(null);
    router.push(`/sales/${saleId}`);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-brand-black">Point of Sale</h1>
          <p className="text-xs text-brand-muted">Opening cash: ${openingCash.toFixed(2)}</p>
        </div>
        <CloseRegisterDialog sessionId={registerSessionId} />
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden">
          <ProductGrid variants={variants} onAdd={addVariant} />
        </div>
        <div className="overflow-hidden">
          <CartPanel
            lines={lines}
            discountTotal={discountTotal}
            onDiscountChange={setDiscountTotal}
            onQuantityChange={updateQuantity}
            onRemove={removeLine}
            onCharge={() => setCheckoutOpen(true)}
            customers={customers}
            selectedCustomerId={customerId}
            onSelectCustomer={setCustomerId}
          />
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        lines={lines}
        discountTotal={Math.min(Number(discountTotal) || 0, lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}
        registerSessionId={registerSessionId}
        branchId={branchId}
        customerId={customerId}
        requireCustomer={requireCustomer}
        captureRequirements={captureRequirements}
        onSuccess={onSaleComplete}
      />
    </div>
  );
}
