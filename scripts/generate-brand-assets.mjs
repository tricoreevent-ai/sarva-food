import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const icons = path.join(pub, "icons");
const brand = path.join(pub, "brand");

await mkdir(icons, { recursive: true });
await mkdir(brand, { recursive: true });

await writeSvg(path.join(icons, "food-gedi-icon.svg"), iconSvg("color", { title: "Food Gedi icon", tile: true }));
await writeSvg(path.join(icons, "food-gedi-icon-filled.svg"), iconSvg("color", { title: "Food Gedi app icon", tile: true, bg: "#FFF8F0" }));
await writeSvg(path.join(icons, "food-gedi-icon-maskable.svg"), iconSvg("color", { title: "Food Gedi maskable app icon", tile: true, bg: "#FFF8F0", pad: 26 }));
await writeSvg(path.join(icons, "food-gedi-icon-white.svg"), iconSvg("white", { title: "Food Gedi icon for dark backgrounds" }));
await writeSvg(path.join(icons, "food-gedi-icon-black.svg"), iconSvg("black", { title: "Food Gedi icon for print" }));
await writeSvg(path.join(icons, "food-gedi-icon-monochrome.svg"), iconSvg("black", { title: "Food Gedi monochrome icon" }));
await writeSvg(path.join(icons, "food-gedi-icon-small.svg"), iconSvg("color", { title: "Food Gedi small icon", tile: true, simplified: true }));
await writeSvg(path.join(icons, "food-gedi-loading-icon.svg"), loadingSvg());

await writeSvg(path.join(brand, "food-gedi-logo.svg"), logoSvg("color", { title: "Food Gedi logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-light.svg"), logoSvg("color", { title: "Food Gedi logo for light backgrounds" }));
await writeSvg(path.join(brand, "food-gedi-logo-dark.svg"), logoSvg("dark", { title: "Food Gedi logo for dark backgrounds" }));
await writeSvg(path.join(brand, "food-gedi-logo-white.svg"), logoSvg("white", { title: "Food Gedi white logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-black.svg"), logoSvg("black", { title: "Food Gedi black logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-high-contrast.svg"), logoSvg("high", { title: "Food Gedi high contrast logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-print.svg"), logoSvg("print", { title: "Food Gedi print logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-compact.svg"), compactLogoSvg("color", { title: "Food Gedi compact logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-small.svg"), compactLogoSvg("color", { title: "Food Gedi small logo", small: true }));
await writeSvg(path.join(brand, "food-gedi-logo-vertical.svg"), verticalLogoSvg());
await writeSvg(path.join(brand, "food-gedi-logo-outline.svg"), outlineLogoSvg());
await writeSvg(path.join(brand, "food-gedi-logo-monochrome.svg"), compactLogoSvg("black", { title: "Food Gedi monochrome logo" }));
await writeSvg(path.join(brand, "food-gedi-logo-text.svg"), textLogoSvg("color"));
await writeSvg(path.join(brand, "food-gedi-logo-text-white.svg"), textLogoSvg("white"));
await writeSvg(path.join(brand, "food-gedi-logo-animated.svg"), animatedLogoSvg());
await writeSvg(path.join(pub, "images", "fallback-logo.svg"), iconSvg("color", { title: "Food Gedi fallback logo", tile: true }));

const iconSvgPath = path.join(icons, "food-gedi-icon-filled.svg");
const maskableSvgPath = path.join(icons, "food-gedi-icon-maskable.svg");
const logoSvgPath = path.join(brand, "food-gedi-logo.svg");

const iconSizes = [16, 24, 32, 48, 64, 96, 144, 180, 192, 256, 512, 1024];
for (const size of iconSizes) await render(iconSvgPath, path.join(icons, `food-gedi-icon-${size}.png`), size, size);

await render(iconSvgPath, path.join(pub, "favicon-16x16.png"), 16, 16);
await render(iconSvgPath, path.join(pub, "favicon-32x32.png"), 32, 32);
await render(iconSvgPath, path.join(pub, "apple-touch-icon.png"), 180, 180);
await render(iconSvgPath, path.join(pub, "android-chrome-192x192.png"), 192, 192);
await render(iconSvgPath, path.join(pub, "android-chrome-512x512.png"), 512, 512);
await render(maskableSvgPath, path.join(pub, "android-chrome-maskable-512.png"), 512, 512);
await render(maskableSvgPath, path.join(icons, "food-gedi-icon-maskable-512.png"), 512, 512);
await render(logoSvgPath, path.join(brand, "food-gedi-og.png"), 1200, 630, { fit: "contain", background: "#FFF8F0" });

await writeFile(path.join(pub, "favicon.svg"), await readFile(iconSvgPath));
await writeIco(path.join(pub, "favicon.ico"), [
  path.join(pub, "favicon-16x16.png"),
  path.join(pub, "favicon-32x32.png"),
  path.join(icons, "food-gedi-icon-48.png"),
]);

async function writeSvg(file, svg) {
  await writeFile(file, `${svg.replace(/[ \t]+$/gm, "")}\n`);
}

function iconSvg(mode, options = {}) {
  const { title = "Food Gedi icon", tile = false, bg = "transparent", pad = 0, simplified = false } = options;
  const inner = iconInner(mode, "fg");
  const transform = pad ? `<g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">${inner.body}</g>` : inner.body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="fg-title">
  <title id="fg-title">${title}</title>
  ${inner.defs}
  ${tile || bg !== "transparent" ? `<rect x="22" y="22" width="468" height="468" rx="104" fill="${bg === "transparent" ? "#FFFFFF" : bg}" opacity="${bg === "transparent" ? ".94" : "1"}"/>` : ""}
  ${transform}
  ${simplified ? `<rect x="22" y="22" width="468" height="468" rx="104" fill="none" stroke="#166B2E" stroke-width="14" opacity=".14"/>` : ""}
</svg>`;
}

function iconInner(mode, id) {
  const color = mode === "color";
  const white = mode === "white";
  const green = color ? `url(#${id}-green)` : white ? "#FFFFFF" : "#111827";
  const orange = color ? `url(#${id}-orange)` : white ? "#FFFFFF" : "#111827";
  const cloche = white ? "#FFB24A" : orange;
  const defs = color ? `<defs>
    <linearGradient id="${id}-green" x1="77" y1="105" x2="329" y2="407" gradientUnits="userSpaceOnUse"><stop stop-color="#22A33A"/><stop offset="1" stop-color="#0B3F1D"/></linearGradient>
    <linearGradient id="${id}-orange" x1="242" y1="116" x2="409" y2="406" gradientUnits="userSpaceOnUse"><stop stop-color="#FF8A00"/><stop offset="1" stop-color="#FF6A00"/></linearGradient>
  </defs>` : "";
  const body = `
  <path d="M116 202C128 119 190 62 259 62c69 0 132 57 144 140h-39C353 144 309 104 259 104c-51 0-94 39-106 98h-37Z" fill="${green}"/>
  <path d="M240 46c0-15 13-27 29-27 17 0 31 12 31 27 0 16-14 25-32 25-16 0-28-10-28-25Zm19 4c0 4 4 7 10 7 7 0 12-3 12-7s-5-7-11-7c-7 0-11 3-11 7Z" fill="${green}"/>
  <path d="M178 186c10-53 43-83 87-83 46 0 80 31 89 83H178Z" fill="${cloche}" stroke="${white ? "#FFB24A" : color ? "#FF7A00" : "#111827"}" stroke-width="5"/>
  <path d="M218 175c9-28 27-44 54-48" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round" opacity=".92"/>
  <path d="M92 226c0-20 16-36 36-36h110c20 0 35 15 35 34 0 20-15 35-35 35h-80v39h75c20 0 35 15 35 34s-15 35-35 35h-75v91l-66-64V226Z" fill="${green}"/>
  <path d="M296 322c0-76 56-134 132-134h8c19 0 34 15 34 34s-15 34-34 34h-8c-36 0-63 29-63 66 0 40 29 69 69 69 24 0 45-10 58-29h-68c-19 0-33-14-33-32s14-32 33-32h119v26c0 82-49 135-119 135-74 0-128-58-128-137Z" fill="${orange}" transform="translate(44 0) scale(.82 1)"/>
  ${color ? `<rect x="22" y="22" width="468" height="468" rx="104" fill="none" stroke="#166B2E" stroke-width="10" opacity=".12"/>` : ""}`;
  return { defs, body };
}

function logoSvg(mode, { title }) {
  const palette = logoPalette(mode);
  const icon = iconInner(palette.iconMode, "fg-logo");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 260" role="img" aria-labelledby="fg-logo-title">
  <title id="fg-logo-title">${title}</title>
  ${icon.defs}
  <g transform="translate(0 28) scale(.367)">${icon.body}</g>
  ${wordmark(214, 139, 88, palette)}
  <line x1="218" y1="180" x2="266" y2="180" stroke="${palette.rule}" stroke-width="5" stroke-linecap="round"/>
  <text x="286" y="190" font-family="Inter, Plus Jakarta Sans, Arial, sans-serif" font-size="31" font-weight="650" fill="${palette.tagline}" letter-spacing="1">Run Smarter. Serve Better.</text>
  <line x1="748" y1="180" x2="796" y2="180" stroke="${palette.rule}" stroke-width="5" stroke-linecap="round"/>
</svg>`;
}

function compactLogoSvg(mode, { title, small = false }) {
  const palette = logoPalette(mode);
  const icon = iconInner(palette.iconMode, `fg-compact-${mode}`);
  const scale = small ? ".293" : ".273";
  const y = small ? 10 : 18;
  const textX = small ? 156 : 158;
  const font = small ? 56 : 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${small ? 500 : 520} 180" role="img" aria-labelledby="fg-compact-title">
  <title id="fg-compact-title">${title}</title>
  ${icon.defs}
  <g transform="translate(0 ${y}) scale(${scale})">${icon.body}</g>
  ${wordmark(textX, 112, font, palette)}
</svg>`;
}

function verticalLogoSvg() {
  const icon = iconInner("color", "fg-vertical");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 620" role="img" aria-labelledby="fg-vertical-title">
  <title id="fg-vertical-title">Food Gedi vertical logo</title>
  ${icon.defs}
  <g transform="translate(136 28) scale(.484)">${icon.body}</g>
  ${wordmark(58, 404, 82, logoPalette("color"))}
  <text x="92" y="472" font-family="Inter, Plus Jakarta Sans, Arial, sans-serif" font-size="28" font-weight="650" fill="#2B2B2B" letter-spacing=".8">Run Smarter. Serve Better.</text>
</svg>`;
}

function outlineLogoSvg() {
  const icon = iconInner("color", "fg-outline");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 180" role="img" aria-labelledby="fg-outline-title">
  <title id="fg-outline-title">Food Gedi outline logo</title>
  ${icon.defs}
  <rect x="3" y="3" width="514" height="174" rx="26" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="6"/>
  <g transform="translate(24 30) scale(.234)">${icon.body}</g>
  ${wordmark(158, 112, 62, logoPalette("color"))}
</svg>`;
}

function textLogoSvg(mode) {
  const palette = logoPalette(mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 140" role="img" aria-labelledby="fg-logo-text-title">
  <title id="fg-logo-text-title">Food Gedi wordmark</title>
  ${wordmark(8, 91, 82, palette)}
</svg>`;
}

function animatedLogoSvg() {
  const icon = iconInner("color", "fg-animated");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 220" role="img" aria-labelledby="fg-animated-title">
  <title id="fg-animated-title">Food Gedi animated loading logo</title>
  ${icon.defs}
  <style>@media (prefers-reduced-motion:no-preference){.mark{transform-origin:110px 110px;animation:pulse 1.4s ease-in-out infinite}@keyframes pulse{50%{transform:scale(1.035)}}}</style>
  <g class="mark" transform="translate(26 44) scale(.328)">${icon.body}</g>
  ${wordmark(220, 126, 62, logoPalette("color"))}
</svg>`;
}

function loadingSvg() {
  const icon = iconInner("color", "fg-load");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="fg-loading-title">
  <title id="fg-loading-title">Food Gedi loading icon</title>
  ${icon.defs}
  <style>@media (prefers-reduced-motion:no-preference){.ring{transform-origin:256px 256px;animation:spin 1.25s linear infinite}.steam{animation:rise 1.5s ease-in-out infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes rise{50%{transform:translateY(-10px);opacity:.55}}}</style>
  <circle class="ring" cx="256" cy="256" r="214" fill="none" stroke="#16A34A" stroke-width="24" stroke-linecap="round" stroke-dasharray="360 990"/>
  <g transform="translate(128 138) scale(.5)">${icon.body}</g>
  <path class="steam" d="M176 90c24-22-9-39 16-62M256 88c26-24-8-43 18-68M336 90c24-22-9-39 16-62" fill="none" stroke="#FF7A00" stroke-width="18" stroke-linecap="round"/>
</svg>`;
}

function wordmark(x, y, size, palette) {
  const dx = Math.round(size * 0.2);
  return `<text x="${x}" y="${y}" font-family="Inter, Plus Jakarta Sans, Arial, sans-serif" font-size="${size}" font-weight="950" letter-spacing="${Math.round(size * -0.06)}"><tspan fill="${palette.food}">Food</tspan><tspan dx="${dx}" fill="${palette.gedi}">Gedi</tspan></text>`;
}

function logoPalette(mode) {
  if (mode === "white") return { iconMode: "white", food: "#FFFFFF", gedi: "#FFB24A", tagline: "#FFFFFF", rule: "#FFFFFF" };
  if (mode === "black" || mode === "print") return { iconMode: "black", food: "#111827", gedi: "#111827", tagline: "#111827", rule: "#111827" };
  if (mode === "dark") return { iconMode: "color", food: "#4FC763", gedi: "#FF8A00", tagline: "#F8FAFC", rule: "#4FC763" };
  if (mode === "high") return { iconMode: "color", food: "#063D1D", gedi: "#B84600", tagline: "#111827", rule: "#063D1D" };
  return { iconMode: "color", food: "#0B3F1D", gedi: "#D86100", tagline: "#2B2B2B", rule: "#166B2E" };
}

async function render(input, output, width, height, options = {}) {
  await sharp(input).resize({ width, height, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, ...options }).png().toFile(output);
}

async function writeIco(output, files) {
  const images = await Promise.all(files.map(async (file) => ({ file, data: await readFile(file) })));
  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const chunks = [Buffer.alloc(headerSize)];
  chunks[0].writeUInt16LE(0, 0);
  chunks[0].writeUInt16LE(1, 2);
  chunks[0].writeUInt16LE(images.length, 4);
  images.forEach((image, index) => {
    const size = Number(path.basename(image.file).match(/(\d+)/)?.[1] ?? 32);
    const pos = 6 + index * 16;
    chunks[0].writeUInt8(size >= 256 ? 0 : size, pos);
    chunks[0].writeUInt8(size >= 256 ? 0 : size, pos + 1);
    chunks[0].writeUInt8(0, pos + 2);
    chunks[0].writeUInt8(0, pos + 3);
    chunks[0].writeUInt16LE(1, pos + 4);
    chunks[0].writeUInt16LE(32, pos + 6);
    chunks[0].writeUInt32LE(image.data.length, pos + 8);
    chunks[0].writeUInt32LE(offset, pos + 12);
    offset += image.data.length;
    chunks.push(image.data);
  });
  await writeFile(output, Buffer.concat(chunks));
}
