# Owner Module Help

## Overview
The Owner Module enables restaurant operators to manage menus, orders, social commerce, and restaurant settings from a secure owner portal.

## Total Screens: 6

### 1. Owner Login (`/owner/login`)
- Main feature: secure owner/auth role separation.
- Includes: Firebase-backed owner login, session repair, and role-aware redirection.
- Benefit: ensures only authorized restaurant owners and staff can access owner workflows.

### 2. Order Management (`/owner/orders`)
- Main feature: live order queue and lifecycle control.
- Includes: order status stages (`new`, `accepted`, `preparing`, `ready`, `picked-up`, `delivered`), kitchen ticket view, and completed order history.
- Benefit: gives operators real-time control over restaurant order flow.

### 3. Menu Management (`/owner/menu`)
- Main feature: enterprise menu engine with multi-channel pricing.
- Includes: add/edit menu item wizard, multi-channel pricing for dine-in/parcel/delivery, availability toggles, modifiers/add-ons, category and cuisine assignment, images, tags, and customer visibility.
- Benefit: enables high-quality menu creation and channel-specific pricing control.

### 4. Social Posts / Marketing (`/owner/social-posts`)
- Main feature: Instagram/WhatsApp social commerce creator.
- Includes: template selection, headline/caption editing, offer code embedding, click-to-order deep-link generation, and share/copy actions.
- Benefit: helps owners promote menu items with social media-friendly links and offers.

### 5. Kitchen Tickets and Table Management (`/owner/kitchen`, `/owner/tables`)
- Main feature: operational in-store support.
- Includes: digital Kitchen Order Tickets (KOT), table status management (`vacant`, `occupied`, `served`, `billed`), waiter assignment, and billing handoff.
- Benefit: aligns front-of-house and kitchen operations.

### 6. Owner Settings & Profile
- Main feature: restaurant identity and configuration.
- Includes: restaurant profile, branding, banners, GST/tax settings, contact details, and hours.
- Benefit: maintains the customer-facing restaurant profile and operational settings in one place.

## Core Feature Highlights
- Scoped owner access tied to restaurantIds.
- Multi-channel menu publishing for delivery, parcel, and dine-in.
- Deep-link social commerce with promo code support.
- Live order lifecycle visibility and kitchen ticket generation.
- Category schedules and GST tax configuration for compliant menu publishing.

## Key Feature Explanations
- Multi-Channel Pricing: set separate prices per commerce channel so your menu fits delivery, dine-in, and parcel costs.
- Modifiers & Add-ons: build customer choices like extra cheese, spice level, and quantity options using structured owner controls.
- Schedule Categories: automate menu display by time window so breakfast, lunch, and dinner sections appear at the right hours.
- Offer Code Support: embed codes into social posts so customers receive discounts automatically from Instagram links.

---
*This file is ideal for owner training and feature handoff, showing the main owner screens plus the operational feature details inside each screen.*
