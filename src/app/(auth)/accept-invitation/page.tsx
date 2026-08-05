import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/server/actions/tenancy";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "This invitation is invalid, already used, or has expired.",
  email_mismatch: "This invitation was sent to a different email address.",
};

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return <StatusCard heading="Missing invitation" body="This invitation link is incomplete." />;
  }

  if (error) {
    return (
      <StatusCard
        heading="Invitation unavailable"
        body={ERROR_MESSAGES[error] ?? "This invitation could not be accepted."}
      />
    );
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { business: true, role: true },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return (
      <StatusCard
        heading="Invitation unavailable"
        body="This invitation is invalid, already used, or has expired."
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">You&apos;re invited</h1>
      <p className="mt-2 text-sm text-brand-muted">
        <span className="font-semibold text-brand-black">{invitation.business.name}</span> invited
        you to join as <span className="font-semibold text-brand-black">{invitation.role.name}</span>.
      </p>
      <form action={acceptInvitationAction.bind(null, token)} className="mt-8">
        <Button type="submit" className="w-full" size="lg">
          Accept invitation
        </Button>
      </form>
    </div>
  );
}

function StatusCard({ heading, body }: { heading: string; body: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">{heading}</h1>
      <p className="mt-4 rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-5 py-4 text-sm text-brand-danger">
        {body}
      </p>
    </div>
  );
}
