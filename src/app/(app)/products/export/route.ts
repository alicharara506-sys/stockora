import { NextResponse } from "next/server";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const context = await requireBusinessContext();

  const variants = await prisma.productVariant.findMany({
    where: { businessId: context.business.id },
    include: {
      product: { include: { category: true, brand: true } },
      attributeValues: { include: { attributeValue: true } },
      barcodes: true,
      inventoryBalances: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "Product",
    "Category",
    "Brand",
    "Variant",
    "SKU",
    "Barcode",
    "Cost price",
    "Selling price",
    "Stock on hand",
    "Reorder level",
    "Status",
  ];

  const rows = variants.map((variant) => {
    const label = variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default";
    const stock = variant.inventoryBalances.reduce((sum, balance) => sum + balance.quantityOnHand, 0);
    return [
      variant.product.name,
      variant.product.category?.name ?? "",
      variant.product.brand?.name ?? "",
      label,
      variant.sku,
      variant.barcodes[0]?.code ?? "",
      Number(variant.costPrice).toFixed(2),
      Number(variant.sellingPrice).toFixed(2),
      String(stock),
      String(variant.reorderLevel),
      variant.isActive ? "Active" : "Inactive",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stockora-products-${context.business.slug}.csv"`,
    },
  });
}
