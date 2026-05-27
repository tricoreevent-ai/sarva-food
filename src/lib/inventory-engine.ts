import { z } from "zod";
import type { InventoryItem, InventoryMovement, InventoryType, OrderLine, Recipe } from "@/lib/types";

export const INVENTORY_TYPE_OPTIONS: Array<{ value: InventoryType; label: string; helper: string }> = [
  { value: "sellable-products", label: "Sellable Products", helper: "Packed retail items sold directly through POS." },
  { value: "raw-ingredients", label: "Raw Ingredients", helper: "Ingredients consumed by recipes and kitchen production." },
  { value: "kitchen-supplies", label: "Kitchen Supplies", helper: "Non-food consumables used by kitchen teams." },
  { value: "housekeeping", label: "Housekeeping", helper: "Cleaning and facility inventory." },
  { value: "packaging", label: "Packaging", helper: "Boxes, bags, containers, labels and parcel material." },
  { value: "equipment", label: "Equipment", helper: "Machines, tools and serviceable assets." },
  { value: "vendor-purchases", label: "Vendor Purchases", helper: "Items tracked directly from supplier invoices." },
  { value: "central-kitchen-stock", label: "Central Kitchen Stock", helper: "Bulk production stock transferred to branches." },
];

export const INVENTORY_UNITS = ["kg", "g", "ltr", "ml", "piece", "packet", "box", "case", "tray", "roll", "bottle"] as const;

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2, "Inventory name is required."),
  category: z.string().trim().min(1, "Category is required."),
  unit: z.string().trim().min(1, "Unit is required."),
  currentStock: z.number().min(0, "Quantity cannot be negative."),
  reorderLevel: z.number().min(0, "Reorder level cannot be negative."),
  sku: z.string().trim().optional(),
});

export const recipeSchema = z.object({
  menuItemId: z.string().trim().min(1, "Menu item is required."),
  menuItemName: z.string().trim().min(1, "Menu item is required."),
  ingredients: z.array(z.object({
    inventoryItemId: z.string().trim().min(1, "Ingredient is required."),
    quantity: z.number().positive("Ingredient quantity is required."),
    unit: z.string().trim().min(1, "Ingredient unit is required."),
  })).min(1, "Recipe must contain at least one ingredient."),
});

export function generateInventorySku(input: { inventoryType: InventoryType; category: string; name: string; existingSkus?: string[] }) {
  const prefix = input.inventoryType
    .split("-")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 4);
  const category = slugPart(input.category, "GEN");
  const name = slugPart(input.name, "ITEM");
  const base = `${prefix}-${category}-${name}`.slice(0, 28);
  const existing = new Set((input.existingSkus ?? []).map((sku) => sku.toUpperCase()));
  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function getInventoryTypeLabel(type?: InventoryType) {
  return INVENTORY_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? "Sellable Products";
}

export function getInventoryStatus(item: InventoryItem) {
  const alertAt = item.lowStockAlert ?? item.reorderLevel;
  const expiresAt = item.expiryDate ? Date.parse(item.expiryDate) : 0;
  const daysToExpiry = expiresAt ? Math.ceil((expiresAt - Date.now()) / 86400000) : null;

  if (item.currentStock <= 0) return { label: "Out", tone: "destructive" as const };
  if (daysToExpiry !== null && daysToExpiry <= 0) return { label: "Expired", tone: "destructive" as const };
  if (daysToExpiry !== null && daysToExpiry <= 2) return { label: "Expiring", tone: "warning" as const };
  if (item.currentStock <= alertAt) return { label: "Low", tone: "warning" as const };
  return { label: "OK", tone: "success" as const };
}

export function predictStockDepletionDays(item: InventoryItem) {
  const dailyUsage = item.averageDailyUsage ?? 0;
  if (dailyUsage <= 0) return null;
  return Math.max(0, Math.round((item.currentStock / dailyUsage) * 10) / 10);
}

export function calculateRecipeCost(recipe: Recipe, inventoryItems: InventoryItem[]) {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  return recipe.ingredients.reduce((sum, ingredient) => {
    const inventoryItem = inventoryById.get(ingredient.inventoryItemId);
    if (!inventoryItem?.costPerUnit) return sum;
    return sum + inventoryItem.costPerUnit * ingredient.quantity;
  }, 0);
}

export function buildRecipeMovements(input: {
  lines: OrderLine[];
  recipes: Recipe[];
  inventoryItems: InventoryItem[];
  branchId: string;
  orderId: string;
  createdBy?: string;
}) {
  const recipeByMenuItem = new Map(input.recipes.filter((recipe) => recipe.active).map((recipe) => [recipe.menuItemId, recipe]));
  const itemById = new Map(input.inventoryItems.map((item) => [item.id, item]));
  const movements: InventoryMovement[] = [];

  for (const line of input.lines) {
    const recipe = recipeByMenuItem.get(line.itemId);
    if (!recipe || line.quantity <= 0) continue;
    for (const ingredient of recipe.ingredients) {
      const inventoryItem = itemById.get(ingredient.inventoryItemId);
      const wastageMultiplier = 1 + ((ingredient.wastagePercent ?? 0) / 100);
      const quantity = Math.round(ingredient.quantity * line.quantity * wastageMultiplier * 1000) / 1000;
      movements.push({
        id: `mov-${Date.now()}-${line.itemId}-${ingredient.inventoryItemId}-${movements.length}`,
        inventoryItemId: ingredient.inventoryItemId,
        inventoryItemName: inventoryItem?.name ?? ingredient.inventoryItemName,
        branchId: input.branchId,
        movementType: "recipe-deduction",
        quantity: -quantity,
        unit: ingredient.unit,
        reason: `${line.quantity} x ${line.name}`,
        orderId: input.orderId,
        recipeId: recipe.id,
        createdAt: new Date().toISOString(),
        createdBy: input.createdBy,
      });
    }
  }

  return movements;
}

export function applyInventoryMovements(items: InventoryItem[], movements: InventoryMovement[]) {
  const deltaById = new Map<string, number>();
  for (const movement of movements) {
    deltaById.set(movement.inventoryItemId, (deltaById.get(movement.inventoryItemId) ?? 0) + movement.quantity);
  }
  return items.map((item) => {
    const delta = deltaById.get(item.id);
    if (delta === undefined) return item;
    return {
      ...item,
      currentStock: Math.max(0, Math.round((item.currentStock + delta) * 1000) / 1000),
      lastMovementAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

function slugPart(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 5);
  return normalized || fallback;
}
