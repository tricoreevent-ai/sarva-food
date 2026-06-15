export const DEFAULT_TENANT_ID = "cafe-al-arab-thanisandra";
export const DEFAULT_RESTAURANT_ID = DEFAULT_TENANT_ID;
export const DEFAULT_BRANCH_ID = "br-cafe-al-arab-thanisandra";
const TENANT_ALIASES = new Map([
  ["cafe-al-arab", DEFAULT_TENANT_ID],
  ["cafe-al-arab-ul", DEFAULT_TENANT_ID],
  ["cafe-al-arab-ul-thanisandra", DEFAULT_TENANT_ID],
]);

export type TenantScoped = {
  tenantId?: string;
  restaurantId?: string;
};

export function resolveTenantId(input?: TenantScoped | string | null) {
  const value = typeof input === "string" ? input : input?.tenantId ?? input?.restaurantId;
  return normalizeTenantId(value);
}

export function withTenantId<T extends TenantScoped>(value: T): T & { tenantId: string } {
  return {
    ...value,
    tenantId: resolveTenantId(value),
  };
}

export function tenantAliases(input?: TenantScoped | string | null) {
  const tenantId = resolveTenantId(input);
  if (tenantId !== DEFAULT_TENANT_ID) return [tenantId];
  return [DEFAULT_TENANT_ID, ...TENANT_ALIASES.keys()];
}

function normalizeTenantId(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || DEFAULT_TENANT_ID;
  return TENANT_ALIASES.get(normalized) ?? normalized;
}
