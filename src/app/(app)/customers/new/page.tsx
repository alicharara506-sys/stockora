import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function NewCustomerPage() {
  const context = await requireBusinessContext();
  const groups = await prisma.customerGroup.findMany({
    where: { businessId: context.business.id },
    orderBy: { name: "asc" },
  });

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
        <h1 className="font-display text-2xl font-bold text-brand-black">Add customer</h1>
      </div>
      <CustomerForm groups={groups} />
    </div>
  );
}
