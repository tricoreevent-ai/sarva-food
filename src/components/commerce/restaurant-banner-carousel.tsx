"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { cn } from "@/lib/utils";

type RestaurantBannerCarouselProps = {
  images: string[];
  alt: string;
  sizes: string;
  intervalMs?: number;
  className?: string;
};

export function RestaurantBannerCarousel({
  images,
  alt,
  sizes,
  intervalMs = 4500,
  className,
}: RestaurantBannerCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const slides = useMemo(() => uniqueImages(images), [images]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || slides.length <= 1 || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "160px 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [slides.length]);

  useEffect(() => {
    if (!visible || slides.length <= 1) return;

    const id = window.setInterval(() => {
      setActive((current) => {
        setPrev(current);
        return (current + 1) % slides.length;
      });
      window.setTimeout(() => setPrev(null), 750);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, slides.length, visible]);

  const current = slides[active] ?? IMAGE_FALLBACKS.restaurant;
  const next = slides.length > 1 ? slides[(active + 1) % slides.length] : "";
  const renderIndexes = Array.from(new Set([prev, active, visible && next ? (active + 1) % slides.length : null].filter((item): item is number => item !== null)));

  return (
    <div ref={rootRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      {slides.length <= 1 ? (
        <SafeImage
          src={current}
          alt={alt}
          fill
          loading="lazy"
          decoding="async"
          fallbackSrc={IMAGE_FALLBACKS.restaurant}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        renderIndexes.map((index) => (
          <SafeImage
            key={`${slides[index]}-${index}`}
            src={slides[index]}
            alt={index === active ? alt : ""}
            fill
            loading="lazy"
            decoding="async"
            fallbackSrc={IMAGE_FALLBACKS.restaurant}
            sizes={sizes}
            className={cn(
              "object-cover opacity-0 transition-opacity duration-700 ease-out",
              index === active && "opacity-100",
            )}
          />
        ))
      )}
    </div>
  );
}

function uniqueImages(images: string[]) {
  const clean = Array.from(new Set(images.filter(Boolean))).slice(0, 5);
  return clean.length ? clean : [IMAGE_FALLBACKS.restaurant];
}
