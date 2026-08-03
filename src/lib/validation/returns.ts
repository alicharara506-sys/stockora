import { z } from "zod";

export const refundMethodValues = ["ORIGINAL", "CASH", "STORE_CREDIT"] as const;

export const returnItemSchema = z.object({
  saleItemId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const createReturnSchema = z.object({
  saleId: z.string().min(1),
  items: z.array(returnItemSchema).min(1, "Select at least one item to return"),
  reason: z.string().max(240).optional().or(z.literal("")),
  refundMethod: z.enum(refundMethodValues),
});

export const createExchangeSchema = z.object({
  saleId: z.string().min(1),
  saleItemId: z.string().min(1),
  oldVariantId: z.string().min(1),
  newVariantId: z.string().min(1),
  quantity: z.number().int().positive(),
});
