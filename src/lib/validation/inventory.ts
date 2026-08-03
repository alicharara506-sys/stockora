import { z } from "zod";

export const adjustStockSchema = z.object({
  locationId: z.string().min(1),
  variantId: z.string().min(1),
  delta: z.coerce.number().int().refine((v) => v !== 0, "Enter a non-zero quantity"),
  reason: z.string().min(2, "Enter a reason").max(240),
});

export const transferItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
});

export const createTransferSchema = z.object({
  fromLocationId: z.string().min(1, "Choose a source branch"),
  toLocationId: z.string().min(1, "Choose a destination branch"),
  items: z.array(transferItemSchema).min(1, "Add at least one item"),
});
