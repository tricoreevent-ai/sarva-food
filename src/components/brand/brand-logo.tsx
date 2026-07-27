"use client";

import Image from "next/image";
import { memo, type RefObject, useEffect, useRef, useState } from "react";
import { useBrand } from "@/components/brand/brand-provider";
import { BRAND_CONFIG, type BrandLogoVariant } from "@/config/branding";
import { brandSurfaceFromCssColor, getAppIcon, getBrandSurfaceTone, getLoadingLogo, getLogoVariant, surfaceNeedsLightLogo, type BrandSurface } from "@/lib/brand-system";
import { cn } from "@/lib/utils";

type BrandSize = "small" | "medium" | "large" | "responsive";
type BrandLogoProps = {
  language?: "english" | "malayalam";
  variant?: BrandLogoVariant;
  surface?: BrandSurface;
  size?: BrandSize;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  showText?: boolean;
};

const sizeClass: Record<BrandSize, string> = {
  small: "h-8",
  medium: "h-10",
  large: "h-14",
  responsive: "h-9 sm:h-10",
};

export const BrandLogo = memo(function BrandLogo({
  variant = "header",
  surface,
  size = "responsive",
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 144px, 180px",
  showText = true,
}: BrandLogoProps) {
  const brand = useBrand();
  const { surfaceRef, resolvedSurface } = useAutoBrandSurface(surface ?? brand.surface);
  if (variant === "icon") return <BrandIcon className={className} priority={priority} sizes="48px" surface={resolvedSurface} />;
  if (variant === "vertical") return <BrandMarkImage surfaceRef={surfaceRef} src={getLogoVariant("vertical", resolvedSurface)} className={cn("h-24 w-40", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  if (variant === "monochrome") return <BrandMarkImage surfaceRef={surfaceRef} src={getLogoVariant("monochrome", resolvedSurface)} className={cn("h-10 w-36", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  if (variant === "outline") return <BrandMarkImage surfaceRef={surfaceRef} src={getLogoVariant("outline", resolvedSurface)} className={cn("h-10 w-36", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  if (variant === "receipt" || variant === "invoice" || !showText) {
    return <BrandMarkImage surfaceRef={surfaceRef} src={getLogoVariant(variant === "invoice" ? "invoice" : "receipt", resolvedSurface)} className={cn("h-10 w-28", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  }

  return (
    <span ref={surfaceRef} className={cn("inline-flex shrink-0 items-center gap-2.5", sizeClass[size], className)} aria-label={BRAND_CONFIG.name}>
      <BrandIcon className="size-9 rounded-xl sm:size-10" priority={priority} sizes="40px" surface={resolvedSurface} />
      <BrandWordmark className="hidden leading-none sm:block" surface={resolvedSurface} />
    </span>
  );
});

export function BrandIcon({
  className,
  priority = false,
  sizes = "48px",
  variant = "filled",
  surface,
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
  variant?: "filled" | "monochrome" | "maskable";
  surface?: BrandSurface;
}) {
  const brand = useBrand();
  const { surfaceRef, resolvedSurface } = useAutoBrandSurface(surface ?? brand.surface);
  const src = variant === "monochrome" ? BRAND_CONFIG.assets.iconMonochrome : variant === "maskable" ? BRAND_CONFIG.assets.iconMaskable : getAppIcon(resolvedSurface);
  const tone = getBrandSurfaceTone(resolvedSurface);
  return (
    <span
      ref={surfaceRef}
      className={cn(
        "brand-mark relative block size-10 shrink-0 overflow-hidden rounded-xl",
        tone === "on-light" && "bg-white ring-1 ring-emerald-900/10",
        tone === "on-dark" && "bg-white/10 ring-1 ring-white/20",
        tone === "print" && "bg-white ring-1 ring-slate-900/20",
        className,
      )}
      aria-hidden="true"
    >
      <Image src={src} alt="" fill sizes={sizes} priority={priority} className="object-contain" />
    </span>
  );
}

export function AppIcon(props: Omit<Parameters<typeof BrandIcon>[0], "variant">) {
  return <BrandIcon {...props} variant="maskable" />;
}

export function BrandWordmark({ className, surface }: { className?: string; surface?: BrandSurface }) {
  const brand = useBrand();
  const resolvedSurface = surface ?? brand.surface;
  const onDark = surfaceNeedsLightLogo(resolvedSurface);
  return (
    <span className={cn("whitespace-nowrap text-xl font-black tracking-tight", className)} aria-hidden="true">
      <span style={{ color: onDark ? "#FFFFFF" : BRAND_CONFIG.colors.primaryDark }}>Food</span>{" "}
      <span style={{ color: onDark ? "#FFB24A" : BRAND_CONFIG.colors.accentDark }}>Gedi</span>
    </span>
  );
}

export function LoadingLogo({ className, priority = false, surface }: { className?: string; priority?: boolean; surface?: BrandSurface }) {
  const brand = useBrand();
  const { surfaceRef, resolvedSurface } = useAutoBrandSurface(surface ?? brand.surface);
  return (
    <span ref={surfaceRef} className={cn("motion-safe:animate-[brandPulse_1000ms_ease-in-out_infinite] inline-grid place-items-center", className)}>
      <span className="relative block size-16 overflow-hidden rounded-2xl">
        <Image src={getLoadingLogo(resolvedSurface)} alt="" fill sizes="64px" priority={priority} className="object-contain" />
      </span>
    </span>
  );
}

export function BrandBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700", className)}>
      <BrandIcon className="size-5 rounded-md" sizes="20px" surface="light" />
      {BRAND_CONFIG.shortName}
    </span>
  );
}

export function BrandIllustration({
  variant = "dashboard",
  className,
  priority = false,
}: {
  variant?: "empty" | "loading" | "auth" | "dashboard";
  className?: string;
  priority?: boolean;
}) {
  const src = {
    empty: BRAND_CONFIG.assets.emptyStateIllustration,
    loading: BRAND_CONFIG.assets.loadingIllustration,
    auth: BRAND_CONFIG.assets.authIllustration,
    dashboard: BRAND_CONFIG.assets.dashboardIllustration,
  }[variant];
  return <BrandMarkImage src={src} className={cn("h-28 w-52", className)} priority={priority} sizes="208px" />;
}

function BrandMarkImage({
  surfaceRef,
  src,
  className,
  imageClassName,
  priority,
  sizes,
}: {
  surfaceRef?: RefObject<HTMLSpanElement | null>;
  src: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <span ref={surfaceRef} className={cn("relative block shrink-0", className)} aria-label={BRAND_CONFIG.name}>
      <Image src={src} alt={BRAND_CONFIG.name} fill sizes={sizes} priority={priority} className={cn("object-contain", imageClassName)} />
    </span>
  );
}

function useAutoBrandSurface(requested: BrandSurface = "auto") {
  const surfaceRef = useRef<HTMLSpanElement>(null);
  const [detected, setDetected] = useState<BrandSurface>("light");

  useEffect(() => {
    if (requested !== "auto") return;
    let node: HTMLElement | null = surfaceRef.current;
    while (node) {
      const next = brandSurfaceFromCssColor(window.getComputedStyle(node).backgroundColor, "transparent");
      if (next !== "transparent") {
        setDetected(next);
        return;
      }
      node = node.parentElement;
    }
    setDetected("light");
  }, [requested]);

  return { surfaceRef, resolvedSurface: requested === "auto" ? detected : requested };
}
