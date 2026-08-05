import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_VARIANT: Record<string, "success" | "danger" | "warning" | "outline" | "purple"> = {
  OPENING: "purple",
  RECEIVED: "success",
  SOLD: "danger",
  RETURNED: "success",
  EXCHANGE_IN: "success",
  EXCHANGE_OUT: "danger",
  TRANSFER_IN: "success",
  TRANSFER_OUT: "danger",
  ADJUSTMENT: "warning",
  DAMAGED: "danger",
  LOST: "danger",
  RESERVED: "outline",
  RELEASED: "outline",
  COUNT_CORRECTION: "warning",
};

export default async function InventoryHistoryPage() {
  const context = await requireBusinessContext();

  const movements = await prisma.inventoryMovement.findMany({
    where: { businessId: context.business.id },
    include: {
      location: true,
      variant: { include: { product: true, attributeValues: { include: { attributeValue: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventory"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-accent"
        >
          <ArrowLeft className="size-4" />
          Back to inventory
        </Link>
        <h1 className="font-display text-2xl font-bold text-brand-black">Stock movement history</h1>
        <p className="mt-1 text-sm text-brand-muted">
          The last 100 stock movements — an immutable, append-only ledger.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Branch</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Change</th>
                <th className="px-5 py-3 font-medium">Balance</th>
                <th className="px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const variantLabel =
                  movement.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") ||
                  "Default";
                return (
                  <tr key={movement.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3 text-brand-muted">
                      {movement.createdAt.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-medium text-brand-black">
                      {movement.variant.product.name} — {variantLabel}
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{movement.location.name}</td>
                    <td className="px-5 py-3">
                      <Badge variant={TYPE_VARIANT[movement.type] ?? "outline"}>
                        {movement.type.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className={movement.quantity < 0 ? "px-5 py-3 text-brand-danger" : "px-5 py-3 text-brand-success"}>
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </td>
                    <td className="px-5 py-3 text-brand-black">{movement.newQuantity}</td>
                    <td className="px-5 py-3 text-brand-muted">{movement.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
