import Link from "next/link";
import { AlertTriangle, DollarSign, Receipt, TrendingDown, TrendingUp, Users } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/reports/date-range";
import { getReportData } from "@/lib/reports/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesTrendChart } from "@/components/reports/sales-trend-chart";
import { RankedBarChart } from "@/components/reports/ranked-bar-chart";

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage() {
  const context = await requireBusinessContext();
  const businessId = context.business.id;

  const todayRange = resolveDateRange({ preset: "today" });
  const yesterdayRange = resolveDateRange({ preset: "yesterday" });
  const weekRange = resolveDateRange({ preset: "week" });

  const [memberCount, weekReport, todayAgg, yesterdayAgg, recentSales, balances] = await Promise.all([
    prisma.businessMembership.count({ where: { businessId, status: "ACTIVE" } }),
    getReportData(businessId, { from: weekRange.from, to: weekRange.to }),
    prisma.sale.aggregate({
      where: { businessId, status: { not: "VOIDED" }, createdAt: { gte: todayRange.from, lte: todayRange.to } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { businessId, status: { not: "VOIDED" }, createdAt: { gte: yesterdayRange.from, lte: yesterdayRange.to } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: { businessId, status: { not: "VOIDED" } },
      include: { branch: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.inventoryBalance.findMany({
      where: { businessId },
      include: { variant: { include: { product: true } }, location: true },
    }),
  ]);

  const todaySales = Number(todayAgg._sum.total ?? 0);
  const yesterdaySales = Number(yesterdayAgg._sum.total ?? 0);
  const todayOrders = todayAgg._count;
  const yesterdayOrders = yesterdayAgg._count;
  const salesChange = formatChange(todaySales, yesterdaySales);
  const ordersChange = formatChange(todayOrders, yesterdayOrders);

  const lowStock = balances
    .filter((b) => b.variant.reorderLevel > 0 && b.quantityOnHand <= b.variant.reorderLevel)
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
    .slice(0, 5);

  const summaryCards = [
    {
      label: "Today's sales",
      value: formatCurrency(todaySales),
      change: salesChange,
      icon: DollarSign,
    },
    {
      label: "Today's orders",
      value: todayOrders.toLocaleString(),
      change: ordersChange,
      icon: Receipt,
    },
    {
      label: "Team members",
      value: memberCount.toLocaleString(),
      icon: Users,
    },
    {
      label: "Low stock alerts",
      value: lowStock.length.toLocaleString(),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">
            Welcome to {context.business.name}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            Signed in as <span className="font-medium text-brand-black">{context.role.name}</span>.
          </p>
        </div>
        <Link href="/reports" className="text-sm font-medium text-brand-purple hover:underline">
          View full reports
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-brand-muted">{stat.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-black">{stat.value}</p>
                {stat.change !== undefined && (
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                      stat.change >= 0 ? "text-brand-success" : "text-brand-danger"
                    }`}
                  >
                    {stat.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {Math.abs(stat.change).toFixed(1)}% vs yesterday
                  </p>
                )}
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                <stat.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales this week</CardTitle>
            <CardDescription>Net sales total per day, last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={weekReport.salesOverTime} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Best sellers this week.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart
              data={weekReport.topProducts.slice(0, 5).map((p) => ({ name: p.name, value: p.revenue }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
            <CardDescription>The latest transactions across all branches.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentSales.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-brand-muted">No sales recorded yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-brand-border first:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium text-brand-black">{sale.saleNumber}</p>
                        <p className="text-xs text-brand-muted">
                          {sale.branch.name} · {sale.customer?.name ?? "Walk-in"}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <p className="font-medium text-brand-black">{formatCurrency(Number(sale.total))}</p>
                        <p className="text-xs text-brand-muted">{sale.createdAt.toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory alerts</CardTitle>
            <CardDescription>Variants at or below their reorder level.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-brand-muted">All stock levels look healthy.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {lowStock.map((balance) => (
                    <tr key={balance.id} className="border-t border-brand-border first:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium text-brand-black">{balance.variant.product.name}</p>
                        <p className="text-xs text-brand-muted">{balance.location.name}</p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Badge variant={balance.quantityOnHand <= 0 ? "danger" : "warning"}>
                          {balance.quantityOnHand} on hand
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
