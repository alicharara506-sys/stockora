"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { expenseSchema } from "@/lib/validation/expenses";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createExpenseAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const category = await prisma.expenseCategory.findFirst({
    where: { id: data.categoryId, businessId: context.business.id },
  });
  if (!category) return { success: false, error: "Category not found." };

  await prisma.$transaction(async (tx) => {
    await tx.expense.create({
      data: {
        businessId: context.business.id,
        branchId: data.branchId || null,
        categoryId: data.categoryId,
        amount: data.amount,
        currency: context.business.baseCurrency,
        paymentMethod: data.paymentMethod,
        supplierId: data.supplierId || null,
        description: data.description || null,
        date: new Date(data.date),
        createdById: context.userId,
      },
    });

    if (data.paymentMethod === "CASH" && data.branchId) {
      const openSession = await tx.registerSession.findFirst({
        where: { register: { businessId: context.business.id, branchId: data.branchId }, status: "OPEN" },
      });
      if (openSession) {
        await tx.cashMovement.create({
          data: {
            registerSessionId: openSession.id,
            type: "CASH_OUT",
            amount: -data.amount,
            reason: `Expense: ${category.name}`,
            createdById: context.userId,
          },
        });
      }
    }
  });

  revalidatePath("/expenses");
  return { success: true };
}

const categoryNameSchema = z.object({ name: z.string().min(2).max(80) });

export type CreateCategoryResult =
  | { success: true; item: { id: string; name: string } }
  | { success: false; error: string };

export async function createExpenseCategoryAction(input: unknown): Promise<CreateCategoryResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = categoryNameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.expenseCategory.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name },
  });
  if (existing) return { success: true, item: { id: existing.id, name: existing.name } };

  const category = await prisma.expenseCategory.create({
    data: { businessId: context.business.id, name: parsed.data.name },
  });
  revalidatePath("/expenses");
  return { success: true, item: { id: category.id, name: category.name } };
}
