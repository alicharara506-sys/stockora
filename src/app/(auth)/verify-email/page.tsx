import Link from "next/link";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/server/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <StatusCard
        heading="Missing verification link"
        body="This verification link is incomplete. Request a new one from your account settings."
      />
    );
  }

  const result = await verifyEmailAction(email, token);

  if (!result.success) {
    return <StatusCard heading="Link expired" body={result.error} />;
  }

  return (
    <StatusCard
      heading="Email verified"
      body="Your email address has been confirmed. You're ready to sign in."
      success
    />
  );
}

function StatusCard({
  heading,
  body,
  success,
}: {
  heading: string;
  body: string;
  success?: boolean;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">{heading}</h1>
      <p
        className={
          success
            ? "mt-4 rounded-xl border border-brand-purple-light bg-brand-purple-lightest px-5 py-4 text-sm text-brand-accent"
            : "mt-4 rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-5 py-4 text-sm text-brand-danger"
        }
      >
        {body}
      </p>
      <Button asChild className="mt-8 w-full" size="lg">
        <Link href="/login">Continue to sign in</Link>
      </Button>
    </div>
  );
}
