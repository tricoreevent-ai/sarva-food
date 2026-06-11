export function parseFirestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "object") return null;

  const timestamp = value as { toDate?: unknown; seconds?: unknown; _seconds?: unknown };
  if (typeof timestamp.toDate === "function") {
    const date = timestamp.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  const seconds = typeof timestamp.seconds === "number"
    ? timestamp.seconds
    : typeof timestamp._seconds === "number"
      ? timestamp._seconds
      : null;
  if (seconds === null) return null;

  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseFirestoreDateIso(value: unknown) {
  return parseFirestoreDate(value)?.toISOString();
}

export function parseFirestoreDateMillis(value: unknown) {
  return parseFirestoreDate(value)?.getTime() ?? 0;
}
