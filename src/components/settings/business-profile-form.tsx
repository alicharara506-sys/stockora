"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBusinessProfileAction } from "@/server/actions/business";

const INDUSTRIES = [
  "Clothing store",
  "Footwear store",
  "Kids & baby store",
  "Boutique",
  "Sports & accessories",
  "Department store",
  "Fashion chain",
];

export function BusinessProfileForm({
  name,
  industry,
}: {
  name: string;
  industry: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateBusinessProfileAction({
        name: formData.get("name"),
        industry: formData.get("industry"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form action={onSubmit} className="max-w-md space-y-4">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-brand-purple-light bg-brand-purple-lightest px-4 py-2.5 text-sm text-brand-accent">
          Saved.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry</Label>
        <select
          id="industry"
          name="industry"
          defaultValue={industry ?? ""}
          required
          className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
        >
          {INDUSTRIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
