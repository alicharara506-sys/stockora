import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Enter a name").max(160),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  gender: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  groupId: z.string().optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
});

export type CustomerInput = z.infer<typeof customerSchema>;
