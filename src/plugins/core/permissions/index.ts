export type PluginRole =
  | "guest"
  | "customer"
  | "kitchen"
  | "waiter"
  | "owner"
  | "admin"
  | "developer";

export type PluginPermissionPolicy = {
  roles: PluginRole[];
};

export function canAccessPlugin(policy: PluginPermissionPolicy, role: PluginRole) {
  return policy.roles.includes(role);
}

export function getRuntimePluginRole(): PluginRole {
  if (process.env.NODE_ENV !== "production") return "developer";
  return "guest";
}
