import {
  defaultMarketingSettings,
  defaultRestaurantMarketingSettings,
  type MarketingSettings,
  type MarketingTone,
  type RestaurantMarketingSettings,
  type WhatsAppTemplateKind,
} from "@/features/marketing/messageTemplates";

export type WhatsAppMenuItemInput = {
  restaurantName: string;
  restaurantSlug: string;
  itemName: string;
  itemDescription?: string;
  price: number;
  offerPrice?: number;
  itemImage?: string;
  cuisine?: string;
  category?: string;
  rating?: number;
  shortUrl: string;
  customerName?: string;
  deliveryAvailable?: boolean;
  openHours?: string;
  phone?: string;
  mapUrl?: string;
  address?: string;
  prepTime?: string;
  foodType?: string;
  restaurantUrl?: string;
};

export type WhatsAppContentOptions = {
  includeImage: boolean;
  includePrice: boolean;
  includeDescription: boolean;
  includeOffer: boolean;
  includeAddress: boolean;
  includePhone: boolean;
  includeOrderLink: boolean;
  includeDelivery: boolean;
  includePrepTime: boolean;
};

export type WhatsAppMessageOptions = {
  template?: WhatsAppTemplateKind;
  marketingSettings?: Partial<MarketingSettings>;
  restaurantSettings?: Partial<RestaurantMarketingSettings>;
  content?: Partial<WhatsAppContentOptions>;
  tone?: MarketingTone;
};

export const defaultWhatsAppContentOptions: WhatsAppContentOptions = { includeImage: false, includePrice: true, includeDescription: false, includeOffer: true, includeAddress: false, includePhone: false, includeOrderLink: true, includeDelivery: false, includePrepTime: false };

const marketingSettingsKey = "sarva-marketing-settings:v1";
const restaurantSettingsPrefix = "sarva-restaurant-marketing-settings:";

export function generateWhatsAppMenuMessage(input: WhatsAppMenuItemInput, options: WhatsAppMessageOptions = {}) {
  const marketingSettings = { ...defaultMarketingSettings, ...options.marketingSettings };
  const restaurantSettings = { ...defaultRestaurantMarketingSettings, ...options.restaurantSettings };
  const content = { ...defaultWhatsAppContentOptions, ...options.content };
  const price = input.offerPrice && input.offerPrice > 0 ? input.offerPrice : input.price;
  const ctaText = restaurantSettings.defaultCtaText || marketingSettings.defaultCtaText;
  const footer = [restaurantSettings.whatsappFooter, marketingSettings.promotionalFooter]
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("\n");

  const scheduled = /pre|schedule|tomorrow|later/i.test(options.template ?? "");
  const lines = scheduled ? [
    "📅 *Available for Pre-Order*",
    `🔥 *${input.itemName}*`,
    content.includePrice ? `💰 ₹${formatPriceValue(price)}` : "",
    input.openHours ? `🕒 Available from *${input.openHours}*` : "",
    "📦 *Schedule Order*",
    content.includeOrderLink ? input.shortUrl : "",
    "❤️ Food Gedi",
  ] : [
    "👋 Hello Food lover!",
    `🔥 Today's Special — *${input.restaurantName || humanizeSlug(input.restaurantSlug)}*`,
    `🍽️ *${input.itemName}*`,
    content.includePrice ? `💰 *₹${formatPriceValue(price)}*` : "",
    `🛒 *${ctaText || "Order Now"}*`,
    content.includeOrderLink ? input.shortUrl : "",
  ];
  const optional = [
    content.includeDescription && input.itemDescription ? truncateText(input.itemDescription, 90) : "",
    content.includeDelivery && input.deliveryAvailable ? "🛵 Delivery available" : "",
    content.includeAddress && input.address ? `📍 ${input.address}` : "",
    content.includePhone && input.phone ? `📞 ${input.phone}` : "",
  ];
  return cleanMessage([...lines, ...optional].filter(Boolean).join("\n"), footer);
}

export function buildWhatsAppShareHref(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function readStoredMarketingSettings(): MarketingSettings {
  if (typeof window === "undefined") return defaultMarketingSettings;
  return {
    ...defaultMarketingSettings,
    ...readJson<Partial<MarketingSettings>>(marketingSettingsKey),
  };
}

export function writeStoredMarketingSettings(settings: MarketingSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(marketingSettingsKey, JSON.stringify(settings));
}

export function readStoredRestaurantMarketingSettings(restaurantSlug: string): RestaurantMarketingSettings {
  if (typeof window === "undefined") return defaultRestaurantMarketingSettings;
  return {
    ...defaultRestaurantMarketingSettings,
    ...readJson<Partial<RestaurantMarketingSettings>>(`${restaurantSettingsPrefix}${restaurantSlug}`),
  };
}

export function writeStoredRestaurantMarketingSettings(restaurantSlug: string, settings: RestaurantMarketingSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${restaurantSettingsPrefix}${restaurantSlug}`, JSON.stringify(settings));
}

function cleanMessage(message: string, footer: string) {
  const cleaned = message
    .split("\n")
    .map((line) => line.replace(/\uFFFD/g, "").replace(/[^\S\r\n]+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !isTechnicalMarketingUrl(line))
    .filter((line, index, all) => all.indexOf(line) === index)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return footer ? `${cleaned}\n\n${footer}` : cleaned;
}

function isTechnicalMarketingUrl(line: string) {
  if (!/^https?:\/\//i.test(line) && !/^(Map|Schedule):\s*https?:\/\//i.test(line)) return false;
  if (/\/s\/[A-Z0-9_-]{3,}$/i.test(line)) return false;
  return /google\.com\/maps|images\.|unsplash|cloudinary|intent=schedule|\/restaurant\/.+\?/.test(line);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function formatPriceValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function humanizeSlug(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}
