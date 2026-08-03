"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions/constants";
import { sendEmail } from "@/lib/email";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  roleId: z.string().min(1, "Choose a role"),
});

export type ActionResult = { success: true } | { success: false; error: string };

export async function inviteMemberAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_EMPLOYEES);

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const role = await prisma.role.findFirst({
    where: { id: parsed.data.roleId, businessId: context.business.id },
  });
  if (!role) {
    return { success: false, error: "That role no longer exists." };
  }

  const email = parsed.data.email.toLowerCase();

  const existingMember = await prisma.businessMembership.findFirst({
    where: { businessId: context.business.id, status: "ACTIVE", user: { email } },
  });
  if (existingMember) {
    return { success: false, error: "This person is already part of your team." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.invitation.create({
    data: {
      businessId: context.business.id,
      email,
      roleId: role.id,
      token,
      invitedById: context.userId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to: email,
    subject: `You're invited to join ${context.business.name} on Stockora`,
    html: `<p>${context.business.name} invited you to join their Stockora workspace as ${role.name}.</p>
      <p><a href="${appUrl}/accept-invitation?token=${token}">Accept invitation</a></p>
      <p>This link expires in 7 days.</p>`,
  });

  revalidatePath("/employees");
  return { success: true };
}

export async function updateMemberRoleAction(
  membershipId: string,
  roleId: string,
): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_EMPLOYEES);

  const membership = await prisma.businessMembership.findFirst({
    where: { id: membershipId, businessId: context.business.id },
    include: { role: true },
  });
  if (!membership) {
    return { success: false, error: "Team member not found." };
  }

  const role = await prisma.role.findFirst({
    where: { id: roleId, businessId: context.business.id },
  });
  if (!role) {
    return { success: false, error: "That role no longer exists." };
  }

  if (membership.role.key === SYSTEM_ROLES.OWNER && role.key !== SYSTEM_ROLES.OWNER) {
    const guardError = await assertNotLastOwner(context.business.id, membershipId);
    if (guardError) return guardError;
  }

  await prisma.businessMembership.update({
    where: { id: membershipId },
    data: { roleId: role.id },
  });

  revalidatePath("/employees");
  return { success: true };
}

export async function removeMemberAction(membershipId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_EMPLOYEES);

  const membership = await prisma.businessMembership.findFirst({
    where: { id: membershipId, businessId: context.business.id },
    include: { role: true },
  });
  if (!membership) {
    return { success: false, error: "Team member not found." };
  }

  if (membership.role.key === SYSTEM_ROLES.OWNER) {
    const guardError = await assertNotLastOwner(context.business.id, membershipId);
    if (guardError) return guardError;
  }

  await prisma.businessMembership.update({
    where: { id: membershipId },
    data: { status: "SUSPENDED" },
  });

  revalidatePath("/employees");
  return { success: true };
}

async function assertNotLastOwner(
  businessId: string,
  excludingMembershipId: string,
): Promise<ActionResult | null> {
  const otherOwners = await prisma.businessMembership.count({
    where: {
      businessId,
      status: "ACTIVE",
      role: { key: SYSTEM_ROLES.OWNER },
      id: { not: excludingMembershipId },
    },
  });

  if (otherOwners === 0) {
    return { success: false, error: "A business must always have at least one Owner." };
  }
  return null;
}
