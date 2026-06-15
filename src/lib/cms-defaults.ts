import type { CmsSettings } from "@/lib/types";
import { BRAND_ASSETS } from "@/lib/brand-assets";
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

const PRIVACY_POLICY = `
<p><strong>Last Updated:</strong> June 9, 2026</p>
<h2>1. Introduction</h2>
<p>${APP_NAME} respects user privacy and is committed to protecting personal information shared through the platform.</p>
<p>${APP_NAME} is a technology platform that connects customers with independent Restaurant Partners. Restaurants remain responsible for their own food preparation, pricing, delivery, payment handling, and customer support.</p>
<h2>2. Information We Collect</h2>
<p>We may collect account information such as name, phone number, email address, login details, delivery addresses, saved preferences, order history, restaurant interactions, support requests, device information, browser information, IP address, location selected by the user, and platform usage data.</p>
<p>Restaurant Partners may provide business information, owner contact details, menu information, operating hours, tax identifiers, delivery settings, bank or payment configuration references, and support contact details.</p>
<h2>3. Information We Do Not Collect</h2>
<p>${APP_NAME} does not store debit card numbers, credit card numbers, CVV, UPI PINs, internet banking passwords, bank login credentials, payment authentication credentials, or other sensitive payment credentials. Payment information is handled by the relevant restaurant or payment service provider.</p>
<h2>4. How We Use Information</h2>
<p>Information is used to create and manage accounts, show restaurant menus, place and track orders, save delivery details, enable restaurant communication, provide support, prevent fraud, secure the platform, improve services, send important updates, and comply with legal obligations.</p>
<h2>5. Sharing of Information</h2>
<p>Customer order and contact details may be shared with the selected Restaurant Partner so the restaurant can process, prepare, communicate about, and fulfil the order. We may also share information with hosting, analytics, communication, mapping, authentication, cloud storage, email, SMS, WhatsApp, and other service providers that help operate the platform.</p>
<p>We may disclose information when required by law, regulation, court order, government authority, or to protect platform security, user safety, legal rights, and fraud prevention.</p>
<h2>6. Cookies and Local Storage</h2>
<p>The platform may use cookies, local storage, and similar technologies for sign-in sessions, cart persistence, preferences, analytics, security, and reliable application operation.</p>
<h2>7. Data Security</h2>
<p>We use reasonable technical and organizational safeguards to protect user information. No internet-based service can guarantee absolute security, and users should protect their login credentials and device access.</p>
<h2>8. Data Retention</h2>
<p>We retain information for as long as needed to provide services, maintain business records, resolve disputes, prevent abuse, meet legal requirements, and support restaurants and customers.</p>
<h2>9. Third-Party Services</h2>
<p>The platform may link to or integrate with third-party services such as payment gateways, Google services, Firebase, Mapbox, Cloudinary, email providers, SMS providers, WhatsApp services, and hosting providers. Their privacy practices are governed by their own policies.</p>
<h2>10. Children's Privacy</h2>
<p>The platform is not intended for children below the age required by applicable law to use online food ordering services without parental or guardian consent.</p>
<h2>11. User Rights</h2>
<p>Users may request access, correction, deletion, or restriction of personal information where applicable by contacting platform support. Some information may be retained where required for legal, security, fraud-prevention, tax, dispute, or operational reasons.</p>
<h2>12. Marketing Communications</h2>
<p>Users may receive service messages, transactional updates, and, where enabled, promotional communications. Users may opt out of non-essential marketing communications when supported by the relevant channel.</p>
<h2>13. Indian Law</h2>
<p>This Privacy Policy is intended to align with applicable Indian privacy, information technology, and consumer-protection requirements. Additional rights may apply depending on future law, regulation, or jurisdiction.</p>
<h2>14. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. Updated versions will be posted on the platform with a revised date.</p>
<h2>15. Contact</h2>
<p>For privacy questions or platform-related data requests, contact <a href="mailto:privacy@nammude.com">privacy@nammude.com</a> or <a href="mailto:support@nammude.com">support@nammude.com</a>.</p>
`;

const REFUND_CANCELLATION_POLICY = `
<p><strong>Last Updated:</strong> June 9, 2026</p>
<h2>1. Overview</h2>
<p>${APP_NAME} is a technology platform that enables customers to discover restaurants and place orders directly with independent Restaurant Partners.</p>
<p>${APP_NAME} does not prepare food, operate restaurants, collect customer payments, hold funds, or manage restaurant bank accounts. All payments are made directly to the respective Restaurant Partner through payment methods enabled by the restaurant.</p>
<p>As a result, refunds are generally subject to the restaurant's review and approval process.</p>
<h2>2. Cancellation Before Order Confirmation</h2>
<p>Orders may be cancelled before acceptance or confirmation by the Restaurant Partner. Once an order has been accepted, prepared, processed, or dispatched, cancellation may not be possible. Cancellation eligibility is determined by the Restaurant Partner.</p>
<h2>3. Non-Cancellable Orders</h2>
<p>Orders may not be eligible for cancellation if food preparation has commenced, the order has been packed or dispatched, customized food items have been prepared, or perishable items have been processed. Restaurants may refuse cancellation in such cases.</p>
<h2>4. Refund Eligibility</h2>
<p>Refund requests may be considered when an accepted order is not delivered, an incorrect item is delivered, food items are missing, a duplicate payment is charged, the restaurant is unable to fulfil the order, the restaurant cancels the order, or payment is debited but an order is not generated due to technical failure.</p>
<p>Refund approval remains subject to verification.</p>
<h2>5. Situations Where Refunds May Not Be Available</h2>
<p>Refunds may not be granted for personal taste preferences, change of mind after confirmation, delays caused by weather, traffic, public events, restrictions, incorrect delivery details, customer unavailability, minor food appearance variations, or restaurant-specific preparation styles.</p>
<h2>6. Food Quality Complaints</h2>
<p>Food quality concerns, including taste, freshness, ingredients, allergens, packaging, and hygiene, must first be raised directly with the Restaurant Partner. Restaurant contact information is displayed on the restaurant page.</p>
<p>${APP_NAME} may assist in communication but cannot independently verify food preparation or quality claims.</p>
<h2>7. Refund Process</h2>
<p>To request a refund, customers should contact the Restaurant Partner directly, provide order details, provide photographs or supporting evidence where applicable, and allow reasonable time for investigation. The Restaurant Partner may request additional information before making a decision.</p>
<h2>8. Refund Timelines</h2>
<p>If approved by the Restaurant Partner or payment provider, UPI refunds may take 1 to 7 business days, bank account refunds may take 3 to 10 business days, and card refunds may take 5 to 15 business days. Actual timelines depend upon banks and payment service providers.</p>
<h2>9. Payment Gateway and Banking Delays</h2>
<p>${APP_NAME} is not responsible for delays caused by banks, UPI systems, payment gateways, network failures, settlement systems, or third-party payment providers. Customers should contact their bank or payment provider for transaction status updates.</p>
<h2>10. Chargebacks</h2>
<p>If a customer initiates a chargeback through a bank or payment provider, the dispute shall be handled according to the policies of the relevant financial institution. ${APP_NAME} does not control chargeback decisions.</p>
<h2>11. Limitation of Liability</h2>
<p>${APP_NAME} does not guarantee refunds and is not liable for refund decisions made by Restaurant Partners. As a technology intermediary, ${APP_NAME}'s role is limited to facilitating order placement and communication.</p>
<p>All refund obligations, where applicable, remain the responsibility of the Restaurant Partner and relevant payment service providers.</p>
<h2>12. Contact Information</h2>
<p>For technical issues related to the platform, contact <a href="mailto:support@nammude.com">support@nammude.com</a>.</p>
<p>For food quality, pricing, preparation, delivery, refund, cancellation, ingredient, allergen, or restaurant service issues, customers must contact the respective Restaurant Partner directly using the contact details available on the restaurant page.</p>
`;

export const defaultCmsSettings: CmsSettings = {
  appName: APP_NAME,
  branding: {
    appName: APP_NAME,
    shortName: "Nammude",
    logoUrl: BRAND_ASSETS.logos.english.lightTheme,
    faviconUrl: BRAND_ASSETS.favicon32,
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
          { id: "press", label: "Press", href: "/press", enabled: false },
          { id: "blog", label: "Blog", href: "/blog", enabled: false },
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
          { id: "safety", label: "Safety", href: "/terms", enabled: false },
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
          { id: "delivery", label: "Delivery Tools", href: "/partner-with-us", enabled: false },
          { id: "marketing", label: "Marketing Tools", href: "/partner-with-us", enabled: false },
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
          { id: "cancellation", label: "Cancellation Policy", href: "/cancellation-policy", enabled: false },
          { id: "cookie", label: "Cookie Policy", href: "/cookie-policy", enabled: false },
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
    customerUnavailableTitle: "No restaurants available in this area",
    customerUnavailableMessage: "Choose another location or check back later. Restaurants will appear here as soon as they are ready to accept orders.",
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
    privacy: PRIVACY_POLICY,
    refund: REFUND_CANCELLATION_POLICY,
    cancellation: REFUND_CANCELLATION_POLICY,
    delivery: "Delivery availability, fees, distance limits, and ETA are set by each restaurant and may change based on location, weather, traffic, and operational load.",
    cookie: "Nammude uses cookies and local storage for sign-in, cart persistence, preferences, analytics, and secure application operation.",
  },
};
