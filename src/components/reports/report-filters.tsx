"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface ReportFiltersProps {
  branches: { id: string; name: string }[];
}

const PRESETS: { value: string; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

export function ReportFilters({ branches }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activePreset = searchParams.get("preset") ?? "today";
  const branchId = searchParams.get("branchId") ?? "";
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function applyParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.value}
            type="button"
            size="sm"
            variant={activePreset === preset.value ? "primary" : "outline"}
            disabled={isPending}
            onClick={() => applyParams({ preset: preset.value, from: undefined, to: undefined })}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activePreset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 rounded-xl border border-brand-border bg-white px-3 text-xs text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
            />
            <span className="text-xs text-brand-muted">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 rounded-xl border border-brand-border bg-white px-3 text-xs text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
            />
            <Button
              type="button"
              size="sm"
              variant="subtle"
              disabled={isPending || !customFrom || !customTo}
              onClick={() => applyParams({ preset: "custom", from: customFrom, to: customTo })}
            >
              Apply
            </Button>
          </>
        )}

        {branches.length > 0 && (
          <select
            value={branchId}
            disabled={isPending}
            onChange={(e) => applyParams({ branchId: e.target.value || undefined })}
            className="h-9 rounded-xl border border-brand-border bg-white px-3 text-xs text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
