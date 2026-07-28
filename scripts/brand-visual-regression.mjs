import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "validation");
const reportPath = path.join(outDir, "BRAND_VISUAL_REGRESSION_REPORT.md");
const sheetPath = path.join(outDir, "brand-visual-regression-contact-sheet.png");
const dirs = [path.join(root, "public", "brand"), path.join(root, "public", "icons")];
const extra = [path.join(root, "public", "favicon.svg"), path.join(root, "public", "images", "fallback-logo.svg")];
const rows = [];
const tiles = [];

await mkdir(outDir, { recursive: true });

for (const file of await brandSvgFiles()) {
  const rel = path.relative(root, file);
  const svg = await readFile(file, "utf8");
  const rules = [
    ["no nested image", !/<image\s+href/i.test(svg)],
    ["no currentColor dependency", !/currentColor/i.test(svg)],
    ["has vector content", /<(path|rect|circle|line|text)\b/i.test(svg)],
    ["has viewBox", /\bviewBox=/i.test(svg)],
    ["has title", /<title\b/i.test(svg)],
  ];
  const render = await visibleRender(file, backgroundFor(file));
  rules.push(["renders visible pixels", render.visiblePixels > 500]);
  rows.push({ file: rel, status: rules.every(([, pass]) => pass) ? "PASS" : "FAIL", rules, visiblePixels: render.visiblePixels });
  tiles.push(render.tile);
}

const failures = rows.filter((row) => row.status === "FAIL");
await writeContactSheet(tiles);
await writeFile(reportPath, [
  "# Brand Visual Regression Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Result: ${failures.length ? "FAIL" : "PASS"}`,
  "",
  `Contact sheet: \`${path.relative(root, sheetPath)}\``,
  "",
  "| Asset | Visible Pixels | Checks | Status |",
  "| --- | ---: | --- | --- |",
  ...rows.map((row) => `| ${row.file} | ${row.visiblePixels} | ${row.rules.map(([name, pass]) => `${pass ? "✓" : "✗"} ${name}`).join("<br>")} | ${row.status} |`),
  "",
].join("\n"));

if (failures.length) {
  console.error(`Brand visual regression failed for ${failures.length} asset(s).`);
  process.exit(1);
}

console.log(`Brand visual regression passed for ${rows.length} SVG assets.`);

async function brandSvgFiles() {
  const files = [];
  for (const dir of dirs) {
    for (const item of await readdir(dir)) {
      if (item.startsWith("food-gedi-") && item.endsWith(".svg")) files.push(path.join(dir, item));
    }
  }
  for (const file of extra) if (existsSync(file)) files.push(file);
  return files.sort();
}

function backgroundFor(file) {
  const name = path.basename(file);
  if (name.includes("white") || name.includes("dark") || name.includes("loading")) return "#0F172A";
  if (name.includes("black") || name.includes("print") || name.includes("monochrome")) return "#FFFFFF";
  return "#FFFFFF";
}

async function visibleRender(file, bg) {
  const width = 260;
  const height = 120;
  const png = await sharp(file).resize({ width, height, fit: "contain" }).flatten({ background: bg }).png().toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const base = hexToRgb(bg);
  let visiblePixels = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const diff = Math.abs(data[i] - base.r) + Math.abs(data[i + 1] - base.g) + Math.abs(data[i + 2] - base.b);
    if (diff > 28) visiblePixels++;
  }
  const tile = await sharp({
    create: { width, height, channels: 3, background: bg },
  }).composite([{ input: png, left: 0, top: 0 }]).png().toBuffer();
  return { visiblePixels, tile };
}

async function writeContactSheet(tileBuffers) {
  const cols = 4;
  const tileW = 260;
  const tileH = 120;
  const rowsCount = Math.ceil(tileBuffers.length / cols);
  await sharp({
    create: { width: cols * tileW, height: rowsCount * tileH, channels: 3, background: "#F8FAFC" },
  }).composite(tileBuffers.map((input, index) => ({
    input,
    left: (index % cols) * tileW,
    top: Math.floor(index / cols) * tileH,
  }))).png().toFile(sheetPath);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}
