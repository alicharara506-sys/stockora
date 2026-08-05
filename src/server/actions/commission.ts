"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { logAudit } from "@/lib/audit";
import { getCommissionDetail } from "@/lib/commission/queries";
import { parseDayRange } from "@/lib/reports/date-range";

export type ActionResult = { success: true } | { success: false; error: string };

function revalidatePerformance() {
  revalidatePath("/performance");
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

const targetSchema = z
  .object({
    userId: z.string().optional().or(z.literal("")),
    branchId: z.string().optional().or(z.literal("")),
    categoryId: z.string().optional().or(z.literal("")),
    productId: z.string().optional().or(z.literal("")),
    period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
    metric: z.enum(["REVENUE", "UNITS", "TRANSACTIONS", "PROFIT"]),
    targetValue: z.coerce.number().positive("Enter a target above zero"),
    startsAt: z.string().min(1, "Choose a start date"),
    endsAt: z.string().min(1, "Choose an end date"),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endsAt) >= new Date(data.startsAt), {
    message: "The end date must be on or after the start date",
    path: ["endsAt"],
  });

export async function createTargetAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // A target assigned to someone outside this business would silently never
  // apply, so reject it rather than store a dangling row.
  if (data.userId) {
    const member = await prisma.businessMembership.findFirst({
      where: { businessId: context.business.id, userId: data.userId },
    });
    if (!member) return { success: false, error: "That person isn't a member of this business." };
  }

  await prisma.salesTarget.create({
    data: {
      businessId: context.business.id,
      userId: data.userId || null,
      branchId: data.branchId || null,
      categoryId: data.categoryId || null,
      productId: data.productId || null,
      period: data.period,
      metric: data.metric,
      targetValue: data.targetValue,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      notes: data.notes || null,
    },
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.create_target",
    entityType: "SalesTarget",
    entityId: data.userId || "team",
    after: { metric: data.metric, period: data.period, targetValue: data.targetValue },
  });

  revalidatePerformance();
  return { success: true };
}

export async function deleteTargetAction(targetId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const target = await prisma.salesTarget.findFirst({
    where: { id: targetId, businessId: context.business.id },
  });
  if (!target) return { success: false, error: "Target not found." };

  await prisma.salesTarget.delete({ where: { id: targetId } });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.delete_target",
    entityType: "SalesTarget",
    entityId: targetId,
    before: { metric: target.metric, targetValue: Number(target.targetValue) },
  });

  revalidatePerformance();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Commission rules
// ---------------------------------------------------------------------------

const ruleSchema = z
  .object({
    name: z.string().min(2, "Enter a name").max(80),
    kind: z.enum(["COMMISSION", "BONUS", "PENALTY"]),
    basis: z.enum([
      "PERCENT_OF_REVENUE",
      "PERCENT_OF_PROFIT",
      "FIXED_PER_SALE",
      "FIXED_PER_UNIT",
      "FIXED_AMOUNT",
    ]),
    value: z.coerce.number().min(0, "Value can't be negative"),
    userId: z.string().optional().or(z.literal("")),
    branchId: z.string().optional().or(z.literal("")),
    categoryId: z.string().optional().or(z.literal("")),
    thresholdPercent: z.coerce.number().min(0).max(1000).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) =>
      !data.basis.startsWith("PERCENT_") || (data.value >= 0 && data.value <= 100),
    { message: "A percentage must be between 0 and 100", path: ["value"] },
  )
  .refine(
    (data) => data.kind === "COMMISSION" || data.thresholdPercent != null,
    { message: "Bonuses and penalties need a target threshold", path: ["thresholdPercent"] },
  );

export async function createCommissionRuleAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const existing = await prisma.commissionRule.findFirst({
    where: { businessId: context.business.id, name: data.name },
  });
  if (existing) return { success: false, error: "A rule with this name already exists." };

  const count = await prisma.commissionRule.count({ where: { businessId: context.business.id } });

  await prisma.commissionRule.create({
    data: {
      businessId: context.business.id,
      name: data.name,
      kind: data.kind,
      basis: data.basis,
      value: data.value,
      userId: data.userId || null,
      branchId: data.branchId || null,
      categoryId: data.categoryId || null,
      thresholdPercent: data.thresholdPercent ?? null,
      isActive: data.isActive,
      sortOrder: count,
    },
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.create_rule",
    entityType: "CommissionRule",
    entityId: data.name,
    after: { kind: data.kind, basis: data.basis, value: data.value },
  });

  revalidatePerformance();
  return { success: true };
}

export async function deleteCommissionRuleAction(ruleId: string): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const rule = await prisma.commissionRule.findFirst({
    where: { id: ruleId, businessId: context.business.id },
  });
  if (!rule) return { success: false, error: "Rule not found." };

  await prisma.commissionRule.delete({ where: { id: ruleId } });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.delete_rule",
    entityType: "CommissionRule",
    entityId: ruleId,
    before: { name: rule.name, value: Number(rule.value) },
  });

  revalidatePerformance();
  return { success: true };
}

export async function toggleCommissionRuleAction(
  ruleId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const rule = await prisma.commissionRule.findFirst({
    where: { id: ruleId, businessId: context.business.id },
  });
  if (!rule) return { success: false, error: "Rule not found." };

  await prisma.commissionRule.update({ where: { id: ruleId }, data: { isActive } });
  revalidatePerformance();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

const payoutSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

/**
 * Freezes the current commission calculation into payout records.
 *
 * Stored rather than recomputed so payroll history stays fixed even after
 * rules, prices or costs change. Re-running the same period overwrites any
 * payout still in DRAFT, but leaves APPROVED and PAID rows alone.
 */
export async function generatePayoutsAction(
  input: unknown,
): Promise<{ success: true; created: number; skipped: number } | { success: false; error: string }> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Choose a period first." };

  // The end must cover the whole final day — a bare date parses to midnight,
  // which would leave that day's sales out of the payout entirely.
  const range = parseDayRange(parsed.data.from, parsed.data.to);
  if (!range) {
    return { success: false, error: "That period isn't a valid date range." };
  }
  const { from, to } = range;

  const members = await prisma.businessMembership.findMany({
    where: { businessId: context.business.id, status: "ACTIVE" },
    select: { userId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const member of members) {
    const detail = await getCommissionDetail(context.business.id, member.userId, { from, to });

    // Nothing sold and nothing owed — don't clutter payroll with empty rows.
    if (detail.achievement.transactions === 0 && detail.result.total === 0) continue;

    const existing = await prisma.commissionPayout.findUnique({
      where: {
        businessId_userId_periodStart_periodEnd: {
          businessId: context.business.id,
          userId: member.userId,
          periodStart: from,
          periodEnd: to,
        },
      },
    });

    if (existing && existing.status !== "DRAFT") {
      skipped += 1;
      continue;
    }

    const values = {
      revenue: detail.achievement.revenue,
      unitsSold: detail.achievement.units,
      transactions: detail.achievement.transactions,
      grossProfit: detail.achievement.profit,
      commissionAmount: detail.result.commission,
      bonusAmount: detail.result.bonus,
      penaltyAmount: detail.result.penalty,
      totalPayable: detail.result.total,
      // Prisma's Json input type doesn't accept a typed array directly.
      breakdown: detail.result.lines as unknown as Prisma.InputJsonValue,
      status: "DRAFT" as const,
      generatedAt: new Date(),
    };

    await prisma.commissionPayout.upsert({
      where: {
        businessId_userId_periodStart_periodEnd: {
          businessId: context.business.id,
          userId: member.userId,
          periodStart: from,
          periodEnd: to,
        },
      },
      create: {
        businessId: context.business.id,
        userId: member.userId,
        periodStart: from,
        periodEnd: to,
        ...values,
      },
      update: values,
    });
    created += 1;
  }

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.generate_payouts",
    entityType: "CommissionPayout",
    entityId: `${parsed.data.from}_${parsed.data.to}`,
    after: { created, skipped },
  });

  revalidatePerformance();
  return { success: true, created, skipped };
}

export async function updatePayoutStatusAction(
  payoutId: string,
  status: "DRAFT" | "APPROVED" | "PAID",
): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  const payout = await prisma.commissionPayout.findFirst({
    where: { id: payoutId, businessId: context.business.id },
  });
  if (!payout) return { success: false, error: "Payout not found." };

  // Paid money can't be un-paid by editing a status — reversing it is an
  // accounting action, not a UI toggle.
  if (payout.status === "PAID" && status !== "PAID") {
    return { success: false, error: "A paid payout can't be reopened." };
  }

  await prisma.commissionPayout.update({
    where: { id: payoutId },
    data: {
      status,
      approvedById: status === "APPROVED" ? context.userId : payout.approvedById,
      paidAt: status === "PAID" ? new Date() : payout.paidAt,
    },
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.update_payout_status",
    entityType: "CommissionPayout",
    entityId: payoutId,
    before: { status: payout.status },
    after: { status },
  });

  revalidatePerformance();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Discount authority
// ---------------------------------------------------------------------------

export async function setDiscountAuthorityAction(
  userId: string,
  maxDiscountPercent: number | null,
): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_COMMISSION);

  if (maxDiscountPercent !== null && (maxDiscountPercent < 0 || maxDiscountPercent > 100)) {
    return { success: false, error: "A discount limit must be between 0 and 100%." };
  }

  const membership = await prisma.businessMembership.findFirst({
    where: { businessId: context.business.id, userId },
  });
  if (!membership) return { success: false, error: "That person isn't a member of this business." };

  await prisma.businessMembership.update({
    where: { id: membership.id },
    data: { maxDiscountPercent },
  });

  await logAudit({
    businessId: context.business.id,
    userId: context.userId,
    action: "commission.set_discount_authority",
    entityType: "BusinessMembership",
    entityId: membership.id,
    before: { maxDiscountPercent: membership.maxDiscountPercent ? Number(membership.maxDiscountPercent) : null },
    after: { maxDiscountPercent },
  });

  revalidatePerformance();
  revalidatePath("/employees");
  return { success: true };
}
