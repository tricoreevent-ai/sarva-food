import type { MarketingTone, WhatsAppTemplateKind } from "@/features/marketing/messageTemplates";
import type { MenuItem } from "@/lib/types";

export const campaignTypes = ["Today's Specials", "Lunch Menu", "Dinner Menu", "Fish Festival", "Weekend Offers", "Best Sellers", "Category", "Festival", "Custom"] as const;
export const campaignLayouts = ["Classic", "Minimal", "Luxury", "Premium", "Festival", "Offer", "Instagram Story", "WhatsApp Status", "Square", "Landscape", "Restaurant Showcase"] as const;
export const campaignCtas = ["Order Now", "Order Direct", "Call Now", "WhatsApp Order", "View Menu", "Reserve Table", "Get Offer", "Scan QR"] as const;
export const socialFormats = ["WhatsApp", "Instagram Story", "Instagram Feed", "Facebook", "Telegram", "X", "Email"] as const;

export type CampaignStatus = "draft" | "published" | "archived" | "scheduled";
export type MarketingCampaign = {
  id: string;
  publicSlug: string;
  name: string;
  type: string;
  status: CampaignStatus;
  menuItemIds: string[];
  itemSnapshots?: Array<{ name: string }>;
  template: WhatsAppTemplateKind;
  tone: MarketingTone;
  layout: string;
  socialFormat: string;
  cta: string;
  message: string;
  scheduleAt?: string;
  scheduleKind?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metrics: { whatsappShares: number; posterDownloads: number; copiedLinks: number; copiedMessages: number; qrDownloads: number; clicks: number; orders: number; revenue: number };
};

export function campaignSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "campaign";
}

export function publicItemSlug(name: string) {
  return campaignSlug(name);
}

export function smartBadges(item: MenuItem) {
  const source = [...(item.badges ?? []), ...(item.tags ?? [])].map((value) => value.toLowerCase());
  const badges: string[] = [];
  if (source.some((value) => value.includes("today"))) badges.push("Today's Special");
  if (source.some((value) => value.includes("chef"))) badges.push("Chef Recommended");
  if (item.isPopular || source.some((value) => value.includes("best"))) badges.push("Best Seller");
  if (source.some((value) => value.includes("limited"))) badges.push("Limited Time");
  if (source.some((value) => value.includes("deal") || value.includes("offer"))) badges.push("Hot Deal");
  if (source.some((value) => value.includes("new"))) badges.push("New Arrival");
  if (source.some((value) => value.includes("festival"))) badges.push("Festival Special");
  if (item.orderCount && item.orderCount > 20) badges.push("Popular Choice");
  return [...new Set(badges)].slice(0, 3);
}

export function campaignPricing(item: MenuItem) {
  const record = item as MenuItem & { offerPrice?: number; discountedPrice?: number; originalPrice?: number };
  const selling = record.offerPrice || record.discountedPrice || item.deliveryPrice || item.parcelPrice || item.price;
  const original = record.originalPrice || ((record.offerPrice || record.discountedPrice) ? item.deliveryPrice || item.parcelPrice || item.price : selling);
  const savings = Math.max(0, original - selling);
  return { selling, original, savings, discount: original > selling ? Math.round((savings / original) * 100) : 0 };
}

export function buildCampaignMessage(name: string, restaurantName: string, items: MenuItem[], cta: string, link: string) {
  const lines = items.filter((item) => !item.soldOut && item.menuVisibility?.delivery !== false).map((item) => {
    const price = item.deliveryPrice ?? item.parcelPrice ?? item.price;
    return `🍽️ *${item.name}* — ₹${price}`;
  });
  return [`🔥 *${name}*`, `From *${restaurantName}*`, "", ...lines, "", `👉 *${cta}*`, link].join("\n");
}

export function emptyMetrics(): MarketingCampaign["metrics"] {
  return { whatsappShares: 0, posterDownloads: 0, copiedLinks: 0, copiedMessages: 0, qrDownloads: 0, clicks: 0, orders: 0, revenue: 0 };
}
