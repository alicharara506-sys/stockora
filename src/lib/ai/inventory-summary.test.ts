import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { highestStockProducts } from "./inventory-summary";

function balance(id: string, name: string, onHand: number, reserved = 0) {
  return { quantityOnHand: onHand, quantityReserved: reserved, variant: { productId: id, product: { name } } };
}

describe("highest inventory", () => {
  test("ranks product totals across variants and locations instead of the largest individual balance", () => {
    assert.deepEqual(highestStockProducts([
      balance("jeans", "Jeans", 12, 2),
      balance("tee", "T-Shirt", 20, 1),
      balance("jeans", "Jeans", 15, 3),
    ], 1), [{ product: "Jeans", quantityOnHand: 27, quantityReserved: 5, quantityAvailable: 22 }]);
  });

  test("keeps distinct products with the same name separate", () => {
    const result = highestStockProducts([balance("first", "Jeans", 5), balance("second", "Jeans", 8)], 5);
    assert.deepEqual(result.map((product) => product.quantityOnHand), [8, 5]);
  });

  test("resolves stock ties by name and applies the limit after ranking", () => {
    assert.deepEqual(highestStockProducts([
      balance("b", "Boots", 10), balance("a", "Apron", 10), balance("c", "Coat", 15),
    ], 2).map((product) => product.product), ["Coat", "Apron"]);
  });

  test("returns no products when stock is empty, zero or negative", () => {
    assert.deepEqual(highestStockProducts([], 5), []);
    assert.deepEqual(highestStockProducts([balance("a", "Apron", 0), balance("b", "Boots", -1)], 5), []);
  });
});
