import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReturnFlow } from "@/components/returns/return-flow";

export default async function ReturnsPage() {
  const context = await requireBusinessContext();

  const [variants, returns, exchanges] = await Promise.all([
    prisma.productVariant.findMany({
      where: { businessId: context.business.id, isActive: true },
      include: { product: true, attributeValues: { include: { attributeValue: true } } },
      take: 200,
    }),
    prisma.return.findMany({
      where: { businessId: context.business.id },
      include: { sale: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.exchange.findMany({
      where: { businessId: context.business.id },
      include: { sale: true, oldVariant: { include: { product: true } }, newVariant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const variantOptions = variants.map((v) => ({
    id: v.id,
    label: `${v.product.name} — ${v.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default"} (${v.sku})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Returns &amp; Exchanges</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Look up a sale by its number to process a return or exchange.
        </p>
      </div>

      <ReturnFlow variantOptions={variantOptions} />

      {returns.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Recent returns</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                    <th className="px-5 py-3 font-medium">Sale #</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Refund method</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.id} className="border-b border-brand-border last:border-0">
                      <td className="px-5 py-3 font-medium text-brand-black">{r.sale.saleNumber}</td>
                      <td className="px-5 py-3">
                        <Badge variant={r.type === "FULL" ? "danger" : "warning"}>{r.type}</Badge>
                      </td>
                      <td className="px-5 py-3 text-brand-muted">{r.refundMethod.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-brand-muted">{r.reason ?? "—"}</td>
                      <td className="px-5 py-3 text-brand-muted">{r.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {exchanges.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Recent exchanges</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                    <th className="px-5 py-3 font-medium">Sale #</th>
                    <th className="px-5 py-3 font-medium">From</th>
                    <th className="px-5 py-3 font-medium">To</th>
                    <th className="px-5 py-3 font-medium">Price difference</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {exchanges.map((ex) => (
                    <tr key={ex.id} className="border-b border-brand-border last:border-0">
                      <td className="px-5 py-3 font-medium text-brand-black">{ex.sale.saleNumber}</td>
                      <td className="px-5 py-3 text-brand-muted">{ex.oldVariant.product.name}</td>
                      <td className="px-5 py-3 text-brand-muted">{ex.newVariant.product.name}</td>
                      <td className="px-5 py-3 text-brand-black">
                        {Number(ex.priceDifference) >= 0 ? "+" : ""}
                        ${Number(ex.priceDifference).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-brand-muted">{ex.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
