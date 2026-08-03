import type { Prisma } from "@/generated/prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Every branch needs a matching InventoryLocation row before it can hold
 * stock, so branch creation always goes through this helper instead of
 * calling `prisma.branch.create` directly.
 */
export async function createBranchForBusiness(
  tx: TxClient,
  input: {
    businessId: string;
    name: string;
    code: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isMainBranch?: boolean;
  },
) {
  const branch = await tx.branch.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      code: input.code,
      address: input.address ?? undefined,
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
      isMainBranch: input.isMainBranch ?? false,
    },
  });

  await tx.inventoryLocation.create({
    data: {
      businessId: input.businessId,
      type: "BRANCH",
      branchId: branch.id,
      name: branch.name,
    },
  });

  return branch;
}
