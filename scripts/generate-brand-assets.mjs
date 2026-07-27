import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const iconSvg = path.join(pub, "icons", "food-gedi-icon-filled.svg");
const maskableSvg = path.join(pub, "icons", "food-gedi-icon-maskable.svg");
const logoSvg = path.join(pub, "brand", "food-gedi-logo.svg");

await mkdir(path.join(pub, "icons"), { recursive: true });
await mkdir(path.join(pub, "brand"), { recursive: true });

const iconSizes = [16, 24, 32, 48, 64, 96, 144, 180, 192, 256, 512, 1024];
for (const size of iconSizes) {
  await render(iconSvg, path.join(pub, "icons", `food-gedi-icon-${size}.png`), size, size);
}

await render(iconSvg, path.join(pub, "favicon-16x16.png"), 16, 16);
await render(iconSvg, path.join(pub, "favicon-32x32.png"), 32, 32);
await render(iconSvg, path.join(pub, "apple-touch-icon.png"), 180, 180);
await render(iconSvg, path.join(pub, "android-chrome-192x192.png"), 192, 192);
await render(iconSvg, path.join(pub, "android-chrome-512x512.png"), 512, 512);
await render(maskableSvg, path.join(pub, "android-chrome-maskable-512.png"), 512, 512);
await render(maskableSvg, path.join(pub, "icons", "food-gedi-icon-maskable-512.png"), 512, 512);
await render(logoSvg, path.join(pub, "brand", "food-gedi-og.png"), 1200, 630, { fit: "contain", background: "#FFF8F0" });

await writeFile(path.join(pub, "favicon.svg"), await readFile(iconSvg));
await writeIco(path.join(pub, "favicon.ico"), [
  path.join(pub, "favicon-16x16.png"),
  path.join(pub, "favicon-32x32.png"),
  path.join(pub, "icons", "food-gedi-icon-48.png"),
]);

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
