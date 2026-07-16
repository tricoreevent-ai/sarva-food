const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function isTrustedMutationOrigin({
  method,
  origin,
  requestOrigin,
  requestHost,
  publicOrigin,
}: {
  method: string;
  origin: string | null;
  requestOrigin: string;
  requestHost: string | null;
  publicOrigin: string;
}) {
  if (safeMethods.has(method.toUpperCase()) || !origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  const hostOrigin = requestHost ? normalizeOrigin(`${new URL(normalizedOrigin).protocol}//${firstHeaderValue(requestHost)}`) : null;
  return [requestOrigin, publicOrigin, hostOrigin].some((candidate) => candidate && normalizeOrigin(candidate) === normalizedOrigin);
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string) {
  return value.split(",")[0]?.trim() || "";
}
