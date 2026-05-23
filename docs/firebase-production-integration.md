# Firebase Production Integration

Date: 2026-05-16

## Firebase Setup

The app uses environment-driven Firebase configuration. Keep these values in `.env.local` and deployment secrets, not in components:

```bash
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAVCIt08pd6ikqbzZ4f5rTxBfDJ-Gdj88Q"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="sarva-food-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="sarva-food-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="sarva-food-app.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="488410799126"
NEXT_PUBLIC_FIREBASE_APP_ID="1:488410799126:web:04386fab3760927f066937"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-6F0Y771N1X"
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="..."
```

For server session verification and production seeding, configure one of:

- Application Default Credentials on Firebase Hosting/Functions.
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`.

## Initialization Architecture

- Client Firebase singleton: `src/firebase/client.ts`.
- Admin Firebase singleton: `src/firebase/admin.ts`.
- Analytics is browser-guarded with `isSupported()`.
- Auth persistence is configured once with `browserLocalPersistence`.
- Emulator connections are guarded by `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true`.
- Existing mock/local store fallback remains active when Firebase is disabled or no authenticated Firebase user exists.

## Firestore Collections

Production seed/init covers:

`users`, `roles`, `restaurants`, `branches`, `tables`, `orders`, `orderItems`, `kitchenOrders`, `menuCategories`, `menuItems`, `deliveryMenus`, `dineInMenus`, `customers`, `loyaltyCustomers`, `accountingEntries`, `expenses`, `inventory`, `inventoryTransactions`, `purchaseOrders`, `suppliers`, `reports`, `printerProfiles`, `receiptTemplates`, `offers`, `coupons`, `settings`, `notifications`, `staffActivityLogs`, `paymentTransactions`, `deliveryAgents`, `customerAddresses`.

## Seeded Data

The production baseline seeds Tamarind Table with:

- Indiranagar branch and delivery radius.
- Tables `T01` through `T08`.
- Indian menu items with GST, parcel charges, modifiers, add-ons, and recipe links.
- Test staff users and role documents.
- Demo customer and customer address.
- Loyalty customer data.
- POS order, order item, KOT queue item, and payment transaction.
- Inventory items, suppliers, purchase order, and inventory transactions.
- Accounting income/expense entries.
- Printer profile and receipt template.
- Offer, coupon, notification, report, and staff activity log.

Seed options:

- Browser/admin action: Admin -> Settings -> Map Configuration -> Initialize Firestore.
- Diagnostics action: Admin -> System -> Firebase Diagnostics -> Seed Firestore.
- CLI with Admin credentials: `npm run firebase:seed:production`.

## Authentication Flow

Enable these providers in Firebase Console:

- Email/password.
- Google.
- Phone auth can remain as a configured placeholder until SMS templates and billing are finalized.

Development test users:

- `owner@sarva.test`
- `manager@sarva.test`
- `cashier@sarva.test`
- `chef@sarva.test`
- `waiter@sarva.test`

Password: `password123`.

The CLI seed script creates Firebase Auth users and maps roles to Firestore `users/{uid}` documents. The UI test login remains dev-only through `NEXT_PUBLIC_ENABLE_TEST_LOGIN=true` and is disabled in production.

## Security Rules

Rules are in:

- `firestore.rules`
- `storage.rules`

Coverage includes:

- Branch-aware restaurant access through `branchIds`.
- Owner/admin/manager protection for employee and role writes.
- Accounting access limited to owner, manager, accountant, and admin.
- Inventory access limited to owner, manager, inventory manager, and admin.
- Customer isolation for customer-owned profiles, coupons, and addresses.
- Secure printer/profile/settings writes.
- Staff activity logs are append-friendly and admin-deletable only.

Deploy:

```bash
npm run firebase:deploy:rules
```

## Indexes

Composite indexes are in `firestore.indexes.json`.

Covered query families:

- Report date ranges.
- Orders by restaurant, branch, status, and date.
- KDS queue by restaurant, branch, status, and date.
- Customer phone lookup.
- Loyalty ranking and recency.
- Accounting reports.
- Expense reports.
- Inventory reports.
- Payment reports.
- Notifications.

Deploy indexes:

```bash
npx firebase-tools deploy --only firestore:indexes
```

## Realtime Architecture

Existing realtime services remain in place:

- KDS: `listenKitchenOrders`.
- Orders: `listenToOrder`, `listenToRestaurantOrders`.
- Customers: `safeListenCustomers`.
- Menu/inventory: advanced menu service listeners.
- Printing: print log and profile services.

Additional production helpers are in `src/services/production-data-service.ts`:

- Accounting entry persistence and date-range listener.
- Inventory save and inventory transaction writes.
- Recipe deduction transaction events.
- Loyalty customer listener.
- Notification listener.
- Customer profile/address upsert.
- Staff activity logging.
- Table status update.

## Diagnostics Workflow

Admin diagnostics page:

`/admin/system/firebase-diagnostics`

Shows:

- Firebase flag and config status.
- Auth initialization and signed-in state.
- Firestore reachability.
- Storage SDK status.
- Required collection health.
- Indexed query probes for KDS, accounting, and customer phone lookup.

Admin dashboards also show a startup Firebase status banner.

## Troubleshooting

- Protected admin/owner/POS routes redirect to `/auth/login` when Firebase mode is enabled and no role cookie is present.
- If login succeeds but protected routes still redirect, verify `/api/auth/session` can use Firebase Admin credentials and `users/{uid}` exists.
- If diagnostics shows empty collections, run the seed action or `npm run firebase:seed:production`.
- If diagnostics shows index failures, deploy `firestore.indexes.json`.
- If KDS remains in local fallback, confirm authenticated user role, `restaurantIds`, `branchIds`, and Firestore rules deployment.
- If accounting or inventory writes silently stay local, sign in with owner/manager/accountant/inventory-manager and rerun diagnostics.
