"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { logAudit } from "@/lib/audit";
import { findCountryPreset } from "@/lib/tax/countries";

export type ActionResult = { success: true } | { success: false; error: string };

function revalidateTax() {
  revalidatePath("/settings");
  revalidatePath("/pos");
  revalidatePath("/products");
}

const settingsSchema = z.object({
  taxEnabled: z.boolean(),
  pricesIncludeTax: z.boolean(),
  taxCountry: z.string().max(2).optional().nullable(),
  taxRegistrationNumber: z.string().max(60).optional().nullable(),
});

export async function updateTaxSettingsAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Turning tax on with no active rule would silently charge nothing, which
  // looks like a bug to the operator. Fail loudly instead.
  if (data.taxEnabled) {
    const activeRules = await prisma.tax.count({
      where: { businessId: context.business.id, isActive: true },
    });
    if (activeRules === 0) {
      return {
        success: false,
        error: "Add at least one active tax rule before enabling taxation.",
      };
    }
  }

  const before = await prisma.businessSetting.findUnique({
    where: { businessId: context.business.id },
  });

  await prisma.businessSetting.upsert({
    where: { businessId: context.business.id },
    create: {
      businessId: context.business.id,
      taxEnabled: data.taxEnabled,
      pricesIncludeTax: data.pricesIncludeTax,
      taxCountry: data.taxCountry || null,
      taxRegistrationNumber: data.taxRegistrationNumber || null,
    },
    update: {
      taxEnabled: data.taxEnabled,
      pricesIncludeTax: data.pricesIncludeTax,
      taxCountry: data.taxCountry || null,
      taxRegistrationNumber: data.taxRegistrationNumber || null,
    },
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "tax.update_settings",
    entityType: "BusinessSetting",
    entityId: context.business.id,
    before: before
      ? {
          taxEnabled: before.taxEnabled,
          pricesIncludeTax: before.pricesIncludeTax,
          taxCountry: before.taxCountry,
        }
      : null,
    after: {
      taxEnabled: data.taxEnabled,
      pricesIncludeTax: data.pricesIncludeTax,
      taxCountry: data.taxCountry ?? null,
    },
  });

  revalidateTax();
  return { success: true };
}

const taxRuleSchema = z.object({
  name: z.string().min(1, "Enter a name").max(80),
  rate: z.coerce
    .number()
    .min(0, "Rate can't be negative")
    .max(100, "Rate can't exceed 100%"),
  system: z.enum(["VAT", "GST", "SALES_TAX", "CONSUMPTION_TAX", "CUSTOM"]),
  treatment: z.enum(["STANDARD", "ZERO_RATED", "EXEMPT", "REVERSE_CHARGE"]),
  isCompound: z.boolean().default(false),
  country: z.string().max(2).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function createTaxRuleAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const parsed = taxRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.tax.findFirst({
    where: { businessId: context.business.id, name: data.name },
  });
  if (existing) return { success: false, error: "A tax rule with this name already exists." };

  const count = await prisma.tax.count({ where: { businessId: context.business.id } });

  await prisma.$transaction(async (tx) => {
    // Only one default may exist, otherwise resolution becomes ambiguous.
    if (data.isDefault) {
      await tx.tax.updateMany({
        where: { businessId: context.business.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    await tx.tax.create({
      data: {
        businessId: context.business.id,
        name: data.name,
        rate: data.rate,
        system: data.system,
        treatment: data.treatment,
        isCompound: data.isCompound,
        country: data.country || null,
        isDefault: data.isDefault,
        isActive: data.isActive,
        sortOrder: count,
      },
    });
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "tax.create_rule",
    entityType: "Tax",
    entityId: data.name,
    after: { name: data.name, rate: data.rate, treatment: data.treatment },
  });

  revalidateTax();
  return { success: true };
}

export async function updateTaxRuleAction(taxId: string, input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const parsed = taxRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const tax = await prisma.tax.findFirst({
    where: { id: taxId, businessId: context.business.id },
  });
  if (!tax) return { success: false, error: "Tax rule not found." };

  const duplicate = await prisma.tax.findFirst({
    where: { businessId: context.business.id, name: data.name, id: { not: taxId } },
  });
  if (duplicate) return { success: false, error: "Another tax rule already uses this name." };

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.tax.updateMany({
        where: { businessId: context.business.id, isDefault: true, id: { not: taxId } },
        data: { isDefault: false },
      });
    }
    await tx.tax.update({
      where: { id: taxId },
      data: {
        name: data.name,
        rate: data.rate,
        system: data.system,
        treatment: data.treatment,
        isCompound: data.isCompound,
        country: data.country || null,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "tax.update_rule",
    entityType: "Tax",
    entityId: taxId,
    before: { name: tax.name, rate: Number(tax.rate), treatment: tax.treatment },
    after: { name: data.name, rate: data.rate, treatment: data.treatment },
  });

  revalidateTax();
  return { success: true };
}

export async function deleteTaxRuleAction(taxId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const tax = await prisma.tax.findFirst({
    where: { id: taxId, businessId: context.business.id },
    include: { _count: { select: { products: true, variants: true } } },
  });
  if (!tax) return { success: false, error: "Tax rule not found." };

  const inUse = tax._count.products + tax._count.variants;
  if (inUse > 0) {
    return {
      success: false,
      error: `${inUse} product(s) or variant(s) still use this rule. Reassign them first, or deactivate the rule instead.`,
    };
  }

  await prisma.tax.delete({ where: { id: taxId } });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "tax.delete_rule",
    entityType: "Tax",
    entityId: taxId,
    before: { name: tax.name, rate: Number(tax.rate) },
  });

  revalidateTax();
  return { success: true };
}

export type PresetResult =
  | { success: true; created: number; skipped: number }
  | { success: false; error: string };

/**
 * Creates a starter rule from a country's standard rate.
 *
 * The rate is a reference figure the admin is expected to confirm — rates
 * change and reduced rates apply to many goods — so this only ever creates a
 * rule, never enables taxation on its own.
 */
export async function applyCountryPresetAction(countryCode: string): Promise<PresetResult> {
  const context = await requirePermission(PERMISSIONS.CHANGE_SETTINGS);

  const preset = findCountryPreset(countryCode);
  if (!preset) return { success: false, error: "Unknown country." };
  if (preset.system === "NONE") {
    return { success: false, error: `${preset.name} has no general sales tax to add.` };
  }

  const name = `${preset.system === "VAT" ? "VAT" : preset.system === "GST" ? "GST" : "Tax"} ${preset.standardRate}%`;
  const existing = await prisma.tax.findFirst({
    where: { businessId: context.business.id, name },
  });
  if (existing) return { success: true, created: 0, skipped: 1 };

  const count = await prisma.tax.count({ where: { businessId: context.business.id } });
  const hasDefault = await prisma.tax.findFirst({
    where: { businessId: context.business.id, isDefault: true },
  });

  await prisma.tax.create({
    data: {
      businessId: context.business.id,
      name,
      rate: preset.standardRate,
      system: preset.system === "CONSUMPTION_TAX" ? "CONSUMPTION_TAX" : preset.system,
      treatment: "STANDARD",
      isCompound: false,
      country: preset.code,
      isDefault: !hasDefault,
      isActive: true,
      sortOrder: count,
    },
  });

  revalidateTax();
  return { success: true, created: 1, skipped: 0 };
}
