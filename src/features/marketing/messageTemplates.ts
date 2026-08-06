import { APP_NAME } from "@/lib/constants";

export type WhatsAppTemplateKind = "todays-special" | "weekend-offer" | "lunch-combo" | "dinner-special" | "chef-recommendation" | "festival-offer" | "new-arrival" | "best-seller" | "limited-time" | "buy-one-get-one";

export type MarketingTone = "professional" | "friendly" | "premium" | "luxury" | "short" | "emoji-rich" | "family" | "urgent" | "festival" | "healthy";

export type MarketingSettings = {
  defaultTemplate: WhatsAppTemplateKind;
  defaultCtaText: string;
  tinyUrlEnabled: boolean;
  promotionalFooter: string;
};

export type RestaurantMarketingSettings = {
  whatsappFooter: string;
  defaultCtaText: string;
};

export const defaultMarketingSettings: MarketingSettings = {
  defaultTemplate: "todays-special",
  defaultCtaText: "Buy Now",
  tinyUrlEnabled: true,
  promotionalFooter: `❤️ Order directly from ${APP_NAME}`,
};

export const defaultRestaurantMarketingSettings: RestaurantMarketingSettings = {
  whatsappFooter: "",
  defaultCtaText: "Order Now",
};

export const WHATSAPP_MESSAGE_TEMPLATES: Record<WhatsAppTemplateKind, string> = {
  "todays-special": `👋 Hello {{customer_name}},

🔥 *Today's Special from {{restaurant_name}}*

🍽️ *{{item_name}}*

{{short_description}}

💰 Starting at *₹{{price}}*

⭐ Freshly prepared
⭐ Best seller
⭐ Limited stock available

🛒 *{{cta_text}}*

{{short_url}}

📍 {{restaurant_name}}

✨ Order now or schedule for later.`,
  "weekend-offer": `🎉 *Weekend Offer from {{restaurant_name}}*

🍽️ *{{item_name}}*

{{description}}

💰 ₹{{price}}

👉 {{cta_text}}

{{short_url}}`,
  "lunch-combo": `🥗 *Lunch Combo*

🍽️ *{{item_name}}* · {{restaurant_name}}

{{short_description}}

💰 ₹{{price}}

👉 {{cta_text}}: {{short_url}}`,
  "dinner-special": `🌙 *Dinner Special from {{restaurant_name}}*

🍽️ *{{item_name}}*

{{description}}

💰 ₹{{price}}

👉 {{cta_text}}: {{short_url}}`,
  "chef-recommendation": `👨‍🍳 *Chef's Recommendation*

🍽️ *{{item_name}}*

{{short_description}}

💰 ₹{{price}}

📍 {{restaurant_name}}
👉 {{cta_text}}: {{short_url}}`,
  "festival-offer": `🎊 *Festival Offer from {{restaurant_name}}*

🍽️ {{item_name}}

💰 ₹{{price}}

✨ Celebrate with great food.

🛒 {{cta_text}}: {{short_url}}`,
  "new-arrival": `✨ *New Arrival at {{restaurant_name}}*

🍽️ *{{item_name}}*

{{short_description}}

💰 ₹{{price}}

👉 {{cta_text}}: {{short_url}}`,
  "best-seller": `🏆 *Best Seller from {{restaurant_name}}*

🍽️ *{{item_name}}*

{{short_description}}

💰 ₹{{price}}

👉 {{cta_text}}: {{short_url}}`,
  "limited-time": `⏳ *Limited Time Only*

🍽️ *{{item_name}}* from {{restaurant_name}}

{{description}}

💰 ₹{{price}}

👉 {{cta_text}}: {{short_url}}`,
  "buy-one-get-one": `🎁 *Buy One Get One*

🍽️ *{{item_name}}* · {{restaurant_name}}

💰 ₹{{price}}

👉 {{cta_text}}

{{short_url}}`,
};

export const whatsappTemplateOptions: Array<{ value: WhatsAppTemplateKind; label: string }> = [
  { value: "todays-special", label: "Today's Special" },
  { value: "weekend-offer", label: "Weekend Offer" },
  { value: "lunch-combo", label: "Lunch Combo" },
  { value: "dinner-special", label: "Dinner Special" },
  { value: "chef-recommendation", label: "Chef Recommendation" },
  { value: "festival-offer", label: "Festival Offer" },
  { value: "new-arrival", label: "New Arrival" },
  { value: "best-seller", label: "Best Seller" },
  { value: "limited-time", label: "Limited Time" },
  { value: "buy-one-get-one", label: "Buy One Get One" },
];

export const marketingToneOptions: Array<{ value: MarketingTone; label: string }> = ["professional", "friendly", "premium", "luxury", "short", "emoji-rich", "family", "urgent", "festival", "healthy"].map((value) => ({ value: value as MarketingTone, label: value.replace(/(^|-)(\w)/g, (_, _dash, letter: string) => `${_dash ? " " : ""}${letter.toUpperCase()}`) }));
