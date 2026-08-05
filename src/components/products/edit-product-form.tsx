"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineCreatableSelect } from "@/components/products/inline-creatable-select";
import { updateProductAction } from "@/server/actions/products";
import { createCategoryAction, createBrandAction } from "@/server/actions/catalog";

const GENDERS = ["UNISEX", "MEN", "WOMEN", "BOYS", "GIRLS"] as const;
const AGE_GROUPS = ["ADULT", "KIDS", "BABY", "TODDLER"] as const;
const SEASONS = ["ALL_SEASON", "SPRING_SUMMER", "FALL_WINTER"] as const;
const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export function EditProductForm({
  productId,
  categories,
  brands,
  initial,
  onDone,
}: {
  productId: string;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  initial: {
    name: string;
    description: string;
    categoryId: string;
    brandId: string;
    gender: (typeof GENDERS)[number];
    ageGroup: (typeof AGE_GROUPS)[number];
    season: (typeof SEASONS)[number];
    collection: string;
    material: string;
    countryOfOrigin: string;
    tags: string;
    status: (typeof STATUSES)[number];
    costPrice: number;
    sellingPrice: number;
    wholesalePrice: string;
    minStock: number;
    notes: string;
  };
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateProductAction(productId, {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Product name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm"
          />
        </div>
        <InlineCreatableSelect
          label="Category"
          options={categories}
          value={form.categoryId}
          onChange={(v) => set("categoryId", v)}
          onCreate={(name) => createCategoryAction({ name })}
        />
        <InlineCreatableSelect
          label="Brand"
          options={brands}
          value={form.brandId}
          onChange={(v) => set("brandId", v)}
          onCreate={(name) => createBrandAction({ name })}
        />
        <SelectField label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={GENDERS} />
        <SelectField label="Age group" value={form.ageGroup} onChange={(v) => set("ageGroup", v)} options={AGE_GROUPS} />
        <SelectField label="Season" value={form.season} onChange={(v) => set("season", v)} options={SEASONS} />
        <SelectField label="Status" value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
        <div className="space-y-1.5">
          <Label>Collection</Label>
          <Input value={form.collection} onChange={(e) => set("collection", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Material</Label>
          <Input value={form.material} onChange={(e) => set("material", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Country of origin</Label>
          <Input value={form.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tags (comma separated)</Label>
          <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Cost price</Label>
          <Input type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Selling price</Label>
          <Input type="number" min={0} step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Wholesale price</Label>
          <Input type="number" min={0} step="0.01" value={form.wholesalePrice} onChange={(e) => set("wholesalePrice", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum stock</Label>
          <Input type="number" min={0} value={form.minStock} onChange={(e) => set("minStock", Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
