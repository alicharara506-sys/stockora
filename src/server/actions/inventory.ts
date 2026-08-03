"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { adjustStockSchema } from "@/lib/validation/inventory";
import { applyInventoryMovement, InsufficientStockError } from "@/server/services/inventory";

export type ActionResult = { success: true } | { success: false; error: string };

export async function adjustStockAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.ADJUST_STOCK);

  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const [location, variant, setting] = await Promise.all([
    prisma.inventoryLocation.findFirst({
      where: { id: data.locationId, businessId: context.business.id },
    }),
    prisma.productVariant.findFirst({
      where: { id: data.variantId, businessId: context.business.id },
    }),
    prisma.businessSetting.findUnique({ where: { businessId: context.business.id } }),
  ]);
  if (!location) return { success: false, error: "Location not found." };
  if (!variant) return { success: false, error: "Variant not found." };

  try {
    await prisma.$transaction((tx) =>
      applyInventoryMovement(tx, {
        businessId: context.business.id,
        locationId: data.locationId,
        variantId: data.variantId,
        type: "ADJUSTMENT",
        quantity: data.delta,
        userId: context.userId,
        notes: data.reason,
        allowNegative: setting?.negativeStockAllowed ?? false,
      }),
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  revalidatePath("/inventory");
  return { success: true };
}
