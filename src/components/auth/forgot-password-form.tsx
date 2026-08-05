"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await requestPasswordResetAction({ email: formData.get("email") });
      setMessage(
        result.success ? result.message ?? "Check your email for a reset link." : result.error,
      );
    });
  }

  if (message) {
    return (
      <div className="rounded-xl border border-brand-purple-light bg-brand-purple-lightest px-5 py-4 text-sm text-brand-accent">
        {message}
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@company.com" required />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
