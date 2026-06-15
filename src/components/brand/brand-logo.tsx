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
  const logo = BRAND_ASSETS.logos[language];

  return (
    <span className={cn("relative block h-10 w-36 shrink-0", className)} aria-label="Nammude">
      <Image
        src={logo.lightTheme}
        alt="Nammude"
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-contain dark:hidden", imageClassName)}
      />
      <Image
        src={logo.darkTheme}
        alt="Nammude"
        fill
        sizes={sizes}
        priority={priority}
        className={cn("hidden object-contain dark:block", imageClassName)}
      />
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
