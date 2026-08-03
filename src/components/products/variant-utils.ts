export interface AttributeValueOption {
  id: string;
  value: string;
}

export interface AttributeOption {
  id: string;
  name: string;
  values: AttributeValueOption[];
}

export interface GeneratedVariantRow {
  key: string;
  attributeValueIds: string[];
  label: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  openingQuantity: number;
  reorderLevel: number;
  isActive: boolean;
}

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])),
    [[]],
  );
}

export function slugify(value: string) {
  return (
    value
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "ITEM"
  );
}

function randomBarcode() {
  let code = "";
  for (let i = 0; i < 12; i++) code += Math.floor(Math.random() * 10);
  return code;
}

export function generateVariantRows(
  productName: string,
  selectedValuesByAttribute: AttributeValueOption[][],
  defaults: { costPrice: number; sellingPrice: number },
): GeneratedVariantRow[] {
  const baseSku = slugify(productName).slice(0, 20);

  if (selectedValuesByAttribute.length === 0) {
    return [
      {
        key: "default",
        attributeValueIds: [],
        label: "Default",
        sku: baseSku,
        barcode: randomBarcode(),
        costPrice: defaults.costPrice,
        sellingPrice: defaults.sellingPrice,
        openingQuantity: 0,
        reorderLevel: 0,
        isActive: true,
      },
    ];
  }

  const combinations = cartesian(selectedValuesByAttribute);

  return combinations.map((combo, index) => {
    const suffix = combo.map((v) => slugify(v.value).slice(0, 4)).join("-");
    return {
      key: combo.map((v) => v.id).join("|"),
      attributeValueIds: combo.map((v) => v.id),
      label: combo.map((v) => v.value).join(" / "),
      sku: `${baseSku}-${suffix}-${index + 1}`,
      barcode: randomBarcode(),
      costPrice: defaults.costPrice,
      sellingPrice: defaults.sellingPrice,
      openingQuantity: 0,
      reorderLevel: 0,
      isActive: true,
    };
  });
}
