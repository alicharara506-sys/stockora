import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCommission,
  achievementPercent,
  metricValue,
  rankLeaderboard,
  type Achievement,
  type CommissionRuleInput,
} from "@/lib/commission/calculate";

const achievement: Achievement = { revenue: 10000, profit: 4000, units: 200, transactions: 50 };

const pct5: CommissionRuleInput = {
  id: "r1",
  name: "5% of revenue",
  kind: "COMMISSION",
  basis: "PERCENT_OF_REVENUE",
  value: 5,
};

describe("metricValue / achievementPercent", () => {
  test("reads each metric off the achievement", () => {
    assert.equal(metricValue(achievement, "REVENUE"), 10000);
    assert.equal(metricValue(achievement, "PROFIT"), 4000);
    assert.equal(metricValue(achievement, "UNITS"), 200);
    assert.equal(metricValue(achievement, "TRANSACTIONS"), 50);
  });

  test("computes the share of target reached", () => {
    assert.equal(achievementPercent(achievement, "REVENUE", 20000), 50);
    assert.equal(achievementPercent(achievement, "UNITS", 100), 200);
  });

  test("treats a zero target as met rather than dividing by zero", () => {
    assert.equal(achievementPercent(achievement, "REVENUE", 0), 100);
    assert.ok(Number.isFinite(achievementPercent(achievement, "REVENUE", 0)));
  });
});

describe("calculateCommission", () => {
  test("no rules pays nothing", () => {
    const result = calculateCommission(achievement, []);
    assert.equal(result.total, 0);
    assert.deepEqual(result.lines, []);
  });

  test("percentage of revenue", () => {
    const result = calculateCommission(achievement, [pct5]);
    assert.equal(result.commission, 500);
    assert.equal(result.total, 500);
  });

  test("percentage of profit", () => {
    const result = calculateCommission(achievement, [
      { ...pct5, id: "r2", basis: "PERCENT_OF_PROFIT", value: 10 },
    ]);
    assert.equal(result.commission, 400);
  });

  test("a loss-making period never produces negative commission", () => {
    const losing: Achievement = { ...achievement, profit: -5000 };
    const result = calculateCommission(losing, [
      { ...pct5, id: "r3", basis: "PERCENT_OF_PROFIT", value: 10 },
    ]);
    assert.equal(result.commission, 0);
    assert.ok(result.total >= 0);
  });

  test("fixed amounts per sale and per unit", () => {
    const perSale = calculateCommission(achievement, [
      { ...pct5, id: "r4", basis: "FIXED_PER_SALE", value: 2 },
    ]);
    assert.equal(perSale.commission, 100); // 50 transactions x 2

    const perUnit = calculateCommission(achievement, [
      { ...pct5, id: "r5", basis: "FIXED_PER_UNIT", value: 0.5 },
    ]);
    assert.equal(perUnit.commission, 100); // 200 units x 0.50
  });

  test("bonus pays only at or above its threshold", () => {
    const bonus: CommissionRuleInput = {
      id: "b1",
      name: "Target bonus",
      kind: "BONUS",
      basis: "FIXED_AMOUNT",
      value: 250,
      thresholdPercent: 100,
    };
    assert.equal(calculateCommission(achievement, [bonus], 99).bonus, 0);
    assert.equal(calculateCommission(achievement, [bonus], 100).bonus, 250);
    assert.equal(calculateCommission(achievement, [bonus], 120).bonus, 250);
  });

  test("penalty applies only below its threshold", () => {
    const penalty: CommissionRuleInput = {
      id: "p1",
      name: "Missed target",
      kind: "PENALTY",
      basis: "FIXED_AMOUNT",
      value: 100,
      thresholdPercent: 80,
    };
    assert.equal(calculateCommission(achievement, [penalty], 90).penalty, 0);
    assert.equal(calculateCommission(achievement, [penalty], 50).penalty, 100);
  });

  test("penalty is recorded as a negative line but a positive total", () => {
    const penalty: CommissionRuleInput = {
      id: "p2",
      name: "Missed target",
      kind: "PENALTY",
      basis: "FIXED_AMOUNT",
      value: 100,
      thresholdPercent: 80,
    };
    const result = calculateCommission(achievement, [pct5, penalty], 50);
    assert.equal(result.commission, 500);
    assert.equal(result.penalty, 100);
    assert.equal(result.total, 400);
    assert.equal(result.lines.find((l) => l.kind === "PENALTY")?.amount, -100);
  });

  test("penalties can never push pay below zero", () => {
    const huge: CommissionRuleInput = {
      id: "p3",
      name: "Severe",
      kind: "PENALTY",
      basis: "FIXED_AMOUNT",
      value: 99999,
      thresholdPercent: 80,
    };
    const result = calculateCommission(achievement, [pct5, huge], 10);
    assert.equal(result.total, 0, "a bad month must not create a debt");
  });

  test("with no target, bonuses pay and penalties stay silent", () => {
    const bonus: CommissionRuleInput = {
      id: "b2", name: "B", kind: "BONUS", basis: "FIXED_AMOUNT", value: 50, thresholdPercent: 100,
    };
    const penalty: CommissionRuleInput = {
      id: "p4", name: "P", kind: "PENALTY", basis: "FIXED_AMOUNT", value: 50, thresholdPercent: 80,
    };
    const result = calculateCommission(achievement, [bonus, penalty]);
    assert.equal(result.bonus, 50);
    assert.equal(result.penalty, 0);
  });

  test("rules without a threshold always apply", () => {
    const bonus: CommissionRuleInput = {
      id: "b3", name: "Flat", kind: "BONUS", basis: "FIXED_AMOUNT", value: 75,
    };
    assert.equal(calculateCommission(achievement, [bonus], 5).bonus, 75);
  });

  test("stacks several rules and records every line", () => {
    const result = calculateCommission(
      achievement,
      [
        pct5,
        { id: "r6", name: "Per unit", kind: "COMMISSION", basis: "FIXED_PER_UNIT", value: 0.25 },
        { id: "b4", name: "Bonus", kind: "BONUS", basis: "FIXED_AMOUNT", value: 200, thresholdPercent: 90 },
      ],
      95,
    );
    assert.equal(result.commission, 550); // 500 + 50
    assert.equal(result.bonus, 200);
    assert.equal(result.total, 750);
    assert.equal(result.lines.length, 3);
  });

  test("zero-value rules are omitted from the breakdown", () => {
    const result = calculateCommission(achievement, [{ ...pct5, id: "r7", value: 0 }]);
    assert.equal(result.lines.length, 0);
  });
});

describe("rankLeaderboard", () => {
  const make = (userId: string, revenue: number) => ({
    userId,
    name: userId,
    achievement: { revenue, profit: 0, units: 0, transactions: 0 },
    targetValue: null,
    targetMetric: null,
    achievedPercent: null,
    commission: 0,
  });

  test("orders by the metric, highest first", () => {
    const ranked = rankLeaderboard([make("a", 100), make("b", 300), make("c", 200)]);
    assert.deepEqual(ranked.map((r) => r.userId), ["b", "c", "a"]);
    assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3]);
  });

  test("ties share a rank and the next rank skips", () => {
    const ranked = rankLeaderboard([make("a", 300), make("b", 300), make("c", 100)]);
    assert.deepEqual(ranked.map((r) => r.rank), [1, 1, 3]);
  });

  test("an empty board is empty, not an error", () => {
    assert.deepEqual(rankLeaderboard([]), []);
  });
});
