# Future Roadmap

## Multi-City Scaling

Prepare with:

- `location` and future `cityId` fields on restaurants.
- City-filtered restaurant queries.
- Region-aware Storage paths.
- Per-city aggregate analytics.

Do not:

- Read every restaurant globally for customer discovery.
- Put city-specific configuration in UI constants.

## Franchise Restaurants

Prepare with:

- Franchise parent ID on restaurant profiles.
- Role permissions scoped by franchise and restaurant.
- Shared menu templates with per-branch overrides.
- Aggregated reporting by franchise, city, and branch.

Future collections:

- `franchises`
- `franchiseUsers`
- `menuTemplates`

## Multi-Language Support

Prepare with:

- Locale segment or user preference.
- Translation keys for UI text.
- Localized menu item fields when production restaurants need them.

Suggested menu shape:

```ts
name: string;
description: string;
translations?: Record<string, { name: string; description: string }>;
```

## AI Recommendations

Prepared hook:

- `src/services/recommendation-service.ts`

Future inputs:

- Menu popularity.
- Time of day.
- Cart contents.
- Dietary preference.
- Restaurant availability.

Keep recommendation output cacheable and explainable. Do not add AI calls to every menu view.

## WhatsApp Automation

Current:

- Message drafting and backend hooks are placeholders.

Future:

- Queue outbound WhatsApp messages.
- Store provider IDs.
- Retry failed sends.
- Rate-limit status updates.
- Keep customer consent and opt-out state.

## Payments

Current:

- Razorpay, Stripe, and UPI abstraction is prepared.

Future:

- Create payment intents in Cloud Functions.
- Confirm payment webhooks server-side.
- Store only provider references and safe metadata.
- Keep COD and UPI fallback for low-friction local ordering.

## Analytics Engine

Prepare with:

- Compact event writes or queued Cloud Function events.
- Daily aggregate documents per restaurant.
- Campaign attribution by link ID.
- BigQuery export when volume justifies it.

Avoid:

- Reading raw orders for dashboards.
- Writing analytics events for every hover, scroll, or minor UI state.

## Operational Milestones

1. Replace mock order creation with Firestore writes behind a feature flag.
2. Enable Firebase Auth role onboarding.
3. Seed restaurants, menus, offers, and social templates.
4. Add payment intent Cloud Function.
5. Add WhatsApp provider queue.
6. Add aggregate analytics collections.
7. Add multi-city discovery and franchise ownership.
