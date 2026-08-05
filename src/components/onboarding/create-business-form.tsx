"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBusinessAction } from "@/server/actions/business";

const INDUSTRIES = [
  "Clothing store",
  "Footwear store",
  "Kids & baby store",
  "Boutique",
  "Sports & accessories",
  "Department store",
  "Fashion chain",
];

const CURRENCIES = ["USD", "LBP", "EUR", "GBP"];

export function CreateBusinessForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBusinessAction({
        name: formData.get("name"),
        industry: formData.get("industry"),
        baseCurrency: formData.get("baseCurrency"),
      });
      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" placeholder="e.g. Stockora Fashion" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry</Label>
        <select
          id="industry"
          name="industry"
          required
          className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
        >
          <option value="">Select an industry</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="baseCurrency">Base currency</Label>
        <select
          id="baseCurrency"
          name="baseCurrency"
          required
          defaultValue="USD"
          className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Setting up your workspace…" : "Create business & continue"}
      </Button>
    </form>
  );
}
