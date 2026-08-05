import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, Building2 } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditCustomerToggle } from "@/components/customers/edit-customer-toggle";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireBusinessContext();

  const customer = await prisma.customer.findFirst({
    where: { id, businessId: context.business.id },
    include: { group: true },
  });
  if (!customer) notFound();

  const [groups, sales, creditTransactions, loyaltyTransactions] = await Promise.all([
    prisma.customerGroup.findMany({ where: { businessId: context.business.id }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.customerCreditTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.loyaltyTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/customers"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-accent"
        >
          <ArrowLeft className="size-4" />
          Back to customers
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-black">{customer.name}</h1>
            {customer.group && <Badge variant="purple" className="mt-1">{customer.group.name}</Badge>}
          </div>
          <EditCustomerToggle
            customerId={customer.id}
            groups={groups}
            initial={{
              name: customer.name,
              phone: customer.phone ?? "",
              email: customer.email ?? "",
              whatsapp: customer.whatsapp ?? "",
              company: customer.company ?? "",
              address: customer.address ?? "",
              birthday: customer.birthday ? customer.birthday.toISOString().slice(0, 10) : "",
              gender: customer.gender ?? "",
              notes: customer.notes ?? "",
              tags: customer.tags.join(", "),
              groupId: customer.groupId ?? "",
              marketingConsent: customer.marketingConsent,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spent" value={`$${Number(customer.totalSpent).toFixed(2)}`} />
        <StatCard label="Store credit" value={`$${Number(customer.storeCreditBalance).toFixed(2)}`} />
        <StatCard label="Loyalty points" value={`${customer.loyaltyBalance} pts`} />
        <StatCard
          label="Last purchase"
          value={customer.lastPurchaseAt ? customer.lastPurchaseAt.toLocaleDateString() : "—"}
        />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-brand-black">
              <Phone className="size-4 text-brand-accent" /> {customer.phone}
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-brand-black">
              <Mail className="size-4 text-brand-accent" /> {customer.email}
            </div>
          )}
          {customer.whatsapp && (
            <div className="flex items-center gap-2 text-sm text-brand-black">
              <MessageCircle className="size-4 text-brand-accent" /> {customer.whatsapp}
            </div>
          )}
          {customer.company && (
            <div className="flex items-center gap-2 text-sm text-brand-black">
              <Building2 className="size-4 text-brand-accent" /> {customer.company}
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm text-brand-black sm:col-span-2">
              <MapPin className="size-4 text-brand-accent" /> {customer.address}
            </div>
          )}
          {customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {customer.notes && <p className="text-sm text-brand-muted sm:col-span-2">{customer.notes}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Purchase history</h2>
        <Card>
          <CardContent className="p-0">
            {sales.length === 0 ? (
              <p className="p-6 text-sm text-brand-muted">No purchases yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                    <th className="px-5 py-3 font-medium">Sale #</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-brand-border last:border-0">
                      <td className="px-5 py-3">
                        <Link href={`/sales/${sale.id}`} className="font-medium text-brand-black hover:text-brand-accent">
                          {sale.saleNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-brand-black">${Number(sale.total).toFixed(2)}</td>
                      <td className="px-5 py-3 text-brand-muted">{sale.status.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3 text-brand-muted">{sale.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {(creditTransactions.length > 0 || loyaltyTransactions.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {creditTransactions.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Store credit activity</h2>
              <Card>
                <CardContent className="space-y-2 p-4">
                  {creditTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between text-sm">
                      <span className="text-brand-muted">{tx.type}</span>
                      <span className="font-medium text-brand-black">${Number(tx.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          {loyaltyTransactions.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-base font-semibold text-brand-black">Loyalty activity</h2>
              <Card>
                <CardContent className="space-y-2 p-4">
                  {loyaltyTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between text-sm">
                      <span className="text-brand-muted">{tx.type}</span>
                      <span className="font-medium text-brand-black">{tx.points} pts</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-brand-muted">{label}</p>
        <p className="mt-1 font-display text-xl font-bold text-brand-black">{value}</p>
      </CardContent>
    </Card>
  );
}
