import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Reset your password</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Enter the email tied to your Stockora account and we&apos;ll send a reset link.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>

      <p className="mt-8 text-center text-sm text-brand-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-purple hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
