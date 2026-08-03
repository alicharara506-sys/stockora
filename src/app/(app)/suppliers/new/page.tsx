import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default function NewSupplierPage() {
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
        <h1 className="font-display text-2xl font-bold text-brand-black">Add supplier</h1>
      </div>
      <SupplierForm />
    </div>
  );
}
