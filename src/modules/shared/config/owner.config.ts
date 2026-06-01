import { ChefHat, ClipboardList, Home, ImagePlus, ReceiptText, Settings2, Store, Table2, Users } from "lucide-react";

export const ownerConfig = {
  storageKey: "sarva-owner-auth",
  allowedRoles: ["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "accountant", "inventory-manager", "delivery-staff", "delivery"],
  routes: [
    { label: "Overview", href: "/owner", icon: Home },
    { label: "Orders", href: "/owner/orders", icon: ClipboardList },
    { label: "Kitchen Queue", href: "/owner/kitchen", icon: ChefHat },
    { label: "POS", href: "/owner/pos", icon: ReceiptText },
    { label: "Menu", href: "/owner/menu", icon: Store },
    { label: "Banners", href: "/owner/settings?tab=branding", icon: ImagePlus },
    { label: "Tables", href: "/owner/tables", icon: Table2 },
    { label: "Customers", href: "/owner/loyalty", icon: Users },
    { label: "Settings", href: "/owner/settings", icon: Settings2 },
  ],
} as const;
