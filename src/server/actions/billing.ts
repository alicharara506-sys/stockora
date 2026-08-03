"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy";
import { PERMISSIONS } from "@/lib/permissions/constants";

export type ActionResult = { success: true } | { success: false; error: string };

const changePlanSchema = z.object({
  planKey: z.enum(["STARTER", "BUSINESS", "PREMIUM"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
});

/**
 * Billing runs in "manual" mode (no live payment provider is wired up) — a
 * plan change takes effect immediately and records a PAID invoice, standing
 * in for the webhook a real provider (Stripe, etc.) would send. Swapping in
 * a real provider means changing this function's body, not its callers.
 */
export async function changePlanAction(input: unknown): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS);
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid plan selection." };

  const plan = await prisma.plan.findUnique({ where: { key: parsed.data.planKey } });
  if (!plan || !plan.isActive) return { success: false, error: "Plan not found." };

  const amount = parsed.data.billingCycle === "MONTHLY" ? plan.monthlyPrice : plan.annualPrice;
  const currentPeriodEnd = new Date();
  if (parsed.data.billingCycle === "MONTHLY") {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  } else {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  }

  const subscription = await prisma.subscription.upsert({
    where: { businessId: context.business.id },
    create: {
      businessId: context.business.id,
      planId: plan.id,
      billingCycle: parsed.data.billingCycle,
      status: "ACTIVE",
      currentPeriodEnd,
      provider: "manual",
    },
    update: {
      planId: plan.id,
      billingCycle: parsed.data.billingCycle,
      status: "ACTIVE",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.invoice.create({
    data: {
      businessId: context.business.id,
      subscriptionId: subscription.id,
      amount,
      currency: "USD",
      status: "PAID",
      paidAt: new Date(),
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const context = await requirePermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS);

  const subscription = await prisma.subscription.findUnique({ where: { businessId: context.business.id } });
  if (!subscription) return { success: false, error: "No active subscription." };

  await prisma.subscription.update({
    where: { businessId: context.business.id },
    data: { cancelAtPeriodEnd: true },
  });

  revalidatePath("/settings");
  return { success: true };
}
