"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  createAttributeAction,
  deleteAttributeAction,
  addAttributeValueAction,
  deleteAttributeValueAction,
} from "@/server/actions/catalog";

type Attribute = {
  id: string;
  name: string;
  values: { id: string; value: string; colorHex: string | null }[];
};

export function AttributeManager({ attributes }: { attributes: Attribute[] }) {
  const [items, setItems] = useState(attributes);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createAttribute() {
    if (!newAttributeName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createAttributeAction({ name: newAttributeName.trim() });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) => [...prev, { id: result.item.id, name: result.item.name, values: [] }]);
      setNewAttributeName("");
    });
  }

  function deleteAttribute(id: string) {
    if (!confirm("Delete this attribute?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAttributeAction(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== id));
    });
  }

  function addValue(attributeId: string, value: string, colorHex: string) {
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addAttributeValueAction(attributeId, { value: value.trim(), colorHex });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((a) =>
          a.id === attributeId
            ? {
                ...a,
                values: [...a.values, { id: `tmp-${Date.now()}`, value: value.trim(), colorHex: colorHex || null }],
              }
            : a,
        ),
      );
    });
  }

  function deleteValue(attributeId: string, valueId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAttributeValueAction(valueId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((a) => (a.id === attributeId ? { ...a, values: a.values.filter((v) => v.id !== valueId) } : a)),
      );
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Input
          value={newAttributeName}
          onChange={(e) => setNewAttributeName(e.target.value)}
          placeholder="New attribute name, e.g. Material"
        />
        <Button type="button" onClick={createAttribute} disabled={isPending || !newAttributeName.trim()}>
          <Plus className="size-4" />
          Add attribute
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((attribute) => (
          <AttributeCard
            key={attribute.id}
            attribute={attribute}
            isPending={isPending}
            onDelete={() => deleteAttribute(attribute.id)}
            onAddValue={(value, colorHex) => addValue(attribute.id, value, colorHex)}
            onDeleteValue={(valueId) => deleteValue(attribute.id, valueId)}
          />
        ))}
      </div>
    </div>
  );
}

function AttributeCard({
  attribute,
  isPending,
  onDelete,
  onAddValue,
  onDeleteValue,
}: {
  attribute: Attribute;
  isPending: boolean;
  onDelete: () => void;
  onAddValue: (value: string, colorHex: string) => void;
  onDeleteValue: (valueId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [colorHex, setColorHex] = useState("");
  const isColorAttribute = attribute.name.toLowerCase() === "color";

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
              <Tag className="size-4" />
            </div>
            <p className="font-display text-sm font-semibold text-brand-black">{attribute.name}</p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
            aria-label={`Delete ${attribute.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {attribute.values.map((v) => (
            <span
              key={v.id}
              className="flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1 text-xs text-brand-black"
            >
              {v.colorHex && (
                <span
                  className="size-3 rounded-full border border-brand-border"
                  style={{ backgroundColor: v.colorHex }}
                />
              )}
              {v.value}
              <button
                type="button"
                onClick={() => onDeleteValue(v.id)}
                disabled={isPending}
                className="text-brand-muted hover:text-brand-danger"
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isColorAttribute ? "e.g. Navy" : "Add value"}
            className="h-8 text-xs"
          />
          {isColorAttribute && (
            <input
              type="color"
              value={colorHex || "#7c3aed"}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-8 w-9 shrink-0 rounded-lg border border-brand-border"
              aria-label="Swatch color"
            />
          )}
          <button
            type="button"
            onClick={() => {
              onAddValue(draft, isColorAttribute ? colorHex : "");
              setDraft("");
            }}
            disabled={isPending || !draft.trim()}
            className="shrink-0 rounded-lg bg-brand-purple px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
