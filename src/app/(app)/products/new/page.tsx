import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage() {
  const context = await requireBusinessContext();

  const [categories, brands, attributes] = await Promise.all([
    prisma.category.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.attribute.findMany({
      where: { businessId: context.business.id },
      include: { values: { orderBy: { value: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/products"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-purple"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
        <h1 className="font-display text-2xl font-bold text-brand-black">Add product</h1>
      </div>

      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, sizeChartId: c.sizeChartId }))}
        brands={brands}
        attributes={attributes}
      />
    </div>
  );
}
