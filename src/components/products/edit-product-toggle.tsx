"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditProductForm } from "@/components/products/edit-product-form";
import type { ComponentProps } from "react";

export function EditProductToggle(props: Omit<ComponentProps<typeof EditProductForm>, "onDone">) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditProductForm {...props} onDone={() => setEditing(false)} />;
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
      <Pencil className="size-4" />
      Edit product
    </Button>
  );
}
