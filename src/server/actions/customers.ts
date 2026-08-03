"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext } from "@/lib/tenancy";
import { customerSchema } from "@/lib/validation/customers";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createCustomerAction(input: unknown): Promise<ActionResult> {
  const context = await requireBusinessContext();

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      businessId: context.business.id,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      gender: data.gender || null,
      notes: data.notes || null,
      tags: data.tags,
      groupId: data.groupId || null,
      marketingConsent: data.marketingConsent,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(customerId: string, input: unknown): Promise<ActionResult> {
  const context = await requireBusinessContext();

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: context.business.id },
  });
  if (!customer) return { success: false, error: "Customer not found." };

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      gender: data.gender || null,
      notes: data.notes || null,
      tags: data.tags,
      groupId: data.groupId || null,
      marketingConsent: data.marketingConsent,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { success: true };
}

const groupNameSchema = z.object({ name: z.string().min(2).max(80) });

export type CreateGroupResult =
  | { success: true; item: { id: string; name: string } }
  | { success: false; error: string };

export async function createCustomerGroupAction(input: unknown): Promise<CreateGroupResult> {
  const context = await requireBusinessContext();
  const parsed = groupNameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.customerGroup.findFirst({
    where: { businessId: context.business.id, name: parsed.data.name },
  });
  if (existing) return { success: true, item: { id: existing.id, name: existing.name } };

  const group = await prisma.customerGroup.create({
    data: { businessId: context.business.id, name: parsed.data.name },
  });
  revalidatePath("/customers");
  return { success: true, item: { id: group.id, name: group.name } };
}
