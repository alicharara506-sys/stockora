import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-keys";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header. Use: Authorization: Bearer <api key>" },
      { status: 401 },
    );
  }

  const apiKey = await verifyApiKey(token);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

  const variants = await prisma.productVariant.findMany({
    where: { businessId: apiKey.businessId, isActive: true },
    include: {
      product: { include: { category: true, brand: true } },
      attributeValues: { include: { attributeValue: true } },
      inventoryBalances: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const products = variants.map((variant) => ({
    sku: variant.sku,
    productName: variant.product.name,
    category: variant.product.category?.name ?? null,
    brand: variant.product.brand?.name ?? null,
    attributes: variant.attributeValues.map((av) => av.attributeValue.value),
    price: Number(variant.sellingPrice),
    currency: "USD",
    stockOnHand: variant.inventoryBalances.reduce((sum, b) => sum + b.quantityOnHand, 0),
  }));

  return NextResponse.json({ data: products, count: products.length });
}
