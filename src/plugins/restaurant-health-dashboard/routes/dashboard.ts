import type { RestaurantHealthSnapshot } from "../types";

export function createDashboardRoute(snapshot: RestaurantHealthSnapshot) {
  return {
    title: "Restaurant Health",
    path: "/admin/plugins/restaurant-health",
    status: snapshot.status,
    cards: snapshot.signals.map((signal) => ({
      id: signal.id,
      label: signal.label,
      status: signal.status,
      value: signal.value,
    })),
  };
}
