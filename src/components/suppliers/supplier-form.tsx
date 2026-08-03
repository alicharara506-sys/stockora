"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupplierAction, updateSupplierAction } from "@/server/actions/suppliers";

interface SupplierFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  contactPerson: string;
  notes: string;
}

export function SupplierForm({
  supplierId,
  initial,
}: {
  supplierId?: string;
  initial?: Partial<SupplierFormValues>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormValues>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    taxNumber: initial?.taxNumber ?? "",
    contactPerson: initial?.contactPerson ?? "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = supplierId
        ? await updateSupplierAction(supplierId, form)
        : await createSupplierAction(form);

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
          <Label htmlFor="supplier-name">Supplier name</Label>
          <Input id="supplier-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supplier-phone">Phone</Label>
          <Input id="supplier-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supplier-email">Email</Label>
          <Input id="supplier-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="supplier-address">Address</Label>
          <Input id="supplier-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supplier-tax">Tax number</Label>
          <Input id="supplier-tax" value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supplier-contact">Contact person</Label>
          <Input id="supplier-contact" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="supplier-notes">Notes</Label>
          <textarea
            id="supplier-notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm"
          />
        </div>
      </div>
      <Button onClick={onSubmit} disabled={isPending || !form.name}>
        {isPending ? "Saving…" : supplierId ? "Save changes" : "Create supplier"}
      </Button>
    </div>
  );
}
