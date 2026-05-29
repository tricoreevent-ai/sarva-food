export const DEFAULT_TENANT_ID = "cafe-al-arab-thanisandra";
export const DEFAULT_RESTAURANT_ID = DEFAULT_TENANT_ID;
export const DEFAULT_BRANCH_ID = "br-cafe-al-arab-thanisandra";

export type TenantScoped = {
  tenantId?: string;
  restaurantId?: string;
};

export function resolveTenantId(input?: TenantScoped | string | null) {
  if (!input) return DEFAULT_TENANT_ID;
  if (typeof input === "string") return input;
  return input.tenantId ?? input.restaurantId ?? DEFAULT_TENANT_ID;
}

export function withTenantId<T extends TenantScoped>(value: T): T & { tenantId: string } {
  return {
    ...value,
    tenantId: resolveTenantId(value),
  };
}
