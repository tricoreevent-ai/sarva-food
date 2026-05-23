"use client";

import Image, { type ImageProps } from "next/image";
import { useMemo, useState } from "react";

export const IMAGE_FALLBACKS = {
  food: "/images/fallback-food.svg",
  restaurant: "/images/fallback-restaurant.svg",
  logo: "/images/fallback-logo.svg",
} as const;

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: ImageProps["src"] | null;
  fallbackSrc?: string;
};

export function SafeImage({ src, fallbackSrc = IMAGE_FALLBACKS.food, onError, unoptimized, alt, ...props }: SafeImageProps) {
  const initialSrc = useMemo(() => normalizeImageSrc(src, fallbackSrc), [src, fallbackSrc]);
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const currentSrc = failedSrc === initialSrc ? fallbackSrc : initialSrc;

  const isInlinePreview = typeof currentSrc === "string" && (currentSrc.startsWith("data:image/") || currentSrc.startsWith("blob:"));
  const isSvg = typeof currentSrc === "string" && currentSrc.endsWith(".svg");

  return (
    <Image
      {...props}
      alt={alt}
      src={currentSrc}
      unoptimized={unoptimized ?? (isSvg || isInlinePreview)}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setFailedSrc(initialSrc);
        }
        onError?.(event);
      }}
    />
  );
}

function normalizeImageSrc(src: SafeImageProps["src"], fallbackSrc: string): ImageProps["src"] {
  if (!src) return fallbackSrc;
  if (typeof src !== "string") return src;
  if (src.startsWith("/")) return src;

  try {
    const url = new URL(src);
    return ["https:", "http:", "blob:", "data:"].includes(url.protocol) ? src : fallbackSrc;
  } catch {
    return fallbackSrc;
  }
}
