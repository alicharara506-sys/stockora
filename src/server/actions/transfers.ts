"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createTransferSchema } from "@/lib/validation/inventory";
import { applyInventoryMovement, InsufficientStockError } from "@/server/services/inventory";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createTransferAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.TRANSFER_STOCK);

  const parsed = createTransferSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (data.fromLocationId === data.toLocationId) {
    return { success: false, error: "Source and destination must be different." };
  }

  const [fromLocation, toLocation] = await Promise.all([
    prisma.inventoryLocation.findFirst({ where: { id: data.fromLocationId, businessId: context.business.id } }),
    prisma.inventoryLocation.findFirst({ where: { id: data.toLocationId, businessId: context.business.id } }),
  ]);
  if (!fromLocation) return { success: false, error: "Source location not found." };
  if (!toLocation) return { success: false, error: "Destination location not found." };

  try {
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          businessId: context.business.id,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          status: "IN_TRANSIT",
          requestedById: context.userId,
          items: {
            create: data.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          },
        },
      });

      for (const item of data.items) {
        await applyInventoryMovement(tx, {
          businessId: context.business.id,
          locationId: data.fromLocationId,
          variantId: item.variantId,
          type: "TRANSFER_OUT",
          quantity: -item.quantity,
          userId: context.userId,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          notes: `Transfer to ${toLocation.name}`,
        });
      }
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: "Not enough stock at the source branch for one or more items." };
    }
    throw error;
  }

  revalidatePath("/transfers");
  revalidatePath("/inventory");
  return { success: true };
}

export async function receiveTransferAction(transferId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.TRANSFER_STOCK);

  const transfer = await prisma.stockTransfer.findFirst({
    where: { id: transferId, businessId: context.business.id },
    include: { items: true, fromLocation: true },
  });
  if (!transfer) return { success: false, error: "Transfer not found." };
  if (transfer.status !== "IN_TRANSIT") {
    return { success: false, error: "This transfer has already been received or cancelled." };
  }

  await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      await applyInventoryMovement(tx, {
        businessId: context.business.id,
        locationId: transfer.toLocationId,
        variantId: item.variantId,
        type: "TRANSFER_IN",
        quantity: item.quantity,
        userId: context.userId,
        referenceType: "StockTransfer",
        referenceId: transfer.id,
        notes: `Received from ${transfer.fromLocation.name}`,
      });
      await tx.stockTransferItem.update({
        where: { id: item.id },
        data: { receivedQuantity: item.quantity },
      });
    }

    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });

  revalidatePath("/transfers");
  revalidatePath("/inventory");
  return { success: true };
}
