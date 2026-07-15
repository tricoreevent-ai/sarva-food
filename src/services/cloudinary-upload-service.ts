import { compressImageFile } from "@/lib/image-optimization";
import {
  cloudinaryImageUrl,
  cloudinaryIncomingTransform,
  cloudinaryThumbnailUrl,
  withCloudinaryTransform as applyCloudinaryTransform,
  type CloudinaryUploadKind,
} from "@/lib/cloudinary-images";

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
  type?: "image/avif" | "image/webp" | "image/jpeg";
  kind?: CloudinaryUploadKind;
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
  const uploadTarget = imageUploadTarget(options);
  const optimizedFile = await compressImageFile(file, {
    maxWidth: options.maxWidth ?? uploadTarget.maxWidth,
    maxHeight: options.maxHeight ?? uploadTarget.maxHeight,
    aspectRatio: options.aspectRatio,
    quality: options.quality ?? uploadTarget.quality,
    type: options.type,
    kind: uploadTarget.kind,
  });
  const uploadParams = cloudinaryUploadParams(uploadTarget);
  const signature = await getCloudinarySignature({
    folder: buildFolder(options.folder, options.restaurantId),
    tags: ["sarva-food", options.folder, options.restaurantId, ...(options.tags ?? [])].filter(Boolean) as string[],
    params: uploadParams,
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
  applyFormDataParams(formData, uploadParams);

  return uploadSignedFormData(signature.cloudName, formData);
}

export async function uploadRemoteImageToCloudinary(url: string, options: UploadOptions): Promise<CloudinaryUploadResult> {
  const remoteUrl = normalizeRemoteImageUrl(url);
  const uploadTarget = imageUploadTarget(options);
  const uploadParams = cloudinaryUploadParams(uploadTarget);
  const signature = await getCloudinarySignature({
    folder: buildFolder(options.folder, options.restaurantId),
    tags: ["sarva-food", options.folder, options.restaurantId, ...(options.tags ?? [])].filter(Boolean) as string[],
    params: uploadParams,
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
  applyFormDataParams(formData, uploadParams);

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
  return cloudinaryThumbnailUrl(url);
}

export function withCloudinaryTransform(url: string, transform = "f_auto,q_auto,dpr_auto") {
  return applyCloudinaryTransform(url, transform);
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
    downloadUrl: cloudinaryImageUrl(data.secure_url),
    secureUrl: cloudinaryImageUrl(data.secure_url),
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    thumbnailUrl: buildThumbnailUrl(data.secure_url),
  };
}

function imageUploadTarget(options: UploadOptions) {
  const kind = options.kind ?? inferImageKind(options);
  const heroLike = Number(options.aspectRatio ?? 0) > 2;
  return {
    kind,
    maxWidth: kind === "logo" || kind === "avatar" ? 1024 : heroLike ? 2200 : 1800,
    maxHeight: kind === "logo" || kind === "avatar" ? 1024 : 1600,
    quality: kind === "logo" ? 0.95 : undefined,
  };
}

function inferImageKind(options: UploadOptions): CloudinaryUploadKind {
  const text = `${options.folder} ${(options.tags ?? []).join(" ")}`.toLowerCase();
  if (/logo|branding/.test(text)) return "logo";
  if (/profile|avatar|staff/.test(text)) return "avatar";
  return "photo";
}

function cloudinaryUploadParams(target: ReturnType<typeof imageUploadTarget>) {
  return {
    transformation: cloudinaryIncomingTransform(target.kind, target.maxWidth, target.maxHeight),
    quality_analysis: "false",
  };
}

function applyFormDataParams(formData: FormData, params: Record<string, string | number | boolean | undefined>) {
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) formData.set(key, String(value));
  });
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
