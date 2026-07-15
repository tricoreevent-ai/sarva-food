# Image Optimization Report

Date: 2026-07-15
Branch: `release/production-nammude`
Release: `v1.0.0-rc5`

## Audit Findings

| Area | Finding | Action |
| --- | --- | --- |
| Owner/Admin upload | Uploads already route through `CloudinaryUploadWidget` and `uploadImageToCloudinary`; local browser compression exists, but AVIF/WebP fallback, metadata stripping intent, and Cloudinary incoming transforms were not standardized. | Standardize upload presets and signed Cloudinary incoming transforms. |
| Restaurant/Menu/Category/Banner/Offer images | Public data services already generate Cloudinary thumbnails in several places, but transform strings are duplicated and not consistently using `dpr_auto`. | Add shared Cloudinary image presets and reuse them in upload/delivery helpers. |
| Customer profile/staff/gallery | Existing screens use `next/image`/`SafeImage` or trusted external profile URLs; no schema change needed. | Keep storage paths unchanged; improve `SafeImage` Cloudinary delivery. |
| Cloudinary delivery | Existing URLs often include `f_auto,q_auto`; some variants lack width/height/DPR constraints. | Use `f_auto,q_auto,dpr_auto` and named size presets. |
| Next/Image | Global config already enables AVIF then WebP and long image cache TTL. Most app images already use `next/image` via `SafeImage`. | Add low-risk preset support and fix obvious oversized list/card usages. |
| SVG/icons | Lucide SVG icons are used throughout. Static fallbacks are small SVG assets. | No sprite rewrite needed during release freeze; keep inline icon usage. |
| Sharp | `sharp` is not installed and adding a server upload path would modify APIs. | Defer Sharp server ingestion until API changes are allowed. Browser canvas + Cloudinary incoming transforms remain the safe RC5 path. |

## Target Presets

| Preset | Use |
| --- | --- |
| `auto` | Default Cloudinary `f_auto,q_auto,dpr_auto` delivery for uncategorized safe images. |
| `thumbnail` | Generic small thumbnails. |
| `small` | Compact mobile/list cards. |
| `medium` | Menu/product grids. |
| `large` | Detail previews. |
| `hero` | First-viewport hero/LCP media. |
| `avatar` | Customer/staff/profile circles. |
| `cart` | Cart, checkout, order history. |
| `adminTable` | Admin/owner table rows. |
| `restaurantCard` | Restaurant list/card thumbnails. |
| `offerCard` | Offer list cards. |
| `categoryIcon` | Category/cuisine icons. |
| `logo` | Brand, restaurant, staff, and owner logo previews. |

## Implemented

| Area | Result |
| --- | --- |
| Upload compression | Browser upload compression now tries AVIF first, falls back to WebP/JPEG, uses EXIF-aware image loading where supported, strips metadata through canvas re-encoding, and applies photo/logo/avatar quality targets. |
| Cloudinary incoming assets | Signed upload parameters now request auto-rotation, max-dimension limiting, metadata stripping, and Cloudinary `q_auto` handling without changing the upload API route. |
| Cloudinary delivery | Added shared Cloudinary delivery helpers and named presets for heroes, restaurant cards, product grids, cart/order thumbnails, admin tables, offer cards, category icons, avatars, and logos. |
| Public thumbnails | Public restaurant/menu/category/cuisine thumbnail URL helpers now reuse shared Cloudinary transforms with `f_auto`, `q_auto`, and `dpr_auto`. |
| Next/Image surfaces | High-volume customer, owner, and admin `SafeImage` surfaces now request right-sized Cloudinary variants for list, table, card, hero, preview, order history, offer, category, menu, and restaurant images. |
| CMS delivery | CMS banner/homepage transforms now include `dpr_auto`; admin CMS preview uses `SafeImage` with a hero preset. |

## Validation

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed after rerun with longer timeout; initial timeout left stale lint workers that were stopped. |
| `npm run build` | Passed with the accepted Firebase/protobuf dynamic dependency warning. |
| `cmd /c npm run analyze` | Passed with analyzer timeout resolved by using the script timeout; reports regenerated. |
| `cmd /c npm run audit:release` | Passed; hardening report regenerated. |
| `cmd /c npm run smoke:operational` | Passed. |
| Image audit scans | No runtime `console.log`, debugger, TODO/FIXME/HACK/XXX, legacy Cloudinary delivery transform, or missing high-risk thumbnail preset found. QR print-window `<img>` tags and static fallback images are intentional. |

## Deferred

- Server-side Sharp optimization is deferred because this sprint forbids API/upload architecture changes.
- SVGO/sprite generation is deferred because repeated icons already come from Lucide SVG components and no oversized raster icon set was found.
