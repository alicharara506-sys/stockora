"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  createCategoryAdminAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/server/actions/catalog";

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  sizeChartId: string | null;
  productCount: number;
};

export function CategoryManager({
  categories,
  sizeCharts,
}: {
  categories: Category[];
  sizeCharts: { id: string; name: string }[];
}) {
  const [items, setItems] = useState(categories);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [sizeChartId, setSizeChartId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tree = useMemo(() => {
    const topLevel = items.filter((c) => !c.parentId);
    return topLevel.map((parent) => ({
      parent,
      children: items.filter((c) => c.parentId === parent.id),
    }));
  }, [items]);

  function submitNew() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCategoryAdminAction({
        name: name.trim(),
        parentId: parentId || null,
        sizeChartId: sizeChartId || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Re-render will pick up the real row via revalidatePath; give instant feedback too.
      setItems((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          name: name.trim(),
          parentId: parentId || null,
          sizeChartId: sizeChartId || null,
          productCount: 0,
        },
      ]);
      setName("");
      setParentId("");
      setSizeChartId("");
    });
  }

  function onAssignSizeChart(categoryId: string, nextSizeChartId: string) {
    const category = items.find((c) => c.id === categoryId);
    if (!category) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCategoryAction(categoryId, {
        name: category.name,
        parentId: category.parentId,
        sizeChartId: nextSizeChartId || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, sizeChartId: nextSizeChartId || null } : c)),
      );
    });
  }

  function onDelete(categoryId: string) {
    if (!confirm("Delete this category?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((c) => c.id !== categoryId));
    });
  }

  function sizeChartName(id: string | null) {
    return id ? sizeCharts.find((s) => s.id === id)?.name : undefined;
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="font-display text-sm font-semibold text-brand-black">Add category</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Outerwear" />
            </div>
            <div className="space-y-1.5">
              <Label>Parent (optional)</Label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
              >
                <option value="">Top level</option>
                {items
                  .filter((c) => !c.parentId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Size system (optional)</Label>
              <select
                value={sizeChartId}
                onChange={(e) => setSizeChartId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-brand-border bg-white px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
              >
                <option value="">None</option>
                {sizeCharts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="button" size="sm" onClick={submitNew} disabled={isPending || !name.trim()}>
            <Plus className="size-4" />
            Add category
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {tree.map(({ parent, children }) => (
          <Card key={parent.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                    <FolderTree className="size-4" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-brand-black">{parent.name}</p>
                    <p className="text-xs text-brand-muted">{parent.productCount} product(s)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(parent.id)}
                  disabled={isPending}
                  className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
                  aria-label={`Delete ${parent.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-muted">Size system</span>
                <select
                  value={parent.sizeChartId ?? ""}
                  onChange={(e) => onAssignSizeChart(parent.id, e.target.value)}
                  disabled={isPending}
                  className="h-8 rounded-lg border border-brand-border bg-white px-2 text-xs text-brand-black"
                >
                  <option value="">None</option>
                  {sizeCharts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {children.length > 0 && (
                <div className="space-y-1.5 border-t border-brand-border pt-3">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center justify-between text-sm">
                      <span className="text-brand-black">{child.name}</span>
                      <div className="flex items-center gap-2">
                        {sizeChartName(child.sizeChartId) && (
                          <Badge variant="outline">{sizeChartName(child.sizeChartId)}</Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(child.id)}
                          disabled={isPending}
                          className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
                          aria-label={`Delete ${child.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
