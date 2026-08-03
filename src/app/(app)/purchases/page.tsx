import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT = {
  DRAFT: "outline",
  SENT: "warning",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
} as const;

export default async function PurchasesPage() {
  const context = await requireBusinessContext();

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { businessId: context.business.id },
    include: { supplier: true, location: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Purchases</h1>
          <p className="mt-1 text-sm text-brand-muted">{purchaseOrders.length} purchase orders</p>
        </div>
        <Button asChild size="sm">
          <Link href="/purchases/new">
            <Plus className="size-4" />
            New purchase order
          </Link>
        </Button>
      </div>

      {purchaseOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <ClipboardList className="size-8 text-brand-muted" />
            <p className="text-sm text-brand-muted">No purchase orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">PO #</th>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/purchases/${po.id}`} className="font-medium text-brand-black hover:text-brand-purple">
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{po.supplier.name}</td>
                    <td className="px-5 py-3 text-brand-muted">{po.location.name}</td>
                    <td className="px-5 py-3 text-brand-muted">{po.items.length}</td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANT[po.status]}>{po.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{po.createdAt.toLocaleDateString()}</td>
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
