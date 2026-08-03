import type { Prisma } from "@/generated/prisma/client";

type TxClient = Prisma.TransactionClient;

export type InventoryMovementType =
  | "OPENING"
  | "RECEIVED"
  | "SOLD"
  | "RETURNED"
  | "EXCHANGE_IN"
  | "EXCHANGE_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "DAMAGED"
  | "LOST"
  | "RESERVED"
  | "RELEASED"
  | "COUNT_CORRECTION";

export class InsufficientStockError extends Error {
  constructor() {
    super("Not enough stock at this location for this movement.");
    this.name = "InsufficientStockError";
  }
}

/**
 * The single path for changing stock. Every caller — product opening stock,
 * manual adjustments, transfers, (eventually) POS sales and returns — goes
 * through here so InventoryBalance is always a faithful projection of the
 * InventoryMovement ledger, never mutated on its own.
 */
export async function applyInventoryMovement(
  tx: TxClient,
  input: {
    businessId: string;
    locationId: string;
    variantId: string;
    type: InventoryMovementType;
    quantity: number; // signed delta: positive = stock in, negative = stock out
    userId?: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    allowNegative?: boolean;
  },
) {
  const balance = await tx.inventoryBalance.findUnique({
    where: { locationId_variantId: { locationId: input.locationId, variantId: input.variantId } },
  });

  const previousQuantity = balance?.quantityOnHand ?? 0;
  const newQuantity = previousQuantity + input.quantity;

  if (newQuantity < 0 && !input.allowNegative) {
    throw new InsufficientStockError();
  }

  await tx.inventoryBalance.upsert({
    where: { locationId_variantId: { locationId: input.locationId, variantId: input.variantId } },
    create: {
      businessId: input.businessId,
      locationId: input.locationId,
      variantId: input.variantId,
      quantityOnHand: newQuantity,
    },
    update: { quantityOnHand: newQuantity },
  });

  await tx.inventoryMovement.create({
    data: {
      businessId: input.businessId,
      locationId: input.locationId,
      variantId: input.variantId,
      type: input.type,
      quantity: input.quantity,
      previousQuantity,
      newQuantity,
      userId: input.userId,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      notes: input.notes,
    },
  });

  return { previousQuantity, newQuantity };
}
