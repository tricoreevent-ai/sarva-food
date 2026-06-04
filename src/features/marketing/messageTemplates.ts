export type WhatsAppTemplateKind = "todays-special" | "promotional" | "festival";

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
  promotionalFooter: "❤️ Order directly from Sarva Food",
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
  promotional: `🔥 CRAVING SOMETHING DELICIOUS?

🍽️ *{{item_name}}*

From *{{restaurant_name}}*

{{description}}

💰 Only ₹{{price}}

🎉 Freshly prepared
🎉 Fast delivery
🎉 Limited availability

👉 {{cta_text}}

{{short_url}}`,
  festival: `🎊 Special Offer from {{restaurant_name}}

🍽️ {{item_name}}

💰 ₹{{price}}

✨ Celebrate with great food.

🛒 {{cta_text}}:

{{short_url}}`,
};

export const whatsappTemplateOptions: Array<{ value: WhatsAppTemplateKind; label: string }> = [
  { value: "todays-special", label: "Today's Special" },
  { value: "promotional", label: "Promotional" },
  { value: "festival", label: "Festival" },
];
