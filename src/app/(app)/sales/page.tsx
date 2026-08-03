import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT = {
  COMPLETED: "success",
  HELD: "outline",
  VOIDED: "danger",
  REFUNDED: "danger",
  PARTIALLY_REFUNDED: "warning",
} as const;

export default async function SalesPage() {
  const context = await requireBusinessContext();

  const sales = await prisma.sale.findMany({
    where: { businessId: context.business.id },
    include: { branch: true, payments: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Sales</h1>
        <p className="mt-1 text-sm text-brand-muted">{sales.length} sales recorded</p>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Receipt className="size-8 text-brand-muted" />
            <p className="text-sm text-brand-muted">No sales yet — ring up your first one in the POS.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Sale #</th>
                  <th className="px-5 py-3 font-medium">Branch</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/sales/${sale.id}`} className="font-medium text-brand-black hover:text-brand-purple">
                        {sale.saleNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{sale.branch.name}</td>
                    <td className="px-5 py-3 text-brand-muted">{sale.items.length}</td>
                    <td className="px-5 py-3 text-brand-muted">
                      {sale.payments.map((p) => p.method).join(", ")}
                    </td>
                    <td className="px-5 py-3 font-medium text-brand-black">
                      ${Number(sale.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANT[sale.status]}>{sale.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{sale.createdAt.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
