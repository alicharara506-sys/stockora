import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SuppliersPage() {
  const context = await requireBusinessContext();

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: context.business.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Suppliers</h1>
          <p className="mt-1 text-sm text-brand-muted">{suppliers.length} suppliers</p>
        </div>
        <Button asChild size="sm">
          <Link href="/suppliers/new">
            <Plus className="size-4" />
            Add supplier
          </Link>
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Truck className="size-8 text-brand-muted" />
            <p className="text-sm text-brand-muted">No suppliers yet.</p>
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
                  <th className="px-5 py-3 font-medium">Contact person</th>
                  <th className="px-5 py-3 font-medium">Balance owed</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-brand-border last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="font-medium text-brand-black hover:text-brand-accent"
                      >
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-brand-muted">
                      {supplier.phone ?? supplier.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{supplier.contactPerson ?? "—"}</td>
                    <td className="px-5 py-3 font-medium text-brand-black">
                      ${Number(supplier.balance).toFixed(2)}
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
