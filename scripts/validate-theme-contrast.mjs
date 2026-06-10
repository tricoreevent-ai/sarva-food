import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = [
  "customer-light.css",
  "customer-dark.css",
  "owner-light.css",
  "owner-dark.css",
  "admin-light.css",
  "admin-dark.css",
];

const pairs = [
  ["--module-text", "--module-bg", 4.5],
  ["--module-text", "--module-card", 4.5],
  ["--module-text-secondary", "--module-bg", 4.5],
  ["--module-text-secondary", "--module-card", 4.5],
  ["--module-text-muted", "--module-bg", 3],
  ["--module-tooltip-text", "--module-tooltip-bg", 4.5],
];

const failures = [];

for (const file of files) {
  const css = readFileSync(join("themes", file), "utf8");
  const vars = Object.fromEntries([...css.matchAll(/(--module-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, key, value]) => [key, value]));
  for (const [fg, bg, min] of pairs) {
    const ratio = contrast(vars[fg], vars[bg]);
    if (ratio < min) failures.push(`${file}: ${fg} on ${bg} is ${ratio.toFixed(2)}; expected ${min}+`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Theme contrast validation passed.");

function contrast(fg, bg) {
  const a = luminance(hex(fg));
  const b = luminance(hex(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function hex(value) {
  const [, r, g, b] = value.match(/^#(..)(..)(..)$/) ?? [];
  return [r, g, b].map((part) => Number.parseInt(part, 16) / 255);
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
