"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/tenancy";
import { ensureSystemRolesSeeded } from "@/lib/permissions/seed";
import { ensurePlansSeeded } from "@/lib/plans";
import { SYSTEM_ROLES, PERMISSIONS } from "@/lib/permissions/constants";
import { createBranchForBusiness } from "@/server/services/branches";
import { requirePermission } from "@/lib/tenancy";
import { ensureBaseAttributesSeeded } from "@/lib/catalog/seed";

const createBusinessSchema = z.object({
  name: z.string().min(2, "Enter your business name").max(120),
  industry: z.string().min(1, "Choose an industry"),
  baseCurrency: z.string().min(3).max(3),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Enter your business name").max(120),
  industry: z.string().min(1, "Choose an industry"),
});

const TRIAL_LENGTH_MS = 1000 * 60 * 60 * 24 * 14;

export type ActionResult = { success: true } | { success: false; error: string };

export async function createBusinessAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = createBusinessSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const slug = await uniqueSlug(parsed.data.name);

  const businessId = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: parsed.data.name,
        slug,
        industry: parsed.data.industry,
        baseCurrency: parsed.data.baseCurrency,
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + TRIAL_LENGTH_MS),
      },
    });

    await tx.businessSetting.create({ data: { businessId: business.id } });

    await createBranchForBusiness(tx, {
      businessId: business.id,
      name: "Main Branch",
      code: "MAIN",
      isMainBranch: true,
    });

    return business.id;
  });

  const roles = await ensureSystemRolesSeeded(businessId);
  const ownerRole = roles.find((role) => role.key === SYSTEM_ROLES.OWNER)!;
  await ensureBaseAttributesSeeded(businessId);

  await prisma.businessMembership.create({
    data: {
      businessId,
      userId: session!.user.id,
      roleId: ownerRole.id,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  await ensurePlansSeeded();
  const starterPlan = await prisma.plan.findUnique({ where: { key: "STARTER" } });
  if (starterPlan) {
    await prisma.subscription.create({
      data: {
        businessId,
        planId: starterPlan.id,
        billingCycle: "MONTHLY",
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + TRIAL_LENGTH_MS),
      },
    });
  }

  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}

export async function updateBusinessProfileAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.business.update({
    where: { id: context.business.id },
    data: { name: parsed.data.name, industry: parsed.data.industry },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

async function uniqueSlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "business";

  let candidate = base;
  let suffix = 0;
  while (true) {
    const existing = await prisma.business.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
