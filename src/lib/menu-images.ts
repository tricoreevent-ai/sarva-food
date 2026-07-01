const MIN_IMAGE_URL_LENGTH = 8;

export function normalizeMenuImageUrls(item: Record<string, unknown>) {
  return uniqueImageUrls([
    item.imagePath,
    ...(Array.isArray(item.imagePaths) ? item.imagePaths : []),
    item.image,
    ...(Array.isArray(item.images) ? item.images : []),
  ]);
}

export function normalizeMenuImageFields<T extends Record<string, unknown>>(item: T) {
  const images = normalizeMenuImageUrls(item);
  const image = images[0] ?? "";
  return {
    ...item,
    image,
    images,
    imagePath: image,
    imagePaths: images,
  };
}

function uniqueImageUrls(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter((value) => value.length >= MIN_IMAGE_URL_LENGTH)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}
