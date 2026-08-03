"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineCreatableSelect } from "@/components/products/inline-creatable-select";
import {
  createCustomerAction,
  updateCustomerAction,
  createCustomerGroupAction,
} from "@/server/actions/customers";

interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  birthday: string;
  gender: string;
  notes: string;
  tags: string;
  groupId: string;
  marketingConsent: boolean;
}

export function CustomerForm({
  customerId,
  groups,
  initial,
}: {
  customerId?: string;
  groups: { id: string; name: string }[];
  initial?: Partial<CustomerFormValues>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormValues>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    birthday: initial?.birthday ?? "",
    gender: initial?.gender ?? "",
    notes: initial?.notes ?? "",
    tags: initial?.tags ?? "",
    groupId: initial?.groupId ?? "",
    marketingConsent: initial?.marketingConsent ?? false,
  });

  function set<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const result = customerId
        ? await updateCustomerAction(customerId, payload)
        : await createCustomerAction(payload);

      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-border bg-white p-6">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="customer-name">Full name</Label>
          <Input id="customer-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer-phone">Phone</Label>
          <Input id="customer-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer-email">Email</Label>
          <Input id="customer-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="customer-address">Address</Label>
          <Input id="customer-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer-birthday">Birthday</Label>
          <Input id="customer-birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer-gender">Gender</Label>
          <Input id="customer-gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} placeholder="Optional" />
        </div>
        <InlineCreatableSelect
          label="Customer group"
          options={groups}
          value={form.groupId}
          onChange={(v) => set("groupId", v)}
          onCreate={(name) => createCustomerGroupAction({ name })}
        />
        <div className="space-y-1.5">
          <Label htmlFor="customer-tags">Tags (comma separated)</Label>
          <Input id="customer-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="customer-notes">Notes</Label>
          <textarea
            id="customer-notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-black">
          <input
            type="checkbox"
            checked={form.marketingConsent}
            onChange={(e) => set("marketingConsent", e.target.checked)}
            className="size-4 rounded border-brand-border text-brand-purple"
          />
          Opted in to marketing communications
        </label>
      </div>
      <Button onClick={onSubmit} disabled={isPending || !form.name}>
        {isPending ? "Saving…" : customerId ? "Save changes" : "Create customer"}
      </Button>
    </div>
  );
}
