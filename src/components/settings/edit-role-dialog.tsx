"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionCheckboxGrid } from "@/components/settings/permission-checkbox-grid";
import { updateRolePermissionsAction } from "@/server/actions/roles";
import type { PermissionKey } from "@/lib/permissions/constants";

export function EditRoleDialog({
  roleId,
  roleName,
  groups,
  defaultChecked,
}: {
  roleId: string;
  roleName: string;
  groups: { group: string; permissions: { key: PermissionKey; label: string }[] }[];
  defaultChecked: string[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateRolePermissionsAction(roleId, formData.getAll("permissionKeys") as string[]);
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
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-black hover:bg-brand-purple-lightest"
        >
          <Pencil className="size-3.5" />
          Edit permissions
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-brand-surface p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              Edit {roleName} permissions
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
            <PermissionCheckboxGrid groups={groups} name="permissionKeys" defaultChecked={defaultChecked} />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving…" : "Save permissions"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
