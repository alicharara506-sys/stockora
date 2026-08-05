"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export function InlineCreatableSelect({
  label,
  options,
  value,
  onChange,
  onCreate,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<{ success: boolean; item?: { id: string; name: string }; error?: string }>;
}) {
  const [items, setItems] = useState(options);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitNew() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await onCreate(newName.trim());
      if (!result.success || !result.item) {
        setError(result.error ?? "Could not create.");
        return;
      }
      setItems((prev) => [...prev, result.item!]);
      onChange(result.item.id);
      setCreating(false);
      setNewName("");
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-brand-black">{label}</label>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>

      {creating ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`New ${label.toLowerCase()} name`}
            className="h-9"
          />
          <button
            type="button"
            onClick={submitNew}
            disabled={isPending}
            className="rounded-lg bg-brand-purple px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "…" : "Add"}
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
        >
          <option value="">None</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-xs text-brand-danger">{error}</p>}
    </div>
  );
}
