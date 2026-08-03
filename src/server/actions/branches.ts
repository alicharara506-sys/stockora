"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createBranchForBusiness } from "@/server/services/branches";

const branchSchema = z.object({
  name: z.string().min(2, "Enter a branch name").max(120),
  code: z.string().min(2, "Enter a short code").max(20),
  address: z.string().max(240).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export type ActionResult = { success: true } | { success: false; error: string };

export async function createBranchAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.branch.findUnique({
    where: { businessId_code: { businessId: context.business.id, code: parsed.data.code } },
  });
  if (existing) {
    return { success: false, error: "A branch with this code already exists." };
  }

  await prisma.$transaction((tx) =>
    createBranchForBusiness(tx, {
      businessId: context.business.id,
      name: parsed.data.name,
      code: parsed.data.code,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    }),
  );

  revalidatePath("/branches");
  return { success: true };
}

export async function toggleBranchActiveAction(branchId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId: context.business.id },
  });
  if (!branch) {
    return { success: false, error: "Branch not found." };
  }
  if (branch.isMainBranch) {
    return { success: false, error: "The main branch can't be deactivated." };
  }

  if (branch.isActive) {
    const activeCount = await prisma.branch.count({
      where: { businessId: context.business.id, isActive: true },
    });
    if (activeCount <= 1) {
      return { success: false, error: "At least one branch must stay active." };
    }
  }

  await prisma.branch.update({
    where: { id: branch.id },
    data: { isActive: !branch.isActive },
  });

  revalidatePath("/branches");
  return { success: true };
}
