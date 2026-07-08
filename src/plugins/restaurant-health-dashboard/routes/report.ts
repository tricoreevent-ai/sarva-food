import type { RestaurantHealthSnapshot } from "../types";

export function createReportRoute(snapshot: RestaurantHealthSnapshot) {
  return {
    title: "Restaurant Health Report",
    generatedAt: snapshot.generatedAt,
    status: snapshot.status,
    metrics: {
      healthScore: snapshot.healthScore,
      routes: snapshot.routes,
      navigation: snapshot.navigation,
      assets: snapshot.assets,
      extensionPoints: snapshot.extensionPoints,
    },
    storage: snapshot.storage,
  };
}
