export type ScaleRegion = {
  city: string;
  locale: string;
  currency: "INR" | "USD";
  timezone: string;
};

export const DEFAULT_REGION: ScaleRegion = {
  city: "Bengaluru",
  locale: "en-IN",
  currency: "INR",
  timezone: "Asia/Calcutta",
};

export type FranchiseScope = {
  brandId?: string;
  franchiseId?: string;
  city?: string;
};

export function buildRestaurantPartition(scope: FranchiseScope) {
  return [scope.brandId, scope.franchiseId, scope.city].filter(Boolean).join(":") || "single";
}
