const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export function legalContentToHtml(content?: string) {
  const value = (content ?? "").trim();
  if (!value) return "";
  if (HTML_TAG_PATTERN.test(value)) return sanitizeLegalHtml(value);
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function sanitizeLegalHtml(html: string) {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]+/gi, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
