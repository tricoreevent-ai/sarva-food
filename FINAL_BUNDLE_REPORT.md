# Final Bundle Report

Date: 2026-07-08T17:26:27.709Z

## Route Ownership

| Route | JS chunks | JS | CSS | Budget | Status |
| --- | --- | --- | --- | --- | --- |

## Remaining Route JS Risk

No tracked route exceeds the script budget table.

## Dependency Notes

| Dependency area | Status |
| --- | --- |
| Firebase/Auth/Stack | Critical customer/profile/POS initial ownership reduced in Phase 2; auth routes still intentionally own auth code. |
| Mapbox | Removed from checked non-map initial route ownership; settings/location map code is tab/action loaded. |
| XLSX | Import/export tooling remains action-loaded for owner/admin menu library paths. |
| react-hot-toast | Owner/admin/profile action paths use lazy toast facade where touched. |
| lucide/framer-motion/shared chunks | Still present where UI surfaces use them; replacing them was not attempted because it would risk visual/interaction regressions before production smoke. |

## Firebase Warning

The remaining Firebase/protobuf dynamic dependency warning is expected. Build/analyze trace it through `@protobufjs/inquire -> protobufjs -> @grpc/proto-loader -> @firebase/firestore -> firebase/firestore -> src/firebase/collections.ts -> src/app/api/admin/system-diagnostics/route.ts`. It originates in upstream Firebase/protobuf server dependency code, not application debug code. The application already keeps Firebase client startup behind config/accessor boundaries where touched; replacing or aliasing Firebase/protobuf internals during certification is not safe, so the warning remains documented and accepted.
