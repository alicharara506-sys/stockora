"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineCreatableSelect } from "@/components/products/inline-creatable-select";
import { VariantGenerator } from "@/components/products/variant-generator";
import type { AttributeOption, GeneratedVariantRow } from "@/components/products/variant-utils";
import { createProductAction } from "@/server/actions/products";
import { createCategoryAction, createBrandAction } from "@/server/actions/catalog";

const GENDERS = ["UNISEX", "MEN", "WOMEN", "BOYS", "GIRLS"] as const;
const AGE_GROUPS = ["ADULT", "KIDS", "BABY", "TODDLER"] as const;
const SEASONS = ["ALL_SEASON", "SPRING_SUMMER", "FALL_WINTER"] as const;

export function ProductForm({
  categories,
  brands,
  attributes,
}: {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  attributes: AttributeOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [gender, setGender] = useState<(typeof GENDERS)[number]>("UNISEX");
  const [ageGroup, setAgeGroup] = useState<(typeof AGE_GROUPS)[number]>("ADULT");
  const [season, setSeason] = useState<(typeof SEASONS)[number]>("ALL_SEASON");
  const [collection, setCollection] = useState("");
  const [material, setMaterial] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("DRAFT");
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [minStock, setMinStock] = useState(0);
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [variantRows, setVariantRows] = useState<GeneratedVariantRow[]>([]);

  function addImageUrl() {
    if (!imageUrlDraft.trim()) return;
    setImageUrls((prev) => [...prev, imageUrlDraft.trim()]);
    setImageUrlDraft("");
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createProductAction({
        name,
        description,
        categoryId,
        brandId,
        gender,
        ageGroup,
        season,
        collection,
        material,
        countryOfOrigin,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        costPrice,
        sellingPrice,
        wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
        minStock,
        notes,
        imageUrls,
        variants: variantRows.map((row) => ({
          attributeValueIds: row.attributeValueIds,
          sku: row.sku,
          barcode: row.barcode,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          openingQuantity: row.openingQuantity,
          reorderLevel: row.reorderLevel,
          isActive: row.isActive,
        })),
      });

      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-danger">
          {error}
        </p>
      )}

      <Section title="General information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
            />
          </div>
          <InlineCreatableSelect
            label="Category"
            options={categories}
            value={categoryId}
            onChange={setCategoryId}
            onCreate={(newName) => createCategoryAction({ name: newName })}
          />
          <InlineCreatableSelect
            label="Brand"
            options={brands}
            value={brandId}
            onChange={setBrandId}
            onCreate={(newName) => createBrandAction({ name: newName })}
          />
          <SelectField label="Gender" value={gender} onChange={(v) => setGender(v as typeof gender)} options={GENDERS} />
          <SelectField label="Age group" value={ageGroup} onChange={(v) => setAgeGroup(v as typeof ageGroup)} options={AGE_GROUPS} />
          <SelectField label="Season" value={season} onChange={(v) => setSeason(v as typeof season)} options={SEASONS} />
          <SelectField label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={["DRAFT", "ACTIVE"]} />
          <div className="space-y-1.5">
            <Label htmlFor="collection">Collection</Label>
            <Input id="collection" value={collection} onChange={(e) => setCollection(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material">Material</Label>
            <Input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="countryOfOrigin">Country of origin</Label>
            <Input id="countryOfOrigin" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Images">
        <div className="flex gap-2">
          <Input
            placeholder="https://…"
            value={imageUrlDraft}
            onChange={(e) => setImageUrlDraft(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={addImageUrl}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {imageUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {imageUrls.map((url, index) => (
              <span
                key={url + index}
                className="flex items-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-black"
              >
                {url}
                <button
                  type="button"
                  onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== index))}
                  className="text-brand-muted hover:text-brand-danger"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="costPrice">Cost price</Label>
            <Input
              id="costPrice"
              type="number"
              min={0}
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sellingPrice">Selling price</Label>
            <Input
              id="sellingPrice"
              type="number"
              min={0}
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wholesalePrice">Wholesale price</Label>
            <Input
              id="wholesalePrice"
              type="number"
              min={0}
              step="0.01"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="minStock">Minimum stock</Label>
            <Input
              id="minStock"
              type="number"
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Variants"
        description="Pick the attribute values that apply to this product, then generate the variant matrix. Opening stock is added to your main branch."
      >
        <VariantGenerator
          productName={name}
          attributes={attributes}
          defaults={{ costPrice, sellingPrice }}
          rows={variantRows}
          onChange={setVariantRows}
        />
      </Section>

      <Section title="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
        />
      </Section>

      <Button onClick={onSubmit} disabled={isPending || !name} size="lg">
        {isPending ? "Creating…" : "Create product"}
      </Button>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6">
      <h2 className="font-display text-base font-semibold text-brand-black">{title}</h2>
      {description && <p className="mt-1 text-sm text-brand-muted">{description}</p>}
      <div className="mt-4">{children}</div>
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
        className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
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
