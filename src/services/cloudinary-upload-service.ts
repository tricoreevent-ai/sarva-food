import { compressImageFile } from "@/lib/image-optimization";

export type CloudinaryUploadFolder =
  | "menu"
  | "categories"
  | "cuisines"
  | "combos"
  | "offers"
  | "cms"
  | "social"
  | "profile"
  | "reviews"
  | "catering";

export type CloudinaryUploadResult = {
  imagePath: string;
  downloadUrl: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  thumbnailUrl?: string;
};

type UploadOptions = {
  folder: CloudinaryUploadFolder | string;
  restaurantId?: string;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  quality?: number;
  type?: "image/webp" | "image/jpeg";
  tags?: string[];
};

type SignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  tags: string;
  signature: string;
  error?: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: { message?: string };
};

export async function uploadImageToCloudinary(file: File, options: UploadOptions): Promise<CloudinaryUploadResult> {
  const optimizedFile = await compressImageFile(file, {
    maxWidth: options.maxWidth ?? 1600,
    maxHeight: options.maxHeight ?? 1200,
    aspectRatio: options.aspectRatio,
    quality: options.quality ?? 0.86,
    type: options.type ?? "image/webp",
  });
  const signature = await getCloudinarySignature({
    folder: buildFolder(options.folder, options.restaurantId),
    tags: ["sarva-food", options.folder, options.restaurantId, ...(options.tags ?? [])].filter(Boolean) as string[],
  });

  const formData = new FormData();
  formData.set("file", optimizedFile);
  formData.set("api_key", signature.apiKey);
  formData.set("timestamp", String(signature.timestamp));
  formData.set("signature", signature.signature);
  formData.set("folder", signature.folder);
  formData.set("tags", signature.tags);
  formData.set("use_filename", "true");
  formData.set("unique_filename", "true");

  return uploadSignedFormData(signature.cloudName, formData);
}

export async function uploadRemoteImageToCloudinary(url: string, options: UploadOptions): Promise<CloudinaryUploadResult> {
  const remoteUrl = normalizeRemoteImageUrl(url);
  const signature = await getCloudinarySignature({
    folder: buildFolder(options.folder, options.restaurantId),
    tags: ["sarva-food", options.folder, options.restaurantId, ...(options.tags ?? [])].filter(Boolean) as string[],
  });

  const formData = new FormData();
  formData.set("file", remoteUrl);
  formData.set("api_key", signature.apiKey);
  formData.set("timestamp", String(signature.timestamp));
  formData.set("signature", signature.signature);
  formData.set("folder", signature.folder);
  formData.set("tags", signature.tags);
  formData.set("use_filename", "true");
  formData.set("unique_filename", "true");

  return uploadSignedFormData(signature.cloudName, formData);
}

export async function getCloudinarySignature(input: { folder: string; tags?: string[]; params?: Record<string, string | number | boolean | undefined> }) {
  const response = await fetch("/api/cloudinary/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as SignatureResponse;
  if (!response.ok || data.error) throw new Error(data.error || "Could not prepare Cloudinary upload.");
  return data;
}

export function buildFolder(folder: CloudinaryUploadFolder | string, restaurantId?: string) {
  return ["sarva-food", restaurantId, folder].filter(Boolean).join("/");
}

function buildThumbnailUrl(url: string) {
  return withCloudinaryTransform(url, "c_fill,w_320,h_240,q_auto,f_auto");
}

export function withCloudinaryTransform(url: string, transform = "f_auto,q_auto") {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto") || url.match(/\/upload\/[^/]+,q_auto/)) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

async function uploadSignedFormData(cloudName: string, formData: FormData): Promise<CloudinaryUploadResult> {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as CloudinaryUploadResponse;
  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message || "Cloudinary upload failed.");
  }

  return {
    imagePath: data.public_id,
    downloadUrl: withCloudinaryTransform(data.secure_url),
    secureUrl: withCloudinaryTransform(data.secure_url),
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    thumbnailUrl: buildThumbnailUrl(data.secure_url),
  };
}

function normalizeRemoteImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter an image web address.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid image web address.");
  }
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Only http and https image addresses are supported.");
  }
  return url.toString();
}
