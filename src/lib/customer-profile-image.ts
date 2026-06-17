export function resolveCustomerPhotoURL(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const photoURL = value?.trim();
    if (photoURL && !isBrandProfileImage(photoURL)) return photoURL;
  }
  return undefined;
}

function isBrandProfileImage(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("/icons/nammude-")
    || normalized.includes("/brand/nammude-")
    || normalized.includes("/images/fallback-logo")
    || normalized.includes("nammude-logo")
    || normalized.includes("nammude-icon");
}
