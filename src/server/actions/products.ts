"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createProductSchema, updateProductSchema } from "@/lib/validation/products";
import { applyInventoryMovement } from "@/server/services/inventory";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createProductAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const skus = data.variants.map((v) => v.sku);
  const barcodes = data.variants.map((v) => v.barcode);

  const [existingSku, existingBarcode] = await Promise.all([
    prisma.productVariant.findFirst({
      where: { businessId: context.business.id, sku: { in: skus } },
    }),
    prisma.barcode.findFirst({
      where: { businessId: context.business.id, code: { in: barcodes } },
    }),
  ]);
  if (existingSku) {
    return { success: false, error: `SKU "${existingSku.sku}" is already in use.` };
  }
  if (existingBarcode) {
    return { success: false, error: `Barcode "${existingBarcode.code}" is already in use.` };
  }

  const mainLocation = await prisma.inventoryLocation.findFirst({
    where: { businessId: context.business.id, branch: { isMainBranch: true } },
  });

  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        businessId: context.business.id,
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        gender: data.gender,
        ageGroup: data.ageGroup,
        season: data.season,
        collection: data.collection || null,
        material: data.material || null,
        countryOfOrigin: data.countryOfOrigin || null,
        tags: data.tags,
        status: data.status,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        wholesalePrice: data.wholesalePrice ?? null,
        minStock: data.minStock,
        notes: data.notes || null,
        images: {
          create: data.imageUrls.map((url, index) => ({
            url,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
    });

    for (const variant of data.variants) {
      const createdVariant = await tx.productVariant.create({
        data: {
          businessId: context.business.id,
          productId: product.id,
          sku: variant.sku,
          costPrice: variant.costPrice,
          sellingPrice: variant.sellingPrice,
          reorderLevel: variant.reorderLevel,
          isActive: variant.isActive,
          attributeValues: {
            create: variant.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
          },
          barcodes: {
            create: [{ businessId: context.business.id, code: variant.barcode, type: "CUSTOM", isPrimary: true }],
          },
        },
      });

      if (mainLocation && variant.openingQuantity > 0) {
        await applyInventoryMovement(tx, {
          businessId: context.business.id,
          locationId: mainLocation.id,
          variantId: createdVariant.id,
          type: "OPENING",
          quantity: variant.openingQuantity,
          userId: context.userId,
          notes: "Opening stock at product creation",
        });
      }
    }

    return product.id;
  });

  revalidatePath("/products");
  redirect(`/products/${productId}`);
}

export async function updateProductAction(productId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: context.business.id },
  });
  if (!product) {
    return { success: false, error: "Product not found." };
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description || null,
      categoryId: data.categoryId || null,
      brandId: data.brandId || null,
      gender: data.gender,
      ageGroup: data.ageGroup,
      season: data.season,
      collection: data.collection || null,
      material: data.material || null,
      countryOfOrigin: data.countryOfOrigin || null,
      tags: data.tags,
      status: data.status,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      wholesalePrice: data.wholesalePrice ?? null,
      minStock: data.minStock,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return { success: true };
}

export async function archiveProductAction(productId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId: context.business.id },
  });
  if (!product) {
    return { success: false, error: "Product not found." };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return { success: true };
}

export async function updateVariantAction(
  variantId: string,
  input: { costPrice: number; sellingPrice: number; reorderLevel: number; isActive: boolean },
): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_PRICE);

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, businessId: context.business.id },
  });
  if (!variant) {
    return { success: false, error: "Variant not found." };
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      reorderLevel: input.reorderLevel,
      isActive: input.isActive,
    },
  });

  revalidatePath(`/products/${variant.productId}`);
  return { success: true };
}
