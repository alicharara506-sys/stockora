import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(2, "Enter a supplier name").max(160),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  taxNumber: z.string().max(60).optional().or(z.literal("")),
  contactPerson: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  method: z.enum(["CASH", "CARD", "MOBILE_WALLET", "BANK_TRANSFER", "STORE_CREDIT", "QR_PAY", "CUSTOM"]),
  referenceNumber: z.string().max(80).optional().or(z.literal("")),
});
