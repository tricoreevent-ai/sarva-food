import Image from "next/image";
import { BRAND_ASSETS, type BrandLogoLanguage } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  language?: BrandLogoLanguage;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function BrandLogo({
  language = "english",
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 136px, 180px",
}: BrandLogoProps) {
  void language;
  void priority;
  void sizes;

  return (
    <span className={cn("relative block h-10 w-36 shrink-0", className)} aria-label="Nammude" role="img">
      <svg
        viewBox="0 0 960 360"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-full w-full", imageClassName)}
        aria-hidden="true"
      >
        <path d="M426 92c-18-42-83-50-111-8-28-42-93-34-111 8-23 54 33 102 111 162 78-60 134-108 111-162Zm-178 12c10-25 50-32 67-5 17-27 57-20 67 5 13 32-21 65-67 102-46-37-80-70-67-102Z" fill="var(--logo-primary-color)" />
        <path d="M300 168 392 90c9-8 23-8 32 0l92 78-28 31-80-68-80 68-28-31Z" fill="#e59e30" />
        <path d="M393 176h29v29h-29zM432 176h29v29h-29zM393 216h29v29h-29zM432 216h29v29h-29z" fill="#a2ae36" />
        <path d="M557 157c42-41 91-42 133-5-18 47-57 70-115 62 20-17 43-38 66-64-31 14-57 31-84 7Z" fill="#a2ae36" />
        <text x="480" y="278" textAnchor="middle" fill="var(--logo-primary-color)" fontFamily="Georgia, 'Times New Roman', serif" fontSize="116" fontWeight="900" fontStyle="italic">Nammude</text>
        <path d="M105 323h145M710 323h145" stroke="var(--logo-secondary-color)" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
        <text x="480" y="335" textAnchor="middle" fill="var(--logo-secondary-color)" fontFamily="Arial, Helvetica, sans-serif" fontSize="32" fontWeight="800" letterSpacing="9">DIRECT FROM KITCHENS YOU TRUST</text>
      </svg>
    </span>
  );
}

export function BrandIcon({
  className,
  priority = false,
  sizes = "48px",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <span className={cn("relative block size-10 shrink-0 overflow-hidden rounded-xl", className)} aria-hidden="true">
      <Image src={BRAND_ASSETS.appIcon} alt="" fill sizes={sizes} priority={priority} className="object-contain" />
    </span>
  );
}
