# Template Engine

## Goal

Support fast visual generation for restaurant social commerce without introducing a heavy rendering dependency too early.

## Implemented Foundation

File: `src/lib/template-engine.ts`

Supported output formats:

- Instagram Story: 1080x1920, 9:16.
- Instagram Feed: 1080x1350, 4:5.
- WhatsApp Status: 1080x1920, 9:16.
- Facebook Post: 1200x1200, 1:1.

Exports:

- `SOCIAL_FORMATS`
- `SocialOutputFormat`
- `buildTemplateExport`

## Studio Flow Updates

File: `src/components/flows/instagram-post-creator-flow.tsx`

Implemented:

- Output format selector.
- Image compression before preview.
- Dynamic preview aspect ratio.
- Export payload with dimensions, aspect ratio, template name, image, copy, offer, and deep link.
- Lazy route import for the studio creator.

## Rendering Strategy

Current MVP:

- Render preview with DOM and `next/image`.
- Export JSON metadata for backend or future canvas rendering.

Next phase:

- Add an offscreen canvas renderer for production-quality PNG/JPEG export.
- Keep platform dimensions centralized in `SOCIAL_FORMATS`.
- Store template settings as JSON in Firestore.
- Store rendered images in Firebase Storage.

## Storage Strategy

Before upload:

- Compress image to WebP or JPEG.
- Cap dimensions to platform output bounds.
- Store original only if the restaurant explicitly needs high-resolution reuse.

Recommended paths:

- `restaurants/{restaurantId}/social/source/{imageId}.webp`
- `restaurants/{restaurantId}/social/exports/{postId}-{format}.webp`
- `restaurants/{restaurantId}/menu/{itemId}.webp`

## Firestore Metadata

Suggested `socialPosts` fields:

- `restaurantId`
- `campaignId`
- `templateId`
- `imagePath`
- `headline`
- `caption`
- `offerCode`
- `exportMetadata`
- `createdAt`
- `updatedAt`

Keep rendered image binary data out of Firestore.

## Performance Notes

- Do not load canvas/export dependencies on normal ordering pages.
- Keep the editor behind the studio route.
- Debounce future auto-render work if text editing becomes canvas-driven.
- Generate thumbnails for saved drafts if the scheduled-posts view grows.
