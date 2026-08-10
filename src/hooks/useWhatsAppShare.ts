"use client";

import { useCallback, useState } from "react";
import { toast } from "@/lib/client-toast";
import { defaultMarketingSettings, defaultRestaurantMarketingSettings, type MarketingSettings, type MarketingTone, type RestaurantMarketingSettings, type WhatsAppTemplateKind } from "@/features/marketing/messageTemplates";
import { useAlert } from "@/hooks/useAlert";
import { ROUTES } from "@/lib/constants";
import { menuItemPath } from "@/lib/menu-item-links";
import type { MenuItem, Restaurant } from "@/lib/types";
import { shortenUrl, type ShortenedUrl } from "@/services/urlShortener";
import {
  buildWhatsAppShareHref,
  generateWhatsAppMenuMessage,
  defaultWhatsAppContentOptions,
  readStoredMarketingSettings,
  readStoredRestaurantMarketingSettings,
} from "@/services/whatsappTemplate";
import type { WhatsAppContentOptions, WhatsAppMenuItemInput } from "@/services/whatsappTemplate";

export type WhatsAppSharePreview = {
  item: MenuItem;
  restaurantName: string;
  originalUrl: string;
  shortUrl: string;
  shortener: ShortenedUrl;
  message: string;
  template: WhatsAppTemplateKind;
  tone: MarketingTone;
  content: WhatsAppContentOptions;
  input: WhatsAppMenuItemInput;
  restaurant?: Partial<Restaurant>;
};

export type MarketingShareChannel = "whatsapp" | "whatsapp-web" | "copy-message" | "copy-link" | "download";
export type MarketingItemAnalytics = { shares: number; lastShared?: string; clicks: number; orders: number; conversion: number };

type ShareInput = {
  item: MenuItem;
  restaurant?: Partial<Restaurant>;
  template?: WhatsAppTemplateKind;
  customerName?: string;
};

type UseWhatsAppShareOptions = {
  marketingSettings?: Partial<MarketingSettings>;
  restaurantSettings?: Partial<RestaurantMarketingSettings>;
};

export function useWhatsAppShare(options: UseWhatsAppShareOptions = {}) {
  const { prompt } = useAlert();
  const [preview, setPreview] = useState<WhatsAppSharePreview | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, MarketingItemAnalytics>>({});

  const openShare = useCallback(async ({ item, restaurant, template, customerName }: ShareInput) => {
    setIsPreparing(true);
    try {
      const restaurantSlug = restaurant?.slug ?? item.restaurantSlug;
      const restaurantName = restaurant?.displayName ?? restaurant?.name ?? humanizeSlug(restaurantSlug);
      const marketingSettings = {
        ...defaultMarketingSettings,
        ...readStoredMarketingSettings(),
        ...options.marketingSettings,
      };
      const restaurantSettings = {
        ...defaultRestaurantMarketingSettings,
        ...readStoredRestaurantMarketingSettings(restaurantSlug),
        ...options.restaurantSettings,
      };
      const originalUrl = buildCustomerItemUrl(item, restaurantSlug);
      const shortener = await shortenUrl(originalUrl, { enabled: marketingSettings.tinyUrlEnabled });
      if (!shortener.ok) throw new Error(shortener.error || "Couldn't create the order link. Please retry.");
      const restaurantUrl = buildRestaurantUrl(restaurantSlug);
      const input: WhatsAppMenuItemInput = {
        restaurantName,
        restaurantSlug,
        itemName: item.name,
        itemDescription: item.description || item.longDescription,
        price: item.deliveryPrice ?? item.parcelPrice ?? item.dineInPrice ?? item.price,
        offerPrice: undefined,
        itemImage: item.image,
        cuisine: item.cuisineIds?.join(", ") || restaurant?.cuisine,
        category: item.category,
        rating: item.averageRating ?? restaurant?.rating,
        shortUrl: shortener.shortUrl,
        customerName,
        deliveryAvailable: restaurant?.orderingEnabled !== false && item.menuVisibility?.delivery !== false,
        openHours: undefined,
        phone: restaurant?.contact?.phone ?? restaurant?.ownerProfile?.businessPhone,
        mapUrl: undefined,
        address: restaurant?.address || restaurant?.location,
        prepTime: item.prepTime,
        foodType: item.foodType ?? (item.isVeg ? "veg" : "nonveg"),
        restaurantUrl,
      };
      const selectedTemplate = template ?? marketingSettings.defaultTemplate;
      const content = defaultWhatsAppContentOptions;
      const tone: MarketingTone = "professional";
      const message = generateWhatsAppMenuMessage(input, {
        template: selectedTemplate,
        marketingSettings,
        restaurantSettings,
        content,
        tone,
      });

      setPreview({
        item,
        restaurantName,
        originalUrl,
        shortUrl: shortener.shortUrl,
        shortener,
        message,
        template: selectedTemplate,
        tone,
        content,
        input,
        restaurant,
      });
      void fetch(`/api/owner/marketing-shares?restaurantId=${encodeURIComponent(restaurantSlug)}&menuItemId=${encodeURIComponent(item.id.split("::")[0])}`)
        .then((response) => response.ok ? response.json() : null)
        .then((payload: { data?: MarketingItemAnalytics } | null) => { if (payload?.data) setAnalytics((current) => ({ ...current, [item.id]: payload.data! })); })
        .catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare WhatsApp message.");
    } finally {
      setIsPreparing(false);
    }
  }, [options.marketingSettings, options.restaurantSettings]);

  const closeShare = useCallback(() => setPreview(null), []);

  const updateShare = useCallback((patch: { template?: WhatsAppTemplateKind; tone?: MarketingTone; content?: Partial<WhatsAppContentOptions>; message?: string }) => {
    setPreview((current) => {
      if (!current) return current;
      const template = patch.template ?? current.template;
      const tone = patch.tone ?? current.tone;
      const content = { ...current.content, ...patch.content };
      return { ...current, template, tone, content, message: patch.message ?? generateWhatsAppMenuMessage(current.input, { template, tone, content }) };
    });
  }, []);

  const recordShare = useCallback((channel: MarketingShareChannel) => {
    if (!preview) return;
    const timestamp = new Date().toISOString();
    setAnalytics((current) => {
      const prior = current[preview.item.id] ?? { shares: 0, clicks: 0, orders: 0, conversion: 0 };
      return { ...current, [preview.item.id]: { ...prior, shares: prior.shares + 1, lastShared: timestamp } };
    });
    void fetch("/api/owner/marketing-shares", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ restaurantId: preview.item.restaurantSlug, menuItemId: preview.item.id.split("::")[0], menuItemName: preview.item.name, channel }) }).catch(() => undefined);
  }, [preview]);

  const copyMessage = useCallback(async () => {
    if (!preview) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is not available.");
      await navigator.clipboard.writeText(preview.message);
      toast.success("WhatsApp message copied.");
      recordShare("copy-message");
    } catch {
      await prompt("Copy WhatsApp message", preview.message, { title: "Copy message", inputLabel: "WhatsApp message" });
    }
  }, [preview, prompt, recordShare]);

  const copyLink = useCallback(async () => {
    if (!preview) return;
      try { await navigator.clipboard.writeText(preview.shortUrl); toast.success("Smart order link copied."); recordShare("copy-link"); }
      catch { await prompt("Copy smart order link", preview.shortUrl, { title: "Copy link", inputLabel: "Smart order URL" }); }
  }, [preview, prompt, recordShare]);

  const openWhatsApp = useCallback(() => {
    if (!preview || typeof window === "undefined") return;
    window.open(buildWhatsAppShareHref(preview.message), "_blank", "noopener,noreferrer");
    recordShare("whatsapp");
  }, [preview, recordShare]);

  const openWhatsAppWeb = useCallback(() => {
    if (!preview || typeof window === "undefined") return;
    window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(preview.message)}`, "_blank", "noopener,noreferrer");
    recordShare("whatsapp-web");
  }, [preview, recordShare]);

  const openChannel = useCallback((channel: "telegram" | "sms" | "email") => {
    if (!preview || typeof window === "undefined") return;
    const encoded = encodeURIComponent(preview.message);
    const href = channel === "telegram"
      ? `https://t.me/share/url?url=${encodeURIComponent(preview.shortUrl)}&text=${encoded}`
      : channel === "sms"
        ? `sms:?&body=${encoded}`
        : `mailto:?subject=${encodeURIComponent(`${preview.item.name} from ${preview.restaurantName}`)}&body=${encoded}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }, [preview]);

  return {
    preview,
    isPreparing,
    openShare,
    closeShare,
    copyMessage,
    copyLink,
    openWhatsApp,
    openWhatsAppWeb,
    openChannel,
    updateShare,
    recordShare,
    analytics,
  };
}

function buildRestaurantUrl(restaurantSlug: string) {
  const path = ROUTES.restaurant(encodeURIComponent(restaurantSlug));
  if (typeof window !== "undefined" && window.location.origin) return `${window.location.origin}${path}`;
  return `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}${path}`;
}

function buildCustomerItemUrl(item: MenuItem, restaurantSlug: string) {
  const itemId = item.id?.split("::")[0] || publicItemSlug(item.name);
  const path = menuItemPath(restaurantSlug, itemId);
  if (typeof window !== "undefined" && window.location.origin) return `${window.location.origin}${path}`;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return configuredOrigin ? `${configuredOrigin}${path}` : path;
}

function publicItemSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function humanizeSlug(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
