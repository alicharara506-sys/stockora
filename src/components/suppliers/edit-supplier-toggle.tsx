"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import type { ComponentProps } from "react";

export function EditSupplierToggle(props: ComponentProps<typeof SupplierForm>) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <SupplierForm {...props} />;
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
      <Pencil className="size-4" />
      Edit
    </Button>
  );
}
