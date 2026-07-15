export const CLOUDINARY_IMAGE_TRANSFORMS = {
  auto: "f_auto,q_auto,dpr_auto",
  thumbnail: "c_fill,w_160,h_120,f_auto,q_auto:eco,dpr_auto",
  small: "c_fill,w_320,h_240,f_auto,q_auto:eco,dpr_auto",
  medium: "c_fill,w_640,h_480,f_auto,q_auto,dpr_auto",
  large: "c_limit,w_960,f_auto,q_auto,dpr_auto",
  hero: "c_fill,w_1920,h_720,f_auto,q_auto:good,dpr_auto",
  avatar: "c_fill,w_160,h_160,g_auto,f_auto,q_auto:good,dpr_auto",
  cart: "c_fill,w_96,h_96,f_auto,q_auto:eco,dpr_auto",
  adminTable: "c_fill,w_72,h_72,f_auto,q_auto:eco,dpr_auto",
  restaurantCard: "c_fill,w_400,h_225,f_auto,q_auto,dpr_auto",
  productGrid: "c_fill,w_420,h_315,f_auto,q_auto,dpr_auto",
  offerCard: "c_fill,w_640,h_360,f_auto,q_auto,dpr_auto",
  categoryIcon: "c_fill,w_160,h_160,f_auto,q_auto:eco,dpr_auto",
  logo: "c_fit,w_320,h_320,f_auto,q_auto:best,dpr_auto",
} as const;

export type CloudinaryImagePreset = keyof typeof CLOUDINARY_IMAGE_TRANSFORMS;
export type CloudinaryUploadKind = "photo" | "logo" | "avatar";

const marker = "/upload/";
const transformToken = /^(a_|ar_|b_|bo_|c_|co_|dpr_|e_|f_|fl_|g_|h_|l_|o_|q_|r_|t_|w_|x_|y_|z_)/;

export function cloudinaryImageUrl(url: string, preset: CloudinaryImagePreset = "auto") {
  return withCloudinaryTransform(url, CLOUDINARY_IMAGE_TRANSFORMS[preset]);
}

export function cloudinaryThumbnailUrl(url: string) {
  if (url.includes("images.unsplash.com")) return unsplashImageUrl(url, 400, 225, 75);
  return cloudinaryImageUrl(url, "restaurantCard");
}

export function withCloudinaryTransform(url: string, transform: string) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const [prefix, rest = ""] = url.split(marker);
  const parts = rest.split("/").filter(Boolean);
  if (parts[0] && isTransformSegment(parts[0])) parts.shift();
  return `${prefix}${marker}${transform}/${parts.join("/")}`;
}

export function unsplashImageUrl(url: string, width: number, height: number, quality = 75) {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("auto", "format");
    if (!nextUrl.searchParams.has("fit")) nextUrl.searchParams.set("fit", "crop");
    nextUrl.searchParams.set("w", String(width));
    nextUrl.searchParams.set("h", String(height));
    nextUrl.searchParams.set("q", String(quality));
    return nextUrl.toString();
  } catch {
    return url;
  }
}

export function cloudinaryIncomingTransform(kind: CloudinaryUploadKind, maxWidth = 2000, maxHeight = 2000) {
  const quality = kind === "logo" ? "q_auto:best" : kind === "avatar" ? "q_auto:good" : "q_auto:good";
  return `a_auto,c_limit,w_${maxWidth},h_${maxHeight},${quality},fl_strip_profile`;
}

function isTransformSegment(segment: string) {
  if (/^v\d+$/.test(segment)) return false;
  return segment.split(",").some((part) => transformToken.test(part));
}
