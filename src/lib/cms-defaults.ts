import type { CmsSettings } from "@/lib/types";
import { APP_DEFAULT_TITLE, APP_DESCRIPTION, APP_NAME, APP_SEO_KEYWORDS } from "@/lib/constants";
import { CMS_VERSION } from "@/modules/shared/config/environment/cms.config";

export const RESPONSIBILITY_DISCLAIMER =
  `Restaurants and food partners are solely responsible for food quality, hygiene, preparation, allergens, packaging, and safety. ${APP_NAME} acts only as a technology platform connecting customers and restaurants.`;

const LEGAL_TERMS = `
<p><strong>Last Updated:</strong> June 9, 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing, browsing, registering on, or using the ${APP_NAME} platform, website, mobile application, or any related services ("Platform"), you acknowledge that you have read, understood, and agreed to be bound by these Terms &amp; Conditions.</p>
<p>If you do not agree with these Terms, you must discontinue use of the Platform immediately.</p>
<h2>2. Nature of Service</h2>
<p>${APP_NAME} is solely a technology platform that facilitates communication and order placement between customers and independent restaurants, food vendors, cloud kitchens, and food service establishments ("Restaurant Partners").</p>
<p>${APP_NAME} does not own, operate, manage, control, supervise, or inspect any restaurant; does not manufacture, prepare, cook, package, store, transport, or deliver food; does not employ restaurant staff, kitchen personnel, delivery personnel, or food handlers; does not guarantee food quality, taste, quantity, freshness, nutritional value, safety, or suitability; and does not act as an agent, partner, franchisee, representative, employee, or legal representative of any restaurant.</p>
<p>Each Restaurant Partner operates independently and is solely responsible for its business activities.</p>
<h2>3. Restaurant Responsibility</h2>
<p>The Restaurant Partner is exclusively responsible for food preparation and cooking, ingredient sourcing, food quality and freshness, hygiene and sanitation standards, compliance with FSSAI regulations and applicable food safety laws, packaging and labelling, allergen disclosures, nutritional information, menu descriptions, pricing and taxes, delivery fulfilment where applicable, and customer support relating to food and orders.</p>
<p>Any complaint regarding food quality, contamination, adulteration, food poisoning, allergens, dietary restrictions, incorrect ingredients, packaging defects, shortages, delays, or restaurant conduct must be directed to the respective Restaurant Partner.</p>
<p>Restaurant contact information is available on the restaurant page within the Platform.</p>
<h2>4. Customer Responsibility</h2>
<p>Customers are responsible for reviewing menu descriptions before ordering, verifying ingredients and allergen information directly with the restaurant, providing accurate delivery and contact information, ensuring availability at the delivery location, and raising concerns directly with the restaurant whenever required.</p>
<p>Customers with food allergies, medical conditions, dietary restrictions, pregnancy-related concerns, or specific nutritional requirements should contact the restaurant directly before placing an order.</p>
<h2>5. Payments</h2>
<h3>5.1 Direct Payments</h3>
<p>${APP_NAME} does not collect, hold, receive, process, settle, or retain customer payments for food orders. Payments made through the Platform are processed directly between the customer and the respective Restaurant Partner and/or authorized third-party payment providers.</p>
<h3>5.2 No Storage of Financial Information</h3>
<p>${APP_NAME} does not store credit card information, debit card information, UPI PINs, bank account details, net banking credentials, or payment authentication credentials. Payment information is handled by authorized third-party payment providers in accordance with their own privacy policies and regulatory obligations.</p>
<h3>5.3 Payment Issues</h3>
<p>${APP_NAME} shall not be liable for failed transactions, duplicate payments, payment gateway outages, banking errors, UPI failures, chargeback disputes, settlement delays, network interruptions, or unauthorized transactions caused by customer negligence. Customers must contact the relevant payment provider, bank, or restaurant directly for payment-related issues.</p>
<h2>6. Refunds, Cancellations and Disputes</h2>
<p>Refund requests are subject to verification by the restaurant, payment confirmation, order validation, and investigation of the reported issue. Refunds are not automatic, and ${APP_NAME} does not guarantee approval of refunds.</p>
<p>The final decision regarding food-related refund claims may rest with the Restaurant Partner, subject to applicable law. Any dispute relating to food quality, quantity, preparation, pricing, delivery, or restaurant service shall primarily be resolved between the customer and the Restaurant Partner.</p>
<h2>7. No Warranty</h2>
<p>The Platform is provided on an "AS IS" and "AS AVAILABLE" basis. ${APP_NAME} makes no representation or warranty regarding food quality, restaurant performance, availability of menu items, delivery timelines, accuracy of restaurant information, continuous platform availability, error-free operation, or suitability for any specific purpose.</p>
<p>All warranties, whether express or implied, are disclaimed to the fullest extent permitted under applicable law.</p>
<h2>8. Limitation of Liability</h2>
<p>To the maximum extent permitted by Indian law, ${APP_NAME}, its owners, directors, employees, consultants, contractors, affiliates, licensors, technology providers, and software developers shall not be liable for food poisoning, allergic reactions, illness, injury, death, contamination, restaurant negligence, misrepresentation by restaurants, delivery failures, late deliveries, incorrect orders, missing items, restaurant closure, service interruptions, data transmission failures, cyber incidents, third-party payment failures, loss of profits, loss of goodwill, indirect damages, consequential damages, special damages, or punitive damages.</p>
<p>Any liability that cannot legally be excluded shall be limited to the extent permitted under applicable law.</p>
<h2>9. Indemnity</h2>
<p>You agree to indemnify and hold harmless ${APP_NAME}, its owners, directors, employees, contractors, affiliates, technology partners, and software developers from and against any claims, losses, liabilities, damages, penalties, costs, or expenses arising from your misuse of the Platform, violation of these Terms, violation of applicable laws, disputes between customers and restaurants, incorrect information provided by you, or fraudulent or unauthorized activities.</p>
<h2>10. Third-Party Services</h2>
<p>The Platform may rely on third-party services including payment gateways, banking networks, SMS providers, WhatsApp integrations, cloud hosting providers, internet service providers, mapping services, and notification services. ${APP_NAME} is not responsible for the availability, performance, security, or actions of such third-party services.</p>
<h2>11. Force Majeure</h2>
<p>${APP_NAME} shall not be liable for any delay, interruption, failure, or inability to provide services caused by events beyond reasonable control, including natural disasters, floods, fire, earthquakes, pandemic events, government actions, internet outages, cyber attacks, power failures, labour strikes, civil unrest, or transportation disruptions.</p>
<h2>12. Intellectual Property</h2>
<p>All Platform content, software, trademarks, branding, designs, source code, graphics, logos, and related materials belong to ${APP_NAME} or its licensors and are protected by applicable intellectual property laws.</p>
<p>Users shall not copy, reproduce, reverse engineer, modify, distribute, or exploit any part of the Platform without written permission.</p>
<h2>13. Suspension and Termination</h2>
<p>${APP_NAME} reserves the right to suspend, restrict, or terminate access to the Platform at any time without prior notice if a user violates these Terms, fraudulent activity is suspected, security concerns arise, or legal compliance requires such action.</p>
<h2>14. Privacy</h2>
<p>${APP_NAME} processes personal information in accordance with its Privacy Policy. Users are encouraged to review the Privacy Policy before using the Platform.</p>
<h2>15. Governing Law and Jurisdiction</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, Karnataka, India.</p>
<h2>16. Developer Protection Clause</h2>
<p>The software developers, technology consultants, hosting providers, contractors, and service providers involved in the creation, maintenance, or operation of the Platform act solely as technology service providers.</p>
<p>Under no circumstances shall such developers or technology providers be liable for restaurant operations, food quality issues, payment disputes, delivery disputes, customer claims, business losses suffered by restaurants or customers, or regulatory actions arising from restaurant conduct.</p>
<p>Any claim relating to food services, restaurant operations, payments, deliveries, or transactions shall be directed solely against the relevant Restaurant Partner or responsible party.</p>
<h2>17. Contact Information</h2>
<p>For platform-related technical support, contact <a href="mailto:support@nammude.com">support@nammude.com</a>.</p>
<p>For food, delivery, pricing, quality, hygiene, refund, ingredient, allergen, or restaurant-related concerns, customers must contact the respective Restaurant Partner directly using the contact information available on the restaurant page.</p>
`;

export const defaultCmsSettings: CmsSettings = {
  appName: APP_NAME,
  branding: {
    appName: APP_NAME,
    shortName: "Nammude",
    logoUrl: "/icons/sarva-icon.svg",
    faviconUrl: "/icons/sarva-icon.svg",
    appDescription: APP_DESCRIPTION,
    supportEmail: "support@nammude.com",
    supportPhone: "",
    onboardingEmail: "partners@nammude.com",
    onboardingWhatsapp: "",
  },
  disclaimer: RESPONSIBILITY_DISCLAIMER,
  homepage: {
    title: "Connect Directly with Restaurants",
    subtitle: "Skip the middlemen and order directly from local restaurants. Browse real-time menus, access exclusive restaurant offers, schedule deliveries, and communicate directly with restaurant owners for a faster, more transparent food ordering experience.",
    visible: true,
    ctaText: "Find Food",
    ctaLink: "/restaurants",
    backgroundImage: "",
    overlayOpacity: 0.1,
    animationStyle: "float",
  },
  banners: [
    {
      id: "homepage-arabic-grills",
      title: "Arabic flavours, made with love",
      subtitle: "Shawarma, mandi, grills, and family platters from restaurants near you.",
      imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Explore Arabic",
      ctaHref: "/restaurants?query=arabic",
      visible: true,
      sortOrder: 1,
    },
    {
      id: "homepage-biryani-meals",
      title: "Biryani and meals for every mood",
      subtitle: "Find dum biryani, Kerala meals, Andhra meals, and lunch combos.",
      imageUrl: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "Order now",
      ctaHref: "/restaurants?query=biryani",
      visible: true,
      sortOrder: 2,
    },
  ],
  footer: {
    visible: true,
    note: "",
    supportEmail: "support@sarvafood.com",
    copyright: `© ${APP_NAME} 2026. All rights reserved.`,
    trustText: "100% Secure & Trusted Platform",
    socialLinks: [
      { id: "facebook", platform: "facebook", label: "Facebook", url: "#", enabled: true },
      { id: "instagram", platform: "instagram", label: "Instagram", url: "#", enabled: true },
      { id: "twitter", platform: "twitter", label: "X", url: "#", enabled: true },
      { id: "linkedin", platform: "linkedin", label: "LinkedIn", url: "#", enabled: true },
      { id: "youtube", platform: "youtube", label: "YouTube", url: "#", enabled: false },
    ],
    sections: [
      {
        id: "company",
        title: "Company",
        enabled: true,
        links: [
          { id: "about", label: "About Us", href: "/about", enabled: true },
          { id: "careers", label: "Careers", href: "/careers", enabled: true },
          { id: "contact", label: "Contact Us", href: "/help", enabled: true },
          { id: "press", label: "Press", href: "/press", enabled: true },
          { id: "blog", label: "Blog", href: "/blog", enabled: true },
        ],
      },
      {
        id: "customers",
        title: "Customers",
        enabled: true,
        links: [
          { id: "help", label: "Help Center", href: "/help", enabled: true },
          { id: "track", label: "Track Order", href: "/track-order", enabled: true },
          { id: "refund", label: "Refund Policy", href: "/refund-policy", enabled: true },
          { id: "safety", label: "Safety", href: "/terms", enabled: true },
          { id: "faqs", label: "FAQs", href: "/help#faqs", enabled: true },
        ],
      },
      {
        id: "owners",
        title: "Restaurant Owners",
        enabled: true,
        links: [
          { id: "register", label: "Register Restaurant", href: "/register-restaurant", enabled: true },
          { id: "owner-login", label: "Owner Login", href: "/owner/login", enabled: true },
          { id: "pos", label: "POS Features", href: "/owner/login", enabled: true },
          { id: "delivery", label: "Delivery Tools", href: "/partner-with-us", enabled: true },
          { id: "marketing", label: "Marketing Tools", href: "/partner-with-us", enabled: true },
        ],
      },
      {
        id: "legal",
        title: "Legal",
        enabled: true,
        links: [
          { id: "terms", label: "Terms & Conditions", href: "/terms", enabled: true },
          { id: "privacy", label: "Privacy Policy", href: "/privacy", enabled: true },
          { id: "refund", label: "Refund Policy", href: "/refund-policy", enabled: true },
          { id: "cancellation", label: "Cancellation Policy", href: "/cancellation-policy", enabled: true },
          { id: "cookie", label: "Cookie Policy", href: "/cookie-policy", enabled: true },
        ],
      },
    ],
    partnerCard: {
      visible: true,
      title: "Partner With Us",
      description: `Grow your restaurant business with ${APP_NAME}.`,
      primaryLabel: "Register Restaurant",
      primaryHref: "/register-restaurant",
      secondaryLabel: "Request Callback",
      secondaryHref: "/partner-with-us",
    },
  },
  announcementBar: {
    visible: false,
    message: "",
    backgroundColor: "#fff7ed",
    icon: "bell",
    redirectUrl: "/offers",
  },
  sections: {
    categoriesVisible: true,
    offersVisible: true,
    featuredRestaurantsVisible: true,
    popularItemsVisible: true,
    recommendedTitle: "Recommended for you",
    popularTitle: "What's popular",
    offerTitle: "Today's special",
  },
  restaurantListing: {
    eyebrow: "Restaurants delivering near you",
    titleTemplate: "{count} {mode}",
    nearbyTitle: "Restaurants delivering near you",
    areaTitle: "Restaurants around this area",
    searchPlaceholder: "Search restaurants, cuisines, offers, or dishes",
  },
  featuredRestaurants: {
    sortLogic: "rating",
    pinnedRestaurantSlugs: [],
  },
  operations: {
    databaseAlertsEnabled: true,
    databaseAlertEmail: "",
    customerUnavailableTitle: "Restaurants are temporarily unavailable",
    customerUnavailableMessage: "Please try again in a moment. Our team is already checking the issue.",
  },
  loyalty: {
    earnPoints: 10,
    earnAmount: 100,
    redemptionPointsPerRupee: 10,
    tiers: [
      { name: "Bronze", minPoints: 0, benefits: ["Basic rewards", "Birthday offers"] },
      { name: "Silver", minPoints: 500, benefits: ["Extra reward multiplier", "Priority support", "Faster reward unlocks"] },
      { name: "Gold", minPoints: 1500, benefits: ["Premium coupons", "Free delivery benefits", "Exclusive restaurant offers", "Early access deals"] },
    ],
  },
  seo: {
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    keywords: APP_SEO_KEYWORDS,
  },
  cmsVersion: CMS_VERSION,
  announcements: [
    {
      id: "homepage-location-ready",
      title: "Thanisandra delivery is live",
      subtitle: "Cafe Al Arab UL and Falak are ready for online orders.",
      imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
      ctaLabel: "See restaurants",
      ctaHref: "/restaurants?query=thanisandra",
      visible: true,
      sortOrder: 1,
    },
  ],
  sponsoredAds: [],
  legalPages: {
    terms: LEGAL_TERMS,
    privacy: RESPONSIBILITY_DISCLAIMER,
    refund: "Refunds are reviewed after payment confirmation, restaurant validation, and issue verification. Refunds are not automatic and may be declined when order fulfilment evidence is available.",
    cancellation: "Cancellation eligibility depends on restaurant acceptance, preparation status, and dispatch status. Orders already prepared or dispatched may not be cancellable.",
    delivery: "Delivery availability, fees, distance limits, and ETA are set by each restaurant and may change based on location, weather, traffic, and operational load.",
    cookie: "Nammude uses cookies and local storage for sign-in, cart persistence, preferences, analytics, and secure application operation.",
  },
};
