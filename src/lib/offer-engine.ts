import type { Offer } from "@/lib/types";

export function isOfferActive(offer: Offer, now = new Date()) {
  if (offer.status && offer.status !== "active") return false;
  const startsAt = offer.validFrom ? Date.parse(offer.validFrom) : 0;
  const endsAt = offer.validTo ? Date.parse(offer.validTo) : 0;
  if (startsAt && startsAt > now.getTime()) return false;
  if (endsAt && endsAt < now.getTime()) return false;
  if (offer.daysOfWeek?.length) {
    const day = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    if (!offer.daysOfWeek.map((item) => item.toLowerCase().slice(0, 3)).includes(day)) return false;
  }
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (offer.startTime && currentTime < offer.startTime) return false;
  if (offer.endTime && currentTime > offer.endTime) return false;
  return true;
}

export function offerPriority(offer: Offer) {
  return [
    offer.sponsored ? 1_000_000 + (offer.sponsoredPriority ?? 0) : 0,
    offer.featured ? 100_000 : 0,
    offer.showOnHomepage === false || offer.hiddenFromHomepage ? -100_000 : 0,
    offer.priority ?? 0,
    offer.discount ?? 0,
  ].reduce((sum, value) => sum + value, 0);
}

export function sortOffers(offers: Offer[]) {
  return offers.slice().sort((first, second) => offerPriority(second) - offerPriority(first));
}

export function isOfferForSurface(offer: Offer, surface: "homepage" | "restaurant") {
  if (surface === "homepage") return offer.showOnHomepage !== false && !offer.hiddenFromHomepage;
  return offer.showOnRestaurantPage !== false;
}

export function offerAppliesToFulfillment(offer: Offer, fulfillment: "delivery" | "parcel" | "dine-in" | "takeaway") {
  return !offer.appliesTo?.length || offer.appliesTo.includes(fulfillment);
}
