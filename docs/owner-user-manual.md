# Owner Module User Manual

Welcome to the Sarva Food App Owner Module. This guide explains how to manage your restaurant's digital presence, operations, and growth tools.

## 1. Access Control
As an **Owner**, your access is securely scoped to your specific `restaurantIds`. You have full read/write permissions for your restaurant's documents, including menus, orders, and social posts.

## 2. Enterprise Menu Engine
The Menu Management flow allows you to maintain a high-quality digital catalog.

### Managing Menu Items
- **Multi-Channel Pricing**: Set different prices for **Dine-in**, **Parcel**, and **Delivery** to account for varied operational costs.
- **Availability Toggles**: Use the "Sold Out" or "Restock" buttons to update item availability in real-time for customers.
- **Advanced Details**: Add spice levels, food types (Veg/Non-Veg/Jain), allergens, and tags (e.g., "Bestseller").
- **Modifiers & Add-ons**: Create custom options (e.g., "Extra Cheese: ₹40") using a simple `Name:Price` format.

### Categories and Cuisines
- Group items into categories (e.g., "Breakfast", "Chef Specials").
- Set **Schedules** for categories to show/hide them automatically at specific times (e.g., Breakfast menu from 07:00 to 11:00).

### Tax & GST Setup
- Configure Indian GST settings, including CGST, SGST, and Service Charges.
- Choose between **Inclusive** or **Exclusive** pricing modes.

## 3. Order Management
Track your revenue and operations through the Order Flow.

### Order Lifecycle
Monitor orders as they progress through these states:
1. **New**: Pending acceptance.
2. **Accepted**: Confirmed by the kitchen.
3. **Preparing**: Currently being cooked.
4. **Ready**: Prepared and waiting for pickup/service.
5. **Picked-up**: Handed over to the delivery partner or customer.
6. **Delivered**: Successfully completed.

### Kitchen Tickets (KOT)
For in-store operations, the system generates digital Kitchen Order Tickets. You can print these directly or view them in the kitchen queue.

## 4. In-Store Table Management
Manage your physical dining space efficiently:
- **Table Status**: Track which tables are `Vacant`, `Occupied`, `Served`, or `Billed`.
- **Waiter Mode**: Assign waiters to specific tables to track service performance.
- **Billing**: Generate and print invoices once a meal is complete.

## 5. Social Commerce & Marketing
Grow your brand using the Instagram Post Creator.

### Creating Posts
- **Templates**: Choose from pre-designed social media templates.
- **Deep Linking**: The system automatically generates "Click-to-Order" links for your posts, allowing customers to jump directly to a specific item from an Instagram story.
- **Offer Codes**: Embed promo codes (e.g., `INSTA20`) into your posts.
- **Admin Review**: Once created, posts are submitted for review to ensure they meet brand guidelines before going live.

## 6. Operational Best Practices

### Image Optimization
The platform automatically compresses images before they are uploaded to Firebase Storage. For the best result, use high-resolution food photos; the system will handle the resizing for menu and social formats.

### Cost Efficiency
- **Caching**: The menu uses a local cache to reduce database reads. If you make changes, they may take 5–10 minutes to reflect globally unless manually refreshed.
- **Analytics**: Use the built-in analytics tab to view bestselling items and profitability without needing to export raw transaction data.

## 7. Troubleshooting
- **Google Maps**: If location searching is unavailable, ensure your restaurant address is manually pinned in the profile settings.
- **Real-time Updates**: If order statuses aren't updating, ensure you have a stable internet connection for the Firestore listeners.

---
*For advanced platform repairs or role assignments, contact the Sarva System Admin.*