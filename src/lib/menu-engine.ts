import type { InventoryItem, MenuItem, TaxSettings } from "@/lib/types";

export type MenuChannel = "dine-in" | "parcel" | "delivery";

export const MENU_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ml", label: "Malayalam" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "ar", label: "Arabic" },
] as const;

export function getChannelPrice(item: MenuItem, channel: MenuChannel) {
  if (channel === "dine-in") return item.dineInPrice ?? item.price;
  if (channel === "parcel") return item.parcelPrice ?? item.price;
  return item.deliveryPrice ?? item.price;
}

export function isItemVisibleForChannel(item: MenuItem, channel: MenuChannel) {
  return item.menuVisibility?.[channel] ?? true;
}

export function calculateRestaurantTax(input: {
  amount: number;
  settings: TaxSettings;
  taxRate?: 5 | 18;
  packingCharge?: number;
  interstate?: boolean;
}) {
  const rate = input.taxRate ?? input.settings.defaultGstRate;
  const packingCharge = input.packingCharge ?? input.settings.defaultPackingCharge;
  const serviceCharge = roundMoney((input.amount * input.settings.serviceChargeRate) / 100);
  const gross = input.amount + packingCharge + serviceCharge;
  const taxableAmount = input.settings.pricingMode === "inclusive" ? roundMoney(gross / (1 + rate / 100)) : gross;
  const gstAmount = input.settings.gstEnabled ? roundMoney((taxableAmount * rate) / 100) : 0;
  const cgst = input.interstate ? 0 : roundMoney(gstAmount / 2);
  const sgst = input.interstate ? 0 : roundMoney(gstAmount / 2);
  const igst = input.interstate ? gstAmount : 0;
  const total = input.settings.pricingMode === "inclusive" ? gross : roundMoney(gross + gstAmount);

  return {
    sac: input.settings.sac,
    taxableAmount,
    serviceCharge,
    packingCharge,
    cgst,
    sgst,
    igst,
    gstAmount,
    total,
  };
}

export function cloneMenuForChannel(item: MenuItem, from: MenuChannel, to: MenuChannel): MenuItem {
  const price = getChannelPrice(item, from);
  return {
    ...item,
    dineInPrice: to === "dine-in" ? price : item.dineInPrice,
    parcelPrice: to === "parcel" ? price : item.parcelPrice,
    deliveryPrice: to === "delivery" ? price : item.deliveryPrice,
    menuVisibility: { "dine-in": true, parcel: true, delivery: true, ...item.menuVisibility, [to]: true },
  };
}

export function getInventoryStatus(item: InventoryItem) {
  if (item.currentStock <= 0) return "sold-out";
  if (item.currentStock <= item.reorderLevel) return "low";
  return "ok";
}

export function shouldAutoSoldOut(item: MenuItem, inventory: InventoryItem[]) {
  if (!item.recipeLinks?.length) return Boolean(item.soldOut);
  return item.recipeLinks.some((link) => {
    const stock = inventory.find((entry) => entry.id === link.inventoryItemId);
    return stock ? stock.currentStock < link.quantity : false;
  });
}

export function parsePricedTokens(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [name, price] = entry.split(":");
      return { id: `opt-${index + 1}`, name: name.trim(), price: Number(price) || 0 };
    })
    .filter((entry) => entry.name.length > 1 && entry.price >= 0);
}

export function buildQrPayload(kind: MenuChannel | "table", restaurantSlug: string, tableNumber?: string) {
  const base = `/restaurant/${restaurantSlug}/menu?mode=${kind}`;
  return tableNumber ? `${base}&table=${encodeURIComponent(tableNumber)}` : base;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
