"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKeyAction } from "@/server/actions/api-keys";

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setError(null);
    setCreatedKey(null);
    setCopied(false);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createApiKeyAction({ name: formData.get("name") });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCreatedKey(result.plaintext);
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New API key
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold text-brand-black">
              {createdKey ? "Your new API key" : "Create API key"}
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

          {createdKey ? (
            <div className="mt-4 space-y-4">
              <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-brand-warning">
                Copy this key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-brand-bg p-3">
                <code className="flex-1 overflow-x-auto text-xs text-brand-black">{createdKey}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdKey);
                    setCopied(true);
                  }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-purple hover:bg-brand-purple-lightest"
                  aria-label="Copy"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
              </div>
              <Button className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <form action={onSubmit} className="mt-4 space-y-4">
              {error && (
                <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-brand-danger">
                  {error}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">Key name</Label>
                <Input id="name" name="name" placeholder="e.g. Shopify sync" required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating…" : "Create key"}
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
