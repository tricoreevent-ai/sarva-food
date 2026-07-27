export function resolveCustomerPhotoURL(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const photoURL = value?.trim();
    if (photoURL && !isBrandProfileImage(photoURL)) return photoURL;
  }
  return undefined;
}

function isBrandProfileImage(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("/icons/food-gedi-")
    || normalized.includes("/brand/food-gedi-")
    || normalized.includes("/images/fallback-logo")
    || normalized.includes("food-gedi-logo")
    || normalized.includes("food-gedi-icon");
}
