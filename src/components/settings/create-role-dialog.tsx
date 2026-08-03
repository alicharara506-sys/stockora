"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionCheckboxGrid } from "@/components/settings/permission-checkbox-grid";
import { createCustomRoleAction } from "@/server/actions/roles";
import type { PermissionKey } from "@/lib/permissions/constants";

export function CreateRoleDialog({
  groups,
}: {
  groups: { group: string; permissions: { key: PermissionKey; label: string }[] }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCustomRoleAction({
        name: formData.get("name"),
        permissionKeys: formData.getAll("permissionKeys"),
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
          Create custom role
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Create custom role
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
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
                {error}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Role name</Label>
              <Input id="name" name="name" placeholder="Store Lead" required />
            </div>
            <PermissionCheckboxGrid groups={groups} name="permissionKeys" />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating…" : "Create role"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
