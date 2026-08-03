import "server-only";
import { prisma } from "@/lib/prisma";

export interface ReportFilters {
  from: Date;
  to: Date;
  branchId?: string;
}

export interface ReportData {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  totalDiscounts: number;
  grossProfit: number;
  cogs: number;
  returnsTotal: number;
  expensesTotal: number;
  netProfit: number;
  salesOverTime: { date: string; total: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByCategory: { name: string; revenue: number }[];
  salesByBranch: { name: string; revenue: number }[];
  paymentBreakdown: { method: string; amount: number }[];
}

export async function getReportData(businessId: string, filters: ReportFilters): Promise<ReportData> {
  const where = {
    businessId,
    createdAt: { gte: filters.from, lte: filters.to },
    status: { not: "VOIDED" as const },
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    include: {
      branch: true,
      payments: true,
      items: {
        include: { variant: { include: { product: { include: { category: true } } } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalOrders = sales.length;
  const totalDiscounts = sales.reduce((sum, s) => sum + Number(s.discountTotal), 0);

  let grossProfit = 0;
  let cogs = 0;
  const salesByDate = new Map<string, number>();
  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  const categoryTotals = new Map<string, number>();
  const branchTotals = new Map<string, number>();
  const paymentTotals = new Map<string, number>();

  for (const sale of sales) {
    const dateKey = sale.createdAt.toISOString().slice(0, 10);
    salesByDate.set(dateKey, (salesByDate.get(dateKey) ?? 0) + Number(sale.total));
    branchTotals.set(sale.branch.name, (branchTotals.get(sale.branch.name) ?? 0) + Number(sale.total));

    for (const payment of sale.payments) {
      paymentTotals.set(payment.method, (paymentTotals.get(payment.method) ?? 0) + Number(payment.amount));
    }

    for (const item of sale.items) {
      const lineRevenue = Number(item.lineTotal);
      const lineCost = Number(item.variant.costPrice) * item.quantity;
      grossProfit += lineRevenue - lineCost;
      cogs += lineCost;

      const productName = item.variant.product.name;
      const existing = productTotals.get(productName) ?? { quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += lineRevenue;
      productTotals.set(productName, existing);

      const categoryName = item.variant.product.category?.name ?? "Uncategorized";
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + lineRevenue);
    }
  }

  const [returnAgg, expenseAgg] = await Promise.all([
    prisma.returnItem.aggregate({
      _sum: { refundAmount: true },
      where: {
        return: {
          businessId,
          createdAt: { gte: filters.from, lte: filters.to },
        },
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        businessId,
        date: { gte: filters.from, lte: filters.to },
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
    }),
  ]);

  const returnsTotal = Number(returnAgg._sum.refundAmount ?? 0);
  const expensesTotal = Number(expenseAgg._sum.amount ?? 0);

  return {
    totalSales,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    totalDiscounts,
    grossProfit,
    cogs,
    returnsTotal,
    expensesTotal,
    netProfit: grossProfit - expensesTotal - returnsTotal,
    salesOverTime: Array.from(salesByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total })),
    topProducts: Array.from(productTotals.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
    salesByCategory: Array.from(categoryTotals.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    salesByBranch: Array.from(branchTotals.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    paymentBreakdown: Array.from(paymentTotals.entries())
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}
