import { z } from "zod";

export const poItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Choose a supplier"),
  locationId: z.string().min(1, "Choose a receiving location"),
  expectedDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(poItemSchema).min(1, "Add at least one item"),
});

export const receiveItemSchema = z.object({
  poItemId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(0),
  unitCost: z.coerce.number().min(0),
  updateCostPrice: z.boolean().default(false),
});

export const receiveGoodsSchema = z.object({
  purchaseOrderId: z.string().min(1),
  invoiceNumber: z.string().max(80).optional().or(z.literal("")),
  items: z.array(receiveItemSchema).min(1),
});
