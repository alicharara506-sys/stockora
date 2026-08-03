import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function CustomersPage() {
  const context = await requireBusinessContext();

  const customers = await prisma.customer.findMany({
    where: { businessId: context.business.id },
    include: { group: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Customers</h1>
          <p className="mt-1 text-sm text-brand-muted">{customers.length} customers</p>
        </div>
        <Button asChild size="sm">
          <Link href="/customers/new">
            <Plus className="size-4" />
            Add customer
          </Link>
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="size-8 text-brand-muted" />
            <p className="text-sm text-brand-muted">No customers yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Group</th>
                  <th className="px-5 py-3 font-medium">Loyalty</th>
                  <th className="px-5 py-3 font-medium">Store credit</th>
                  <th className="px-5 py-3 font-medium">Total spent</th>
                  <th className="px-5 py-3 font-medium">Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-brand-black hover:text-brand-purple"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">
                      {customer.phone ?? customer.email ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {customer.group ? <Badge variant="purple">{customer.group.name}</Badge> : "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{customer.loyaltyBalance} pts</td>
                    <td className="px-5 py-3 text-brand-muted">
                      ${Number(customer.storeCreditBalance).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 font-medium text-brand-black">
                      ${Number(customer.totalSpent).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-brand-muted">
                      {customer.lastPurchaseAt ? customer.lastPurchaseAt.toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
