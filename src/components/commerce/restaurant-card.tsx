import Link from "next/link";
import { memo } from "react";
import { Bike, Clock, MapPin, Star, TicketPercent } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import type { Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function RestaurantCardComponent({ restaurant }: { restaurant: Restaurant & { distanceKm?: number } }) {
  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <article className="mobile-premium-card touch-lift h-full overflow-hidden rounded-lg bg-card transition-transform duration-300 group-hover:-translate-y-1">
        <div className="relative aspect-[16/11] overflow-hidden bg-muted">
          <SafeImage
            src={restaurant.image}
            alt={`${restaurant.name} food preview`}
            fill
            fallbackSrc={IMAGE_FALLBACKS.restaurant}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            {restaurant.rating > 0 ? (
              <Badge className="rounded-full bg-white text-primary shadow-sm">
                <Star className="mr-1 size-3 fill-current" aria-hidden="true" />
                {restaurant.rating}
              </Badge>
            ) : null}
            <Badge className="rounded-full" variant={restaurant.isOpen ? "success" : "warning"}>
              {restaurant.isOpen ? "Open" : "Preorder"}
            </Badge>
          </div>
          {restaurant.deliveryEligible !== undefined ? (
            <div className="absolute bottom-3 right-3">
              <Badge className="rounded-full bg-white text-primary">
                {restaurant.deliveryEligible ? "Delivers here" : "Out of range"}
              </Badge>
            </div>
          ) : null}
          {restaurant.tags.some((tag) => tag.toLowerCase().includes("offer")) ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
              <Badge className="rounded-full bg-secondary text-secondary-foreground">
                <TicketPercent className="mr-1 size-3" aria-hidden="true" />
                Offers available
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
              {restaurant.deliveryTime || "Timing pending"}
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
          <div className="customer-scroll flex gap-2 overflow-x-auto">
            {restaurant.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="muted" className="shrink-0 rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}

export const RestaurantCard = memo(RestaurantCardComponent);
