import { toCents, toMajor, roundHalfAwayFromZero } from "@/lib/money";

export type TargetMetric = "REVENUE" | "UNITS" | "TRANSACTIONS" | "PROFIT";
export type CommissionKind = "COMMISSION" | "BONUS" | "PENALTY";
export type CommissionBasis =
  | "PERCENT_OF_REVENUE"
  | "PERCENT_OF_PROFIT"
  | "FIXED_PER_SALE"
  | "FIXED_PER_UNIT"
  | "FIXED_AMOUNT";

/** What a salesperson actually achieved over a period. */
export interface Achievement {
  revenue: number;
  profit: number;
  units: number;
  transactions: number;
}

export const EMPTY_ACHIEVEMENT: Achievement = {
  revenue: 0,
  profit: 0,
  units: 0,
  transactions: 0,
};

export interface CommissionRuleInput {
  id: string;
  name: string;
  kind: CommissionKind;
  basis: CommissionBasis;
  /** Percentage for PERCENT_* bases, otherwise a money amount. */
  value: number;
  /** For BONUS/PENALTY: the share of target that triggers the rule. */
  thresholdPercent?: number | null;
}

export interface CommissionLine {
  ruleId: string;
  name: string;
  kind: CommissionKind;
  basis: CommissionBasis;
  amount: number;
}

export interface CommissionResult {
  commission: number;
  bonus: number;
  penalty: number;
  /** Commission plus bonus, less penalty. Never below zero. */
  total: number;
  lines: CommissionLine[];
}

/** Reads the metric a target is measured in off an achievement. */
export function metricValue(achievement: Achievement, metric: TargetMetric): number {
  switch (metric) {
    case "REVENUE":
      return achievement.revenue;
    case "PROFIT":
      return achievement.profit;
    case "UNITS":
      return achievement.units;
    case "TRANSACTIONS":
      return achievement.transactions;
  }
}

/**
 * Percentage of target reached.
 *
 * A target of zero is treated as fully met rather than dividing by zero —
 * an unset goal shouldn't fire a penalty.
 */
export function achievementPercent(
  achievement: Achievement,
  metric: TargetMetric,
  targetValue: number,
): number {
  if (targetValue <= 0) return 100;
  return (metricValue(achievement, metric) / targetValue) * 100;
}

/** Amount a single rule pays out against an achievement. */
function ruleAmount(rule: CommissionRuleInput, achievement: Achievement): number {
  switch (rule.basis) {
    case "PERCENT_OF_REVENUE":
      return toMajor(roundHalfAwayFromZero((toCents(achievement.revenue) * rule.value) / 100));
    case "PERCENT_OF_PROFIT":
      // Commission is never negative when the period ran at a loss — a
      // salesperson doesn't owe money back on an unprofitable month.
      return toMajor(
        roundHalfAwayFromZero((toCents(Math.max(0, achievement.profit)) * rule.value) / 100),
      );
    case "FIXED_PER_SALE":
      return toMajor(toCents(rule.value) * achievement.transactions);
    case "FIXED_PER_UNIT":
      return toMajor(toCents(rule.value) * achievement.units);
    case "FIXED_AMOUNT":
      return rule.value;
  }
}

/**
 * Computes commission, bonuses and penalties for one person over one period.
 *
 * BONUS rules fire when achievement reaches their threshold; PENALTY rules
 * fire when it falls below. Rules without a threshold always apply. With no
 * target set, `achievedPercent` defaults to 100 so bonuses pay and penalties
 * stay silent — the safer direction when a goal was never assigned.
 */
export function calculateCommission(
  achievement: Achievement,
  rules: CommissionRuleInput[],
  achievedPercent = 100,
): CommissionResult {
  const lines: CommissionLine[] = [];
  let commissionCents = 0;
  let bonusCents = 0;
  let penaltyCents = 0;

  for (const rule of rules) {
    const threshold = rule.thresholdPercent ?? null;

    if (rule.kind === "BONUS" && threshold !== null && achievedPercent < threshold) continue;
    if (rule.kind === "PENALTY" && threshold !== null && achievedPercent >= threshold) continue;

    const amount = ruleAmount(rule, achievement);
    if (amount === 0) continue;

    const cents = toCents(amount);
    if (rule.kind === "COMMISSION") commissionCents += cents;
    else if (rule.kind === "BONUS") bonusCents += cents;
    else penaltyCents += Math.abs(cents);

    lines.push({
      ruleId: rule.id,
      name: rule.name,
      kind: rule.kind,
      basis: rule.basis,
      amount: toMajor(rule.kind === "PENALTY" ? -Math.abs(cents) : cents),
    });
  }

  // A period can reduce to zero pay, but never to a debt.
  const totalCents = Math.max(0, commissionCents + bonusCents - penaltyCents);

  return {
    commission: toMajor(commissionCents),
    bonus: toMajor(bonusCents),
    penalty: toMajor(penaltyCents),
    total: toMajor(totalCents),
    lines,
  };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  achievement: Achievement;
  targetValue: number | null;
  targetMetric: TargetMetric | null;
  achievedPercent: number | null;
  commission: number;
  rank: number;
}

/**
 * Ranks people by a metric, highest first.
 *
 * Ties share a rank (1, 2, 2, 4) so two people on identical numbers aren't
 * arbitrarily ordered against each other.
 */
export function rankLeaderboard(
  entries: Omit<LeaderboardEntry, "rank">[],
  metric: TargetMetric = "REVENUE",
): LeaderboardEntry[] {
  const sorted = [...entries].sort(
    (a, b) => metricValue(b.achievement, metric) - metricValue(a.achievement, metric),
  );

  let lastValue: number | null = null;
  let lastRank = 0;

  return sorted.map((entry, index) => {
    const value = metricValue(entry.achievement, metric);
    const rank = lastValue !== null && value === lastValue ? lastRank : index + 1;
    lastValue = value;
    lastRank = rank;
    return { ...entry, rank };
  });
}
