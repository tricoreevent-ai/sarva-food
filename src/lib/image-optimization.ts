import { IMAGE_UPLOAD } from "@/lib/constants";

export type ImageCompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  quality?: number;
  type?: "image/webp" | "image/jpeg";
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
  const quality = options.quality ?? IMAGE_UPLOAD.quality;
  const outputType = options.type ?? IMAGE_UPLOAD.type;
  const image = await loadImage(file);
  const crop = getCenterCrop(image.width, image.height, options.aspectRatio);
  const scale = Math.min(1, maxWidth / crop.width, maxHeight / crop.height);
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, quality),
  );
  if (!blob) return file;

  const optimizedName = file.name.replace(/\.[^.]+$/, outputType === "image/webp" ? ".webp" : ".jpg");
  return new File([blob], optimizedName, { type: outputType });
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

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load image for compression."));
    };
    image.src = url;
  });
}
