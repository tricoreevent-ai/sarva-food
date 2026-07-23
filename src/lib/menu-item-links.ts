export function canonicalMenuItemId(value: string) {
  const raw = decodeSafely(value).split("::")[0]?.trim() ?? "";
  return raw;
}

export function menuItemPath(restaurantSlug: string, itemId: string) {
  return `/restaurant/${encodeURIComponent(decodeSafely(restaurantSlug))}/item/${encodeURIComponent(canonicalMenuItemId(itemId))}`;
}

export function menuItemShortPath(restaurantSlug: string, itemId: string) {
  return `/r/${encodeURIComponent(decodeSafely(restaurantSlug))}/${encodeURIComponent(canonicalMenuItemId(itemId))}`;
}

function decodeSafely(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
