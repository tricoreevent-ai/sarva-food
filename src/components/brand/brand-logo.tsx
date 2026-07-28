"use client";

import Image from "next/image";
import { memo, type RefObject, useEffect, useId, useRef, useState } from "react";
import { useBrand } from "@/components/brand/brand-provider";
import { BRAND_CONFIG, type BrandLogoVariant } from "@/config/branding";
import { brandSurfaceFromCssColor, getBrandSurfaceTone, getLoadingLogo, getLogoVariant, surfaceNeedsLightLogo, type BrandSurface } from "@/lib/brand-system";
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
      <BrandIcon className="size-9 sm:size-10" priority={priority} sizes="40px" surface={resolvedSurface} />
      <BrandWordmark className="hidden leading-none sm:block" surface={resolvedSurface} />
    </span>
  );
});

export function BrandIcon({
  className,
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
  const tone = getBrandSurfaceTone(resolvedSurface);
  const iconMode = variant === "monochrome" ? tone === "on-dark" ? "white" : "black" : tone === "on-dark" ? "white" : "color";
  return (
    <span
      ref={surfaceRef}
      data-brand-logo-icon
      className={cn(
        "brand-mark relative block size-10 shrink-0",
        variant === "maskable" && "overflow-hidden rounded-xl",
        variant === "maskable" && tone === "on-light" && "bg-white ring-1 ring-emerald-900/10",
        variant === "maskable" && tone === "on-dark" && "bg-white/10 ring-1 ring-white/20",
        variant === "maskable" && tone === "print" && "bg-white ring-1 ring-slate-900/20",
        className,
      )}
      aria-hidden="true"
    >
      <FoodGediIconSvg mode={iconMode} tile={variant === "maskable"} className="size-full" />
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
      <span className="relative block size-16">
        <Image src={getLoadingLogo(resolvedSurface)} alt="" fill sizes="64px" priority={priority} className="object-contain" />
      </span>
    </span>
  );
}

export function BrandBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700", className)}>
      <BrandIcon className="size-5" sizes="20px" surface="light" />
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

function FoodGediIconSvg({ mode, tile, className }: { mode: "color" | "white" | "black"; tile: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const color = mode === "color";
  const white = mode === "white";
  const titleId = `${id}-title`;
  const greenId = `${id}-green`;
  const orangeId = `${id}-orange`;
  const green = color ? `url(#${greenId})` : white ? "#FFFFFF" : "#111827";
  const orange = color ? `url(#${orangeId})` : white ? "#FFFFFF" : "#111827";
  const cloche = white ? "#FFB24A" : orange;
  return (
    <svg className={className} viewBox="0 0 512 512" role="img" aria-labelledby={titleId} focusable="false">
      <title id={titleId}>{BRAND_CONFIG.name} icon</title>
      {color ? (
        <defs>
          <linearGradient id={greenId} x1="77" y1="105" x2="329" y2="407" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22A33A" />
            <stop offset="1" stopColor="#0B3F1D" />
          </linearGradient>
          <linearGradient id={orangeId} x1="242" y1="116" x2="409" y2="406" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF8A00" />
            <stop offset="1" stopColor="#FF6A00" />
          </linearGradient>
        </defs>
      ) : null}
      {tile ? <rect x="22" y="22" width="468" height="468" rx="104" fill="#FFFFFF" opacity=".94" /> : null}
      <path d="M116 202C128 119 190 62 259 62c69 0 132 57 144 140h-39C353 144 309 104 259 104c-51 0-94 39-106 98h-37Z" fill={green} />
      <path d="M240 46c0-15 13-27 29-27 17 0 31 12 31 27 0 16-14 25-32 25-16 0-28-10-28-25Zm19 4c0 4 4 7 10 7 7 0 12-3 12-7s-5-7-11-7c-7 0-11 3-11 7Z" fill={green} />
      <path d="M178 186c10-53 43-83 87-83 46 0 80 31 89 83H178Z" fill={cloche} stroke={white ? "#FFB24A" : color ? "#FF7A00" : "#111827"} strokeWidth="5" />
      <path d="M218 175c9-28 27-44 54-48" fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" opacity=".92" />
      <path d="M92 226c0-20 16-36 36-36h110c20 0 35 15 35 34 0 20-15 35-35 35h-80v39h75c20 0 35 15 35 34s-15 35-35 35h-75v91l-66-64V226Z" fill={green} />
      <path d="M296 322c0-76 56-134 132-134h8c19 0 34 15 34 34s-15 34-34 34h-8c-36 0-63 29-63 66 0 40 29 69 69 69 24 0 45-10 58-29h-68c-19 0-33-14-33-32s14-32 33-32h119v26c0 82-49 135-119 135-74 0-128-58-128-137Z" fill={orange} transform="translate(44 0) scale(.82 1)" />
      {color ? <rect x="22" y="22" width="468" height="468" rx="104" fill="none" stroke="#166B2E" strokeWidth="10" opacity=".12" /> : null}
    </svg>
  );
}
