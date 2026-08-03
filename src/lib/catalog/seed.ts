import { prisma } from "@/lib/prisma";

const BASE_ATTRIBUTES: { name: string; values: { value: string; colorHex?: string }[] }[] = [
  {
    name: "Color",
    values: [
      { value: "Black", colorHex: "#0A0A0A" },
      { value: "White", colorHex: "#FFFFFF" },
      { value: "Purple", colorHex: "#7C3AED" },
    ],
  },
  {
    name: "Size",
    values: [{ value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }],
  },
];

/** Gives a new business a starter Color/Size attribute set so the product
 * variant generator isn't empty on day one. Businesses can add more later. */
export async function ensureBaseAttributesSeeded(businessId: string) {
  for (const attribute of BASE_ATTRIBUTES) {
    const created = await prisma.attribute.upsert({
      where: { businessId_name: { businessId, name: attribute.name } },
      create: { businessId, name: attribute.name },
      update: {},
    });

    for (const value of attribute.values) {
      await prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: created.id, value: value.value } },
        create: { attributeId: created.id, value: value.value, colorHex: value.colorHex },
        update: {},
      });
    }
  }
}
