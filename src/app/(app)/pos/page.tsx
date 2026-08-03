import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { ensureMainRegister, getOpenRegisterSession } from "@/server/services/registers";
import { OpenRegisterForm } from "@/components/pos/open-register-form";
import { PosClient } from "@/components/pos/pos-client";
import type { PosVariant } from "@/components/pos/types";

export default async function PosPage() {
  const context = await requireBusinessContext();

  const register = await ensureMainRegister(context.business.id);
  if (!register) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-8 text-center text-sm text-brand-muted">
        Set up a main branch before using the POS.
      </div>
    );
  }

  const session = await getOpenRegisterSession(register.id, context.userId);
  if (!session) {
    return <OpenRegisterForm registerId={register.id} />;
  }

  const location = await prisma.inventoryLocation.findFirst({
    where: { businessId: context.business.id, branchId: register.branchId },
  });

  const balances = location
    ? await prisma.inventoryBalance.findMany({
        where: { locationId: location.id, quantityOnHand: { gt: 0 } },
        include: {
          variant: {
            include: {
              product: { include: { category: true } },
              attributeValues: { include: { attributeValue: true } },
            },
          },
        },
      })
    : [];

  const variants: PosVariant[] = balances
    .filter((b) => b.variant.isActive && b.variant.product.status === "ACTIVE")
    .map((b) => ({
      id: b.variantId,
      productId: b.variant.productId,
      productName: b.variant.product.name,
      categoryName: b.variant.product.category?.name ?? null,
      variantLabel: b.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default",
      sku: b.variant.sku,
      barcode: null,
      price: Number(b.variant.sellingPrice),
      imageUrl: b.variant.imageUrl,
      stock: b.quantityOnHand,
    }));

  const customers = await prisma.customer.findMany({
    where: { businessId: context.business.id },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <PosClient
      variants={variants}
      customers={customers}
      registerSessionId={session.id}
      branchId={register.branchId}
      openingCash={Number(session.openingCash)}
    />
  );
}
