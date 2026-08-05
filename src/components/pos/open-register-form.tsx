"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openRegisterAction } from "@/server/actions/register";

export function OpenRegisterForm({ registerId }: { registerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openingCash, setOpeningCash] = useState("0");

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await openRegisterAction({ registerId, openingCash });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-8 text-center shadow-card-lg">
        <h1 className="font-display text-xl font-bold text-brand-black">Open your register</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Count the cash in your drawer before your first sale.
        </p>
        {error && (
          <p className="mt-4 rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-1.5 text-left">
          <Label htmlFor="openingCash">Opening cash</Label>
          <Input
            id="openingCash"
            type="number"
            min={0}
            step="0.01"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
          />
        </div>
        <Button className="mt-6 w-full" size="lg" onClick={onSubmit} disabled={isPending}>
          {isPending ? "Opening…" : "Open register"}
        </Button>
      </div>
    </div>
  );
}
