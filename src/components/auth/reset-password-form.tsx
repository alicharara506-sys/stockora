"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/server/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordAction({
        token,
        password: formData.get("password"),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-brand-purple-light bg-brand-purple-lightest px-5 py-4 text-sm text-brand-accent">
        Password updated — redirecting you to sign in…
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
