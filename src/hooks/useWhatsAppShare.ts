"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { defaultMarketingSettings, defaultRestaurantMarketingSettings, type MarketingSettings, type RestaurantMarketingSettings, type WhatsAppTemplateKind } from "@/features/marketing/messageTemplates";
import { useAlert } from "@/hooks/useAlert";
import { ROUTES } from "@/lib/constants";
import type { MenuItem, Restaurant } from "@/lib/types";
import { shortenUrl, type ShortenedUrl } from "@/services/urlShortener";
import {
  buildWhatsAppShareHref,
  generateWhatsAppMenuMessage,
  readStoredMarketingSettings,
  readStoredRestaurantMarketingSettings,
} from "@/services/whatsappTemplate";

export type WhatsAppSharePreview = {
  item: MenuItem;
  restaurantName: string;
  originalUrl: string;
  shortUrl: string;
  shortener: ShortenedUrl;
  message: string;
  template: WhatsAppTemplateKind;
};

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
      const message = generateWhatsAppMenuMessage({
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
      }, {
        template: template ?? marketingSettings.defaultTemplate,
        marketingSettings,
        restaurantSettings,
      });

      setPreview({
        item,
        restaurantName,
        originalUrl,
        shortUrl: shortener.shortUrl,
        shortener,
        message,
        template: template ?? marketingSettings.defaultTemplate,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare WhatsApp message.");
    } finally {
      setIsPreparing(false);
    }
  }, [options.marketingSettings, options.restaurantSettings]);

  const closeShare = useCallback(() => setPreview(null), []);

  const copyMessage = useCallback(async () => {
    if (!preview) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is not available.");
      await navigator.clipboard.writeText(preview.message);
      toast.success("WhatsApp message copied.");
    } catch {
      await prompt("Copy WhatsApp message", preview.message, { title: "Copy message", inputLabel: "WhatsApp message" });
    }
  }, [preview, prompt]);

  const openWhatsApp = useCallback(() => {
    if (!preview || typeof window === "undefined") return;
    window.open(buildWhatsAppShareHref(preview.message), "_blank", "noopener,noreferrer");
  }, [preview]);

  return {
    preview,
    isPreparing,
    openShare,
    closeShare,
    copyMessage,
    openWhatsApp,
  };
}

function buildCustomerItemUrl(item: MenuItem, restaurantSlug: string) {
  const itemId = item.id.split("::")[0];
  const path = ROUTES.item(encodeURIComponent(restaurantSlug), encodeURIComponent(itemId));
  if (typeof window !== "undefined" && window.location.origin) return `${window.location.origin}${path}`;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return configuredOrigin ? `${configuredOrigin}${path}` : path;
}

function humanizeSlug(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
