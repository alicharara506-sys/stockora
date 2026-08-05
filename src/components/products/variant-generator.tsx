"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  generateVariantRows,
  type AttributeOption,
  type AttributeValueOption,
  type GeneratedVariantRow,
} from "@/components/products/variant-utils";

export function VariantGenerator({
  productName,
  attributes,
  defaults,
  rows,
  onChange,
  presetSelection,
  onPresetApplied,
}: {
  productName: string;
  attributes: AttributeOption[];
  defaults: { costPrice: number; sellingPrice: number };
  rows: GeneratedVariantRow[];
  onChange: (rows: GeneratedVariantRow[]) => void;
  /** When set, merges these value ids into the given attribute's selection
   * and regenerates — used to apply a category's size chart in one click. */
  presetSelection?: { attributeId: string; valueIds: string[] } | null;
  onPresetApplied?: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  });

  function toggleValue(attributeId: string, valueId: string) {
    setSelected((prev) => {
      const current = prev[attributeId] ?? [];
      const next = current.includes(valueId)
        ? current.filter((id) => id !== valueId)
        : [...current, valueId];
      return { ...prev, [attributeId]: next };
    });
  }

  function regenerate() {
    const groups: AttributeValueOption[][] = attributes
      .map((attribute) => {
        const selectedIds = selected[attribute.id] ?? [];
        return attribute.values.filter((value) => selectedIds.includes(value.id));
      })
      .filter((group) => group.length > 0);

    onChange(generateVariantRows(productName || "Product", groups, defaults));
  }

  // Regenerate defaults once on mount so a product always has at least the
  // no-attribute "Default" variant, without requiring an explicit click.
  useEffect(() => {
    if (rows.length === 0) regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Applies a category's synced size values (e.g. from "Load category sizes")
  // by merging them into the current selection and regenerating immediately.
  useEffect(() => {
    if (!presetSelection) return;
    const merged = { ...selectedRef.current, [presetSelection.attributeId]: presetSelection.valueIds };
    setSelected(merged);

    const groups: AttributeValueOption[][] = attributes
      .map((attribute) => {
        const selectedIds = merged[attribute.id] ?? [];
        return attribute.values.filter((value) => selectedIds.includes(value.id));
      })
      .filter((group) => group.length > 0);
    onChange(generateVariantRows(productName || "Product", groups, defaults));
    onPresetApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSelection]);

  function updateRow(key: string, patch: Partial<GeneratedVariantRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {attributes.map((attribute) => (
          <div key={attribute.id}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              {attribute.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {attribute.values.map((value) => {
                const isChecked = (selected[attribute.id] ?? []).includes(value.id);
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => toggleValue(attribute.id, value.id)}
                    className={
                      isChecked
                        ? "rounded-full border border-brand-purple bg-brand-purple-lightest px-3 py-1.5 text-xs font-medium text-brand-purple"
                        : "rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
                    }
                  >
                    {value.value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={regenerate}>
        Generate variants
      </Button>

      <div className="overflow-x-auto rounded-xl border border-brand-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-brand-bg text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Variant</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Barcode</th>
              <th className="px-3 py-2 font-medium">Cost</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Opening qty</th>
              <th className="px-3 py-2 font-medium">Reorder</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-brand-border">
                <td className="px-3 py-2 font-medium text-brand-black">{row.label}</td>
                <td className="px-3 py-2">
                  <Input
                    value={row.sku}
                    onChange={(e) => updateRow(row.key, { sku: e.target.value })}
                    className="h-8 w-32 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.barcode}
                    onChange={(e) => updateRow(row.key, { barcode: e.target.value })}
                    className="h-8 w-32 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.costPrice}
                    onChange={(e) => updateRow(row.key, { costPrice: Number(e.target.value) })}
                    className="h-8 w-24 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.sellingPrice}
                    onChange={(e) => updateRow(row.key, { sellingPrice: Number(e.target.value) })}
                    className="h-8 w-24 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={row.openingQuantity}
                    onChange={(e) => updateRow(row.key, { openingQuantity: Number(e.target.value) })}
                    className="h-8 w-20 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={row.reorderLevel}
                    onChange={(e) => updateRow(row.key, { reorderLevel: Number(e.target.value) })}
                    className="h-8 w-20 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
