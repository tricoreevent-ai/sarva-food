# Nammude Existing Features - Complete Reference

**Document Version**: 2026-06-30
**Status**: Production Release
**Platform**: Next.js Full-Stack Commerce Ecosystem

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Customer Module Features](#customer-module-features)
3. [Owner & Operator Module Features](#owner--operator-module-features)
4. [Admin & Management Features](#admin--management-features)
5. [Delivery & Logistics Features](#delivery--logistics-features)
6. [POS & Billing Features](#pos--billing-features)
7. [Menu & Inventory Management](#menu--inventory-management)
8. [Social Commerce & Marketing](#social-commerce--marketing)
9. [Financial & Accounting Features](#financial--accounting-features)
10. [Restaurant Operations](#restaurant-operations)
11. [Multi-Tenant & Multi-Branch](#multi-tenant--multi-branch)
12. [Technology & Infrastructure](#technology--infrastructure)

---

## Application Overview

**Nammude** is a direct restaurant-to-customer food ordering and operations platform. It eliminates intermediaries by connecting customers directly with restaurant owners through an integrated commerce, delivery, and operational management system.

### Core Capabilities
- **Restaurant Discovery**: Search and filter restaurants by cuisine, location, ratings, and delivery options.
- **Food Ordering**: Browse menus, customize dishes, apply offers, and checkout seamlessly.
- **Order Management**: Track orders in real-time from placement through delivery/pickup.
- **Restaurant Operations**: Manage menus, staff, kitchen workflows, inventory, and financial reporting.
- **Multi-Channel Publishing**: Publish menus independently for dine-in, delivery, and parcel (takeaway) channels.
- **Social Commerce**: Create Instagram/WhatsApp-driven campaigns with deep linking and automatic offer application.
- **Compliance**: GST/tax calculations, financial reporting, and audit trails for restaurant operators.

---

## Customer Module Features

The customer module delivers a premium, mobile-first food ordering experience with discovery, ordering, and real-time tracking.

### 1. Restaurant Discovery & Browsing

**Homepage** (`/`)
- Image-led hero with high-visibility restaurant and offer promotions.
- Featured restaurants carousel.
- Trending dishes showcase.
- Cuisine categories grid.
- Offer carousel and deal highlights.
- Dynamic CMS-driven homepage content with fallback branding.
- Mobile-optimized layout with sticky cart access.

**Restaurant Listing & Search** (`/restaurants`)
- Destination-grade search interface with rich hero.
- Location-aware restaurant discovery with saved address picker.
- Recent delivery location shortcuts.
- GPS-based address detection.
- Cuisine and cuisine-region filter chips.
- Search input with real-time suggestion.
- Desktop/mobile adaptive filter drawer.
- Restaurant card display with ratings, hours, delivery status, and cuisine tags.

### 2. Restaurant Detail Page

**Page** (`/restaurant/[slug]`)
- Full-width restaurant hero banner with fallback image handling.
- Restaurant metadata: name, ratings, reviews count, hours of operation.
- Opening/closing hours display with current open/closed status.
- Address card with map link and click-to-call functionality.
- WhatsApp contact option with prefilled message.
- Offer carousel specific to the restaurant.
- Popular/featured items section with reorder support.
- Menu access with sticky "Order Now" CTA.
- About/information section with restaurant description and guidelines.

### 3. Menu Browsing & Item Discovery

**Menu Flow** (`/restaurant/[slug]/menu`)
- Sticky search bar for menu item discovery.
- Horizontal category tab navigation.
- Filter chips for cuisine, veg/non-veg, tags, price range.
- Item list with image, name, price, ratings, tags, and availability status.
- Quick "Add to Cart" action with quantity selector.
- Persistent cart sidebar visible on desktop.
- Mobile cart summary with tap-to-checkout.

**Item Detail Page** (`/restaurant/[slug]/item/[itemId]`)
- Large food imagery with gallery support.
- Item metadata: name, price, ratings, reviews, food type, spice level.
- Calories and nutritional information display.
- Allergen labels and dietary badges.
- Customization options (modifiers and add-ons) with pricing.
- Quantity selector and subtotal calculation.
- Sticky mobile "Order Now" CTA.
- WhatsApp dish promotion link with prefilled message.
- Similar/recommended items section.
- Customer reviews and ratings.

### 4. Offers & Deals

**Offers Page** (`/offers`)
- Dedicated offer browsing experience.
- Active promotional banners with countdown timers.
- Filter by restaurant, coupon code, or deal type.
- Offer details: discount value, validity, category restrictions.
- One-click "Use Offer" CTA that applies code to cart.
- Expired vs. active offer status indicators.

### 5. Checkout & Payments

**Checkout Flow** (`/checkout`)
- Order mode selection: "Order Now" or "Schedule Later" with time/date picker.
- Customer details auto-population for logged-in users.
- Delivery address selection from saved addresses or new address entry.
- GPS-based address detection.
- Order type selection: Delivery, Parcel (takeaway), Dine-in.
- Order summary with item list, quantity, price breakdown.
- Offer code input and application.
- Tax calculation (CGST, SGST, IGST for GST-registered restaurants).
- Service charge and packing charge application.
- Payment method selection:
  - UPI (Razorpay integration)
  - Credit/Debit Card (Razorpay)
  - Cash on Delivery (COD)
- Scheduled order support with 30-minute interval slots.
- Schedule validation against restaurant operating hours.
- Final amount display with all charges and discounts applied.
- One-click checkout for returning customers.
- Terms & Conditions acceptance with full-text policy display.

### 6. Order Tracking & Management

**Order Confirmation** (`/order/[id]`)
- Order summary with order ID and timestamp.
- Order status timeline with current step highlighted.
- Estimated delivery time and distance display.
- Live order status updates: new → preparing → ready → delivered.
- Restaurant contact action (call, WhatsApp).
- Delivery partner tracking (when applicable).
- Estimated arrival time (ETA) countdown.
- Receipt download/print option.
- Reorder quick action.
- Order review and rating option.

**Order Tracking** (`/track-order`)
- Track active orders by order ID.
- Order status visualization with timeline.
- Delivery partner location display (real-time tracking placeholder).
- Estimated time to delivery.
- Restaurant and customer contact options.

**Order History** (`/orders`)
- Chronological list of completed orders.
- Order summary cards with date, restaurant, items, total, and status.
- Reorder one-click action for previous orders.
- Review option with rating and photo upload.
- Invoice download for each order.
- Filter by restaurant, date range, or status.

### 7. Customer Profile & Account

**Profile Management** (`/account/profile`)
- Customer name and display picture with upload.
- Phone number (required for order delivery).
- Email address with verification.
- Language and locale preferences (English, Hindi, Malayalam).
- Theme preference: Light, Dark, System default.

**Saved Addresses** (`/account/profile?tab=addresses`)
- Save multiple delivery addresses with labels (Home, Work, Other).
- Primary address designation.
- Address edit, delete, and management.
- Recent delivery location history.
- GPS-based address detection for quick save.

**Wallet & Loyalty Points** (`/account/profile?tab=payments`)
- Loyalty points balance display.
- Points history ledger (earned, redeemed, expired).
- VIP tier and tier benefits display.
- Birthday coupon and referral rewards tracking.
- One-click reorder for frequent orders.

**Favorites** (`/account/profile?tab=favorites`)
- Saved favorite restaurants.
- Saved favorite menu items.
- Quick reorder from favorites.

**Settings** (`/account/profile?tab=settings`)
- Notification preferences (push, email, SMS).
- Language selection (English, Hindi, Malayalam).
- Theme preference.
- Privacy and data sharing settings.
- Account security and session management.

### 8. Deep Linking & Social Commerce

**Instagram Order Flow**
- Deep-link routes: `/instagram/[restaurantSlug]/[itemId]?offer=PROMO20`
- Automatic offer code parsing and application.
- Pre-populated product detail with offer state displayed.
- "Order Now" sticky CTA for direct checkout.
- Social attribution tracking (placeholders for analytics).

**WhatsApp Integration**
- WhatsApp contact action on restaurant detail page.
- Prefilled order message with restaurant name and contact.
- Dish-level WhatsApp promotion with item details and offer code.
- Order status notifications via WhatsApp (framework ready).

### 9. Authentication & Security

**Customer Login Options**
- Firebase authentication with email/password.
- Google Sign-in integration.
- Phone-based OTP (framework ready).
- Session repair and profile auto-creation on first login.
- Session-based authentication with secure cookies.

**Access Control**
- Customer data scoped by user ID.
- Order history visible only to order owner.
- Profile information protected with role-based access.
- Multi-device session management.

---

## Owner & Operator Module Features

The owner module enables restaurant operators to manage menus, orders, staff, operations, and business settings from a secure portal.

### 1. Owner Login & Access Control

**Owner Portal Login** (`/owner/login`)
- Firebase-backed owner/manager authentication.
- Secure role separation from customer/admin surfaces.
- Session repair for profile/restaurant validation.
- Role-aware redirection to operational dashboards.
- Multi-device session tracking with activity logs.

**Owner Profile & Identity**
- Restaurant name and legal name.
- Owner name and contact information.
- Restaurant logo and branding assets.
- Cuisine type and cuisine regions.
- Restaurant phone and WhatsApp number.
- Email for order notifications.
- Restaurant website URL (optional).

### 2. Order Management

**Orders Dashboard** (`/owner/orders`)
- Live order queue with real-time updates.
- Order status tracking: new → accepted → preparing → ready → picked-up → delivered.
- Order list filtering by status, date range, order type, and customer.
- Order detail view with:
  - Customer name and phone.
  - Delivery address and instructions.
  - Order items with modifiers and special notes.
  - Payment method and amount.
  - Kitchen ticket (KOT) generation button.
  - Order notes for kitchen/delivery.

**Order Actions**
- Accept/reject incoming orders.
- Update order status through lifecycle.
- Add kitchen notes and special instructions.
- Assign delivery partner (integration ready).
- Print kitchen ticket or receipt.
- Mark as completed or cancelled.
- Refund order (partial or full).
- Order history search and filter.

### 3. Enterprise Menu Management

**Menu Landing Page** (`/owner/menu`)
- Menu item list with search and filters.
- Quick filters: category, cuisine, food type, channel, visibility, availability, price range.
- Advanced filter drawer for desktop.
- POS-style dense desktop table layout with stacked mobile rows.
- Bulk actions: publish, unpublish, enable/disable channels, delete.
- Pagination with configurable page size.
- Item image preview on hover.
- Tooltipped icon actions: view, edit, delete, preview, export.

**Add/Edit Menu Item Wizard** (6-Step Flow)
- **Step 1: Basic Information**
  - Item name (required).
  - Item description/summary.
  - Restaurant/item category (required).
  - Primary cuisine type (required).
  - Food type: Veg/Non-Veg/Jain (required).
  - Base price (required).
  - Item images with cover image selection.
  - Image URL fallback for manual entry.

- **Step 2: Description & Details**
  - Full description with rich text support.
  - Preparation time (minutes).
  - Calories and nutrition facts.
  - Allergen labels (peanuts, gluten, dairy, etc.).
  - Dietary badges: Vegan, Gluten-Free, Organic, etc.
  - Spice level: Mild, Medium, Hot.
  - Customer-facing tags: Bestseller, Chef Special, Limited Time.

- **Step 3: Customization**
  - Modifiers (size options, base options, etc.) with pricing.
  - Add-ons (toppings, side items) with optional/required toggle.
  - Modifier groups with single/multiple selection.
  - Dynamic pricing calculations.
  - Visual modifier preview.

- **Step 4: Additional Information**
  - Search tags for menu discovery.
  - Related/recommended items.
  - Substitution rules (optional).
  - Items available/unavailable toggle.
  - Sold-out state management.

- **Step 5: Channel Visibility**
  - Dine-in channel: price, availability, enabled status.
  - Parcel (takeaway) channel: price, availability, enabled status.
  - Delivery channel: price, availability, enabled status.
  - Channel-specific pricing support.
  - Multi-channel publication rules.

- **Step 6: Review & Publish**
  - Live menu preview with customer theme.
  - Publication summary and validation.
  - Final review before saving.
  - Publish/Draft/Archive actions.

**Menu Item Import/Export**
- Excel template generation from active owner menu structure.
- Bulk import with validation error reporting.
- Export existing menu items to Excel.
- Template includes all item fields and master category/cuisine options.

**Category & Cuisine Management**
- Category list with reorder capability (display order).
- Cuisine type selection from master admin list.
- Category scheduling: show/hide by time window (e.g., breakfast 7am-11am).
- Enable/disable categories without deleting items.

### 4. Pricing & Tax Configuration

**Multi-Channel Pricing Engine**
- Set independent prices for dine-in, parcel, and delivery channels.
- Channel availability toggle (hide item from specific channels).
- Channel-specific discounts and surcharges.
- Base price validation and currency formatting.

**Tax & GST Setup**
- GST Registration Number (GSTIN) input and validation.
- Tax treatment: Inclusive vs. Exclusive pricing mode.
- CGST (Central GST) percentage setup.
- SGST (State GST) percentage setup.
- IGST (Integrated GST) percentage setup.
- Service charge configuration: fixed amount or percentage.
- Packing charge setup: fixed or per-order.
- Tax calculation preview on menu items.

**Pricing Rules & Auto-Pricing**
- Base price configuration.
- Auto-pricing rules based on modifiers and add-ons.
- Bulk price update across channels.
- Price history tracking.

### 5. Offers & Promotions

**Offer Management** (`/owner/offers`)
- Create, edit, delete offers and coupons.
- Offer types: flat discount or percentage discount.
- Offer details:
  - Coupon code (e.g., WELCOM50).
  - Discount value (flat amount or percentage).
  - Validity period: start and end date/time.
  - Max redemptions (optional).
  - Min order value threshold.
  - Category restriction (applicable to specific menu categories).
  - Channel restriction: dine-in, parcel, delivery.

**Offer Publishing**
- Public offer banner with description.
- Offer visibility toggle.
- Featured offer promotion (featured offer carousel).
- Archive old or expired offers.
- Live offer editing with dirty-form tracking.

**Coupon Code Support**
- Unique coupon code generation.
- Manual code entry and validation.
- Redemption counter and limit enforcement.
- Customer-facing coupon code display and "Use Offer" button.
- Automatic offer application on checkout.

### 6. Kitchen Operations

**Kitchen Display System** (`/owner/kitchen`)
- Live order ticket display optimized for kitchen staff.
- Large, readable order cards with table number and order ID.
- Order items with modifiers and special notes.
- Prep time timer and elapsed time countdown.
- Order priority badges: rush, normal, scheduled.
- Kanban-style board: received → preparing → ready → completed.
- Touch-sized status action buttons for kitchen staff.
- Fullscreen mode for kitchen display TVs/monitors.
- Audio alert for new orders (sound mute toggle).
- Order filtering by status or table number.
- KOT (Kitchen Order Ticket) print integration.

**Kitchen Ticket (KOT) Workflow**
- Automatic KOT generation when order is accepted.
- KOT preview before printing.
- Thermal printer ESC-POS format support.
- Multiple printer profile support.
- Auto-print option for new orders.

### 7. Table Management & Dine-In Operations

**Table Management** (`/owner/tables`)
- Visual table grid/map display.
- Table status tracking: vacant, occupied, preparing, ready, served, billed.
- Table capacity and seating configuration.
- QR code generation per table.
- Quick table status update.
- Table assignment UI for waiters.

**Waiter Mode & Workflow**
- Waiter-specific order creation interface.
- Quick item selection with category filters.
- Order customization and notes.
- Table number assignment.
- KOT generation and kitchen submission.
- Order status tracking for assigned tables.
- Table billing handoff.

**Table Ordering Flow**
1. Customer scans table QR or waiter creates order.
2. Order mapped to table and stored as table order.
3. Kitchen displays ticket with table number.
4. Kitchen updates status: new → preparing → ready.
5. Waiter marks served and initiates billing.
6. Cashier/POS generates receipt.
7. Table marked as billed and reset to vacant.

### 8. Printer Management

**Printer Settings** (`/owner/printers`)
- Printer profile creation and management.
- Printer connection status and test print.
- Default printer selection for different print jobs.
- Paper size configuration: 58mm, 80mm, A4.

**Printer Job Routing**
- Kitchen ticket printer assignment.
- Billing receipt printer assignment.
- Menu/label printer assignment (optional).
- Multiple printer support per restaurant.

**Print Template Customization**
- Kitchen ticket template with logo, header, footer.
- Receipt template with business info, tax breakdown, items.
- Menu card template with categories, items, prices.
- Preview and test print before production use.

**Browser Print Integration**
- Direct browser-print support as primary method.
- ESC-POS format support for thermal printers.
- PDF generation for A4 documents.
- Native printer bridge ready for future enhancement.

### 9. Digital Signage & Menu Display

**Digital Menu Display** (`/owner/digital-menu`)
- Designed for TVs, monitors, and tablets in restaurants.
- Landscape/portrait layout orientation selector.
- Full-screen mode for kiosk/display deployment.
- Large, readable menu cards with food images.
- Category auto-scroll with configurable duration.
- Promotional banner rotation with timer.
- QR code display for customer self-ordering.
- Font and layout scaling options.
- Theme selection: light, dark, or brand theme.
- Scheduled menu rotation (breakfast, lunch, dinner).

### 10. Social Commerce & Marketing

**Social Post Creator** (`/owner/social-posts`)
- Instagram/WhatsApp campaign creation interface.
- Template selection from pre-designed layouts.
- Content editor:
  - Headline/title input.
  - Food image selection or upload.
  - Caption with rich text editor.
  - Offer code embedding (e.g., INSTA20).
  - Call-to-action (CTA) customization.
  - Location tag assignment.

**Deep Link Generation**
- Automatic click-to-order link creation.
- Instagram-compatible deep link format.
- WhatsApp-compatible link format.
- URL shortening with TinyURL integration.
- QR code generation for physical promotion.

**Post Publishing Workflow**
1. Owner creates post with content, offer, and image.
2. Post submitted with pending status.
3. Admin reviews in moderation queue.
4. Admin approves and publishes to Nammude social accounts.
5. Published posts appear in customer feeds.
6. Customer taps link → item detail auto-opens with offer applied.

**Offer Code Support**
- Coupon code embedding in social posts.
- Automatic offer validation and application.
- Social campaign tracking (framework).

**WhatsApp Marketing**
- WhatsApp contact action templates.
- Prefilled message generation.
- Menu item WhatsApp promotion.
- Direct restaurant contact with preset messages.

### 11. Staff & Access Management

**Employee Management** (`/owner/employees`)
- Staff member creation and profile management.
- Staff roles: Manager, Cashier, Waiter, Chef, Delivery Partner, Kitchen Staff.
- Branch assignment for multi-branch restaurants.
- Staff status: active, inactive, on-leave.
- Phone number and email for staff contact.

**Role-Based Access Control (RBAC)**
- Role permissions configuration:
  - Owner: full access.
  - Manager: limited owner functions.
  - Cashier: billing and transactions only.
  - Waiter: table and order management.
  - Kitchen: kitchen display system only.
  - Delivery: assigned delivery orders only.

**Staff Login & Sessions**
- Staff login with phone/email and password/OTP.
- Role-specific dashboard and feature access.
- Activity logging for staff actions.
- Session tracking and timeout.
- Password and access control management.

**Payroll & Estimations**
- Salary structure configuration per role.
- Payroll estimate calculations (intentionally not statutory).
- Hours tracking and attendance (placeholder).
- Payout tracking and payment method.

### 12. Owner Settings & Profile Management

**Restaurant Profile** (`/owner/settings`)
- Restaurant name and legal business name.
- Restaurant description and cuisine focus.
- Phone number and WhatsApp contact.
- Restaurant website URL.
- Email for order notifications.
- GSTIN and tax registration details.
- FSSAI license number (optional placeholder).
- Cuisine type and cuisine regions (multi-select).

**Business Address**
- Street address with landmark.
- City, state, postal code.
- Google Maps location pinning.
- Delivery radius configuration.
- Timezone for scheduling.

**Operating Hours**
- Hour-by-hour operation schedule.
- Open/closed status by day of week.
- Special hours for holidays (closed days).
- Temporary closure option (emergency closure).
- Prep/cutoff time for scheduled orders.

**Branding & Banners**
- Restaurant logo upload and management.
- Multiple restaurant banners (carousel).
- Cover image for restaurant hero.
- Favicon for browser tab (optional).
- Brand color and theme (future enhancement).
- Customer-facing banner preview.

**Delivery Configuration**
- Delivery radius (km) from restaurant location.
- Delivery charge configuration: fixed or distance-based.
- Min order value for free delivery.
- Dine-in availability toggle.
- Parcel (takeaway) availability toggle.
- Delivery availability toggle.

**Communication Settings**
- Order notification email address.
- Staff emergency contact number.
- Customer support contact method (chat, call, WhatsApp).
- Auto-response templates for common queries.
- Message templates for order status updates.

---

## Admin & Management Features

The admin module provides platform-level management, monitoring, and configuration for the Nammude ecosystem.

### 1. Admin Dashboard & Overview

**Admin Home** (`/admin`)
- System health overview: Firebase status, sync health, active errors.
- KPI cards: pending onboarding, pending approvals, subscription alerts, support requests.
- Active alerts and system diagnostics summary.
- Quick navigation to critical management sections.

### 2. Restaurant & Owner Management

**Restaurants Directory** (`/admin/restaurants`)
- Complete list of all restaurants on the platform.
- Restaurant cards with name, cuisine, city, status.
- Filter and search by name, cuisine, location, status.
- Bulk actions: approve, reject, suspend, reactive.
- Restaurant detail view with:
  - Owner information and contact details.
  - Menu statistics and item count.
  - Order volume and revenue summary.
  - Subscription plan and billing status.
  - Compliance information (GSTIN, license).
  - Address and location verification status.

**Restaurant Onboarding** (`/admin/restaurants` - applications)
- Onboarding applications queue.
- Application approval workflow: pending → approved → live.
- Document verification: GSTIN, FSSAI, address proof.
- Business profile validation.
- Background check placeholders.
- Approval notes and feedback to owners.

**Restaurant Reviews & Approval** (`/admin/reviews`)
- Banner/image approval queue.
- Menu item verification (on-demand).
- Policy compliance review.
- Disapprove with feedback loop.

### 3. User & Admin Management

**Users Management** (`/admin/users`)
- Admin user directory.
- Admin role creation and permission assignment.
- Activity logs for all admin actions.
- Session management and revocation.
- Password and security controls.

### 4. Content Management System (CMS)

**CMS Dashboard** (`/admin/cms`)
- Homepage content configuration:
  - Hero section: title, subtitle, background image.
  - Featured restaurants display.
  - Featured offers configuration.
  - Promotional banners.
  - CMS branding override (app name, colors, etc.).

**Branding Settings**
- App name configuration (Nammude).
- App logo and favicon.
- Primary color and theme settings.
- Footer branding and links visibility.

**Legal & Policy Management**
- Terms & Conditions with rich text editor.
- Privacy Policy with full-text editing.
- Refund & Cancellation Policy.
- Delivery Policy.
- Cookie Policy.
- Markdown-to-HTML rendering.
- Preview before publishing.

**Customer Service Alerts**
- Database outage alert configuration.
- Alert recipient email setup.
- Customer-facing outage message.
- SMTP settings for email delivery.

### 5. Menu & Catalog Management

**Food Categories** (`/admin/categories`)
- Master food category list.
- Category icons and images.
- Display order and sorting.
- Enable/disable categories globally.
- Category metadata and descriptions.

**Cuisine Types** (`/admin/cuisines`)
- Master cuisine type list.
- Cuisine icons and images with Cloudinary URLs.
- Cuisine display order.
- Associated food types and ingredients.
- Cuisine metadata and descriptions.
- Support for regional cuisines: Punjabi, Hyderabadi, Bengali, etc.

**Featured Menu Items** (`/admin/featured-menu-items`)
- Configure featured/promoted menu items on customer homepage.
- Feature order and priority.
- Feature enable/disable toggle.
- Featured item carousel management.

### 6. Subscription & Billing Management

**Plans & Pricing** (`/admin/plans`)
- Subscription plan creation and management.
- Plan features and tier configuration.
- Pricing per month/year.
- Trial period configuration.
- Promotional pricing rules.

**Subscriptions** (`/admin/subscriptions`)
- Active subscriptions list.
- Subscription status: active, suspended, expired, cancelled.
- Billing cycle and renewal dates.
- Payment method on file.
- Invoice generation and download.
- Subscription upgrade/downgrade handling.
- Cancellation and refund processing.

**Invoicing & Payments**
- Invoice generation for subscriptions.
- Payment tracking and reconciliation.
- Failed payment alerts and retry.
- Refund and credit management.

### 7. Campaign & Promotion Management

**Campaigns** (`/admin/campaigns`)
- Create and manage platform-wide promotions.
- Campaign schedule: start/end dates.
- Campaign type: seasonal, flash sale, referral, etc.
- Campaign budget allocation.
- Banner and promotional content.
- Restaurant eligibility and targeting.

**Social Queue & Moderation** (`/admin/social-queue`)
- Approve/reject owner social media posts.
- Brand guideline compliance review.
- Post scheduling and publishing.
- Meta/Instagram integration placeholders.
- Published post analytics.

### 8. Analytics & Reporting

**Analytics Dashboard** (`/admin/analytics`)
- Platform KPIs: total orders, revenue, active restaurants.
- Daily, weekly, monthly trends.
- Order volume by restaurant and cuisine.
- Payment method breakdown.
- Customer acquisition and retention metrics.
- AOV (Average Order Value) analysis.
- Custom date range reporting.
- Export to CSV/PDF.

### 9. Diagnostics & System Health

**Firebase Diagnostics** (`/admin/system/firebase-diagnostics`)
- Firestore collection overview.
- Document count per collection.
- Firestore indexes status.
- Query performance analysis.
- Index recommendation engine.
- Storage usage and quota.
- Firebase pricing estimation.

**System Diagnostics** (`/admin/system/diagnostics`)
- Application health check.
- API endpoint status.
- Database connectivity.
- External service status (payment gateways, email, etc.).
- Performance metrics and uptime.

### 10. Leads & Support Management

**Restaurant Leads** (`/admin/leads`)
- Inquiry management for new restaurant partnerships.
- Lead status tracking: new, contacted, qualified, rejected.
- Lead details: business info, contact, location.
- Follow-up scheduling and reminders.
- Lead scoring and prioritization.

**Support Queue** (`/admin/support`)
- Customer support tickets.
- Ticket status: open, in-progress, waiting, resolved.
- Priority levels and categorization.
- Assignment to support team.
- Chat/note interface for ticket communication.
- Ticket history and resolution tracking.

---

## Delivery & Logistics Features

Delivery management system for restaurant order fulfillment and delivery partner operations.

### 1. Delivery Workflow

**Delivery Dashboard** (`/delivery`)
- Live delivery order queue.
- Order acceptance/rejection interface.
- Assigned delivery list with status.
- Delivery route optimization placeholders.

**Delivery Orders** (`/delivery/orders`)
- Assigned orders for delivery partner.
- Accept/reject order action.
- Pickup confirmation at restaurant.
- On-the-way status update.
- Delivery confirmation with location.
- Failed delivery handling.

**Delivery History** (`/delivery/history`)
- Completed deliveries list.
- Delivery performance metrics.
- Customer feedback and ratings.
- Earnings summary and payouts.

**Delivery Reports** (`/delivery/reports`)
- Daily delivery summary.
- Completion rate and on-time performance.
- Earnings and incentive tracking.
- Customer satisfaction scores.

### 2. Delivery Tracking & Communication

**Live Location Tracking**
- Real-time delivery partner location display (framework ready).
- Distance and ETA calculation.
- Route map display on customer app.
- Delivery partner contact action (call, chat).

**Communication**
- In-app messaging with restaurant and customer.
- Order status notifications via app/SMS/WhatsApp.
- Delivery arrival notification.
- Proof of delivery: photo/OTP option.

---

## POS & Billing Features

The Point-of-Sale (POS) system for in-store order entry, billing, and kitchen integration.

### 1. POS Billing Screen

**POS Main Screen** (`/owner/pos`)
- Wizard-oriented workflow: order setup → item selection → preview/billing.

**Order Setup & Details**
- Order type selection: dine-in, parcel, delivery (for catering).
- Table number assignment for dine-in.
- Waiter name assignment.
- Customer name and phone (optional).
- Delivery address (for delivery orders).
- Special kitchen instructions.

**Item Selection**
- Category-based menu grid with search.
- Touch-friendly item cards with images.
- Quick item add with quantity selector.
- Modifier/add-on selection inline or in detail view.
- Search bar for quick item lookup.
- Item image preview.
- Sold-out/unavailable items grayed out.

**Live Bill Calculation**
- Running total with item count.
- Item-level price breakdown.
- Real-time modifier and customization pricing.
- Automatic tax calculation (CGST, SGST, IGST).
- Service charge application.
- Packing charge (if applicable).
- Discount application and coupon code entry.
- Final billable amount.

**Payment Processing**
- Payment method selection: cash, card, UPI, mixed.
- UPI payment integration (Razorpay).
- Card payment (Razorpay).
- Split payment support (cash + card, multiple UPI).
- Tender amount entry for cash.
- Change calculation and display.
- Payment receipt generation.

**KOT (Kitchen Order Ticket)**
- Automatic KOT generation on bill save.
- KOT preview before submission.
- KOT print to thermal printer.
- Printer selection and routing.
- Test print capability.

**Additional POS Actions**
- Hold order and resume later.
- Save draft order for quick recall.
- Void/cancel item before submission.
- Apply bulk discounts (10%, 15%, etc.).
- Manual price override (manager only).
- Refund processing for returned items.

### 2. Table Management in POS

**Table Billing Grid** (`/pos/tables`)
- Visual table layout with occupancy status.
- Table status: vacant, occupied, serving, billed.
- Quick table selection for order entry.
- Table status update and workflow.
- Waiter assignment display.
- Active bill amount display per table.

### 3. Invoice & Receipt Management

**Invoice Preview** (`/pos/invoice`)
- Final bill summary with order details.
- Itemized list with quantities and prices.
- Tax breakdown (CGST, SGST, IGST).
- Service charge and packing charge display.
- Total due and payment method.
- Order ID and timestamp.
- Restaurant name, address, GSTIN.
- QR code placeholder for digital receipt.

**Receipt Printing**
- Thermal printer (58mm, 80mm) support.
- ESC-POS format compatibility.
- A4 paper support for invoices.
- Receipt template customization.
- Logo and branding on receipt.
- Auto-print on order completion.
- Manual reprint of any receipt.

---

## Menu & Inventory Management

### 1. Inventory System

**Inventory Dashboard** (`/owner/inventory`)
- Current stock levels by item and unit.
- Low-stock alerts with threshold configuration.
- Inventory item master list.
- Stock valuation and cost tracking.

**Stock Management**
- Stock inward: purchase order receipts, adjustments.
- Stock outward: sales deduction, wastage, transfer.
- Stock transfer between branches.
- Inventory variance and reconciliation.

**Supplier Management**
- Supplier directory with contact details.
- Supplier category and payment terms.
- Purchase order creation from low-stock alerts.
- Supplier payment tracking.
- Supplier performance metrics.

**Recipe & Bill of Materials (BOM)**
- Recipe creation with ingredient lists.
- Auto-deduction from inventory on order (placeholder).
- Food cost calculation per dish.
- Wastage tracking and variance analysis.

---

## Social Commerce & Marketing

### 1. Instagram Marketing

**Post Creation & Publishing**
- Template-based post creation.
- Food image selection from menu or upload.
- Headline, caption, and hashtag input.
- Offer code embedding.
- Click-to-order deep link generation.
- Campaign scheduling.
- Admin approval workflow.

**Deep Linking**
- Automatic deep-link generation to food item.
- Instagram-compatible URL format.
- WhatsApp-compatible sharing.
- TinyURL shortening with fallback.
- QR code for physical promotion.

**Post Analytics** (placeholders)
- Click-through rate (CTR) tracking.
- Conversion rate from social to order.
- Campaign attribution and ROI.

### 2. WhatsApp Marketing

**WhatsApp Contact**
- Click-to-WhatsApp action on restaurant detail.
- Prefilled order message template.
- Restaurant contact information sharing.
- Order status notification via WhatsApp (framework).

**WhatsApp Order Flow**
- Dish-level WhatsApp CTA.
- Prefilled product details and offer.
- Direct checkout from WhatsApp message.

### 3. Meta Integration** (Admin)

**Meta Connection** (`/admin/meta`)
- Instagram account connection and management.
- Facebook account connection.
- Graph API authentication.
- OAuth token management and refresh.
- Account page selection for publishing.
- Posting history and analytics.

---

## Financial & Accounting Features

### 1. Accounting Dashboard

**Chart of Accounts**
- Income accounts: sales, delivery revenue, service charges.
- Expense accounts: COGS, labor, rent, utilities, marketing.
- Asset accounts: cash, bank, inventory.
- Liability accounts: payables, GST liability.
- Equity accounts.

### 2. Transaction Management

**Transaction Recording**
- Every transaction records: date, time, user, branch, payment method.
- Tax data: GST amount, tax classification.
- Source tracking: order ID, invoice number.
- Transaction type: sales, expense, refund, adjustment.

**Sales Journal**
- Daily sales summary by order type and channel.
- Payment method breakdown.
- Tax collected summary.
- Discount and refund summary.

**Expense Tracking**
- Expense category classification.
- Supplier/vendor tracking.
- Receipt/bill attachment.
- Expense approval workflow.

### 3. Financial Reporting

**Reports Available**
- Daily Sales Summary: revenue, order count, avg AOV.
- Sales Journal: itemized daily transactions.
- GST/Tax Liability Report: CGST, SGST, IGST collected and payable.
- Expense Report: by category and department.
- Gross Profit: revenue minus COGS.
- Food Cost Percentage: COGS ÷ revenue.
- P&L Statement: revenue minus all expenses.
- Cash Flow Report: cash receipts and disbursements.
- Balance Sheet: assets, liabilities, equity snapshot.

**Report Export Options**
- Browser print to PDF.
- CSV/Excel download.
- Custom date ranges.
- Filterable by restaurant, branch, payment method.

### 4. Tax Compliance

**GST Calculation**
- CGST, SGST, IGST application per item.
- Automatic tax recalculation on discounts.
- Tax-inclusive vs. tax-exclusive mode support.
- HSN code support for GST filing.

**Tax Reporting**
- GST summary by monthly periods.
- Tax collected vs. tax paid.
- Tax liability tracking.
- Export for GST return filing.

**Audit Trail**
- Every transaction logged with user, timestamp, action.
- Modification history for corrections.
- User accountability and activity tracking.
- Compliance audit trail for regulatory review.

---

## Restaurant Operations

### 1. Restaurant Onboarding

**Onboarding Checklist**
- Profile completion: name, cuisine, address.
- Business verification: GSTIN, FSSAI license.
- Media assets: logo, banners, photos.
- Menu setup: categories, items, pricing.
- Operating hours and delivery configuration.
- Staff setup and RBAC configuration.
- Payment and subscription activation.

**Onboarding Gates**
- Dashboard access restricted until profile is complete.
- Redirect to onboarding page until requirements met.
- Progressive onboarding with guided steps.

### 2. Restaurant Hours & Availability

**Operating Hours Configuration**
- Hour-by-hour schedule by day of week.
- Open/close times with timezone support.
- Special hours for holidays.
- Temporary closure option.

**Order Availability**
- Real-time open/closed status.
- Current open/close window display to customers.
- Schedule validation for future/scheduled orders.
- Prep time and order cutoff time configuration.

### 3. Unified Order Dashboard

**Order Queue View**
- All orders in one consolidated view: dine-in, delivery, parcel.
- Order status at a glance: new, preparing, ready, delivered.
- Filter by order type, status, time range.
- Quick statistics: pending count, in-progress count.

**Order Aggregation** (Framework)
- Swiggy, Zomato, UberEats, DoorDash integration placeholders.
- External orders tagged with source.
- Unified order flow through same KDS, printer, reports.

### 4. QR Code Ordering

**Table QR Generation**
- Dynamic QR code per table.
- QR contains deep link to restaurant + table ID.
- Customer scans → self-orders through mobile app.
- Order linked to table for KDS workflow.

**QR Order Workflow**
- Customer scans table QR.
- Mobile app opens restaurant menu with table context.
- Customer selects items and places order.
- Kitchen receives ticket with table number.
- Waiter notified when order ready.

### 5. Multi-Branch Operations

**Branch Management**
- Branch creation and configuration per restaurant.
- Branch-specific staff and inventory.
- Branch-specific operating hours.
- Branch-specific printer and table setup.
- Master branch fallback (operational safety).

**Centralized Dashboards**
- Owner dashboard aggregates all branches.
- KPI summaries by branch.
- Branch-level drill-down reports.

---

## Multi-Tenant & Multi-Branch

### 1. Multi-Tenancy Model

**Tenant Isolation**
- Each restaurant = unique tenant context.
- Data scoped by `tenantId` (restaurant ID).
- Staff access restricted to assigned restaurant(s).
- Firestore security rules enforce tenant boundaries.

**Restaurant Identity**
- Restaurant profile: legal name, location, cuisine.
- Restaurant slug for URL routing (e.g., `/restaurant/cafe-al-arab-thanisandra`).
- Restaurant aliases support (e.g., multiple IDs consolidate to one).
- Restaurant logo and branding assets.

### 2. Multi-Branch Strategy

**Branch Structure**
- Multi-branch restaurants share one profile but operate independently.
- Branch-scoped staff, inventory, printers, tables.
- Centralized owner dashboard with branch aggregation.
- Branch-specific order, menu, and accounting records.

**Branch Fallback Logic**
- Safe fallback to main branch when branch document unavailable.
- POS and kitchen can operate without branch assignment.
- Graceful degradation when branch data missing.

### 3. Role-Based Access

**Role Hierarchy**
- Owner: full restaurant access.
- Manager: limited owner functions.
- Cashier: billing only.
- Waiter: table and order management.
- Kitchen Staff: kitchen display system only.
- Delivery Partner: assigned delivery orders only.

**Scoped Access Enforcement**
- Database-level Firestore rules.
- API-level session validation.
- Feature-level UI permission checks.

---

## Technology & Infrastructure

### 1. Frontend Architecture

**Framework & Stack**
- Next.js 16 (App Router) for full-stack application.
- React 18+ for UI components.
- TypeScript for type safety.
- TailwindCSS for styling with theme system.
- Zustand for state management (persisted stores).

**Module Architecture**
- Customer module: `/src/modules/customer/`.
- Owner module: `/src/modules/owner/`.
- Admin module: `/src/modules/admin/`.
- Shared authentication and configuration.

**Component Organization**
- UI primitives: buttons, inputs, cards, tables, dialogs.
- Domain widgets: restaurant cards, order cards, menu items.
- Feature flows: composite workflows for major user journeys.
- Layouts: headers, sidebars, shells for each user surface.

**PWA & Mobile**
- Progressive Web App with service worker.
- Offline-first architecture with Firestore caching.
- Mobile-optimized responsive design.
- Deep linking support for social commerce.
- App install prompts and shortcuts.

### 2. Backend & APIs

**API Structure**
- RESTful endpoints under `/api/`.
- Public APIs under `/api/public/`.
- Owner APIs under `/api/owner/`.
- Customer APIs under `/api/customer/`.
- Admin APIs under `/api/admin/`.

**API Examples**
- GET `/api/public/restaurants` - public restaurant listing.
- GET `/api/public/menu?restaurantId=x` - public menu.
- GET `/api/owner/orders` - owner's orders.
- GET `/api/owner/menu` - owner's menu.
- POST `/api/customer/orders` - create customer order.
- POST `/api/customer/cart` - sync customer cart.

### 3. Firebase Integration

**Firestore Database**
- Collections: restaurants, menus, menuItems, orders, customers, offers, staff.
- Denormalized data for performance.
- Realtime listeners for order updates, inventory, kitchen.
- Server-side Firebase Admin SDK for backend writes.

**Firestore Security Rules**
- Tenant-based access control.
- Role-based read/write permissions.
- Public data separation from owner/internal data.

**Firebase Authentication**
- Email/password login.
- Google Sign-in.
- Phone OTP (placeholder).
- Session-based cookie authentication.

**Firebase Storage**
- Cloudinary integration for image management (primary).
- Firebase Storage fallback (diagnostics use only).

### 4. Data & Caching

**Cache Layers**
- Browser memory cache for public data.
- Service Worker cache for offline support.
- Redis/in-memory cache server-side (optional).
- Invalidation on data mutations.

**Public Data Cache**
- Menu, restaurant, offer caching.
- No-store headers prevent CDN caching of dynamic content.
- Cache invalidation on owner menu updates.

### 5. Payment Integration

**Razorpay Integration**
- UPI payment support.
- Card payment support (credit/debit).
- Cash on Delivery (COD) option.
- Payment verification webhook.
- Refund processing.
- Subscription billing.

### 6. Email & Notifications

**Email Service**
- SMTP-based order confirmations and notifications.
- Owner receipt of new orders.
- Customer order status updates.
- Marketing emails and newsletters.
- Compliance: Terms, Privacy, Refund policies.

**Push Notifications**
- In-app notifications for order updates.
- Browser push notifications (service worker).
- SMS notifications (framework placeholder).
- WhatsApp notifications (framework placeholder).

### 7. Image Management

**Cloudinary Integration**
- Image upload and signing server-side (`/api/cloudinary/signature`).
- Automatic image transformation and optimization.
- Responsive image sizing (mobile, tablet, desktop).
- Menu item, offer, profile, banner image handling.
- CDN delivery and caching.

### 8. Localization & Internationalization

**Language Support**
- English (default).
- Hindi.
- Malayalam.
- Framework ready for Tamil, Kannada, Arabic.

**RTL Support**
- Arabic and other RTL language placeholders.
- Layout direction toggle in settings.

**Regional Cuisine Support**
- Punjabi, Hyderabadi, Bengali, Gujarati, Rajasthani.
- Maharashtrian, Goan, Awadhi, Kashmiri, North East Indian.
- Cuisine icons and images per region.

### 9. Theme & Appearance

**Theme System**
- Light and Dark modes.
- System theme detection.
- Independent theme for customer, owner, admin surfaces.
- Theme persistence in local storage.
- CSS variable-based token system.

**Brand Customization**
- App name configuration (Nammude).
- Logo and favicon management.
- Primary color and palette.
- Theme override by restaurant (admin CMS).

### 10. Performance & Optimization

**Frontend Performance**
- Code splitting by route.
- Image lazy loading and optimization.
- Font subsetting and preloading.
- Service Worker caching strategy.
- Bundle size analysis and optimization.

**Backend Performance**
- Firestore indexes for query optimization.
- Paginated API responses.
- Caching of public data.
- Request deduplication.

**Monitoring**
- Error tracking and reporting.
- Performance metrics collection.
- User analytics (framework).
- Audit logging.

### 11. Security & Compliance

**Data Protection**
- HTTPS-only communication.
- Secure cookie handling with httpOnly, Secure, SameSite flags.
- Password hashing and salting.
- Rate limiting on authentication endpoints.

**Access Control**
- Session-based authentication.
- Role-based access control (RBAC).
- Multi-factor authentication (framework).
- Audit logs of all sensitive actions.

**Compliance**
- GST compliance: tax calculation and reporting.
- Data privacy: GDPR-ready user data policies.
- Terms & Conditions and Privacy Policy.
- Refund and cancellation policies.
- Food safety compliance placeholders (FSSAI).

### 12. Deployment & Hosting

**Deployment Target**
- Hostinger for production hosting (primary).
- Vercel deployment configuration as backup.
- Next.js static and dynamic rendering.

**Environment Management**
- `.env.local` for local development.
- `.env.production` for production settings.
- Firebase project configuration per environment.

**CI/CD & Quality Assurance**
- TypeScript type checking.
- ESLint for code quality.
- Production build verification.
- Automated deployment workflow.

**Monitoring & Maintenance**
- Uptime monitoring and alerts.
- Error tracking and logging.
- Performance monitoring.
- Database backup and recovery.

---

## Summary of Feature Coverage

Nammude provides an end-to-end restaurant commerce and operations platform with:

- **Customer Experience**: discovery, ordering, tracking, profile, loyalty
- **Owner Operations**: menu, pricing, orders, kitchen, staff, inventory, reporting
- **Admin Control**: restaurants, CMS, campaigns, compliance, analytics
- **Delivery Management**: order routing, tracking, partner operations
- **Financial Management**: transactions, tax compliance, accounting, reporting
- **Social Commerce**: Instagram/WhatsApp deep linking, campaign management
- **Multi-Tenant**: secure restaurant isolation and multi-branch support
- **Technology**: modern stack with PWA, offline support, real-time updates

All features are production-ready with comprehensive documentation, security measures, and compliance frameworks.

---

**Last Updated**: 2026-06-30
**Maintained By**: Nammude Development Team
**Next Review**: Quarterly feature audit
