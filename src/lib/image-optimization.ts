import { IMAGE_UPLOAD } from "@/lib/constants";

export type ImageCompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  quality?: number;
  type?: "image/avif" | "image/webp" | "image/jpeg";
  kind?: "photo" | "logo" | "avatar";
};

export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {},
) {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  const maxWidth = options.maxWidth ?? IMAGE_UPLOAD.maxWidth;
  const maxHeight = options.maxHeight ?? IMAGE_UPLOAD.maxHeight;
  const image = await loadImageSource(file);
  const crop = getCenterCrop(image.width, image.height, options.aspectRatio);
  const scale = Math.min(1, maxWidth / crop.width, maxHeight / crop.height);
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image.source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  image.close?.();
  const { blob, type } = await encodeCanvas(canvas, options);
  if (!blob) return file;

  return new File([blob], optimizedName(file.name, type), { type });
}

function getCenterCrop(width: number, height: number, aspectRatio?: number) {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { x: 0, y: 0, width, height };
  }

  const currentRatio = width / height;
  if (currentRatio > aspectRatio) {
    const nextWidth = Math.round(height * aspectRatio);
    return { x: Math.round((width - nextWidth) / 2), y: 0, width: nextWidth, height };
  }

  const nextHeight = Math.round(width / aspectRatio);
  return { x: 0, y: Math.round((height - nextHeight) / 2), width, height: nextHeight };
}

async function encodeCanvas(canvas: HTMLCanvasElement, options: ImageCompressionOptions) {
  const candidates = options.type ? [options.type] : ["image/avif", IMAGE_UPLOAD.type, "image/jpeg"] as const;
  for (const type of candidates) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, options.quality ?? qualityFor(type, options.kind)),
    );
    if (blob && blob.type === type) return { blob, type };
  }
  return { blob: null, type: "image/jpeg" as const };
}

function qualityFor(type: ImageCompressionOptions["type"], kind: ImageCompressionOptions["kind"]) {
  if (kind === "logo") return 0.95;
  if (type === "image/avif") return 0.56;
  if (type === "image/webp") return 0.74;
  return IMAGE_UPLOAD.quality;
}

function optimizedName(name: string, type: string) {
  const extension = type === "image/avif" ? ".avif" : type === "image/webp" ? ".webp" : ".jpg";
  return name.replace(/\.[^.]+$/, extension);
}

async function loadImageSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall back to HTMLImageElement below.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: image, width: image.width, height: image.height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load image for compression."));
    };
    image.src = url;
  });
}
