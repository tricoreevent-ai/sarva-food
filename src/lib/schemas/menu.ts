import { z } from "zod";

export const gstinSchema = z
  .string()
  .trim()
  .regex(/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN")
  .refine((value) => Number(value.slice(0, 2)) >= 1 && Number(value.slice(0, 2)) <= 37, "Invalid GST state code");

export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number");
export const priceSchema = z.coerce.number().min(0, "Price cannot be negative").max(999999);
export const stockQuantitySchema = z.coerce.number().min(0, "Stock cannot be negative");
export const taxPercentSchema = z.coerce.number().min(0).max(28);
export const deliveryRadiusSchema = z.coerce.number().min(0.5).max(50);
export const branchNameSchema = z.string().trim().min(2).max(80);
export const emailSchema = z.string().trim().email();

export const translatedTextSchema = z
  .object({
    hi: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
    ml: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
    ta: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
    kn: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
    ar: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
  })
  .optional();

export const modifierOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
  price: priceSchema,
});

export const modifierGroupSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(2),
    required: z.boolean(),
    min: z.coerce.number().int().min(0),
    max: z.coerce.number().int().min(0),
    options: z.array(modifierOptionSchema).min(1),
  })
  .refine((value) => value.max >= value.min, "Max selection cannot be lower than min selection");

export const recipeLinkSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: stockQuantitySchema.refine((value) => value > 0, "Recipe quantity must be greater than zero"),
  unit: z.string().trim().min(1),
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(2, "Menu item name is required"),
  description: z.string().min(8),
  price: priceSchema.refine((value) => value > 0, "Price must be greater than zero"),
  categoryId: z.string().min(1),
  available: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export const menuCategorySchema = z.object({
  name: z.string().trim().min(2),
  translations: z.record(z.enum(["hi", "ml", "ta", "kn", "ar"]), z.string()).optional(),
  image: z.string().url().or(z.literal("")).optional(),
  banner: z.string().url().or(z.literal("")).optional(),
  enabled: z.boolean().default(true),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const cuisineSchema = z.object({
  name: z.string().trim().min(2),
  image: z.string().url().or(z.literal("")).optional(),
  icon: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const taxSettingsSchema = z.object({
  id: z.string().optional(),
  restaurantSlug: z.string().optional(),
  restaurantId: z.string().optional(),
  branchId: z.string().optional(),
  gstEnabled: z.boolean(),
  gstin: gstinSchema.optional().or(z.literal("")),
  pricingMode: z.enum(["inclusive", "exclusive"]),
  defaultGstRate: z.union([z.literal(5), z.literal(18)]),
  cgstRate: taxPercentSchema,
  sgstRate: taxPercentSchema,
  igstRate: taxPercentSchema,
  serviceChargeRate: taxPercentSchema,
  defaultPackingCharge: priceSchema,
  sac: z.literal("996331").optional(),
}).refine((value) => !value.gstEnabled || value.gstin, "GSTIN is required when GST is enabled").refine((value) => {
  if (!value.gstEnabled) return true;
  return Number((value.cgstRate + value.sgstRate).toFixed(2)) === value.defaultGstRate || value.igstRate === value.defaultGstRate;
}, "CGST + SGST or IGST must match the selected GST rate");

export const menuChannelSchema = z.object({
  visible: z.boolean(),
  available: z.boolean(),
  price: priceSchema,
  taxRate: z.union([z.literal(5), z.literal(18)]),
  packingCharge: priceSchema,
  offerCode: z.string().trim().optional(),
});

export const advancedMenuItemSchema = z.object({
  name: z.string().trim().min(2),
  translations: translatedTextSchema,
  category: z.string().trim().min(2),
  categoryId: z.string().optional(),
  cuisineIds: z.array(z.string()).default([]),
  description: z.string().trim().min(8),
  longDescription: z.string().optional(),
  price: priceSchema.refine((value) => value > 0),
  dineInPrice: priceSchema,
  parcelPrice: priceSchema,
  deliveryPrice: priceSchema,
  packingCharge: priceSchema,
  prepTime: z.string().min(2),
  foodType: z.enum(["veg", "nonveg", "egg", "vegan", "jain"]),
  spiceLevel: z.enum(["mild", "medium", "hot"]),
  tags: z.string().optional(),
  allergens: z.string().optional(),
  modifiers: z.string().optional(),
  addOns: z.string().optional(),
  modifierGroups: z.array(modifierGroupSchema).default([]),
  recipeLinks: z.array(recipeLinkSchema).default([]),
  menuVisibility: z.object({
    "dine-in": z.boolean(),
    parcel: z.boolean(),
    delivery: z.boolean(),
  }),
  channels: z.object({
    "dine-in": menuChannelSchema,
    parcel: menuChannelSchema,
    delivery: menuChannelSchema,
  }).optional(),
});

export const comboSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  image: z.string().url().or(z.literal("")).optional(),
  itemIds: z.array(z.string()).min(1).optional(),
  price: priceSchema.refine((value) => value > 0),
  discount: priceSchema,
  available: z.boolean().default(true),
}).refine((value) => value.discount < value.price, "Combo discount must be lower than combo price");

export const inventorySchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  branchId: z.string().min(1),
  currentStock: stockQuantitySchema,
  unit: z.string().trim().min(1),
  reorderLevel: stockQuantitySchema,
}).refine((value) => value.currentStock >= 0 && value.reorderLevel >= 0, "Inventory values cannot be negative");

export const menuImportRowSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  price: priceSchema.refine((value) => value > 0),
  deliveryPrice: priceSchema.optional(),
  foodType: z.enum(["veg", "nonveg", "egg", "vegan", "jain"]),
});
