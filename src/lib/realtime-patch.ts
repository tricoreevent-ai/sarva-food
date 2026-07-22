export function applyRealtimePatch<T extends { id: string }>(
  current: T[],
  full: T[] | undefined,
  upsert: T[] | undefined,
  removed: string[] | undefined,
) {
  if (full) return full;
  if (!upsert?.length && !removed?.length) return current;
  const removedIds = new Set(removed ?? []);
  const byId = new Map(current.filter((item) => !removedIds.has(item.id)).map((item) => [item.id, item]));
  for (const item of upsert ?? []) byId.set(item.id, item);
  return Array.from(byId.values()).sort((first, second) => Date.parse(String((second as T & { createdAt?: string }).createdAt ?? "")) - Date.parse(String((first as T & { createdAt?: string }).createdAt ?? "")));
}
