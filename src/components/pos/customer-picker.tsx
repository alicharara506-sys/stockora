"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Search, User } from "lucide-react";

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
}

export function CustomerPicker({
  customers,
  selectedId,
  onSelect,
}: {
  customers: PosCustomer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = customers.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [customers, query]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
        >
          <User className="size-3.5" />
          {selected ? selected.name : "Walk-in customer"}
          <ChevronDown className="size-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 w-64 rounded-xl border border-brand-border bg-brand-surface p-2 shadow-card-lg"
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-brand-border px-2 py-1.5">
            <Search className="size-3.5 text-brand-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              className="w-full text-xs outline-none"
            />
          </div>
          <div className="mt-2 max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
            >
              Walk-in customer
            </button>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c.id);
                  setOpen(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
              >
                {c.name}
                {c.phone && <span className="ml-1 text-brand-muted">· {c.phone}</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-brand-muted">No matches.</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
