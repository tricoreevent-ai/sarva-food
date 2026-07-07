import Link from "next/link";
import { memo } from "react";
import { Bike, Clock, MapPin, Star } from "lucide-react";
import { RestaurantBannerCarousel } from "@/components/commerce/restaurant-banner-carousel";
import { IMAGE_FALLBACKS } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { getRestaurantOperatingStatus } from "@/lib/restaurant-operating-status";
import type { Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function RestaurantCardComponent({ restaurant }: { restaurant: Restaurant & { distanceKm?: number } }) {
  const operatingStatus = getRestaurantOperatingStatus(restaurant);
  const images = restaurantListingImages(restaurant);

  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      prefetch={false}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <article className="mobile-premium-card touch-lift content-visibility-auto h-full overflow-hidden rounded-lg bg-card transition-transform duration-300 group-hover:-translate-y-1">
        <div className="relative aspect-[16/11] overflow-hidden bg-muted">
          <RestaurantBannerCarousel
            images={images}
            alt={`${restaurant.name} food preview`}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            intervalMs={4200}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            {restaurant.rating > 0 ? (
              <Badge className="rounded-full bg-white text-primary shadow-sm">
                <Star className="mr-1 size-3 fill-current" aria-hidden="true" />
                {restaurant.rating}
              </Badge>
            ) : null}
            <Badge className="rounded-full" variant={operatingStatus.open ? "success" : "warning"}>
              {operatingStatus.label}
            </Badge>
          </div>
          {restaurant.deliveryEligible !== undefined ? (
            <div className="absolute bottom-3 right-3">
              <Badge className="rounded-full bg-white text-primary">
                {restaurant.deliveryEligible ? "Delivers here" : "Out of range"}
              </Badge>
            </div>
          ) : null}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h2 className="text-lg font-black">{restaurant.name}</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{restaurant.cuisine}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {operatingStatus.detail || restaurant.deliveryTime || "Timing pending"}
            </span>
            {restaurant.deliveryRadiusKm ? (
              <span className="inline-flex items-center gap-1">
                <Bike className="size-3" aria-hidden="true" />
                {restaurant.deliveryRadiusKm} km radius
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {typeof restaurant.distanceKm === "number"
                ? `${restaurant.distanceKm} km`
                : restaurant.location}
            </span>
            {restaurant.priceForTwo > 0 ? <span>{formatCurrency(restaurant.priceForTwo)} for two</span> : null}
            {typeof restaurant.deliveryFee === "number" ? (
              <span>{restaurant.deliveryFee === 0 ? "Free delivery" : `${formatCurrency(restaurant.deliveryFee)} fee`}</span>
            ) : null}
          </div>
          {typeof restaurant.reviewCount === "number" && restaurant.reviewCount > 0 ? (
            <p className="text-xs font-bold text-muted-foreground">
              {restaurant.reviewCount.toLocaleString("en-IN")} verified reviews
            </p>
          ) : null}
          <div className="relative">
            <div className="customer-scroll flex gap-2 overflow-x-auto pr-8">
              {restaurant.tags.slice(0, 8).map((tag) => (
                <Badge key={tag} variant="muted" className="shrink-0 rounded-full">
                  {tag}
                </Badge>
              ))}
            </div>
            {restaurant.tags.length > 3 ? <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" aria-hidden="true" /> : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

export const RestaurantCard = memo(RestaurantCardComponent);

function restaurantListingImages(restaurant: Restaurant) {
  const images = restaurant.activeBannerThumbnails?.length ? restaurant.activeBannerThumbnails : restaurant.thumbnailImages ?? [];
  const unique = Array.from(new Set(images.filter(Boolean))).slice(0, 5);
  return unique.length ? unique : [IMAGE_FALLBACKS.restaurant];
}
