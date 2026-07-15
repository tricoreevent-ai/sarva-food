import { CalendarClock, Mail, Star } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import type { Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function ScheduleRestaurantCard({
  restaurant,
  mode = "scheduled",
  advanceDays = 14,
}: {
  restaurant: Restaurant;
  mode?: "scheduled" | "catering";
  advanceDays?: number;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[1.8] bg-slate-100">
        <SafeImage src={restaurant.image} alt={restaurant.name} fill fallbackSrc={IMAGE_FALLBACKS.restaurant} cloudinaryPreset="restaurantCard" sizes="320px" className="object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-orange-600">
          {mode === "catering" ? "Catering Quote Available" : "Scheduled Delivery Available"}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="line-clamp-1 font-black text-slate-950">{restaurant.displayName ?? restaurant.name}</h2>
            <span className="flex items-center gap-1 text-xs font-bold text-slate-700"><Star className="size-3 fill-amber-400 text-amber-400" />{restaurant.rating || "New"}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{restaurant.cuisine}</p>
        </div>
        <div className="grid gap-1 text-xs font-semibold text-slate-500">
          <span><CalendarClock className="mr-1 inline size-3" />Schedule up to {advanceDays} days in advance</span>
          {mode === "catering" ? <span><Mail className="mr-1 inline size-3" />Owner can send revised quote by email</span> : null}
          <span>{restaurant.deliveryTime} · {formatCurrency(restaurant.minPrice ?? 199)} min order</span>
        </div>
        <span className="grid h-11 place-items-center rounded-xl border border-orange-300 text-sm font-black text-orange-600 group-hover:bg-orange-50">
          {mode === "catering" ? "Request Quote" : "Schedule Now"}
        </span>
      </div>
    </article>
  );
}
