import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditSupplierToggle } from "@/components/suppliers/edit-supplier-toggle";
import { RecordPaymentDialog } from "@/components/suppliers/record-payment-dialog";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireBusinessContext();

  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId: context.business.id },
  });
  if (!supplier) notFound();

  const [purchaseOrders, payments] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/suppliers"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-purple"
        >
          <ArrowLeft className="size-4" />
          Back to suppliers
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-brand-black">{supplier.name}</h1>
          <div className="flex gap-2">
            <RecordPaymentDialog supplierId={supplier.id} />
            <EditSupplierToggle
              supplierId={supplier.id}
              initial={{
                name: supplier.name,
                phone: supplier.phone ?? "",
                email: supplier.email ?? "",
                address: supplier.address ?? "",
                taxNumber: supplier.taxNumber ?? "",
                contactPerson: supplier.contactPerson ?? "",
                notes: supplier.notes ?? "",
              }}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-brand-muted">Balance owed</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-black">
            ${Number(supplier.balance).toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm text-brand-black">
              <Phone className="size-4 text-brand-purple" /> {supplier.phone}
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm text-brand-black">
              <Mail className="size-4 text-brand-purple" /> {supplier.email}
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-sm text-brand-black sm:col-span-2">
              <MapPin className="size-4 text-brand-purple" /> {supplier.address}
            </div>
          )}
          {supplier.contactPerson && (
            <p className="text-sm text-brand-muted sm:col-span-2">
              Contact person: <span className="text-brand-black">{supplier.contactPerson}</span>
            </p>
          )}
          {supplier.notes && <p className="text-sm text-brand-muted sm:col-span-2">{supplier.notes}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Purchase orders</h2>
        <Card>
          <CardContent className="p-0">
            {purchaseOrders.length === 0 ? (
              <p className="p-6 text-sm text-brand-muted">No purchase orders yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                    <th className="px-5 py-3 font-medium">PO #</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b border-brand-border last:border-0">
                      <td className="px-5 py-3">
                        <Link href={`/purchases/${po.id}`} className="font-medium text-brand-black hover:text-brand-purple">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline">{po.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-5 py-3 text-brand-muted">{po.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Payment history</h2>
          <Card>
            <CardContent className="space-y-2 p-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span className="text-brand-muted">
                    {payment.method.replace(/_/g, " ")} · {payment.createdAt.toLocaleDateString()}
                  </span>
                  <span className="font-medium text-brand-black">${Number(payment.amount).toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
