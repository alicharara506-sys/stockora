"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createPurchaseOrderSchema, receiveGoodsSchema } from "@/lib/validation/purchases";
import { applyInventoryMovement } from "@/server/services/inventory";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createPurchaseOrderAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = createPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const [supplier, location] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: data.supplierId, businessId: context.business.id } }),
    prisma.inventoryLocation.findFirst({ where: { id: data.locationId, businessId: context.business.id } }),
  ]);
  if (!supplier) return { success: false, error: "Supplier not found." };
  if (!location) return { success: false, error: "Location not found." };

  const poId = await prisma.$transaction(async (tx) => {
    const poNumber = await nextPoNumber(tx, context.business.id);

    const po = await tx.purchaseOrder.create({
      data: {
        businessId: context.business.id,
        locationId: data.locationId,
        supplierId: data.supplierId,
        poNumber,
        status: "SENT",
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes || null,
        createdById: context.userId,
        items: {
          create: data.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
    });

    return po.id;
  });

  revalidatePath("/purchases");
  redirect(`/purchases/${poId}`);
}

export async function receiveGoodsAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = receiveGoodsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: data.purchaseOrderId, businessId: context.business.id },
    include: { items: true },
  });
  if (!po) return { success: false, error: "Purchase order not found." };
  if (po.status === "RECEIVED" || po.status === "CANCELLED") {
    return { success: false, error: "This purchase order is already closed." };
  }

  const poItemById = new Map(po.items.map((i) => [i.id, i]));
  const itemsToReceive = data.items.filter((i) => i.quantity > 0);
  if (itemsToReceive.length === 0) {
    return { success: false, error: "Enter a quantity to receive for at least one item." };
  }

  for (const item of itemsToReceive) {
    const poItem = poItemById.get(item.poItemId);
    if (!poItem) return { success: false, error: "Item not found on this purchase order." };
    if (item.quantity + poItem.receivedQuantity > poItem.quantity) {
      return { success: false, error: "Received quantity exceeds what was ordered." };
    }
  }

  const totalCost = itemsToReceive.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  await prisma.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: {
        businessId: context.business.id,
        purchaseOrderId: po.id,
        locationId: po.locationId,
        receivedById: context.userId,
        invoiceNumber: data.invoiceNumber || null,
        items: {
          create: itemsToReceive.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            updateCostPrice: item.updateCostPrice,
          })),
        },
      },
    });

    for (const item of itemsToReceive) {
      await applyInventoryMovement(tx, {
        businessId: context.business.id,
        locationId: po.locationId,
        variantId: item.variantId,
        type: "RECEIVED",
        quantity: item.quantity,
        userId: context.userId,
        referenceType: "GoodsReceipt",
        referenceId: receipt.id,
      });

      await tx.purchaseOrderItem.update({
        where: { id: item.poItemId },
        data: { receivedQuantity: { increment: item.quantity } },
      });

      if (item.updateCostPrice) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { costPrice: item.unitCost },
        });
      }
    }

    await tx.supplier.update({
      where: { id: po.supplierId },
      data: { balance: { increment: totalCost } },
    });

    const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    const fullyReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
    });
  });

  revalidatePath(`/purchases/${po.id}`);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  return { success: true };
}

async function nextPoNumber(tx: Prisma.TransactionClient, businessId: string) {
  const count = await tx.purchaseOrder.count({ where: { businessId } });
  let candidate = `PO-${String(count + 1).padStart(5, "0")}`;
  let suffix = 0;
  while (await tx.purchaseOrder.findUnique({ where: { businessId_poNumber: { businessId, poNumber: candidate } } })) {
    suffix += 1;
    candidate = `PO-${String(count + 1 + suffix).padStart(5, "0")}`;
  }
  return candidate;
}
