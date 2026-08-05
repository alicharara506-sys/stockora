import { ArrowLeftRight } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { CreateTransferDialog } from "@/components/transfers/create-transfer-dialog";
import { ReceiveTransferButton } from "@/components/transfers/receive-transfer-button";

const STATUS_VARIANT = {
  DRAFT: "outline",
  IN_TRANSIT: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
} as const;

export default async function TransfersPage() {
  const context = await requireBusinessContext();
  const canTransfer = context.permissions.has(PERMISSIONS.TRANSFER_STOCK);

  const [locations, variants, transfers] = await Promise.all([
    prisma.inventoryLocation.findMany({
      where: { businessId: context.business.id },
      orderBy: { name: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { businessId: context.business.id, isActive: true },
      include: { product: true, attributeValues: { include: { attributeValue: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.stockTransfer.findMany({
      where: { businessId: context.business.id },
      include: { fromLocation: true, toLocation: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const variantOptions = variants.map((variant) => {
    const label = variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default";
    return { id: variant.id, label: `${variant.product.name} — ${label} (${variant.sku})` };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Transfers</h1>
          <p className="mt-1 text-sm text-brand-muted">Move stock between your branches.</p>
        </div>
        {canTransfer && locations.length >= 2 && (
          <CreateTransferDialog locations={locations} variants={variantOptions} />
        )}
      </div>

      {locations.length < 2 && (
        <Card>
          <CardContent className="p-6 text-sm text-brand-muted">
            You need at least two branches to create a transfer. Add one from the Branches page.
          </CardContent>
        </Card>
      )}

      {transfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-purple-lightest text-brand-accent">
              <ArrowLeftRight className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-brand-black">No transfers yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">From</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  {canTransfer && <th className="px-5 py-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3 font-medium text-brand-black">{transfer.fromLocation.name}</td>
                    <td className="px-5 py-3 text-brand-black">{transfer.toLocation.name}</td>
                    <td className="px-5 py-3 text-brand-muted">
                      {transfer.items.reduce((sum, item) => sum + item.quantity, 0)} units
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANT[transfer.status]}>{transfer.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{transfer.createdAt.toLocaleDateString()}</td>
                    {canTransfer && (
                      <td className="px-5 py-3 text-right">
                        {transfer.status === "IN_TRANSIT" && (
                          <ReceiveTransferButton transferId={transfer.id} />
                        )}
                      </td>
                    )}
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
