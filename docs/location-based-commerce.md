# Location-Based Commerce

## GPS Flow

The customer homepage and restaurant listing use `useLocationCommerce`. On first load the hook reads the persisted delivery location from local storage, then falls back to Indiranagar demo coordinates. When the customer taps GPS, the browser geolocation API requests permission, stores the detected coordinates, and refreshes delivery restaurants by distance.

## Google Places Flow

Manual search calls the same hook. If the Google Maps Places library is available on `window.google.maps.places`, autocomplete predictions are used and the selected Google Places address is persisted with its `placeId`. In local/demo mode, cached Bengaluru suggestions are used so the customer flow remains testable without an API key.

## Business Onboarding Flow

Owners and cloud kitchens apply from `/owner/onboarding`. The form captures business name, owner details, cuisine, Google Places-style address, area, delivery radius, restaurant images, and food images. Submissions are stored as lightweight business applications in the existing Zustand demo store.

## Approval Flow

Admins review applications in `/admin/restaurants`. Approving an application creates an approved restaurant record and makes it visible in customer discovery. Rejecting keeps the application in review history without adding it to listings.

## Customer Auth Flow

Customer sign-in stays simple. First-time and returning users enter name and email, receive a Firebase email magic link, and complete sign-in by opening the link. Phone OTP remains available as a secondary returning-user flow. Mobile number is optional at the first step.

## Location Persistence Strategy

The selected location is stored in `sarva-commerce-location`. Recent locations are stored in `sarva-commerce-recent-locations` and capped to four entries. Restaurant discovery filters approved restaurants by delivery radius, sorts by distance, then rating, minimizing repeated API calls and reusing cached client state.
