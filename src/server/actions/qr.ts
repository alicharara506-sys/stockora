"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createQrCode } from "@/lib/qr";

export type ActionResult = { success: true } | { success: false; error: string };

export async function generateStoreQrAction(): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);
  await createQrCode({
    businessId: context.business.id,
    type: "STORE",
    payload: { businessName: context.business.name },
  });
  revalidatePath("/qr-codes");
  return { success: true };
}

const productQrSchema = z.object({ variantId: z.string().min(1) });

export async function generateProductQrAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);
  const parsed = productQrSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Select a product variant." };

  const variant = await prisma.productVariant.findFirst({
    where: { id: parsed.data.variantId, businessId: context.business.id },
    include: { product: true },
  });
  if (!variant) return { success: false, error: "Variant not found." };

  await createQrCode({
    businessId: context.business.id,
    type: "PRODUCT",
    payload: { variantId: variant.id, productName: variant.product.name, sku: variant.sku },
  });
  revalidatePath("/qr-codes");
  return { success: true };
}

const paymentQrSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  note: z.string().max(140).optional(),
});

export async function generatePaymentQrAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);
  const parsed = paymentQrSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await createQrCode({
    businessId: context.business.id,
    type: "PAYMENT",
    payload: {
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      currency: context.business.baseCurrency,
    },
    expiresAt,
  });
  revalidatePath("/qr-codes");
  return { success: true };
}

const revokeSchema = z.object({ id: z.string().min(1) });

export async function revokeQrAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);
  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const qrCode = await prisma.qRCode.findFirst({
    where: { id: parsed.data.id, businessId: context.business.id },
  });
  if (!qrCode) return { success: false, error: "QR code not found." };

  await prisma.qRCode.update({ where: { id: qrCode.id }, data: { status: "REVOKED" } });
  revalidatePath("/qr-codes");
  return { success: true };
}
