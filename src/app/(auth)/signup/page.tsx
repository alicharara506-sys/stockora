import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Start your free trial</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Set up Stockora for your store in minutes.
      </p>

      <div className="mt-8">
        <SignUpForm />
      </div>

      <p className="mt-8 text-center text-sm text-brand-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-purple hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
