# Firebase Troubleshooting

## Required Environment

Set these values in `.env.local` for live Firebase:

- `NEXT_PUBLIC_USE_FIREBASE=true`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

For local emulator work:

- `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true`
- Run `npm run firebase:emulators`

## Firestore Enablement

In Firebase Console, enable:

- Authentication
- Cloud Firestore in native mode
- Storage

Owner/POS/KDS users must have a document in `users/{uid}` with:

- `active: true`
- `role: "owner"`, `"manager"`, `"cashier"`, `"waiter"`, `"chef"`, `"accountant"`, `"inventory-manager"`, or `"admin"`
- `restaurantIds: ["cafe-al-arab-thanisandra"]` or the production restaurant ID
- `branchIds: ["br-cafe-al-arab-thanisandra"]` for branch-scoped users

## Collections Used

The production operations path writes and listens to:

- `users`, `roles`, `restaurants`, `branches`, `tables`
- `orders`, `orderItems`, `kitchenOrders`
- `menuCategories`, `menuItems`, `deliveryMenus`, `dineInMenus`, `menus`
- `customers`, `customerAddresses`, `loyaltyCustomers`
- `accountingEntries`, `expenses`, `reports`, `paymentTransactions`
- `inventory`, `inventoryTransactions`, `purchaseOrders`, `suppliers`
- `printerProfiles`, `billTemplates`, `kotTemplates`, `receiptTemplates`, `receipts`, `printLogs`, `kotPrintQueue`
- `offers`, `coupons`, `settings`, `notifications`, `staffActivityLogs`, `deliveryAgents`, `deliveries`

Firestore creates collections automatically on first successful write.

## Rules And Indexes

Deploy rules and indexes after changes:

```bash
npm run firebase:deploy:rules
npx firebase-tools deploy --only firestore:indexes
```

Required composite indexes are in `firestore.indexes.json`, including:

- `orders`: `restaurantId`, `status`, `createdAt`
- `kitchenOrders`: `restaurantId`, `branchId`, `status`, `createdAt`
- `customers`: `restaurantId`, `normalizedPhone`
- `customers`: `restaurantId`, `lifetimeValue`
- `loyaltyCustomers`: `restaurantId`, `loyaltyPoints`
- `accountingEntries`: `restaurantId`, `branchId`, `type`, `createdAt`
- `inventory`: `restaurantId`, `branchId`, `itemName`

## Diagnostics

Open Admin -> Firebase Diagnostics or `/admin/system/firebase-diagnostics` to verify:

- Auth initialization
- Firestore reachability
- Storage SDK initialization
- Collection health
- Indexed query probes

## Common Permission Failures

- `Missing or insufficient permissions`: the signed-in user is missing `users/{uid}` or `restaurantIds`.
- KDS shows local queue only: Firebase is disabled, unauthenticated, or rules denied `kitchenOrders`.
- POS payment does not create receipts: user is unauthenticated or lacks owner/cashier access.
- Customer search returns empty: phone must normalize to the last 10 digits and customer docs must have `normalizedPhone`.

## Emulator Checks

1. Set `NEXT_PUBLIC_USE_FIREBASE=true`.
2. Set `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true`.
3. Start emulators with `npm run firebase:emulators`.
4. Sign in as an owner/cashier user.
5. Create or seed `users/{uid}` with the proper restaurant access.
6. Send a KOT from `/pos` and verify it appears in `kitchenOrders`.
