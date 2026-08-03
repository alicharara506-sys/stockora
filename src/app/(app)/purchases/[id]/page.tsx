import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceiveGoodsForm } from "@/components/purchases/receive-goods-form";

const STATUS_VARIANT = {
  DRAFT: "outline",
  SENT: "warning",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "danger",
} as const;

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireBusinessContext();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, businessId: context.business.id },
    include: {
      supplier: true,
      location: true,
      items: {
        include: { variant: { include: { product: true, attributeValues: { include: { attributeValue: true } } } } },
      },
      goodsReceipts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!po) notFound();

  const receivableItems = po.items
    .filter((item) => item.receivedQuantity < item.quantity)
    .map((item) => ({
      poItemId: item.id,
      variantId: item.variantId,
      label: `${item.variant.product.name} — ${
        item.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default"
      }`,
      remaining: item.quantity - item.receivedQuantity,
      unitCost: Number(item.unitCost),
    }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/purchases"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-purple"
        >
          <ArrowLeft className="size-4" />
          Back to purchases
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-brand-black">{po.poNumber}</h1>
          <Badge variant={STATUS_VARIANT[po.status]}>{po.status.replace(/_/g, " ")}</Badge>
        </div>
        <p className="mt-1 text-sm text-brand-muted">
          {po.supplier.name} → {po.location.name}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Ordered</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} className="border-b border-brand-border last:border-0">
                  <td className="px-5 py-3 font-medium text-brand-black">
                    {item.variant.product.name} —{" "}
                    {item.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default"}
                  </td>
                  <td className="px-5 py-3 text-brand-muted">{item.quantity}</td>
                  <td className="px-5 py-3 text-brand-muted">{item.receivedQuantity}</td>
                  <td className="px-5 py-3 text-brand-black">${Number(item.unitCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {receivableItems.length > 0 && (
        <ReceiveGoodsForm purchaseOrderId={po.id} items={receivableItems} />
      )}

      {po.goodsReceipts.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Goods receipts</h2>
          <Card>
            <CardContent className="space-y-2 p-4">
              {po.goodsReceipts.map((receipt) => (
                <div key={receipt.id} className="flex justify-between text-sm">
                  <span className="text-brand-muted">
                    {receipt.createdAt.toLocaleString()}
                    {receipt.invoiceNumber && ` · Invoice ${receipt.invoiceNumber}`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
