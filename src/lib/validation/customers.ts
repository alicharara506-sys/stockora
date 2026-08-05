import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Enter a name").max(160),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  whatsapp: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(160).optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  gender: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  groupId: z.string().optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** Details captured at the till when a sale needs a customer on it. Kept
 * separate from customerSchema because the till asks for less and enforces
 * required fields dynamically from business settings. */
export const checkoutCustomerSchema = z.object({
  name: z.string().min(2, "Enter the customer's name").max(160),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  whatsapp: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(160).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
});

export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>;

/**
 * Normalizes a phone number for duplicate detection.
 *
 * Strips formatting to digits, then drops a leading "00" — the international
 * access prefix — so "00961 3 123 456" and "+961 3 123 456" resolve to the
 * same number.
 *
 * Deliberately does NOT strip a single leading "0" (the national trunk
 * prefix): "03123456" and "+9613123456" may well be the same subscriber, but
 * deciding that needs the country's dialing plan, and guessing wrong would
 * merge two different people. Local and international forms of one number are
 * therefore treated as distinct.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

/** Loose name comparison for duplicate detection — case and spacing only. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
