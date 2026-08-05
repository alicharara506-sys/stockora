"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { updateVariantAction } from "@/server/actions/products";

export function VariantRowEditor({
  variantId,
  costPrice,
  sellingPrice,
  reorderLevel,
  isActive,
  canEdit,
}: {
  variantId: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({ costPrice, sellingPrice, reorderLevel, isActive });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(next: typeof values) {
    setValues(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updateVariantAction(variantId, next);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  if (!canEdit) {
    return (
      <>
        <td className="px-3 py-2">${costPrice.toFixed(2)}</td>
        <td className="px-3 py-2">${sellingPrice.toFixed(2)}</td>
        <td className="px-3 py-2">{reorderLevel}</td>
        <td className="px-3 py-2">{isActive ? "Active" : "Inactive"}</td>
      </>
    );
  }

  return (
    <>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={values.costPrice}
          onChange={(e) => save({ ...values, costPrice: Number(e.target.value) })}
          className="h-8 w-24 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={values.sellingPrice}
          onChange={(e) => save({ ...values, sellingPrice: Number(e.target.value) })}
          className="h-8 w-24 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          value={values.reorderLevel}
          onChange={(e) => save({ ...values, reorderLevel: Number(e.target.value) })}
          className="h-8 w-20 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => save({ ...values, isActive: !values.isActive })}
          className={
            values.isActive
              ? "rounded-full bg-brand-success/10 px-2.5 py-1 text-xs font-medium text-brand-success"
              : "rounded-full bg-brand-bg px-2.5 py-1 text-xs font-medium text-brand-muted"
          }
        >
          {values.isActive ? "Active" : "Inactive"}
        </button>
        {isPending && <span className="ml-1.5 text-[10px] text-brand-muted">Saving…</span>}
        {saved && !isPending && <span className="ml-1.5 text-[10px] text-brand-success">Saved</span>}
        {error && <span className="ml-1.5 text-[10px] text-brand-danger">{error}</span>}
      </td>
    </>
  );
}
