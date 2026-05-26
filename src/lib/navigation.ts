import {
  BarChart3,
  Bike,
  CalendarClock,
  ChefHat,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  ImagePlus,
  LayoutTemplate,
  MapPin,
  Megaphone,
  PackageCheck,
  Percent,
  ReceiptText,
  ClipboardCheck,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  Store,
  Table2,
  Users,
  Utensils,
  Soup,
} from "lucide-react";
import type { NavItem } from "@/lib/types";

export const customerNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/restaurants", icon: Store },
  { label: "Schedule", href: "/schedule", icon: CalendarClock },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Deals", href: "/offers", icon: Percent },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export const ownerNav: NavItem[] = [
  { label: "Overview", href: "/owner", icon: Home },
  { label: "Orders", href: "/owner/orders", icon: ClipboardList },
  { label: "Kitchen Queue", href: "/owner/kitchen", icon: ChefHat },
  { label: "Menu", href: "/owner/menu", icon: Utensils },
  { label: "Tables", href: "/owner/tables", icon: Table2 },
  { label: "Customers", href: "/owner/loyalty", icon: Users },
  { label: "Marketing", href: "/owner/offers", icon: Percent },
  { label: "Reports", href: "/owner/reports", icon: BarChart3 },
  { label: "Inventory", href: "/owner/inventory", icon: PackageCheck },
  { label: "Employees", href: "/owner/employees", icon: Users },
  { label: "Accounting", href: "/owner/accounting", icon: CreditCard },
  { label: "Settings", href: "/owner/settings", icon: Settings2 },
];

export const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: Home },
  { label: "Restaurants", href: "/admin/restaurants", icon: Store },
  { label: "Food Categories", href: "/admin/categories", icon: Utensils },
  { label: "Cuisine Types", href: "/admin/cuisines", icon: Soup },
  { label: "Owner Reviews", href: "/admin/reviews", icon: ClipboardCheck },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { label: "System Settings", href: "/admin/cms", icon: LayoutTemplate },
  { label: "Social Queue", href: "/admin/social-queue", icon: ImagePlus },
  { label: "Meta Integrations", href: "/admin/meta", icon: Settings2 },
  { label: "Map Settings", href: "/admin/settings/map", icon: MapPin },
  { label: "Firebase Diagnostics", href: "/admin/system/firebase-diagnostics", icon: ShieldCheck },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export const deliveryNav: NavItem[] = [
  { label: "Today", href: "/delivery", icon: Bike },
  { label: "Orders", href: "/delivery/orders", icon: ClipboardList },
  { label: "History", href: "/delivery/history", icon: FileText },
  { label: "Reports", href: "/delivery/reports", icon: BarChart3 },
];

export const studioNav: NavItem[] = [
  { label: "Studio", href: "/studio", icon: ImagePlus },
  { label: "Templates", href: "/studio/templates", icon: LayoutTemplate },
  { label: "Create Post", href: "/studio/create-post", icon: Megaphone },
  { label: "Scheduled", href: "/studio/scheduled-posts", icon: CalendarClock },
];

export const cateringNav: NavItem[] = [
  { label: "Overview", href: "/catering", icon: Home },
  { label: "Requests", href: "/catering/requests", icon: ClipboardList },
  { label: "Packages", href: "/catering/packages", icon: ChefHat },
];

export const posNav: NavItem[] = [
  { label: "New Order", href: "/owner/pos", icon: ReceiptText },
  { label: "Active Orders", href: "/owner/pos?panel=active", icon: ClipboardList },
  { label: "Hold Orders", href: "/owner/pos?panel=held", icon: CalendarClock },
  { label: "Past Orders", href: "/owner/pos?panel=past", icon: FileText },
  { label: "Customers", href: "/owner/pos?panel=customers", icon: Users },
];

export const ecosystemApps = [
  { label: "Customer Ordering", href: "/", icon: ShoppingBag },
  { label: "Owner Dashboard", href: "/owner", icon: Store },
  { label: "Admin Dashboard", href: "/admin", icon: BarChart3 },
  { label: "Delivery Partner", href: "/delivery", icon: Bike },
  { label: "POS Billing", href: "/owner/pos", icon: ReceiptText },
  { label: "Marketing Studio", href: "/studio", icon: ImagePlus },
  { label: "Catering", href: "/catering", icon: ChefHat },
  { label: "Parcel Pickup", href: "/parcel", icon: PackageCheck },
];
