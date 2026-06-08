export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
  process.env.NEXT_PUBLIC_BRAND_NAME?.trim() ||
  "Nammude";
export const APP_DESCRIPTION =
  "Nammude is a direct restaurant-to-customer platform that connects food lovers with local restaurant owners without third-party intermediaries. Order directly, access exclusive offers, enjoy transparent pricing, and support local businesses.";
export const APP_DEFAULT_TITLE = "Order Directly From Restaurants Near You";
export const APP_SEO_KEYWORDS = [
  "direct restaurant ordering",
  "order directly from restaurants",
  "restaurant to customer platform",
  "food ordering without middlemen",
  "local restaurants",
  "restaurant offers",
  "real-time menus",
  "transparent food pricing",
  "restaurant owner direct ordering",
  "Nammude",
];

export const DEFAULT_RESTAURANT_SLUG = "cafe-al-arab-thanisandra";

export const ROUTES = {
  home: "/",
  restaurants: "/restaurants",
  checkout: "/checkout",
  offers: "/offers",
  trackOrder: "/track-order",
  offline: "/offline",
  restaurant: (slug: string) => `/restaurant/${slug}`,
  menu: (slug: string) => `/restaurant/${slug}/menu`,
  item: (slug: string, itemId: string) => `/restaurant/${slug}/item/${itemId}`,
  instagram: (slug: string, itemId: string, offer?: string) =>
    offer ? `/instagram/${slug}/${itemId}?offer=${encodeURIComponent(offer)}` : `/instagram/${slug}/${itemId}`,
  order: (orderId: string) => `/order/${orderId}`,
  orderSuccess: (orderId: string) => `/order-success?orderId=${orderId}`,
} as const;

export const FIRESTORE_LIMITS = {
  restaurantOrders: 25,
  orderHistory: 20,
  menuItems: 60,
  deliveryAssignments: 20,
  cateringRequests: 25,
} as const;

export const CACHE_TTL = {
  short: 30_000,
  menu: 5 * 60_000,
  restaurant: 10 * 60_000,
  staticList: 30 * 60_000,
} as const;

export const IMAGE_UPLOAD = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.78,
  type: "image/webp",
} as const;
