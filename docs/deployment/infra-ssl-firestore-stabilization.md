Build the next production stabilization pass for the Food Gedi application.

This is NOT a prototype anymore. 
Do NOT add mock data, fake placeholders, demo widgets, fake stats, or temporary UI. 
Every screen must follow production logic only.

Think carefully before implementing. 
Do proper architecture separation between customer app, owner portal, and admin system.

====================================================
1. SEPARATE CUSTOMER / OWNER / ADMIN ARCHITECTURE
====================================================

Current issue:
Owner accounts are appearing inside the public customer profile screen.

This is wrong.

Implement strict separation:

Customer app:
- food ordering
- customer profile
- addresses
- payments
- order history
- saved restaurants
- delivery tracking

Owner portal:
- restaurant management
- menu management
- orders
- delivery radius
- analytics
- staff
- settings

Admin:
- platform operations only

Required route separation:

/ -> customer app
/profile -> customer profile only
/login -> customer login only

/owner -> owner dashboard
/owner/login -> owner login only

/admin -> admin system

Public navbar must NOT contain:
- staff login
- owner login
- restaurant staff access
- operational controls

Remove:
- “Register Your Restaurant”
- staff/operator login
from customer navbar.

Only customer-related navigation should remain.

====================================================
2. CUSTOMER PROFILE REBUILD
====================================================

Current issue:
Customer profile shows owner data and operational stats.

Fix completely.

If user is NOT logged in:
Show ONLY:
- Sign in
- Create account
- Forgot password

Nothing else.

Do NOT show:
- fake stats
- fake orders
- fake addresses
- demo rewards
- placeholder cards

After customer login:
Show proper customer profile.

Sections:
- profile photo
- name
- email
- verified phone
- saved addresses
- payment methods
- order history
- saved restaurants
- offers
- logout

Web layout:
- left sidebar profile card
- right tabbed content

Mobile layout:
- stacked cards
- sticky top header
- responsive spacing
- no horizontal overflow

All profile data must come from Firestore only.

====================================================
3. OTP AUTH FLOW FIX
====================================================

Current issue:
Expected auth validation errors are appearing as:
- Next.js error overlay
- console exceptions
- stack traces

This is wrong.

Fix auth flow completely.

Expected validation states:
- account already exists
- invalid OTP
- expired OTP
- incorrect password
- email not found

These are NOT exceptions.

Do NOT:
- throw errors
- show console overlay
- captureException
- console.error

Instead:
- show inline form errors
- show toast/snackbar
- keep user on same screen

Implement proper UI states.

====================================================
4. SMTP / EMAIL OTP STABILIZATION
====================================================

Current issue:
OTP endpoint returns:
500 Internal Server Error

Fix SMTP configuration.

Use:
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM

Use proper Gmail App Password support.

Add:
- SMTP validation
- connection test
- meaningful backend logs
- safe frontend error messages

Frontend must NEVER show stack traces.

If email fails:
Show:
“Unable to send OTP right now. Please try again later.”

NOT:
- raw error
- server stack
- Next.js overlay

====================================================
5. MAP + LOCATION SYSTEM (ZOMATO-LIKE)
====================================================

Implement proper production-grade location architecture.

On app load:
- browser should request GPS permission automatically once per session
- support retry if denied

User location flow:
1. GPS detection
2. Map pin appears
3. User can drag pin
4. Address updates live
5. User confirms address
6. Address saved

Allow:
- GPS location
- map pin selection
- manual search
- saved addresses

Use:
Google Maps OR OpenStreetMap

Required:
- reverse geocoding
- distance calculation
- delivery radius filtering

Restaurant visibility:
distance <= deliveryRadiusKm

Owner can configure:
delivery radius per branch.

====================================================
6. ADDRESS SYSTEM REBUILD
====================================================

Saved addresses must contain BOTH:
- text address
- geo coordinates

Example:

{
  label,
  fullAddress,
  landmark,
  geo: {
    lat,
    lng
  },
  verified,
  placeId
}

Delivery validation MUST use coordinates.

When saving address:
- validate text and coordinates match
- reverse geocode confirmation

Customer can:
- save multiple addresses
- set default address
- edit/delete addresses
- choose address during checkout

====================================================
7. MOBILE UI FIXES
====================================================

Current issues:
- cut off buttons
- inconsistent card sizes
- overflow
- hidden content
- different image sizes
- broken spacing

Fix entire mobile layout.

Requirements:
- no horizontal scroll
- safe responsive containers
- proper mobile padding
- sticky bottom navigation
- equal card widths
- equal image sizes

All food cards must use identical structure.

Standardize:
- image aspect ratio
- image height
- title height
- spacing
- typography
- button positions

Use:
object-fit: cover

Recommended:
Food cards:
aspect-ratio: 4/3

====================================================
8. IMAGE UPLOAD + CROPPING
====================================================

Implement production image upload flow.

Before upload:
- crop
- compress
- resize
- preview

Use image cropper.

Recommended:
react-easy-crop

Required image standards:

Food:
1200x900

Restaurant cover:
1600x900

Profile:
500x500

Store optimized images in Firebase Storage.

====================================================
9. FIX IMAGE 404 ERRORS
====================================================

Current issue:
Next Image returns 404 for remote images.

Fix next.config.js image configuration.

Add proper:
images.remotePatterns

OR move all images to Firebase Storage.

Implement:
SafeImage fallback system.

Broken images must NEVER break layout.

====================================================
10. PUBLIC MENU SYSTEM
====================================================

Current issue:
Menu inconsistencies and missing menu data.

Implement strict menu architecture.

Each restaurant has:
- dine-in menu
- parcel menu
- delivery menu

Public customer app should ONLY load:
delivery-enabled items.

Owner can:
- enable/disable delivery per item
- mark sold out
- set availability

Customer menu API must return ONLY:
- sanitized public data
- no owner/internal fields

====================================================
11. OWNER BULK EXCEL MENU UPLOAD
====================================================

Implement proper bulk menu upload.

Features:
- download template
- upload Excel
- validation preview
- import
- duplicate checks
- copy to all menu types

Owner can:
- delete menu items
- bulk edit items
- bulk availability toggle

====================================================
12. ERROR HANDLING SYSTEM
====================================================

Catch ALL frontend errors properly.

Do NOT expose:
- stack traces
- Next.js overlays
- console exception dumps

Create reusable:
- ErrorAlert
- RetryCard
- EmptyState
- OfflineState

All API failures must show:
- safe UI message
- retry button

NOT:
console errors visible to user

====================================================
13. LOCAL HTTPS + SSL
====================================================

Update:
run.bat

to launch HTTPS mode automatically.

Requirements:
- local HTTPS
- LAN support
- mobile browser support
- service worker compatibility

Use:
npm run dev:lan:https

Ensure:
- SSL cert loading
- HTTP -> HTTPS redirect
- mobile access on same WiFi

====================================================
14. DATABASE CLEANUP
====================================================

Remove:
- fake owner records
- mock customer data
- placeholder stats
- demo addresses
- dummy rewards
- fake offers

Keep ONLY:
- production-safe seed data
- Tamarind Table demo restaurant
- real delivery menu
- real customer test account

====================================================
15. PERFORMANCE
====================================================

Optimize:
- Firestore reads
- menu loading
- public APIs
- image loading
- caching

Requirements:
- first load under 2 seconds
- cached load under 500ms
- no infinite skeletons
- no endless loading states

====================================================
16. FINAL VERIFICATION REQUIRED
====================================================

Before completion verify:

- customer signup
- OTP flow
- password reset
- GPS permission
- map selection
- address save
- delivery filtering
- menu loading
- add to cart
- checkout
- profile
- owner login
- owner menu upload
- mobile layout
- tablet layout
- desktop layout
- HTTPS LAN access

Run:
- npm run lint
- npm run typecheck
- npm run build

Provide:
- exact files changed
- exact routes tested
- exact unresolved limitations if any

Do NOT say “should work”.
Actually verify logic before finishing.## Real Device Verification

Manual device pass:

- Android Chrome: HTTPS opens, location prompt appears, GPS resolves, restaurants and menus load
- Samsung Internet: same checks
- iPhone Safari: same checks
- offline: recent restaurants/menu render from cache and owner writes remain queued

This pass requires a phone on the same LAN and cannot be fully automated from CI.
