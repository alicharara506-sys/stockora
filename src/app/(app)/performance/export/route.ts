import { NextResponse, type NextRequest } from "next/server";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { parseDayRange } from "@/lib/reports/date-range";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Payroll export for a period's commission payouts. */
export async function GET(request: NextRequest) {
  const context = await requireBusinessContext();

  // Pay data is sensitive: gate the download on the same permission that
  // guards the screen, so a direct URL isn't a way around it.
  if (!context.permissions.has(PERMISSIONS.VIEW_PERFORMANCE)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return new NextResponse("Provide a from and to date.", { status: 400 });
  }

  const range = parseDayRange(from, to);
  if (!range) {
    return new NextResponse("Those dates aren't valid.", { status: 400 });
  }

  const payouts = await prisma.commissionPayout.findMany({
    where: {
      businessId: context.business.id,
      periodStart: { gte: range.from },
      periodEnd: { lte: range.to },
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { totalPayable: "desc" },
  });

  const header = [
    "Employee",
    "Email",
    "Period start",
    "Period end",
    "Revenue",
    "Units sold",
    "Transactions",
    "Gross profit",
    "Commission",
    "Bonus",
    "Penalty",
    "Total payable",
    "Status",
  ];

  const rows = payouts.map((p) => [
    p.user.name ?? "",
    p.user.email,
    p.periodStart.toISOString().slice(0, 10),
    p.periodEnd.toISOString().slice(0, 10),
    Number(p.revenue).toFixed(2),
    String(p.unitsSold),
    String(p.transactions),
    Number(p.grossProfit).toFixed(2),
    Number(p.commissionAmount).toFixed(2),
    Number(p.bonusAmount).toFixed(2),
    Number(p.penaltyAmount).toFixed(2),
    Number(p.totalPayable).toFixed(2),
    p.status,
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stockora-payroll-${context.business.slug}-${from}-to-${to}.csv"`,
    },
  });
}
