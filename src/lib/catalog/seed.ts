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

const BASE_SIZE_CHARTS: { name: string; values: string[] }[] = [
  {
    name: "Baby Sizes",
    values: ["Newborn", "0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"],
  },
  {
    name: "Kids Sizes",
    values: ["Age 2", "Age 3", "Age 4", "Age 5", "Age 6", "Age 7", "Age 8", "Age 9", "Age 10", "Age 11", "Age 12"],
  },
  { name: "Women Sizes", values: ["XXS", "XS", "S", "M", "L", "XL", "XXL"] },
  { name: "Men Sizes", values: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
  { name: "Shoe Sizes (EU)", values: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"] },
  { name: "Shoe Sizes (UK)", values: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
  { name: "Shoe Sizes (US)", values: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13"] },
  { name: "One Size", values: ["One Size"] },
];

/** Default top-level category tree, each linked to the size system that
 * applies to it. Categories without a natural size system (Sports,
 * Lifestyle) are left unassigned — admins pick a chart if one applies. */
const BASE_CATEGORIES: { name: string; sizeChartName?: string }[] = [
  { name: "Baby", sizeChartName: "Baby Sizes" },
  { name: "Kids", sizeChartName: "Kids Sizes" },
  { name: "Women", sizeChartName: "Women Sizes" },
  { name: "Men", sizeChartName: "Men Sizes" },
  { name: "Accessories", sizeChartName: "One Size" },
  { name: "Shoes", sizeChartName: "Shoe Sizes (EU)" },
  { name: "Sports" },
  { name: "Lifestyle" },
];

/** Seeds the default size charts (with ordered values) and the default
 * top-level category tree for a new business, wiring each category to its
 * matching size chart. Idempotent — safe to call more than once. */
export async function ensureBaseCatalogSeeded(businessId: string) {
  const chartsByName = new Map<string, string>();

  for (const chart of BASE_SIZE_CHARTS) {
    const created = await prisma.sizeChart.upsert({
      where: { businessId_name: { businessId, name: chart.name } },
      create: { businessId, name: chart.name },
      update: {},
    });
    chartsByName.set(chart.name, created.id);

    for (const [index, value] of chart.values.entries()) {
      await prisma.sizeChartValue.upsert({
        where: { sizeChartId_value: { sizeChartId: created.id, value } },
        create: { sizeChartId: created.id, value, sortOrder: index },
        update: { sortOrder: index },
      });
    }
  }

  for (const category of BASE_CATEGORIES) {
    const sizeChartId = category.sizeChartName ? chartsByName.get(category.sizeChartName) : undefined;
    const existing = await prisma.category.findFirst({
      where: { businessId, name: category.name, parentId: null },
    });
    if (existing) {
      await prisma.category.update({ where: { id: existing.id }, data: { sizeChartId } });
    } else {
      await prisma.category.create({ data: { businessId, name: category.name, sizeChartId } });
    }
  }
}
