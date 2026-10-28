interface StockBalance {
  quantityOnHand: number;
  quantityReserved: number;
  variant: { productId: string; product: { name: string } };
}

export function highestStockProducts(balances: readonly StockBalance[], limit: number) {
  const products = new Map<string, { product: string; quantityOnHand: number; quantityReserved: number }>();
  for (const balance of balances) {
    const productId = balance.variant.productId;
    const product = products.get(productId) ?? {
      product: balance.variant.product.name,
      quantityOnHand: 0,
      quantityReserved: 0,
    };
    product.quantityOnHand += balance.quantityOnHand;
    product.quantityReserved += balance.quantityReserved;
    products.set(productId, product);
  }
  return Array.from(products.values())
    .filter((product) => product.quantityOnHand > 0)
    .sort((a, b) => b.quantityOnHand - a.quantityOnHand || a.product.localeCompare(b.product))
    .slice(0, limit)
    .map((product) => ({ ...product, quantityAvailable: product.quantityOnHand - product.quantityReserved }));
}
