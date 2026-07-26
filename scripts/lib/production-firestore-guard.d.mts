export type ProductionFirestorePlan = {
  name: string;
  projectId?: string;
  reads?: number;
  writes?: number;
  deletes?: number;
  details?: string[];
};

export function productionFirestorePlan(plan: ProductionFirestorePlan): Required<ProductionFirestorePlan>;
export function assertProductionFirestoreAllowed(plan: ProductionFirestorePlan): void;
