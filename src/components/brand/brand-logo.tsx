import Image from "next/image";
import { BRAND_CONFIG, type BrandLogoVariant } from "@/config/branding";
import { cn } from "@/lib/utils";

type BrandSize = "small" | "medium" | "large" | "responsive";
type BrandLogoProps = {
  language?: "english" | "malayalam";
  variant?: BrandLogoVariant;
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

export function BrandLogo({
  variant = "header",
  size = "responsive",
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 144px, 180px",
  showText = true,
}: BrandLogoProps) {
  if (variant === "icon") return <BrandIcon className={className} priority={priority} sizes="48px" />;
  if (variant === "vertical") return <BrandMarkImage src={BRAND_CONFIG.assets.logoVertical} className={cn("h-24 w-40", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  if (variant === "monochrome") return <BrandMarkImage src={BRAND_CONFIG.assets.logoMonochrome} className={cn("h-10 w-36", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  if (variant === "outline") return <BrandMarkImage src={BRAND_CONFIG.assets.logoOutline} className={cn("h-10 w-36", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  if (variant === "receipt" || variant === "invoice" || !showText) {
    return <BrandMarkImage src={BRAND_CONFIG.assets.logoCompact} className={cn("h-10 w-28", className)} imageClassName={imageClassName} priority={priority} sizes={sizes} />;
  }

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", sizeClass[size], className)} aria-label={BRAND_CONFIG.name}>
      <BrandIcon className="size-9 rounded-xl sm:size-10" priority={priority} sizes="40px" />
      <BrandWordmark className="hidden leading-none sm:block" />
    </span>
  );
}

export function BrandIcon({
  className,
  priority = false,
  sizes = "48px",
  variant = "filled",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
  variant?: "filled" | "monochrome" | "maskable";
}) {
  const src = variant === "monochrome" ? BRAND_CONFIG.assets.iconMonochrome : variant === "maskable" ? BRAND_CONFIG.assets.iconMaskable : BRAND_CONFIG.assets.iconFilled;
  return (
    <span className={cn("relative block size-10 shrink-0 overflow-hidden rounded-xl", className)} aria-hidden="true">
      <Image src={src} alt="" fill sizes={sizes} priority={priority} className="object-contain" />
    </span>
  );
}

export function AppIcon(props: Omit<Parameters<typeof BrandIcon>[0], "variant">) {
  return <BrandIcon {...props} variant="maskable" />;
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("whitespace-nowrap text-xl font-black tracking-tight", className)} aria-hidden="true">
      <span className="text-[#166B2E]">Food</span> <span className="text-[#FF7A00]">Gedi</span>
    </span>
  );
}

export function LoadingLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("motion-safe:animate-[brandPulse_1000ms_ease-in-out_infinite] inline-grid place-items-center", className)}>
      <BrandIcon className="size-16 rounded-2xl" priority={priority} sizes="64px" />
    </span>
  );
}

export function BrandBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700", className)}>
      <BrandIcon className="size-5 rounded-md" sizes="20px" />
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
  src,
  className,
  imageClassName,
  priority,
  sizes,
}: {
  src: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <span className={cn("relative block shrink-0", className)} aria-label={BRAND_CONFIG.name}>
      <Image src={src} alt={BRAND_CONFIG.name} fill sizes={sizes} priority={priority} className={cn("object-contain", imageClassName)} />
    </span>
  );
}
