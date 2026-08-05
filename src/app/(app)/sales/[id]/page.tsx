import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { createQrCode, qrTargetUrl, renderQrSvg } from "@/lib/qr";
import { Logo } from "@/components/ui/logo";
import { PrintButton } from "@/components/pos/print-button";

export default async function SaleReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireBusinessContext();

  const sale = await prisma.sale.findFirst({
    where: { id, businessId: context.business.id },
    include: {
      branch: true,
      employee: true,
      customer: true,
      payments: true,
      items: {
        include: {
          variant: {
            include: { product: true, attributeValues: { include: { attributeValue: true } } },
          },
        },
      },
    },
  });

  if (!sale) notFound();

  let receiptQr = await prisma.qRCode.findFirst({
    where: { saleId: sale.id, type: "RECEIPT", status: "ACTIVE" },
  });
  if (!receiptQr) {
    receiptQr = await createQrCode({
      businessId: context.business.id,
      type: "RECEIPT",
      saleId: sale.id,
      payload: {
        saleNumber: sale.saleNumber,
        total: Number(sale.total),
        currency: sale.currency,
        date: sale.createdAt.toISOString(),
      },
    });
  }
  const qrSvg = await renderQrSvg(qrTargetUrl(receiptQr.token));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-accent"
        >
          <ArrowLeft className="size-4" />
          Back to sales
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-brand-border bg-brand-surface p-8 shadow-card print:border-none print:shadow-none">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <p className="mt-2 text-xs text-brand-muted">{sale.branch.name}</p>
          {sale.branch.address && <p className="text-xs text-brand-muted">{sale.branch.address}</p>}
        </div>

        <div className="mt-6 flex justify-between text-xs text-brand-muted">
          <span>Receipt #{sale.saleNumber}</span>
          <span>{sale.createdAt.toLocaleString()}</span>
        </div>
        <p className="text-xs text-brand-muted">Cashier: {sale.employee.name ?? sale.employee.email}</p>
        {sale.customer && <p className="text-xs text-brand-muted">Customer: {sale.customer.name}</p>}

        <div className="mt-4 space-y-2 border-t border-dashed border-brand-border pt-4">
          {sale.items.map((item) => {
            const label =
              item.variant.attributeValues.map((av) => av.attributeValue.value).join(" / ") || "Default";
            return (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-brand-black">{item.variant.product.name}</p>
                  <p className="text-xs text-brand-muted">
                    {label} · {item.quantity} × ${Number(item.unitPrice).toFixed(2)}
                  </p>
                </div>
                <span className="font-medium text-brand-black">${Number(item.lineTotal).toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-1 border-t border-dashed border-brand-border pt-4 text-sm">
          <div className="flex justify-between text-brand-muted">
            <span>Subtotal</span>
            <span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          {Number(sale.discountTotal) > 0 && (
            <div className="flex justify-between text-brand-muted">
              <span>Discount</span>
              <span>-${Number(sale.discountTotal).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-display text-base font-bold text-brand-black">
            <span>Total</span>
            <span>${Number(sale.total).toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-brand-border pt-4 text-sm">
          {sale.payments.map((payment) => (
            <div key={payment.id} className="flex justify-between text-brand-muted">
              <span>{payment.method.replace(/_/g, " ")}</span>
              <span>${Number(payment.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-dashed border-brand-border pt-4">
          <div className="size-24 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-[10px] text-brand-muted">Scan to view this receipt online</p>
        </div>

        <p className="mt-4 text-center text-xs text-brand-muted">Thank you for shopping with us!</p>
      </div>
    </div>
  );
}
