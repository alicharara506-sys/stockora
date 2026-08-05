"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Ruler, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  createSizeChartAction,
  renameSizeChartAction,
  deleteSizeChartAction,
  addSizeChartValueAction,
  deleteSizeChartValueAction,
} from "@/server/actions/catalog";

type SizeChart = {
  id: string;
  name: string;
  values: { id: string; value: string }[];
};

export function SizeChartManager({ sizeCharts }: { sizeCharts: SizeChart[] }) {
  const [charts, setCharts] = useState(sizeCharts);
  const [newChartName, setNewChartName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createChart() {
    if (!newChartName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createSizeChartAction({ name: newChartName.trim() });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCharts((prev) => [...prev, { id: result.item.id, name: result.item.name, values: [] }]);
      setNewChartName("");
    });
  }

  function deleteChart(id: string) {
    if (!confirm("Delete this size chart?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSizeChartAction(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCharts((prev) => prev.filter((c) => c.id !== id));
    });
  }

  function addValue(chartId: string, value: string) {
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addSizeChartValueAction(chartId, { value: value.trim() });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCharts((prev) =>
        prev.map((c) =>
          c.id === chartId
            ? { ...c, values: [...c.values, { id: `tmp-${Date.now()}`, value: value.trim() }] }
            : c,
        ),
      );
    });
  }

  function deleteValue(chartId: string, valueId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteSizeChartValueAction(valueId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCharts((prev) =>
        prev.map((c) => (c.id === chartId ? { ...c, values: c.values.filter((v) => v.id !== valueId) } : c)),
      );
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Input
          value={newChartName}
          onChange={(e) => setNewChartName(e.target.value)}
          placeholder="New size chart name, e.g. Toddler Sizes"
        />
        <Button type="button" onClick={createChart} disabled={isPending || !newChartName.trim()}>
          <Plus className="size-4" />
          Add chart
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {charts.map((chart) => (
          <SizeChartCard
            key={chart.id}
            chart={chart}
            isPending={isPending}
            onDelete={() => deleteChart(chart.id)}
            onAddValue={(value) => addValue(chart.id, value)}
            onDeleteValue={(valueId) => deleteValue(chart.id, valueId)}
          />
        ))}
      </div>
    </div>
  );
}

function SizeChartCard({
  chart,
  isPending,
  onDelete,
  onAddValue,
  onDeleteValue,
}: {
  chart: SizeChart;
  isPending: boolean;
  onDelete: () => void;
  onAddValue: (value: string) => void;
  onDeleteValue: (valueId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(chart.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenamePending, startRenameTransition] = useTransition();

  function submitRename() {
    if (!name.trim() || name === chart.name) {
      setRenaming(false);
      return;
    }
    setRenameError(null);
    startRenameTransition(async () => {
      const result = await renameSizeChartAction(chart.id, { name: name.trim() });
      if (!result.success) {
        setRenameError(result.error);
        return;
      }
      setRenaming(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
              <Ruler className="size-4" />
            </div>
            {renaming ? (
              <div className="flex items-center gap-1.5">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-40 text-sm" />
                <button
                  type="button"
                  onClick={submitRename}
                  disabled={isRenamePending}
                  className="text-brand-accent hover:text-brand-purple-bright"
                >
                  <Check className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 font-display text-sm font-semibold text-brand-black"
                onClick={() => setRenaming(true)}
              >
                {chart.name}
                <Pencil className="size-3 text-brand-muted" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
            aria-label={`Delete ${chart.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        {renameError && <p className="text-xs text-brand-danger">{renameError}</p>}

        <div className="flex flex-wrap gap-1.5">
          {chart.values.map((v) => (
            <span
              key={v.id}
              className="flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs text-brand-black"
            >
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
            placeholder="Add size, e.g. XXL"
            className="h-8 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              onAddValue(draft);
              setDraft("");
            }}
            disabled={isPending || !draft.trim()}
            className="rounded-lg bg-brand-purple px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
