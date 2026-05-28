import { BarChart3, ClipboardList, CreditCard, LayoutTemplate, ShieldCheck, Store, Users } from "lucide-react";

export const adminConfig = {
  storageKey: "sarva-admin-auth",
  allowedRoles: ["admin", "super_admin"],
  routes: [
    { label: "Overview", href: "/admin", icon: BarChart3 },
    { label: "Restaurants", href: "/admin/restaurants", icon: Store },
    { label: "Restaurant Leads", href: "/admin/leads", icon: ClipboardList },
    { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
    { label: "CMS", href: "/admin/cms", icon: LayoutTemplate },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Diagnostics", href: "/admin/system/diagnostics", icon: ShieldCheck },
  ],
} as const;
