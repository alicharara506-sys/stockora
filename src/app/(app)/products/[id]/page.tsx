import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { EditProductToggle } from "@/components/products/edit-product-toggle";
import { ArchiveProductButton } from "@/components/products/archive-product-button";
import { VariantRowEditor } from "@/components/products/variant-row-editor";

const STATUS_VARIANT = {
  DRAFT: "outline",
  ACTIVE: "success",
  ARCHIVED: "danger",
} as const;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireBusinessContext();

  const product = await prisma.product.findFirst({
    where: { id, businessId: context.business.id },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        include: {
          attributeValues: { include: { attributeValue: true } },
          barcodes: true,
          inventoryBalances: true,
        },
      },
    },
  });

  if (!product) notFound();

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
  ]);

  const canManage = context.permissions.has(PERMISSIONS.MANAGE_PRODUCTS);
  const canChangePrice = context.permissions.has(PERMISSIONS.CHANGE_PRICE);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/products"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-accent"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-brand-black">{product.name}</h1>
            <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
          </div>
          {canManage && product.status !== "ARCHIVED" && (
            <div className="flex gap-2">
              <EditProductToggle
                productId={product.id}
                categories={categories}
                brands={brands}
                initial={{
                  name: product.name,
                  description: product.description ?? "",
                  categoryId: product.categoryId ?? "",
                  brandId: product.brandId ?? "",
                  gender: product.gender,
                  ageGroup: product.ageGroup,
                  season: product.season,
                  collection: product.collection ?? "",
                  material: product.material ?? "",
                  countryOfOrigin: product.countryOfOrigin ?? "",
                  tags: product.tags.join(", "),
                  status: product.status,
                  costPrice: Number(product.costPrice),
                  sellingPrice: Number(product.sellingPrice),
                  wholesalePrice: product.wholesalePrice ? String(product.wholesalePrice) : "",
                  minStock: product.minStock,
                  notes: product.notes ?? "",
                }}
              />
              <ArchiveProductButton productId={product.id} />
            </div>
          )}
        </div>
      </div>

      {product.images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {product.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.id}
              src={image.url}
              alt={product.name}
              className="h-32 w-32 shrink-0 rounded-xl border border-brand-border object-cover"
            />
          ))}
        </div>
      )}

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Category" value={product.category?.name ?? "—"} />
          <Detail label="Brand" value={product.brand?.name ?? "—"} />
          <Detail label="Gender" value={product.gender} />
          <Detail label="Age group" value={product.ageGroup} />
          <Detail label="Season" value={product.season} />
          <Detail label="Collection" value={product.collection ?? "—"} />
          <Detail label="Material" value={product.material ?? "—"} />
          <Detail label="Country of origin" value={product.countryOfOrigin ?? "—"} />
          <Detail label="Cost price" value={`$${Number(product.costPrice).toFixed(2)}`} />
          <Detail label="Selling price" value={`$${Number(product.sellingPrice).toFixed(2)}`} />
          <Detail
            label="Wholesale price"
            value={product.wholesalePrice ? `$${Number(product.wholesalePrice).toFixed(2)}` : "—"}
          />
          <Detail label="Minimum stock" value={String(product.minStock)} />
          {product.tags.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">Tags</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="purple">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {product.description && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">Description</p>
              <p className="mt-1 text-sm text-brand-black">{product.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-brand-black">
          Variants ({product.variants.length})
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                    <th className="px-3 py-2.5 font-medium">Variant</th>
                    <th className="px-3 py-2.5 font-medium">SKU</th>
                    <th className="px-3 py-2.5 font-medium">Barcode</th>
                    <th className="px-3 py-2.5 font-medium">Stock</th>
                    <th className="px-3 py-2.5 font-medium">Cost</th>
                    <th className="px-3 py-2.5 font-medium">Price</th>
                    <th className="px-3 py-2.5 font-medium">Reorder</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => {
                    const label =
                      variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") ||
                      "Default";
                    const stock = variant.inventoryBalances.reduce((s, b) => s + b.quantityOnHand, 0);
                    return (
                      <tr key={variant.id} className="border-b border-brand-border last:border-0">
                        <td className="px-3 py-2 font-medium text-brand-black">{label}</td>
                        <td className="px-3 py-2 text-brand-muted">{variant.sku}</td>
                        <td className="px-3 py-2 text-brand-muted">
                          {variant.barcodes[0]?.code ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-brand-black">{stock}</td>
                        <VariantRowEditor
                          variantId={variant.id}
                          costPrice={Number(variant.costPrice)}
                          sellingPrice={Number(variant.sellingPrice)}
                          reorderLevel={variant.reorderLevel}
                          isActive={variant.isActive}
                          canEdit={canChangePrice}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 text-sm text-brand-black">{value}</p>
    </div>
  );
}
