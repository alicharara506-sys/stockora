import { z } from "zod";

export const productGenderValues = ["MEN", "WOMEN", "UNISEX", "BOYS", "GIRLS"] as const;
export const ageGroupValues = ["ADULT", "KIDS", "BABY", "TODDLER"] as const;
export const seasonValues = ["ALL_SEASON", "SPRING_SUMMER", "FALL_WINTER"] as const;
export const productStatusValues = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export const variantInputSchema = z.object({
  attributeValueIds: z.array(z.string()).default([]),
  sku: z.string().min(1, "SKU is required").max(60),
  barcode: z.string().min(1, "Barcode is required").max(60),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  openingQuantity: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Enter a product name").max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  gender: z.enum(productGenderValues).default("UNISEX"),
  ageGroup: z.enum(ageGroupValues).default("ADULT"),
  season: z.enum(seasonValues).default("ALL_SEASON"),
  collection: z.string().max(120).optional().or(z.literal("")),
  material: z.string().max(120).optional().or(z.literal("")),
  countryOfOrigin: z.string().max(80).optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  status: z.enum(productStatusValues).default("DRAFT"),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  wholesalePrice: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(2000).optional().or(z.literal("")),
  imageUrls: z.array(z.string().url()).default([]),
  variants: z.array(variantInputSchema).min(1, "Add at least one variant"),
});

export const updateProductSchema = createProductSchema.omit({ variants: true });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
