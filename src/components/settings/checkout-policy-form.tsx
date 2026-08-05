"use client";

import { useState, useTransition } from "react";
import { updateCheckoutPolicyAction } from "@/server/actions/business";

export interface CheckoutPolicy {
  requireCustomerAtCheckout: boolean;
  requireCustomerPhone: boolean;
  requireCustomerEmail: boolean;
}

export function CheckoutPolicyForm({ policy }: { policy: CheckoutPolicy }) {
  const [form, setForm] = useState(policy);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(next: CheckoutPolicy) {
    const previous = form;
    setForm(next);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateCheckoutPolicyAction(next);
      if (!result.success) {
        setError(result.error);
        setForm(previous);
        return;
      }
      setNotice("Checkout policy saved.");
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      {notice && <p className="text-sm text-brand-success">{notice}</p>}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={form.requireCustomerAtCheckout}
          disabled={isPending}
          onChange={(e) => save({ ...form, requireCustomerAtCheckout: e.target.checked })}
          className="mt-0.5 size-4 rounded border-brand-border"
        />
        <span className="text-sm">
          <span className="font-medium text-brand-black">Require customer details on every sale</span>
          <span className="block text-brand-muted">
            {form.requireCustomerAtCheckout
              ? "Cashiers must record a customer before a sale can be finalized."
              : "Anonymous walk-in sales are allowed. Cashiers can still add details optionally."}
          </span>
        </span>
      </label>

      {form.requireCustomerAtCheckout && (
        <div className="ml-7 space-y-3 border-l border-brand-border pl-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Required fields
          </p>
          <p className="text-xs text-brand-muted">Name is always required.</p>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-black">
            <input
              type="checkbox"
              checked={form.requireCustomerPhone}
              disabled={isPending}
              onChange={(e) => save({ ...form, requireCustomerPhone: e.target.checked })}
              className="size-4 rounded border-brand-border"
            />
            Phone number
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-black">
            <input
              type="checkbox"
              checked={form.requireCustomerEmail}
              disabled={isPending}
              onChange={(e) => save({ ...form, requireCustomerEmail: e.target.checked })}
              className="size-4 rounded border-brand-border"
            />
            Email address
          </label>
        </div>
      )}
    </div>
  );
}
