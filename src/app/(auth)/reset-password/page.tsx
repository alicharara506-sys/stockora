import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-5 py-4 text-sm text-brand-danger">
        This reset link is missing its token. Request a new one from the forgot password page.
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Set a new password</h1>
      <p className="mt-2 text-sm text-brand-muted">Choose a strong password for your account.</p>
      <div className="mt-8">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
