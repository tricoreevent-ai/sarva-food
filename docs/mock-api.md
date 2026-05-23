# Mock API

File:

- `lib/mock-api.ts`

The fake API layer gives frontend flows realistic delays and response shapes without building a backend.

## Pattern

Each service method:

- Waits with a simulated delay.
- Accepts an input object shaped like a future API request.
- Returns a typed response object.
- Leaves persistence to `useAppStore` or `useCartStore`.

## Services

### Restaurants

- `mockApi.restaurants.search(restaurants, query)`

Simulates restaurant discovery search.

### Offers

- `mockApi.offers.validate(code, subtotal)`

Simulates offer-code validation and discount calculation.

### Orders

- `mockApi.orders.create(input)`
- `mockApi.orders.updateStatus(order, status, note)`

Simulates checkout and owner order status transitions.

### Menu

- `mockApi.menu.create(item)`
- `mockApi.menu.update(item)`

Simulates owner menu CRUD.

### Delivery

- `mockApi.delivery.verifyOtp(delivery, otp)`
- `mockApi.delivery.updateStatus(delivery, status)`

Simulates pickup OTP and delivery completion.

### Studio

- `mockApi.studio.generatePreview(input)`
- `mockApi.studio.exportPreview(postId)`

Simulates social post generation/export.

### POS

- `mockApi.pos.takePayment(bill)`

Simulates payment capture.

### Catering

- `mockApi.catering.createQuote(input)`

Simulates quotation pricing.

### Deep Links

- `mockApi.deepLinks.resolveInstagramLink(input)`

Simulates campaign link resolution before opening a food item page.

## Seed Data

Centralized JSON data lives in:

- `lib/mock-data.json`

Typed exports and selectors live in:

- `lib/mock-data.ts`

Future Firebase integration should replace service method bodies while keeping component contracts stable.
