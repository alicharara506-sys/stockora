"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBranchAction } from "@/server/actions/branches";

export function CreateBranchDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBranchAction({
        name: formData.get("name"),
        code: formData.get("code"),
        address: formData.get("address"),
        phone: formData.get("phone"),
        email: formData.get("email"),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add branch
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-brand-surface p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Add branch
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

          <form action={onSubmit} className="mt-4 space-y-4">
            {error && (
              <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Branch name</Label>
                <Input id="name" name="name" placeholder="Beirut Mall Branch" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" placeholder="MALL" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="Optional" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="Optional" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="Optional" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating…" : "Create branch"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
