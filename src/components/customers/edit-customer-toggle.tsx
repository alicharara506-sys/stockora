"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";
import type { ComponentProps } from "react";

export function EditCustomerToggle(props: ComponentProps<typeof CustomerForm>) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <CustomerForm {...props} />;
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
      <Pencil className="size-4" />
      Edit
    </Button>
  );
}
