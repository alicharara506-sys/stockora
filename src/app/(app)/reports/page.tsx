import { BarChart3, DollarSign, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/reports/date-range";
import { getReportData } from "@/lib/reports/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { SalesTrendChart } from "@/components/reports/sales-trend-chart";
import { RankedBarChart } from "@/components/reports/ranked-bar-chart";

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; branchId?: string }>;
}) {
  const context = await requireBusinessContext();
  const params = await searchParams;

  const range = resolveDateRange(params);
  const branches = await prisma.branch.findMany({
    where: { businessId: context.business.id },
    orderBy: { name: "asc" },
  });

  const branchId = params.branchId && branches.some((b) => b.id === params.branchId) ? params.branchId : undefined;

  const report = await getReportData(context.business.id, { from: range.from, to: range.to, branchId });

  const summaryCards = [
    { label: "Total sales", value: formatCurrency(report.totalSales), icon: DollarSign },
    { label: "Orders", value: report.totalOrders.toLocaleString(), icon: Receipt },
    { label: "Avg. order value", value: formatCurrency(report.avgOrderValue), icon: BarChart3 },
    { label: "Gross profit", value: formatCurrency(report.grossProfit), icon: TrendingUp },
    { label: "Expenses", value: formatCurrency(report.expensesTotal), icon: Wallet },
    { label: "Returns", value: formatCurrency(report.returnsTotal), icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Reports</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Performance for {range.from.toLocaleDateString()} – {range.to.toLocaleDateString()}
        </p>
      </div>

      <ReportFilters branches={branches.map((b) => ({ id: b.id, name: b.name }))} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-brand-muted">{card.label}</p>
                <p className="mt-1 font-display text-lg font-bold text-brand-black">{card.value}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                <card.icon className="size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales over time</CardTitle>
          <CardDescription>Net sales total per day for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <SalesTrendChart data={report.salesOverTime} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Best sellers by revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart data={report.topProducts.map((p) => ({ name: p.name, value: p.revenue }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
            <CardDescription>Revenue share across product categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart data={report.salesByCategory.map((c) => ({ name: c.name, value: c.revenue }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by branch</CardTitle>
            <CardDescription>Revenue by store location.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart data={report.salesByBranch.map((b) => ({ name: b.name, value: b.revenue }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment breakdown</CardTitle>
            <CardDescription>Collected amount by payment method.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart
              data={report.paymentBreakdown.map((p) => ({ name: p.method.replace(/_/g, " "), value: p.amount }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
