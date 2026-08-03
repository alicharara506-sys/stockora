export interface PosVariant {
  id: string;
  productId: string;
  productName: string;
  categoryName: string | null;
  variantLabel: string;
  sku: string;
  barcode: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
}

export interface CartLine {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}
