import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/reports/date-range";
import { getReportData } from "@/lib/reports/queries";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/constants";

export interface ToolCallContext {
  businessId: string;
  permissions: Set<string>;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  permission: PermissionKey;
  schema: z.ZodType;
  run: (ctx: ToolCallContext, input: never) => Promise<unknown>;
}

const dateRangeShape = {
  preset: z.enum(["today", "yesterday", "week", "month", "custom"]).optional().describe(
    "Date range preset. Defaults to 'month' if omitted.",
  ),
  from: z.string().optional().describe("ISO date, required when preset is 'custom'."),
  to: z.string().optional().describe("ISO date, required when preset is 'custom'."),
  branchId: z.string().optional().describe("Limit results to a single branch."),
};

function parseRange(input: { preset?: string; from?: string; to?: string }) {
  return resolveDateRange({ preset: input.preset ?? "month", from: input.from, to: input.to });
}

function defineTool<S extends z.ZodType>(def: {
  name: string;
  description: string;
  permission: PermissionKey;
  schema: S;
  run: (ctx: ToolCallContext, input: z.infer<S>) => Promise<unknown>;
}): ToolDefinition {
  return def as unknown as ToolDefinition;
}

const getSalesSummary = defineTool({
  name: "getSalesSummary",
  description: "Total sales, order count, average order value, and discounts for a date range.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object(dateRangeShape),
  run: async (ctx, input) => {
    const range = parseRange(input);
    const report = await getReportData(ctx.businessId, { from: range.from, to: range.to, branchId: input.branchId });
    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      totalSales: report.totalSales,
      totalOrders: report.totalOrders,
      avgOrderValue: report.avgOrderValue,
      totalDiscounts: report.totalDiscounts,
    };
  },
});

const getTopProducts = defineTool({
  name: "getTopProducts",
  description: "Best-selling products by revenue for a date range.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object({ ...dateRangeShape, limit: z.number().int().min(1).max(20).default(5) }),
  run: async (ctx, input) => {
    const range = parseRange(input);
    const report = await getReportData(ctx.businessId, { from: range.from, to: range.to, branchId: input.branchId });
    return { products: report.topProducts.slice(0, input.limit) };
  },
});

const getLowStockVariants = defineTool({
  name: "getLowStockVariants",
  description: "Product variants at or below their reorder level, across all locations.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
  run: async (ctx, input) => {
    const balances = await prisma.inventoryBalance.findMany({
      where: { businessId: ctx.businessId },
      include: { variant: { include: { product: true } }, location: true },
    });
    const lowStock = balances
      .filter((b) => b.variant.reorderLevel > 0 && b.quantityOnHand <= b.variant.reorderLevel)
      .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
      .slice(0, input.limit)
      .map((b) => ({
        product: b.variant.product.name,
        sku: b.variant.sku,
        location: b.location.name,
        quantityOnHand: b.quantityOnHand,
        reorderLevel: b.variant.reorderLevel,
      }));
    return { lowStock };
  },
});

const getProfitSummary = defineTool({
  name: "getProfitSummary",
  description: "Gross profit, cost of goods sold, and net profit (after expenses and returns) for a date range.",
  permission: PERMISSIONS.VIEW_PROFIT,
  schema: z.object(dateRangeShape),
  run: async (ctx, input) => {
    const range = parseRange(input);
    const report = await getReportData(ctx.businessId, { from: range.from, to: range.to, branchId: input.branchId });
    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      grossProfit: report.grossProfit,
      cogs: report.cogs,
      expensesTotal: report.expensesTotal,
      returnsTotal: report.returnsTotal,
      netProfit: report.netProfit,
    };
  },
});

const comparePeriods = defineTool({
  name: "comparePeriods",
  description: "Compares total sales and orders for 'today' vs 'yesterday' or 'week' vs the prior week, or 'month' vs the prior month.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object({
    period: z.enum(["today", "week", "month"]).default("week"),
    branchId: z.string().optional(),
  }),
  run: async (ctx, input) => {
    const current = resolveDateRange({ preset: input.period });
    const spanMs = current.to.getTime() - current.from.getTime();
    const previousTo = new Date(current.from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - spanMs);

    const [currentReport, previousReport] = await Promise.all([
      getReportData(ctx.businessId, { from: current.from, to: current.to, branchId: input.branchId }),
      getReportData(ctx.businessId, { from: previousFrom, to: previousTo, branchId: input.branchId }),
    ]);

    return {
      current: { from: current.from.toISOString(), to: current.to.toISOString(), totalSales: currentReport.totalSales, totalOrders: currentReport.totalOrders },
      previous: { from: previousFrom.toISOString(), to: previousTo.toISOString(), totalSales: previousReport.totalSales, totalOrders: previousReport.totalOrders },
      salesChangePct:
        previousReport.totalSales === 0
          ? (currentReport.totalSales === 0 ? 0 : 100)
          : ((currentReport.totalSales - previousReport.totalSales) / previousReport.totalSales) * 100,
    };
  },
});

const getBranchPerformance = defineTool({
  name: "getBranchPerformance",
  description: "Revenue broken down by branch for a date range.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object(dateRangeShape),
  run: async (ctx, input) => {
    const range = parseRange(input);
    const report = await getReportData(ctx.businessId, { from: range.from, to: range.to });
    return { branches: report.salesByBranch };
  },
});

const getSlowMovingStock = defineTool({
  name: "getSlowMovingStock",
  description: "Variants with stock on hand that have had no sales in the given number of days.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object({ days: z.number().int().min(1).max(365).default(30), limit: z.number().int().min(1).max(50).default(10) }),
  run: async (ctx, input) => {
    const since = new Date();
    since.setDate(since.getDate() - input.days);

    const recentlySoldVariantIds = new Set(
      (
        await prisma.saleItem.findMany({
          where: { sale: { businessId: ctx.businessId, createdAt: { gte: since }, status: { not: "VOIDED" } } },
          select: { variantId: true },
          distinct: ["variantId"],
        })
      ).map((r) => r.variantId),
    );

    const balances = await prisma.inventoryBalance.findMany({
      where: { businessId: ctx.businessId, quantityOnHand: { gt: 0 } },
      include: { variant: { include: { product: true } }, location: true },
    });

    const slowMoving = balances
      .filter((b) => !recentlySoldVariantIds.has(b.variantId))
      .sort((a, b) => b.quantityOnHand - a.quantityOnHand)
      .slice(0, input.limit)
      .map((b) => ({
        product: b.variant.product.name,
        sku: b.variant.sku,
        location: b.location.name,
        quantityOnHand: b.quantityOnHand,
      }));

    return { days: input.days, slowMoving };
  },
});

const getCustomerSummary = defineTool({
  name: "getCustomerSummary",
  description: "Total customer count and the top customers by lifetime spend.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object({ limit: z.number().int().min(1).max(20).default(5) }),
  run: async (ctx, input) => {
    const [totalCustomers, topCustomers] = await Promise.all([
      prisma.customer.count({ where: { businessId: ctx.businessId } }),
      prisma.customer.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { totalSpent: "desc" },
        take: input.limit,
      }),
    ]);
    return {
      totalCustomers,
      topCustomers: topCustomers.map((c) => ({
        name: c.name,
        totalSpent: Number(c.totalSpent),
        lastPurchaseAt: c.lastPurchaseAt?.toISOString() ?? null,
      })),
    };
  },
});

const getReturnSummary = defineTool({
  name: "getReturnSummary",
  description: "Return counts, refunded amount, and most common return reasons for a date range.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object(dateRangeShape),
  run: async (ctx, input) => {
    const range = parseRange(input);
    const returns = await prisma.return.findMany({
      where: { businessId: ctx.businessId, createdAt: { gte: range.from, lte: range.to } },
      include: { items: true },
    });

    const reasonCounts = new Map<string, number>();
    let refundTotal = 0;
    for (const ret of returns) {
      const reason = ret.reason ?? "Unspecified";
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      refundTotal += ret.items.reduce((sum, item) => sum + Number(item.refundAmount), 0);
    }

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      returnCount: returns.length,
      refundTotal,
      topReasons: Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  },
});

const getSuggestedReorders = defineTool({
  name: "getSuggestedReorders",
  description: "Suggested reorder quantities for variants at or below their reorder level, sized to bring stock back to twice the reorder level.",
  permission: PERMISSIONS.VIEW_REPORTS,
  schema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
  run: async (ctx, input) => {
    const balances = await prisma.inventoryBalance.findMany({
      where: { businessId: ctx.businessId },
      include: { variant: { include: { product: { include: { supplier: true } } } }, location: true },
    });

    const suggestions = balances
      .filter((b) => b.variant.reorderLevel > 0 && b.quantityOnHand <= b.variant.reorderLevel)
      .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
      .slice(0, input.limit)
      .map((b) => ({
        product: b.variant.product.name,
        sku: b.variant.sku,
        location: b.location.name,
        quantityOnHand: b.quantityOnHand,
        reorderLevel: b.variant.reorderLevel,
        suggestedQuantity: Math.max(b.variant.reorderLevel * 2 - b.quantityOnHand, b.variant.reorderLevel),
        supplier: b.variant.product.supplier?.name ?? null,
      }));

    return { suggestions };
  },
});

export const AI_TOOLS: ToolDefinition[] = [
  getSalesSummary,
  getTopProducts,
  getLowStockVariants,
  getProfitSummary,
  comparePeriods,
  getBranchPerformance,
  getSlowMovingStock,
  getCustomerSummary,
  getReturnSummary,
  getSuggestedReorders,
];

export function getToolSpecs(): { name: string; description: string; inputSchema: Record<string, unknown> }[] {
  return AI_TOOLS.map((tool) => {
    const inputSchema = z.toJSONSchema(tool.schema) as Record<string, unknown>;
    delete inputSchema.$schema;
    return { name: tool.name, description: tool.description, inputSchema };
  });
}

export async function runTool(name: string, rawInput: unknown, ctx: ToolCallContext): Promise<ToolResult> {
  const tool = AI_TOOLS.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `Unknown tool: ${name}` };

  if (!ctx.permissions.has(tool.permission)) {
    return { ok: false, error: `Permission denied: this action requires the "${tool.permission}" permission.` };
  }

  const parsed = tool.schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { ok: false, error: `Invalid input for ${name}: ${parsed.error.message}` };
  }

  try {
    const data = await tool.run(ctx, parsed.data as never);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Tool execution failed." };
  }
}
