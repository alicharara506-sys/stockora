import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticateAction } from "@/server/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Welcome back</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Sign in to manage sales, inventory, and reports.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-brand-danger">
          {error === "RateLimited"
            ? "Too many sign-in attempts. Please wait a few minutes and try again."
            : "Invalid email or password. Please try again."}
        </p>
      )}

      <form action={authenticateAction} className="mt-8 space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-purple hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-brand-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-brand-purple hover:underline">
          Start your free trial
        </Link>
      </p>
    </div>
  );
}
