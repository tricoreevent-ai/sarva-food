import type { MarketingTone, WhatsAppTemplateKind } from "@/features/marketing/messageTemplates";
import type { MenuItem } from "@/lib/types";

export const campaignTypes = ["Today's Special", "Tomorrow's Special", "Weekend Offer", "Breakfast Menu", "Lunch Menu", "Dinner Menu", "Festival Menu", "Chef Recommendation", "Limited Stock", "Fresh Catch", "Only Today", "Pre-order", "Flash Sale", "Combo Offer", "Bulk Catering", "Family Pack", "Category", "Custom"] as const;
export const campaignLayouts = ["Classic", "Minimal", "Luxury", "Premium", "Festival", "Offer", "Instagram Story", "WhatsApp Status", "Square", "Landscape", "Restaurant Showcase"] as const;
export const campaignCtas = ["Order Now", "Order Today", "Limited Stock", "Delivery Available", "Pre-book", "Order Direct", "Call Now", "WhatsApp Order", "View Menu", "Reserve Table", "Get Offer", "Scan QR"] as const;
export const socialFormats = ["WhatsApp", "Instagram Story", "Instagram Feed", "Facebook", "Telegram", "X", "Email"] as const;
export const campaignMessageBlocks = ["Headline", "Offer", "Price", "Description", "Schedule", "Restaurant", "CTA", "Footer"] as const;

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
  orderingOpensAt?: string;
  orderingClosesAt?: string;
  cookingStartsAt?: string;
  deliveryStartsAt?: string;
  pickupStartsAt?: string;
  expiresAt?: string;
  autoDisableAt?: string;
  maximumOrders?: number;
  maximumQuantity?: number;
  orderCount?: number;
  quantityOrdered?: number;
  shortUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metrics: { whatsappShares: number; posterDownloads: number; copiedLinks: number; copiedMessages: number; qrDownloads: number; clicks: number; orders: number; revenue: number; repeatCustomers?: number };
  clickHours?: Record<string, number>;
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

export function buildCampaignMessage(name: string, restaurantName: string, items: MenuItem[], cta: string, link: string, timing?: { orderingOpensAt?: string; orderingClosesAt?: string; deliveryStartsAt?: string; expiresAt?: string; scheduleKind?: string; messageBlocks?: readonly string[] }) {
  const available = items.filter((item) => !item.soldOut && item.menuVisibility?.delivery !== false);
  const lines = available.slice(0, 4).map((item) => {
    const price = item.deliveryPrice ?? item.parcelPrice ?? item.price;
    return `🍽️ *${item.name}* - ₹${price}`;
  });
  const order = timing?.messageBlocks?.length ? timing.messageBlocks : campaignMessageBlocks;
  const scheduled = Boolean(timing?.scheduleKind || timing?.orderingOpensAt || timing?.deliveryStartsAt);
  const safeLink = isShortMarketingLink(link) ? link : "Smart link will be generated before sharing.";
  const blockText: Record<string, string[]> = {
    Headline: [`🔥 *${name.trim() || "Today's Special"}*`],
    Offer: lines.length ? lines : ["🍽️ Fresh specials available today."],
    Price: available.length > 1 ? [`Best picks from ${restaurantName}`] : [],
    Description: available[0]?.description ? [available[0].description.replace(/\s+/g, " ").slice(0, 90)] : [],
    Schedule: scheduled ? [
      timing?.orderingOpensAt ? `📅 Ordering opens ${friendly(timing.orderingOpensAt)}` : "",
      timing?.deliveryStartsAt ? `🚚 Available from ${friendly(timing.deliveryStartsAt)}` : "",
      timing?.orderingClosesAt || timing?.expiresAt ? `⏳ Available until ${friendly(timing.orderingClosesAt || timing.expiresAt)}` : "",
    ].filter(Boolean) : [],
    Restaurant: [`🏪 ${restaurantName}`],
    CTA: [`👇 *${scheduled ? normalizeScheduledCta(cta) : normalizeOrderNowCta(cta)}*`, safeLink],
    Footer: ["❤️ Order directly from Food Gedi"],
  };
  return sanitizeWhatsAppMessage(order.flatMap((block) => blockText[block] ?? []));
}

export function emptyMetrics(): MarketingCampaign["metrics"] & { repeatCustomers?: number } {
  return { whatsappShares: 0, posterDownloads: 0, copiedLinks: 0, copiedMessages: 0, qrDownloads: 0, clicks: 0, orders: 0, revenue: 0 };
}

export function campaignAvailability(campaign: Pick<MarketingCampaign, "status" | "scheduleAt" | "orderingOpensAt" | "orderingClosesAt" | "expiresAt" | "autoDisableAt" | "maximumOrders" | "maximumQuantity" | "orderCount" | "quantityOrdered">, now = new Date()) {
  const time = now.getTime(); const opens = dateMs(campaign.orderingOpensAt); const closes = dateMs(campaign.orderingClosesAt); const expires = dateMs(campaign.expiresAt); const disabled = dateMs(campaign.autoDisableAt);
  const scheduled = dateMs(campaign.scheduleAt); const effectivelyPublished = campaign.status === "published" || (campaign.status === "scheduled" && scheduled > 0 && time >= scheduled);
  if (!effectivelyPublished) return { orderable: false, state: campaign.status === "scheduled" ? "scheduled" : "unavailable", message: campaign.status === "scheduled" ? `Ordering opens ${friendly(campaign.orderingOpensAt || campaign.scheduleAt)}` : "This campaign is not currently available." };
  if (opens && time < opens) return { orderable: false, state: "coming-soon", message: `Ordering opens ${friendly(campaign.orderingOpensAt)}` };
  if ((closes && time >= closes) || (expires && time >= expires) || (disabled && time >= disabled)) return { orderable: false, state: "expired", message: "Ordering for this special has closed." };
  if (campaign.maximumOrders && (campaign.orderCount ?? 0) >= campaign.maximumOrders) return { orderable: false, state: "sold-out", message: "This campaign has reached its maximum number of orders." };
  if (campaign.maximumQuantity && (campaign.quantityOrdered ?? 0) >= campaign.maximumQuantity) return { orderable: false, state: "sold-out", message: "This special is sold out." };
  return { orderable: true, state: "active", message: closes ? `Ordering closes ${friendly(campaign.orderingClosesAt)}` : "Order directly from the restaurant." };
}

function dateMs(value?: string) { const parsed = value ? new Date(value).getTime() : 0; return Number.isFinite(parsed) ? parsed : 0; }
function friendly(value?: string) { if (!value) return "soon"; return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)); }
function isShortMarketingLink(value: string) { return /^https:\/\/[^/\s]+\/[a-z0-9-]{3,}$/i.test(value) || /^https:\/\/[^/\s]+\/s\/[a-z0-9-]{3,}$/i.test(value); }
function normalizeOrderNowCta(value: string) { return ["Order Today", "Order Now", "Limited Stock", "Delivery Available"].includes(value) ? value : "Order Now"; }
function normalizeScheduledCta(value: string) { return value === "Pre-book" ? value : "Pre-book"; }
function sanitizeWhatsAppMessage(lines: string[]) {
  return lines
    .map((line) => line.replace(/\uFFFD/g, "").replace(/[^\S\r\n]+/g, " ").trim())
    .filter(Boolean)
    .filter((line, index, all) => all.indexOf(line) === index)
    .join("\n");
}
