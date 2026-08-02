"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/server/actions/auth";

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSubmitted(true);
      setTimeout(() => router.push("/login"), 2500);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-brand-purple-light bg-brand-purple-lightest px-5 py-4 text-sm text-brand-purple">
        Account created. Check your email to verify your address — redirecting you to sign in…
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Jordan Reyes" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" placeholder="you@company.com" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Creating account…" : "Start free trial"}
      </Button>
      <p className="text-center text-xs text-brand-muted">
        No credit card required · 14-day free trial
      </p>
    </form>
  );
}
