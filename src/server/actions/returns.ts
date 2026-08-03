"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createReturnSchema, createExchangeSchema } from "@/lib/validation/returns";
import { applyInventoryMovement, InsufficientStockError } from "@/server/services/inventory";

export type ActionResult = { success: true } | { success: false; error: string };

export interface SaleForReturn {
  id: string;
  saleNumber: string;
  branchId: string;
  customerId: string | null;
  status: string;
  items: {
    saleItemId: string;
    variantId: string;
    productName: string;
    variantLabel: string;
    unitPrice: number;
    quantitySold: number;
    quantityReturned: number;
  }[];
}

export async function findSaleForReturnAction(
  saleNumber: string,
): Promise<{ success: true; sale: SaleForReturn } | { success: false; error: string }> {
  const context = await requirePermission(PERMISSIONS.RETURN_SALE);

  const sale = await prisma.sale.findFirst({
    where: { businessId: context.business.id, saleNumber: saleNumber.trim() },
    include: {
      items: {
        include: {
          variant: { include: { product: true, attributeValues: { include: { attributeValue: true } } } },
          returnItems: true,
        },
      },
    },
  });

  if (!sale) return { success: false, error: "No sale found with that number." };
  if (sale.status === "VOIDED") return { success: false, error: "This sale was voided." };

  return {
    success: true,
    sale: {
      id: sale.id,
      saleNumber: sale.saleNumber,
      branchId: sale.branchId,
      customerId: sale.customerId,
      status: sale.status,
      items: sale.items.map((item) => ({
        saleItemId: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantLabel:
          item.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default",
        unitPrice: Number(item.unitPrice),
        quantitySold: item.quantity,
        quantityReturned: item.returnItems.reduce((sum, ri) => sum + ri.quantity, 0),
      })),
    },
  };
}

export async function createReturnAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.RETURN_SALE);

  const parsed = createReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const sale = await prisma.sale.findFirst({
    where: { id: data.saleId, businessId: context.business.id },
    include: { items: { include: { returnItems: true } } },
  });
  if (!sale) return { success: false, error: "Sale not found." };

  const saleItemById = new Map(sale.items.map((i) => [i.id, i]));
  for (const item of data.items) {
    const saleItem = saleItemById.get(item.saleItemId);
    if (!saleItem) return { success: false, error: "That item isn't part of this sale." };
    const alreadyReturned = saleItem.returnItems.reduce((sum, ri) => sum + ri.quantity, 0);
    if (item.quantity + alreadyReturned > saleItem.quantity) {
      return { success: false, error: "Return quantity exceeds what was sold." };
    }
  }

  if (data.refundMethod === "STORE_CREDIT" && !sale.customerId) {
    return { success: false, error: "This sale has no customer to credit." };
  }

  const location = await prisma.inventoryLocation.findFirst({
    where: { businessId: context.business.id, branchId: sale.branchId },
  });
  if (!location) return { success: false, error: "This branch has no stock location configured." };

  const totalReturnQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalSoldQuantity = sale.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAlreadyReturned = sale.items.reduce(
    (sum, i) => sum + i.returnItems.reduce((s, ri) => s + ri.quantity, 0),
    0,
  );
  const isFullReturn = totalReturnQuantity + totalAlreadyReturned >= totalSoldQuantity;

  const refundAmount = data.items.reduce((sum, item) => {
    const saleItem = saleItemById.get(item.saleItemId)!;
    return sum + Number(saleItem.unitPrice) * item.quantity;
  }, 0);

  await prisma.$transaction(async (tx) => {
    const returnRecord = await tx.return.create({
      data: {
        businessId: context.business.id,
        saleId: sale.id,
        customerId: sale.customerId,
        type: isFullReturn ? "FULL" : "PARTIAL",
        reason: data.reason || null,
        refundMethod: data.refundMethod,
        status: "COMPLETED",
        approvedById: context.userId,
        items: {
          create: data.items.map((item) => ({
            saleItemId: item.saleItemId,
            variantId: item.variantId,
            quantity: item.quantity,
            refundAmount: Number(saleItemById.get(item.saleItemId)!.unitPrice) * item.quantity,
          })),
        },
      },
    });

    for (const item of data.items) {
      await applyInventoryMovement(tx, {
        businessId: context.business.id,
        locationId: location.id,
        variantId: item.variantId,
        type: "RETURNED",
        quantity: item.quantity,
        userId: context.userId,
        referenceType: "Return",
        referenceId: returnRecord.id,
      });
    }

    if (data.refundMethod === "STORE_CREDIT" && sale.customerId) {
      await tx.customerCreditTransaction.create({
        data: {
          customerId: sale.customerId,
          type: "ISSUE",
          amount: refundAmount,
          referenceType: "Return",
          referenceId: returnRecord.id,
        },
      });
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { storeCreditBalance: { increment: refundAmount } },
      });
    }

    if (data.refundMethod === "CASH") {
      const openSession = await tx.registerSession.findFirst({
        where: { register: { businessId: context.business.id, branchId: sale.branchId }, status: "OPEN" },
      });
      if (openSession) {
        await tx.cashMovement.create({
          data: {
            registerSessionId: openSession.id,
            type: "REFUND",
            amount: -refundAmount,
            reason: `Return for sale ${sale.saleNumber}`,
            createdById: context.userId,
          },
        });
      }
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: { status: isFullReturn ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
  });

  revalidatePath("/returns");
  revalidatePath("/inventory");
  revalidatePath("/customers");
  return { success: true };
}

export async function createExchangeAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.EXCHANGE_ITEM);

  const parsed = createExchangeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const sale = await prisma.sale.findFirst({
    where: { id: data.saleId, businessId: context.business.id },
  });
  if (!sale) return { success: false, error: "Sale not found." };

  const [oldVariant, newVariant] = await Promise.all([
    prisma.productVariant.findFirst({ where: { id: data.oldVariantId, businessId: context.business.id } }),
    prisma.productVariant.findFirst({ where: { id: data.newVariantId, businessId: context.business.id } }),
  ]);
  if (!oldVariant || !newVariant) return { success: false, error: "Variant not found." };

  const location = await prisma.inventoryLocation.findFirst({
    where: { businessId: context.business.id, branchId: sale.branchId },
  });
  if (!location) return { success: false, error: "This branch has no stock location configured." };

  const priceDifference =
    (Number(newVariant.sellingPrice) - Number(oldVariant.sellingPrice)) * data.quantity;
  const exchangeReceiptNumber = `X-${Date.now().toString(36).toUpperCase()}`;

  try {
    await prisma.$transaction(async (tx) => {
      const exchange = await tx.exchange.create({
        data: {
          businessId: context.business.id,
          saleId: sale.id,
          oldVariantId: data.oldVariantId,
          newVariantId: data.newVariantId,
          priceDifference,
          exchangeReceiptNumber,
        },
      });

      await applyInventoryMovement(tx, {
        businessId: context.business.id,
        locationId: location.id,
        variantId: data.oldVariantId,
        type: "EXCHANGE_IN",
        quantity: data.quantity,
        userId: context.userId,
        referenceType: "Exchange",
        referenceId: exchange.id,
      });

      await applyInventoryMovement(tx, {
        businessId: context.business.id,
        locationId: location.id,
        variantId: data.newVariantId,
        type: "EXCHANGE_OUT",
        quantity: -data.quantity,
        userId: context.userId,
        referenceType: "Exchange",
        referenceId: exchange.id,
      });

      if (priceDifference !== 0) {
        const openSession = await tx.registerSession.findFirst({
          where: { register: { businessId: context.business.id, branchId: sale.branchId }, status: "OPEN" },
        });
        if (openSession) {
          await tx.cashMovement.create({
            data: {
              registerSessionId: openSession.id,
              type: priceDifference > 0 ? "SALE" : "REFUND",
              amount: priceDifference,
              reason: `Exchange ${exchangeReceiptNumber}`,
              createdById: context.userId,
            },
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: "Not enough stock of the replacement item." };
    }
    throw error;
  }

  revalidatePath("/returns");
  revalidatePath("/inventory");
  return { success: true };
}
