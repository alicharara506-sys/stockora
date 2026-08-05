"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineCreatableSelect } from "@/components/products/inline-creatable-select";
import { createExpenseAction, createExpenseCategoryAction } from "@/server/actions/expenses";

const METHODS = ["CASH", "CARD", "MOBILE_WALLET", "BANK_TRANSFER", "CUSTOM"] as const;

export function CreateExpenseDialog({
  categories,
  branches,
  suppliers,
}: {
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createExpenseAction({
        categoryId,
        amount,
        branchId,
        paymentMethod: method,
        supplierId,
        description,
        date,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setAmount("");
      setDescription("");
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add expense
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-brand-surface p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Add expense
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-purple-lightest"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            {error && (
              <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}
            <InlineCreatableSelect
              label="Category"
              options={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreate={(name) => createExpenseCategoryAction({ name })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expenseAmount">Amount</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expenseDate">Date</Label>
                <Input id="expenseDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
                >
                  <option value="">Business-wide</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as typeof method)}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {suppliers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-sm"
                >
                  <option value="">None</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="expenseDescription">Description</Label>
              <Input
                id="expenseDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={isPending || !categoryId || !amount || !date}>
              {isPending ? "Saving…" : "Add expense"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
