"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/tenancy";

export async function acceptInvitationAction(token: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/accept-invitation?token=${token}`)}`);
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { business: true, role: true },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    redirect(`/accept-invitation?token=${token}&error=invalid`);
  }

  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    redirect(`/accept-invitation?token=${token}&error=email_mismatch`);
  }

  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.businessMembership.upsert({
      where: { businessId_userId: { businessId: invitation.businessId, userId: session.user.id } },
      create: {
        businessId: invitation.businessId,
        userId: session.user.id,
        roleId: invitation.roleId,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      update: { status: "ACTIVE", joinedAt: new Date() },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return created;
  });

  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, membership.businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}
