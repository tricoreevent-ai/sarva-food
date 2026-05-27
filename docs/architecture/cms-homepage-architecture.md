# CMS, Homepage, Upload, Environment, and Toast Architecture

## Source of Truth

Customer homepage content is resolved through the CMS service layer before rendering.

- CMS document: `appSettings/cms`
- Category collection: `appCategories`
- Cuisine collection: `appCuisines`
- Config constants: `src/config/environment/cms.config.ts`
- Resolver services: `src/services/cms/*`

The customer app should consume public APIs or CMS resolver services. UI code should not directly query Firestore collections.

## Homepage Rendering Flow

1. Admin edits CMS at `/admin/cms`.
2. Admin API normalizes and publishes CMS through `resolveCmsSettings`.
3. A version snapshot is written under `appSettings/cms/versions`.
4. Public CMS API returns normalized CMS with cache headers.
5. Customer homepage resolves CMS fields and renders hero, announcement bar, categories, banners, offers, featured restaurants, and popular item section visibility from CMS configuration.

## Upload Flow

All image uploads use `CloudinaryUploadWidget`.

- The widget renders through Radix Dialog portal.
- Global layer constants live in `src/lib/z-index.ts`.
- Modal footer actions remain sticky: Cancel, Crop & Upload, Upload Web Image.
- Cloudinary delivery URLs are normalized with `f_auto,q_auto`.
- Aspect ratio presets live in `CMS_IMAGE_PRESETS`.

## Environment Configuration

Environment summaries live under `src/config/environment`.

- `env.client.ts`: public client configuration summary.
- `env.server.ts`: server-only configuration summary.
- `firebase.config.ts`: Firebase client diagnostic summary.
- `cms.config.ts`: CMS collection names, required fields, version, and image presets.

Admin diagnostics are available at `/admin/system/diagnostics`.

## Toast Architecture

Use `toastManager.showOnce(id, config)` for login/auth lifecycle to avoid duplicate notifications from StrictMode, auth listeners, and explicit login callbacks.

Toast layer uses `Z_INDEX.toast` and is positioned on the right-middle of the viewport with a 30-second duration by default.

