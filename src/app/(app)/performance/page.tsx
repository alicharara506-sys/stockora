import { notFound } from "next/navigation";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { resolveDateRange } from "@/lib/reports/date-range";
import { getPerformanceData } from "@/lib/commission/queries";
import type { TargetMetric } from "@/lib/commission/calculate";
import { ReportFilters } from "@/components/reports/report-filters";
import { PerformanceTabs } from "@/components/performance/performance-tabs";
import { Leaderboard, PerformanceSummary } from "@/components/performance/leaderboard";
import { TargetsManager } from "@/components/performance/targets-manager";
import { RulesManager } from "@/components/performance/rules-manager";
import { PayoutsPanel } from "@/components/performance/payouts-panel";

const VALID_METRICS: TargetMetric[] = ["REVENUE", "PROFIT", "UNITS", "TRANSACTIONS"];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; branchId?: string; metric?: string }>;
}) {
  const context = await requireBusinessContext();
  if (!context.permissions.has(PERMISSIONS.VIEW_PERFORMANCE)) notFound();

  const canManage = context.permissions.has(PERMISSIONS.MANAGE_COMMISSION);
  const params = await searchParams;
  const range = resolveDateRange(params);

  const branches = await prisma.branch.findMany({
    where: { businessId: context.business.id },
    orderBy: { name: "asc" },
  });
  const branchId =
    params.branchId && branches.some((b) => b.id === params.branchId) ? params.branchId : undefined;

  const rankMetric = VALID_METRICS.includes(params.metric as TargetMetric)
    ? (params.metric as TargetMetric)
    : "REVENUE";

  const [performance, members, categories, targets, rules, payouts] = await Promise.all([
    getPerformanceData(context.business.id, { from: range.from, to: range.to, branchId }, rankMetric),
    prisma.businessMembership.findMany({
      where: { businessId: context.business.id, status: "ACTIVE" },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.category.findMany({
      where: { businessId: context.business.id },
      orderBy: { name: "asc" },
    }),
    prisma.salesTarget.findMany({
      where: { businessId: context.business.id },
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } },
        category: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    }),
    prisma.commissionRule.findMany({
      where: { businessId: context.business.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.commissionPayout.findMany({
      where: {
        businessId: context.business.id,
        periodStart: { gte: range.from },
        periodEnd: { lte: range.to },
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { totalPayable: "desc" },
    }),
  ]);

  const memberOptions = members.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Performance</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Targets, rankings and commission for {context.business.name}.
        </p>
      </div>

      <ReportFilters branches={branches} />

      <PerformanceSummary totals={performance.totals} />

      <PerformanceTabs
        leaderboard={
          <Leaderboard entries={performance.leaderboard} rankMetric={performance.rankMetric} />
        }
        targets={
          <TargetsManager
            canManage={canManage}
            members={memberOptions}
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            targets={targets.map((t) => ({
              id: t.id,
              userName: t.user ? (t.user.name ?? t.user.email) : null,
              branchName: t.branch?.name ?? null,
              categoryName: t.category?.name ?? null,
              productName: t.product?.name ?? null,
              period: t.period,
              metric: t.metric,
              targetValue: Number(t.targetValue),
              startsAt: isoDate(t.startsAt),
              endsAt: isoDate(t.endsAt),
            }))}
          />
        }
        rules={
          <RulesManager
            canManage={canManage}
            members={memberOptions}
            rules={rules.map((r) => ({
              id: r.id,
              name: r.name,
              kind: r.kind,
              basis: r.basis,
              value: Number(r.value),
              userName: r.user ? (r.user.name ?? r.user.email) : null,
              thresholdPercent: r.thresholdPercent === null ? null : Number(r.thresholdPercent),
              isActive: r.isActive,
            }))}
          />
        }
        payouts={
          <PayoutsPanel
            canManage={canManage}
            from={isoDate(range.from)}
            to={isoDate(range.to)}
            payouts={payouts.map((p) => ({
              id: p.id,
              userName: p.user.name ?? p.user.email,
              periodStart: isoDate(p.periodStart),
              periodEnd: isoDate(p.periodEnd),
              revenue: Number(p.revenue),
              unitsSold: p.unitsSold,
              commissionAmount: Number(p.commissionAmount),
              bonusAmount: Number(p.bonusAmount),
              penaltyAmount: Number(p.penaltyAmount),
              totalPayable: Number(p.totalPayable),
              status: p.status,
            }))}
          />
        }
      />
    </div>
  );
}
