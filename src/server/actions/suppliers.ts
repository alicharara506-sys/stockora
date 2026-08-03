"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { supplierSchema, supplierPaymentSchema } from "@/lib/validation/suppliers";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createSupplierAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supplier = await prisma.supplier.create({
    data: {
      businessId: context.business.id,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      taxNumber: data.taxNumber || null,
      contactPerson: data.contactPerson || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}

export async function updateSupplierAction(supplierId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId: context.business.id },
  });
  if (!supplier) return { success: false, error: "Supplier not found." };

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      taxNumber: data.taxNumber || null,
      contactPerson: data.contactPerson || null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
  return { success: true };
}

export async function recordSupplierPaymentAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = supplierPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, businessId: context.business.id },
  });
  if (!supplier) return { success: false, error: "Supplier not found." };

  await prisma.$transaction([
    prisma.supplierPayment.create({
      data: {
        businessId: context.business.id,
        supplierId: supplier.id,
        amount: data.amount,
        method: data.method,
        referenceNumber: data.referenceNumber || null,
      },
    }),
    prisma.supplier.update({
      where: { id: supplier.id },
      data: { balance: { decrement: data.amount } },
    }),
  ]);

  revalidatePath(`/suppliers/${supplier.id}`);
  revalidatePath("/suppliers");
  return { success: true };
}
