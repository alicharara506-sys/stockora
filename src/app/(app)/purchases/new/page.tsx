import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { CreatePoForm } from "@/components/purchases/create-po-form";

export default async function NewPurchaseOrderPage() {
  const context = await requireBusinessContext();

  const [suppliers, locations, variants] = await Promise.all([
    prisma.supplier.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.inventoryLocation.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({
      where: { businessId: context.business.id, isActive: true },
      include: { product: true, attributeValues: { include: { attributeValue: true } } },
      take: 200,
    }),
  ]);

  const variantOptions = variants.map((v) => ({
    id: v.id,
    label: `${v.product.name} — ${v.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default"} (${v.sku})`,
    costPrice: Number(v.costPrice),
  }));

  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const locationOptions = locations.map((l) => ({ id: l.id, name: l.name }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/purchases"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-accent"
        >
          <ArrowLeft className="size-4" />
          Back to purchases
        </Link>
        <h1 className="font-display text-2xl font-bold text-brand-black">New purchase order</h1>
      </div>

      {suppliers.length === 0 ? (
        <p className="rounded-2xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-muted">
          Add a supplier first from the Suppliers page.
        </p>
      ) : (
        <CreatePoForm suppliers={supplierOptions} locations={locationOptions} variants={variantOptions} />
      )}
    </div>
  );
}
