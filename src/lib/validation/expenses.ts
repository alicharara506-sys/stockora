import { z } from "zod";

export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  branchId: z.string().optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_WALLET", "BANK_TRANSFER", "STORE_CREDIT", "QR_PAY", "CUSTOM"]),
  supplierId: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  date: z.string().min(1, "Choose a date"),
});
