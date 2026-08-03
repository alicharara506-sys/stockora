"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext } from "@/lib/tenancy";
import { checkoutSchema } from "@/lib/validation/pos";
import { applyInventoryMovement, InsufficientStockError } from "@/server/services/inventory";

export type CheckoutResult = { success: true; saleId: string } | { success: false; error: string };

export async function checkoutAction(input: unknown): Promise<CheckoutResult> {
  const context = await requireBusinessContext();

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const [session, location, setting] = await Promise.all([
    prisma.registerSession.findFirst({
      where: { id: data.registerSessionId, status: "OPEN" },
      include: { register: true },
    }),
    prisma.inventoryLocation.findFirst({
      where: { businessId: context.business.id, branchId: data.branchId },
    }),
    prisma.businessSetting.findUnique({ where: { businessId: context.business.id } }),
  ]);

  if (!session || session.register.businessId !== context.business.id) {
    return { success: false, error: "No open register session. Open your register first." };
  }
  if (!location) {
    return { success: false, error: "This branch has no stock location configured." };
  }

  const customer = data.customerId
    ? await prisma.customer.findFirst({ where: { id: data.customerId, businessId: context.business.id } })
    : null;
  if (data.customerId && !customer) {
    return { success: false, error: "Customer not found." };
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: data.items.map((i) => i.variantId) }, businessId: context.business.id },
  });
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(0, subtotal - data.discountTotal);

  if (data.paymentMethod === "STORE_CREDIT") {
    if (!customer) return { success: false, error: "Select a customer to pay with store credit." };
    if (Number(customer.storeCreditBalance) < total) {
      return { success: false, error: "Customer doesn't have enough store credit." };
    }
  }

  try {
    const saleId = await prisma.$transaction(async (tx) => {
      const saleNumber = await nextSaleNumber(tx, context.business.id);

      const sale = await tx.sale.create({
        data: {
          businessId: context.business.id,
          branchId: data.branchId,
          registerSessionId: session.id,
          saleNumber,
          employeeId: context.userId,
          customerId: customer?.id,
          currency: context.business.baseCurrency,
          subtotal,
          discountTotal: data.discountTotal,
          taxTotal: 0,
          total,
          status: "COMPLETED",
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.unitPrice * item.quantity,
            })),
          },
          payments: {
            create: [
              {
                method: data.paymentMethod,
                amount: total,
                currency: context.business.baseCurrency,
                status: "COMPLETED",
              },
            ],
          },
        },
      });

      for (const item of data.items) {
        const variant = variantById.get(item.variantId);
        if (!variant) throw new Error(`Unknown variant ${item.variantId}`);

        await applyInventoryMovement(tx, {
          businessId: context.business.id,
          locationId: location.id,
          variantId: item.variantId,
          type: "SOLD",
          quantity: -item.quantity,
          userId: context.userId,
          referenceType: "Sale",
          referenceId: sale.id,
          allowNegative: setting?.negativeStockAllowed ?? false,
        });
      }

      if (data.paymentMethod === "CASH") {
        await tx.cashMovement.create({
          data: {
            registerSessionId: session.id,
            type: "SALE",
            amount: total,
            reason: `Sale ${saleNumber}`,
            createdById: context.userId,
          },
        });
      }

      if (customer) {
        const loyaltyEarned = Math.floor(total);

        if (data.paymentMethod === "STORE_CREDIT") {
          await tx.customerCreditTransaction.create({
            data: {
              customerId: customer.id,
              type: "REDEEM",
              amount: total,
              referenceType: "Sale",
              referenceId: sale.id,
            },
          });
        }

        if (loyaltyEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              type: "EARN",
              points: loyaltyEarned,
              referenceType: "Sale",
              referenceId: sale.id,
            },
          });
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            totalSpent: { increment: total },
            lastPurchaseAt: new Date(),
            storeCreditBalance:
              data.paymentMethod === "STORE_CREDIT" ? { decrement: total } : undefined,
            loyaltyBalance: loyaltyEarned > 0 ? { increment: loyaltyEarned } : undefined,
          },
        });
      }

      return sale.id;
    });

    revalidatePath("/pos");
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/customers");
    return { success: true, saleId };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: "Not enough stock for one or more items in this sale." };
    }
    throw error;
  }
}

async function nextSaleNumber(tx: Prisma.TransactionClient, businessId: string) {
  const count = await tx.sale.count({ where: { businessId } });
  let candidate = `S-${String(count + 1).padStart(6, "0")}`;
  let suffix = 0;
  while (await tx.sale.findUnique({ where: { businessId_saleNumber: { businessId, saleNumber: candidate } } })) {
    suffix += 1;
    candidate = `S-${String(count + 1 + suffix).padStart(6, "0")}`;
  }
  return candidate;
}
