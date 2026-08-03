import Link from "next/link";
import { Download, Plus, Shirt } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/permissions/constants";

const STATUS_VARIANT = {
  DRAFT: "outline",
  ACTIVE: "success",
  ARCHIVED: "danger",
} as const;

export default async function ProductsPage() {
  const context = await requireBusinessContext();
  const canManage = context.permissions.has(PERMISSIONS.MANAGE_PRODUCTS);

  const products = await prisma.product.findMany({
    where: { businessId: context.business.id },
    include: {
      category: true,
      brand: true,
      variants: { include: { inventoryBalances: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Products</h1>
          <p className="mt-1 text-sm text-brand-muted">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/products/export">
              <Download className="size-4" />
              Export CSV
            </Link>
          </Button>
          {canManage && (
            <Button asChild size="sm">
              <Link href="/products/new">
                <Plus className="size-4" />
                Add product
              </Link>
            </Button>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-purple-lightest text-brand-purple">
              <Shirt className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-brand-black">
              No products yet
            </p>
            <p className="max-w-sm text-sm text-brand-muted">
              Add your first product with sizes, colors, and opening stock.
            </p>
            {canManage && (
              <Button asChild className="mt-2">
                <Link href="/products/new">Add product</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Brand</th>
                  <th className="px-5 py-3 font-medium">Variants</th>
                  <th className="px-5 py-3 font-medium">Stock on hand</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stockOnHand = product.variants.reduce(
                    (sum, variant) =>
                      sum + variant.inventoryBalances.reduce((s, b) => s + b.quantityOnHand, 0),
                    0,
                  );
                  return (
                    <tr key={product.id} className="border-b border-brand-border last:border-0">
                      <td className="px-5 py-3">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium text-brand-black hover:text-brand-purple"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-brand-muted">{product.category?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-brand-muted">{product.brand?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-brand-muted">{product.variants.length}</td>
                      <td className="px-5 py-3 text-brand-muted">{stockOnHand}</td>
                      <td className="px-5 py-3 text-brand-black">${Number(product.sellingPrice).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
