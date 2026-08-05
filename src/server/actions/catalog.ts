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

export type ActionResult = { success: true } | { success: false; error: string };

function revalidateCatalog() {
  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/settings");
}

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
  revalidateCatalog();
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
  revalidateCatalog();
  return { success: true, item: { id: brand.id, name: brand.name } };
}

// ---------------------------------------------------------------------------
// Categories (admin management: hierarchy + default size chart)
// ---------------------------------------------------------------------------

const categoryAdminSchema = z.object({
  name: z.string().min(2, "Enter a name").max(120),
  parentId: z.string().optional().nullable(),
  sizeChartId: z.string().optional().nullable(),
});

export async function createCategoryAdminAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = categoryAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const parentId = parsed.data.parentId || null;

  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, businessId: context.business.id },
    });
    if (!parent) return { success: false, error: "Parent category not found." };
  }

  const existing = await prisma.category.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name, parentId },
  });
  if (existing) return { success: false, error: "A category with this name already exists here." };

  await prisma.category.create({
    data: {
      businessId: context.business.id,
      name: parsed.data.name,
      parentId,
      sizeChartId: parsed.data.sizeChartId || null,
    },
  });
  revalidateCatalog();
  return { success: true };
}

export async function updateCategoryAction(categoryId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = categoryAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId: context.business.id },
  });
  if (!category) return { success: false, error: "Category not found." };

  const parentId = parsed.data.parentId || null;
  if (parentId === categoryId) {
    return { success: false, error: "A category cannot be its own parent." };
  }
  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, businessId: context.business.id },
    });
    if (!parent) return { success: false, error: "Parent category not found." };
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { name: parsed.data.name, parentId, sizeChartId: parsed.data.sizeChartId || null },
  });
  revalidateCatalog();
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId: context.business.id },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!category) return { success: false, error: "Category not found." };
  if (category._count.children > 0) {
    return { success: false, error: "Move or delete its subcategories first." };
  }
  if (category._count.products > 0) {
    return { success: false, error: `${category._count.products} product(s) still use this category.` };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidateCatalog();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Size charts
// ---------------------------------------------------------------------------

export async function createSizeChartAction(input: unknown): Promise<CreateNamedResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.sizeChart.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name },
  });
  if (existing) return { success: false, error: "A size chart with this name already exists." };

  const chart = await prisma.sizeChart.create({
    data: { businessId: context.business.id, name: parsed.data.name },
  });
  revalidateCatalog();
  return { success: true, item: { id: chart.id, name: chart.name } };
}

export async function renameSizeChartAction(sizeChartId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const chart = await prisma.sizeChart.findFirst({
    where: { id: sizeChartId, businessId: context.business.id },
  });
  if (!chart) return { success: false, error: "Size chart not found." };

  await prisma.sizeChart.update({ where: { id: sizeChartId }, data: { name: parsed.data.name } });
  revalidateCatalog();
  return { success: true };
}

export async function deleteSizeChartAction(sizeChartId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const chart = await prisma.sizeChart.findFirst({
    where: { id: sizeChartId, businessId: context.business.id },
    include: { _count: { select: { categories: true } } },
  });
  if (!chart) return { success: false, error: "Size chart not found." };
  if (chart._count.categories > 0) {
    return { success: false, error: `${chart._count.categories} categor${chart._count.categories === 1 ? "y" : "ies"} still use this chart.` };
  }

  await prisma.sizeChart.delete({ where: { id: sizeChartId } });
  revalidateCatalog();
  return { success: true };
}

const sizeChartValueSchema = z.object({ value: z.string().min(1, "Enter a value").max(40) });

export async function addSizeChartValueAction(sizeChartId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = sizeChartValueSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const chart = await prisma.sizeChart.findFirst({
    where: { id: sizeChartId, businessId: context.business.id },
    include: { _count: { select: { values: true } } },
  });
  if (!chart) return { success: false, error: "Size chart not found." };

  const existing = await prisma.sizeChartValue.findFirst({
    where: { sizeChartId, value: parsed.data.value },
  });
  if (existing) return { success: false, error: "This size already exists in the chart." };

  await prisma.sizeChartValue.create({
    data: { sizeChartId, value: parsed.data.value, sortOrder: chart._count.values },
  });
  revalidateCatalog();
  return { success: true };
}

export async function deleteSizeChartValueAction(valueId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const value = await prisma.sizeChartValue.findFirst({
    where: { id: valueId, sizeChart: { businessId: context.business.id } },
  });
  if (!value) return { success: false, error: "Size value not found." };

  await prisma.sizeChartValue.delete({ where: { id: valueId } });
  revalidateCatalog();
  return { success: true };
}

export type SyncCategorySizeResult =
  | {
      success: true;
      attributeId: string;
      /** Every value on the shared "Size" attribute — the full option list. */
      values: { id: string; value: string }[];
      /** Only the values belonging to this category's chart, so a Baby product
       * doesn't inherit unrelated sizes (S/M/L) that live on the same attribute. */
      selectedValueIds: string[];
    }
  | { success: false; error: string };

/** Ensures a business-wide "Size" attribute exists with a value for every
 * entry in the category's linked size chart, so the variant generator can
 * offer that category's size system without the admin re-typing it. */
export async function syncCategorySizeChartAction(categoryId: string): Promise<SyncCategorySizeResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId: context.business.id },
    include: { sizeChart: { include: { values: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!category) return { success: false, error: "Category not found." };
  if (!category.sizeChart) return { success: false, error: "This category has no size chart assigned." };

  const sizeAttribute = await prisma.attribute.upsert({
    where: { businessId_name: { businessId: context.business.id, name: "Size" } },
    create: { businessId: context.business.id, name: "Size" },
    update: {},
  });

  for (const chartValue of category.sizeChart.values) {
    await prisma.attributeValue.upsert({
      where: { attributeId_value: { attributeId: sizeAttribute.id, value: chartValue.value } },
      create: { attributeId: sizeAttribute.id, value: chartValue.value },
      update: {},
    });
  }

  const allValues = await prisma.attributeValue.findMany({
    where: { attributeId: sizeAttribute.id },
    orderBy: { value: "asc" },
  });

  const chartValues = new Set(category.sizeChart.values.map((v) => v.value));

  revalidateCatalog();
  return {
    success: true,
    attributeId: sizeAttribute.id,
    values: allValues.map((v) => ({ id: v.id, value: v.value })),
    selectedValueIds: allValues.filter((v) => chartValues.has(v.value)).map((v) => v.id),
  };
}

export async function getCategorySizeValuesAction(
  categoryId: string,
): Promise<{ success: true; values: string[] } | { success: false; error: string }> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId: context.business.id },
    include: { sizeChart: { include: { values: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!category) return { success: false, error: "Category not found." };
  if (!category.sizeChart) return { success: true, values: [] };

  return { success: true, values: category.sizeChart.values.map((v) => v.value) };
}

// ---------------------------------------------------------------------------
// Attributes (Color, Material, etc.)
// ---------------------------------------------------------------------------

export async function createAttributeAction(input: unknown): Promise<CreateNamedResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.attribute.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name },
  });
  if (existing) return { success: false, error: "An attribute with this name already exists." };

  const attribute = await prisma.attribute.create({
    data: { businessId: context.business.id, name: parsed.data.name },
  });
  revalidateCatalog();
  return { success: true, item: { id: attribute.id, name: attribute.name } };
}

export async function deleteAttributeAction(attributeId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const attribute = await prisma.attribute.findFirst({
    where: { id: attributeId, businessId: context.business.id },
  });
  if (!attribute) return { success: false, error: "Attribute not found." };

  const usedCount = await prisma.variantAttributeValue.count({
    where: { attributeValue: { attributeId } },
  });
  if (usedCount > 0) {
    return { success: false, error: "This attribute is used by existing product variants and can't be deleted." };
  }

  await prisma.attribute.delete({ where: { id: attributeId } });
  revalidateCatalog();
  return { success: true };
}

const attributeValueSchema = z.object({
  value: z.string().min(1, "Enter a value").max(60),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #7C3AED")
    .optional()
    .or(z.literal("")),
});

export async function addAttributeValueAction(attributeId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = attributeValueSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const attribute = await prisma.attribute.findFirst({
    where: { id: attributeId, businessId: context.business.id },
  });
  if (!attribute) return { success: false, error: "Attribute not found." };

  const existing = await prisma.attributeValue.findFirst({
    where: { attributeId, value: parsed.data.value },
  });
  if (existing) return { success: false, error: "This value already exists for this attribute." };

  await prisma.attributeValue.create({
    data: { attributeId, value: parsed.data.value, colorHex: parsed.data.colorHex || null },
  });
  revalidateCatalog();
  return { success: true };
}

export async function deleteAttributeValueAction(valueId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const value = await prisma.attributeValue.findFirst({
    where: { id: valueId, attribute: { businessId: context.business.id } },
  });
  if (!value) return { success: false, error: "Value not found." };

  const usedCount = await prisma.variantAttributeValue.count({ where: { attributeValueId: valueId } });
  if (usedCount > 0) {
    return { success: false, error: "This value is used by existing product variants and can't be deleted." };
  }

  await prisma.attributeValue.delete({ where: { id: valueId } });
  revalidateCatalog();
  return { success: true };
}
