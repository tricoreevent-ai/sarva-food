import {
  defaultMarketingSettings,
  defaultRestaurantMarketingSettings,
  WHATSAPP_MESSAGE_TEMPLATES,
  type MarketingSettings,
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
};

export type WhatsAppMessageOptions = {
  template?: WhatsAppTemplateKind;
  marketingSettings?: Partial<MarketingSettings>;
  restaurantSettings?: Partial<RestaurantMarketingSettings>;
};

const marketingSettingsKey = "sarva-marketing-settings:v1";
const restaurantSettingsPrefix = "sarva-restaurant-marketing-settings:";

export function generateWhatsAppMenuMessage(input: WhatsAppMenuItemInput, options: WhatsAppMessageOptions = {}) {
  const marketingSettings = { ...defaultMarketingSettings, ...options.marketingSettings };
  const restaurantSettings = { ...defaultRestaurantMarketingSettings, ...options.restaurantSettings };
  const templateId = options.template ?? marketingSettings.defaultTemplate;
  const template = WHATSAPP_MESSAGE_TEMPLATES[templateId] ?? WHATSAPP_MESSAGE_TEMPLATES["todays-special"];
  const price = input.offerPrice && input.offerPrice > 0 ? input.offerPrice : input.price;
  const ctaText = restaurantSettings.defaultCtaText || marketingSettings.defaultCtaText;
  const footer = [restaurantSettings.whatsappFooter, marketingSettings.promotionalFooter]
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("\n");

  const replacements = {
    customer_name: input.customerName?.trim() || "Food lover",
    restaurant_name: input.restaurantName || humanizeSlug(input.restaurantSlug),
    restaurant_slug: input.restaurantSlug,
    item_name: input.itemName,
    item_description: input.itemDescription ?? "",
    description: input.itemDescription ?? "",
    short_description: truncateText(input.itemDescription ?? "", 180),
    price: formatPriceValue(price),
    item_image: input.itemImage ?? "",
    cuisine: input.cuisine ?? "",
    category: input.category ?? "",
    rating: input.rating ? input.rating.toFixed(1) : "",
    short_url: input.shortUrl,
    cta_text: ctaText,
  };

  return cleanMessage(replaceTemplateTokens(template, replacements), footer);
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

function replaceTemplateTokens(template: string, replacements: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] ?? "");
}

function cleanMessage(message: string, footer: string) {
  const cleaned = message
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return footer ? `${cleaned}\n\n${footer}` : cleaned;
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
