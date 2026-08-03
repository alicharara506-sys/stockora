"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";

const nameSchema = z.object({ name: z.string().min(2, "Enter a name").max(120) });

export type CreateNamedResult =
  | { success: true; item: { id: string; name: string } }
  | { success: false; error: string };

export async function createCategoryAction(input: unknown): Promise<CreateNamedResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.category.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name, parentId: null },
  });
  if (existing) return { success: true, item: { id: existing.id, name: existing.name } };

  const category = await prisma.category.create({
    data: { businessId: context.business.id, name: parsed.data.name },
  });
  revalidatePath("/products");
  return { success: true, item: { id: category.id, name: category.name } };
}

export async function createBrandAction(input: unknown): Promise<CreateNamedResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.brand.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name },
  });
  if (existing) return { success: true, item: { id: existing.id, name: existing.name } };

  const brand = await prisma.brand.create({
    data: { businessId: context.business.id, name: parsed.data.name },
  });
  revalidatePath("/products");
  return { success: true, item: { id: brand.id, name: brand.name } };
}
