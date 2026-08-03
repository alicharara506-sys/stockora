"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { PosVariant } from "@/components/pos/types";

export function ProductGrid({
  variants,
  onAdd,
}: {
  variants: PosVariant[];
  onAdd: (variant: PosVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const v of variants) if (v.categoryName) set.add(v.categoryName);
    return ["All", ...Array.from(set).sort()];
  }, [variants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return variants.filter((v) => {
      if (category !== "All" && v.categoryName !== category) return false;
      if (!q) return true;
      return (
        v.productName.toLowerCase().includes(q) ||
        v.variantLabel.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        (v.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [variants, query, category]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2.5">
        <Search className="size-4 text-brand-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, SKU, or barcode…"
          className="w-full text-sm outline-none"
        />
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={
              category === c
                ? "shrink-0 rounded-full bg-brand-purple px-3.5 py-1.5 text-xs font-medium text-white"
                : "shrink-0 rounded-full border border-brand-border px-3.5 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
            }
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {filtered.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => variant.stock > 0 && onAdd(variant)}
            disabled={variant.stock <= 0}
            className="flex flex-col items-start rounded-xl border border-brand-border bg-white p-3 text-left shadow-card transition-shadow hover:shadow-card-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="mb-2 flex h-20 w-full items-center justify-center rounded-lg bg-brand-purple-lightest">
              {variant.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={variant.imageUrl} alt={variant.productName} className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span className="font-display text-lg font-bold text-brand-purple">
                  {variant.productName.slice(0, 1)}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-brand-black">{variant.productName}</p>
            <p className="text-[11px] text-brand-muted">{variant.variantLabel}</p>
            <div className="mt-1.5 flex w-full items-center justify-between">
              <span className="text-sm font-bold text-brand-purple">${variant.price.toFixed(2)}</span>
              <span className="text-[10px] text-brand-muted">{variant.stock} left</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-brand-muted">No products match.</p>
        )}
      </div>
    </div>
  );
}
