"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext } from "@/lib/tenancy";
import { checkoutSchema } from "@/lib/validation/pos";
import { normalizePhone, normalizeName } from "@/lib/validation/customers";
import { applyInventoryMovement, InsufficientStockError } from "@/server/services/inventory";
import { loadTaxContext, resolveRules } from "@/lib/tax/resolve";
import { calculateCartTax } from "@/lib/tax/calculate";
import { allocateCents, toCents, toMajor } from "@/lib/money";

export type CheckoutResult = { success: true; saleId: string } | { success: false; error: string };

export async function checkoutAction(input: unknown): Promise<CheckoutResult> {
  const context = await requireBusinessContext();

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const [session, location, setting] = await Promise.all([
    prisma.registerSession.findFirst({
      where: { id: data.registerSessionId, status: "OPEN" },
      include: { register: true },
    }),
    prisma.inventoryLocation.findFirst({
      where: { businessId: context.business.id, branchId: data.branchId },
    }),
    prisma.businessSetting.findUnique({ where: { businessId: context.business.id } }),
  ]);

  if (!session || session.register.businessId !== context.business.id) {
    return { success: false, error: "No open register session. Open your register first." };
  }
  if (!location) {
    return { success: false, error: "This branch has no stock location configured." };
  }

  let customer = data.customerId
    ? await prisma.customer.findFirst({ where: { id: data.customerId, businessId: context.business.id } })
    : null;
  if (data.customerId && !customer) {
    return { success: false, error: "Customer not found." };
  }

  // Captured-at-the-till details are matched against existing customers so a
  // repeat buyer stays one record with one history rather than gaining a new
  // row on every visit.
  //
  // The name must match as well as the phone. Phone alone is not identity:
  // households and colleagues share numbers, and a phone-only match would
  // silently file one person's purchase — and their loyalty points and spend
  // — under someone else's account. When the number matches but the name
  // doesn't, a separate customer is created instead.
  //
  // The lookup is read-only here; the write happens inside the sale
  // transaction so a checkout that fails on stock leaves no orphan behind.
  const captured = !customer ? data.newCustomer : undefined;
  if (captured?.phone) {
    const digits = normalizePhone(captured.phone);
    const capturedName = normalizeName(captured.name);
    if (digits.length >= 6) {
      const candidates = await prisma.customer.findMany({
        where: { businessId: context.business.id, phone: { not: null } },
        select: { id: true, phone: true, name: true },
      });
      const match = candidates.find(
        (c) => normalizePhone(c.phone ?? "") === digits && normalizeName(c.name) === capturedName,
      );
      if (match) {
        customer = await prisma.customer.findUnique({ where: { id: match.id } });
      }
    }
  }
  const customerToCreate = customer ? undefined : captured;

  // Enforced server-side: the UI gate alone would be bypassable by anyone
  // calling the action directly.
  if (setting?.requireCustomerAtCheckout) {
    const name = customer?.name ?? customerToCreate?.name;
    const phone = customer?.phone ?? customerToCreate?.phone;
    const email = customer?.email ?? customerToCreate?.email;

    if (!name) {
      return { success: false, error: "This sale needs customer details before it can be completed." };
    }
    if (setting.requireCustomerPhone && !phone) {
      return { success: false, error: "A phone number is required to complete this sale." };
    }
    if (setting.requireCustomerEmail && !email) {
      return { success: false, error: "An email address is required to complete this sale." };
    }
  }

  // A customer being created right now has no balance to spend.
  if (data.paymentMethod === "STORE_CREDIT" && customerToCreate) {
    return { success: false, error: "A new customer has no store credit yet. Choose another payment method." };
  }

  const [variants, taxContext] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: data.items.map((i) => i.variantId) }, businessId: context.business.id },
      include: { product: { select: { taxId: true } } },
    }),
    loadTaxContext(context.business.id),
  ]);
  const variantById = new Map(variants.map((v) => [v.id, v]));

  // Spread the order-level discount across lines by value, so tax is charged
  // on what each line actually cost. allocateCents guarantees the parts sum to
  // the discount exactly — no cent lost or invented.
  const lineGrossCents = data.items.map((item) => toCents(item.unitPrice * item.quantity));
  const discountPerLine = allocateCents(toCents(data.discountTotal), lineGrossCents);

  const taxed = calculateCartTax(
    data.items.map((item, index) => {
      const variant = variantById.get(item.variantId);
      return {
        key: item.variantId,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: toMajor(discountPerLine[index]),
        rules: resolveRules(
          taxContext,
          { variantTaxId: variant?.taxId, productTaxId: variant?.product.taxId },
          { customerExempt: customer?.taxExempt ?? false },
        ),
      };
    }),
    taxContext.pricesIncludeTax,
  );

  // subtotal keeps its existing meaning: line prices before discount.
  const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxTotal = taxed.taxTotal;

  // calculateCartTax already returns the customer-facing gross for both
  // pricing modes — adding taxTotal here would double-count it on
  // tax-inclusive prices. With tax off this equals subtotal - discountTotal,
  // exactly the previous arithmetic.
  const total = Math.max(0, taxed.total);

  if (data.paymentMethod === "STORE_CREDIT") {
    if (!customer) return { success: false, error: "Select a customer to pay with store credit." };
    if (Number(customer.storeCreditBalance) < total) {
      return { success: false, error: "Customer doesn't have enough store credit." };
    }
  }

  try {
    const saleId = await prisma.$transaction(async (tx) => {
      // Created here rather than earlier so a rollback (e.g. insufficient
      // stock) doesn't leave a customer behind for a sale that never happened.
      const saleCustomer = customerToCreate
        ? await tx.customer.create({
            data: {
              businessId: context.business.id,
              name: customerToCreate.name,
              phone: customerToCreate.phone || null,
              email: customerToCreate.email || null,
              whatsapp: customerToCreate.whatsapp || null,
              company: customerToCreate.company || null,
              notes: customerToCreate.notes || null,
              marketingConsent: customerToCreate.marketingConsent,
            },
          })
        : customer;

      const saleNumber = await nextSaleNumber(tx, context.business.id);

      const sale = await tx.sale.create({
        data: {
          businessId: context.business.id,
          branchId: data.branchId,
          registerSessionId: session.id,
          saleNumber,
          employeeId: context.userId,
          customerId: saleCustomer?.id,
          currency: context.business.baseCurrency,
          subtotal,
          discountTotal: data.discountTotal,
          taxTotal,
          total,
          pricesIncludedTax: taxContext.pricesIncludeTax,
          taxBreakdown: taxed.summary,
          status: "COMPLETED",
          notes: data.notes || null,
          items: {
            create: data.items.map((item, index) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: toMajor(discountPerLine[index]),
              // taxed.lines preserves input order, so index-match rather than
              // keying by variantId — the same variant can appear twice.
              taxAmount: taxed.lines[index]?.tax ?? 0,
              lineTotal: item.unitPrice * item.quantity,
            })),
          },
          payments: {
            create: [
              {
                method: data.paymentMethod,
                amount: total,
                currency: context.business.baseCurrency,
                status: "COMPLETED",
              },
            ],
          },
        },
      });

      for (const item of data.items) {
        const variant = variantById.get(item.variantId);
        if (!variant) throw new Error(`Unknown variant ${item.variantId}`);

        await applyInventoryMovement(tx, {
          businessId: context.business.id,
          locationId: location.id,
          variantId: item.variantId,
          type: "SOLD",
          quantity: -item.quantity,
          userId: context.userId,
          referenceType: "Sale",
          referenceId: sale.id,
          allowNegative: setting?.negativeStockAllowed ?? false,
        });
      }

      if (data.paymentMethod === "CASH") {
        await tx.cashMovement.create({
          data: {
            registerSessionId: session.id,
            type: "SALE",
            amount: total,
            reason: `Sale ${saleNumber}`,
            createdById: context.userId,
          },
        });
      }

      if (saleCustomer) {
        const loyaltyEarned = Math.floor(total);

        if (data.paymentMethod === "STORE_CREDIT") {
          await tx.customerCreditTransaction.create({
            data: {
              customerId: saleCustomer.id,
              type: "REDEEM",
              amount: total,
              referenceType: "Sale",
              referenceId: sale.id,
            },
          });
        }

        if (loyaltyEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId: saleCustomer.id,
              type: "EARN",
              points: loyaltyEarned,
              referenceType: "Sale",
              referenceId: sale.id,
            },
          });
        }

        await tx.customer.update({
          where: { id: saleCustomer.id },
          data: {
            totalSpent: { increment: total },
            lastPurchaseAt: new Date(),
            storeCreditBalance:
              data.paymentMethod === "STORE_CREDIT" ? { decrement: total } : undefined,
            loyaltyBalance: loyaltyEarned > 0 ? { increment: loyaltyEarned } : undefined,
          },
        });
      }

      return sale.id;
    });

    revalidatePath("/pos");
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/customers");
    return { success: true, saleId };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: "Not enough stock for one or more items in this sale." };
    }
    throw error;
  }
}

async function nextSaleNumber(tx: Prisma.TransactionClient, businessId: string) {
  const count = await tx.sale.count({ where: { businessId } });
  let candidate = `S-${String(count + 1).padStart(6, "0")}`;
  let suffix = 0;
  while (await tx.sale.findUnique({ where: { businessId_saleNumber: { businessId, saleNumber: candidate } } })) {
    suffix += 1;
    candidate = `S-${String(count + 1 + suffix).padStart(6, "0")}`;
  }
  return candidate;
}
