import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { CreateBusinessForm } from "@/components/onboarding/create-business-form";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-brand-bg px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-8 shadow-card-lg">
          <h1 className="font-display text-xl font-bold text-brand-black">
            Set up your business
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            This creates your workspace, a main branch, and starts your 14-day free trial.
          </p>
          <div className="mt-6">
            <CreateBusinessForm />
          </div>
        </div>
      </div>
    </div>
  );
}
