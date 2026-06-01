import { Home, Percent, Search, ShoppingBag, UserRound } from "lucide-react";

export const customerConfig = {
  storageKey: "sarva-customer-auth",
  allowedRoles: ["customer"],
  protectedRoutes: ["/account", "/profile", "/orders", "/wallet", "/addresses", "/favorites"],
  routes: [
    { label: "Home", href: "/", icon: Home },
    { label: "Restaurants", href: "/restaurants", icon: Search },
    { label: "Offers", href: "/offers", icon: Percent },
    { label: "Cart", href: "/cart", icon: ShoppingBag },
    { label: "Profile", href: "/account/profile", icon: UserRound },
  ],
} as const;
