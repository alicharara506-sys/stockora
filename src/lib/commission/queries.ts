import "server-only";
import { prisma } from "@/lib/prisma";
import { toCents, toMajor } from "@/lib/money";
import {
  calculateCommission,
  achievementPercent,
  rankLeaderboard,
  EMPTY_ACHIEVEMENT,
  type Achievement,
  type CommissionRuleInput,
  type LeaderboardEntry,
  type TargetMetric,
} from "@/lib/commission/calculate";

export interface PerformanceFilters {
  from: Date;
  to: Date;
  branchId?: string;
}

/**
 * Aggregates what each salesperson achieved in a period.
 *
 * Returns are subtracted from the seller's numbers: commission is owed on
 * goods the customer kept, not on goods that came back. Refunds are matched
 * to the original sale, so a return lands on whoever made the sale even when
 * someone else processed it.
 */
export async function getAchievementsByUser(
  businessId: string,
  filters: PerformanceFilters,
): Promise<Map<string, Achievement>> {
  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      createdAt: { gte: filters.from, lte: filters.to },
      status: { not: "VOIDED" },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    select: {
      id: true,
      employeeId: true,
      total: true,
      taxTotal: true,
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          variant: { select: { costPrice: true } },
        },
      },
    },
  });

  const byUser = new Map<string, { revenueCents: number; profitCents: number; units: number; transactions: number }>();

  function bucket(userId: string) {
    let entry = byUser.get(userId);
    if (!entry) {
      entry = { revenueCents: 0, profitCents: 0, units: 0, transactions: 0 };
      byUser.set(userId, entry);
    }
    return entry;
  }

  for (const sale of sales) {
    const entry = bucket(sale.employeeId);
    // Tax is collected for the state, not earned by the seller, so it is
    // excluded from the revenue commission is calculated on.
    const netRevenueCents = toCents(Number(sale.total)) - toCents(Number(sale.taxTotal));
    entry.revenueCents += netRevenueCents;
    entry.transactions += 1;

    let costCents = 0;
    for (const item of sale.items) {
      entry.units += item.quantity;
      costCents += toCents(Number(item.variant.costPrice)) * item.quantity;
    }
    entry.profitCents += netRevenueCents - costCents;
  }

  // Clawback: subtract refunded value and units from the original seller.
  const returns = await prisma.return.findMany({
    where: {
      businessId,
      createdAt: { gte: filters.from, lte: filters.to },
      status: { not: "REJECTED" },
    },
    select: {
      sale: { select: { employeeId: true, branchId: true } },
      items: {
        select: {
          quantity: true,
          refundAmount: true,
          variant: { select: { costPrice: true } },
        },
      },
    },
  });

  for (const ret of returns) {
    if (filters.branchId && ret.sale.branchId !== filters.branchId) continue;
    const entry = bucket(ret.sale.employeeId);
    for (const item of ret.items) {
      const refundCents = toCents(Number(item.refundAmount));
      const costCents = toCents(Number(item.variant.costPrice)) * item.quantity;
      entry.revenueCents -= refundCents;
      entry.profitCents -= refundCents - costCents;
      entry.units -= item.quantity;
    }
  }

  const result = new Map<string, Achievement>();
  for (const [userId, entry] of byUser) {
    result.set(userId, {
      revenue: toMajor(entry.revenueCents),
      profit: toMajor(entry.profitCents),
      units: entry.units,
      transactions: entry.transactions,
    });
  }
  return result;
}

function toRuleInput(rule: {
  id: string;
  name: string;
  kind: string;
  basis: string;
  value: unknown;
  thresholdPercent: unknown;
}): CommissionRuleInput {
  return {
    id: rule.id,
    name: rule.name,
    kind: rule.kind as CommissionRuleInput["kind"],
    basis: rule.basis as CommissionRuleInput["basis"],
    value: Number(rule.value),
    thresholdPercent: rule.thresholdPercent === null ? null : Number(rule.thresholdPercent),
  };
}

export interface PerformanceData {
  leaderboard: LeaderboardEntry[];
  totals: { revenue: number; units: number; transactions: number; commission: number };
  rankMetric: TargetMetric;
}

/**
 * Builds the performance view: every active member's achievement, the target
 * that applies to them in this window, and what they have earned.
 */
export async function getPerformanceData(
  businessId: string,
  filters: PerformanceFilters,
  rankMetric: TargetMetric = "REVENUE",
): Promise<PerformanceData> {
  const [members, rules, targets, achievements] = await Promise.all([
    prisma.businessMembership.findMany({
      where: { businessId, status: "ACTIVE" },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.commissionRule.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.salesTarget.findMany({
      where: {
        businessId,
        isActive: true,
        startsAt: { lte: filters.to },
        endsAt: { gte: filters.from },
      },
    }),
    getAchievementsByUser(businessId, filters),
  ]);

  const entries = members.map((member) => {
    const achievement = achievements.get(member.userId) ?? EMPTY_ACHIEVEMENT;

    // A target naming this person wins over a team-wide one.
    const target =
      targets.find((t) => t.userId === member.userId) ?? targets.find((t) => t.userId === null) ?? null;

    const targetValue = target ? Number(target.targetValue) : null;
    const targetMetric = (target?.metric as TargetMetric | undefined) ?? null;
    const percent =
      target && targetMetric ? achievementPercent(achievement, targetMetric, targetValue ?? 0) : null;

    // Rules naming this person replace the general ones rather than stacking,
    // so a personal arrangement doesn't pay twice.
    const personal = rules.filter((r) => r.userId === member.userId);
    const applicable = personal.length > 0 ? personal : rules.filter((r) => r.userId === null);

    const commission = calculateCommission(
      achievement,
      applicable.map(toRuleInput),
      percent ?? 100,
    );

    return {
      userId: member.userId,
      name: member.user.name ?? member.user.email,
      achievement,
      targetValue,
      targetMetric,
      achievedPercent: percent,
      commission: commission.total,
    };
  });

  const leaderboard = rankLeaderboard(entries, rankMetric);

  return {
    leaderboard,
    totals: {
      revenue: toMajor(leaderboard.reduce((sum, e) => sum + toCents(e.achievement.revenue), 0)),
      units: leaderboard.reduce((sum, e) => sum + e.achievement.units, 0),
      transactions: leaderboard.reduce((sum, e) => sum + e.achievement.transactions, 0),
      commission: toMajor(leaderboard.reduce((sum, e) => sum + toCents(e.commission), 0)),
    },
    rankMetric,
  };
}

/** Full commission detail for one person, including the per-rule breakdown. */
export async function getCommissionDetail(
  businessId: string,
  userId: string,
  filters: PerformanceFilters,
) {
  const [rules, targets, achievements] = await Promise.all([
    prisma.commissionRule.findMany({
      where: { businessId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.salesTarget.findMany({
      where: {
        businessId,
        isActive: true,
        startsAt: { lte: filters.to },
        endsAt: { gte: filters.from },
      },
    }),
    getAchievementsByUser(businessId, filters),
  ]);

  const achievement = achievements.get(userId) ?? EMPTY_ACHIEVEMENT;
  const target = targets.find((t) => t.userId === userId) ?? targets.find((t) => t.userId === null) ?? null;
  const targetMetric = (target?.metric as TargetMetric | undefined) ?? null;
  const percent =
    target && targetMetric
      ? achievementPercent(achievement, targetMetric, Number(target.targetValue))
      : null;

  const personal = rules.filter((r) => r.userId === userId);
  const applicable = personal.length > 0 ? personal : rules.filter((r) => r.userId === null);

  return {
    achievement,
    target,
    achievedPercent: percent,
    result: calculateCommission(achievement, applicable.map(toRuleInput), percent ?? 100),
  };
}
