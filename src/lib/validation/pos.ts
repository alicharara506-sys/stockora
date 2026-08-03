import { z } from "zod";

export const paymentMethodValues = [
  "CASH",
  "CARD",
  "MOBILE_WALLET",
  "BANK_TRANSFER",
  "STORE_CREDIT",
  "QR_PAY",
  "CUSTOM",
] as const;

export const checkoutItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

export const checkoutSchema = z.object({
  registerSessionId: z.string().min(1),
  branchId: z.string().min(1),
  items: z.array(checkoutItemSchema).min(1, "Add at least one item"),
  discountTotal: z.number().min(0).default(0),
  paymentMethod: z.enum(paymentMethodValues),
  amountTendered: z.number().min(0).optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
