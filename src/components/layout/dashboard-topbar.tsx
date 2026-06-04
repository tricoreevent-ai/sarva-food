"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CircleHelp,
  CreditCard,
  DatabaseZap,
  Grid3X3,
  Headphones,
  ImagePlus,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareWarning,
  Percent,
  ReceiptText,
  Search,
  Settings2,
  ShieldAlert,
  ShoppingBag,
  Table2,
  UserRound,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { OwnerBreadcrumbs } from "@/components/layout/owner-breadcrumbs";
import { SidebarLinks } from "@/components/layout/dashboard-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/app-store";
import { actualOrderTime, readableOrderId, readableTableOrderId, relativeOrderTime } from "@/lib/order-display";
import { playOperationalSound } from "@/lib/operational-sounds";
import { getRestaurantOperatingStatus } from "@/lib/restaurant-operating-status";
import type { DemoOrder, NavItem, TableOrder } from "@/lib/types";
import { cn, formatCurrency, getInitials } from "@/lib/utils";

type DashboardTopbarProps = {
  app: "owner" | "admin" | "delivery" | "studio" | "catering" | "pos";
  appName: string;
  navItems: NavItem[];
  homeHref: string;
};

type SearchResult = {
  id: string;
  group: "Orders" | "Customers" | "Tables" | "Menu Items" | "Staff";
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
};

type NotificationItem = {
  id: string;
  group: "New Orders" | "Delayed Orders" | "Catering" | "System Alerts";
  title: string;
  description: string;
  priority: "critical" | "medium" | "normal" | "success";
  href?: string;
  createdAt?: string;
};

const notificationStorageKey = "sarva-owner-notification-ack";
const soundMuteStorageKey = "sarva-owner-sound-muted";

export function DashboardTopbar(props: DashboardTopbarProps) {
  if (props.app === "admin") {
    return <AdminConsoleTopbar {...props} />;
  }
  return <OwnerOperationsTopbar {...props} />;
}

function OwnerOperationsTopbar({ app, appName, navItems, homeHref }: DashboardTopbarProps) {
  const router = useRouter();
  const authUser = useAppStore((state) => state.authUser);
  const ownerBusinessProfile = useAppStore((state) => state.ownerBusinessProfile);
  const productName = useAppStore((state) => state.cmsSettings.appName?.trim() || "Sarva Food");
  const orders = useAppStore((state) => state.orders);
  const tableOrders = useAppStore((state) => state.tableOrders);
  const loyaltyCustomers = useAppStore((state) => state.loyaltyCustomers);
  const menuItems = useAppStore((state) => state.menuItems);
  const posTables = useAppStore((state) => state.posTables);
  const staffMembers = useAppStore((state) => state.staffMembers);
  const cateringInquiries = useAppStore((state) => state.cateringInquiries);
  const offlineQueue = useAppStore((state) => state.offlineQueue);
  const printerSettings = useAppStore((state) => state.printerSettings);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [browserOnline, setBrowserOnline] = useState(true);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const productInitials = getInitials(productName);
  const ownerName = ownerBusinessProfile?.ownerName || (authUser.name && authUser.name !== "Anonymous" ? authUser.name : "Owner");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const updateOnlineState = () => setBrowserOnline(navigator.onLine);
    const timer = window.setTimeout(updateOnlineState, 0);
    const handleOnline = updateOnlineState;
    const handleOffline = updateOnlineState;
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSoundMuted(localStorage.getItem(soundMuteStorageKey) === "1");
      try {
        setAcknowledgedIds(new Set(JSON.parse(localStorage.getItem(notificationStorageKey) ?? "[]") as string[]));
      } catch {
        setAcknowledgedIds(new Set());
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unlock = () => setSoundUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;

    const closeWhenOutside = (event: Event) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  const notifications = useMemo(() => {
    return buildNotifications({
      orders,
      tableOrders,
      cateringInquiries,
      offlineQueue,
      printerOffline: printerSettings.connectionStatus === "offline",
      browserOnline,
    });
  }, [browserOnline, cateringInquiries, offlineQueue, orders, printerSettings.connectionStatus, tableOrders]);

  const unreadCount = notifications.filter((item) => !acknowledgedIds.has(item.id)).length;
  const urgentUnreadCount = notifications.filter((item) => !acknowledgedIds.has(item.id) && (item.priority === "critical" || item.priority === "medium")).length;

  useEffect(() => {
    if (app !== "owner" || !soundUnlocked || soundMuted || urgentUnreadCount === 0) return;
    let cancelled = false;
    const ring = async () => {
      if (cancelled) return;
      await playOperationalSound({ sound: "loud-alarm", volume: 0.9, repeatCount: 2, repeatGapMs: 220 });
    };
    void ring();
    const interval = window.setInterval(() => void ring(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [app, soundMuted, soundUnlocked, urgentUnreadCount]);

  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return buildSearchResults({ query: debouncedQuery, orders, tableOrders, loyaltyCustomers, posTables, menuItems, staffMembers });
  }, [debouncedQuery, loyaltyCustomers, menuItems, orders, posTables, staffMembers, tableOrders]);

  function acknowledgeNotifications() {
    const next = new Set([...acknowledgedIds, ...notifications.map((item) => item.id)]);
    setAcknowledgedIds(next);
    try {
      localStorage.setItem(notificationStorageKey, JSON.stringify(Array.from(next).slice(-150)));
    } catch {
      // Local notification acknowledgements are best-effort only.
    }
  }

  function toggleMute() {
    const next = !soundMuted;
    setSoundMuted(next);
    try {
      localStorage.setItem(soundMuteStorageKey, next ? "1" : "0");
    } catch {
      // Sound preference can safely fall back to the in-memory value.
    }
  }

  async function handleLogout() {
    await fetch(`/api/auth/session?surface=${app === "admin" ? "admin" : "owner"}`, { method: "DELETE" }).catch(() => undefined);
    router.push(app === "admin" ? "/admin/login" : "/owner/login");
  }

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/94 shadow-sm backdrop-blur-xl">
        <div className="flex min-h-16 w-full items-center gap-2 px-3 py-2 sm:px-5 2xl:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="rounded-r-3xl">
              <SheetHeader>
                <SheetTitle>{appName}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <SidebarLinks items={navItems} />
              </div>
            </SheetContent>
          </Sheet>

          <Link href={homeHref} className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200" aria-label="Go to dashboard overview">
            <span className="food-gradient grid size-10 place-items-center rounded-xl text-sm font-black text-white shadow-lg">{productInitials}</span>
            <span className="hidden min-w-24 sm:block">
              <span className="block text-base font-black leading-5 text-slate-950">{productName}</span>
            </span>
          </Link>

          <OwnerBreadcrumbs className="hidden max-w-72 shrink-0 lg:flex" />

          <div className="hidden min-w-0 flex-1 items-center lg:flex">
            <div className="relative min-w-72 flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-20 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                placeholder="Search orders, customers, menu items..."
                aria-label="Global search"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">Ctrl / K</span>
              <SearchResultsPanel results={searchResults} query={debouncedQuery} onNavigate={() => setQuery("")} />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderIconButton className="lg:hidden" icon={Search} title="Search" description="Find orders, customers, tables, and menu items." onClick={() => setMobileSearchOpen(true)} />

            <div className="relative">
              <HeaderIconButton
                icon={Bell}
                title="Notifications"
                description="View order alerts, kitchen updates, sync warnings, and operational requests."
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  setQuickActionsOpen(false);
                  acknowledgeNotifications();
                }}
              />
              {unreadCount ? (
                <span className="absolute -right-1 -top-1 grid size-5 animate-pulse place-items-center rounded-full bg-red-500 text-[10px] font-black text-white">{unreadCount}</span>
              ) : null}
              {notificationsOpen ? (
                <NotificationPanel notifications={notifications} onClose={() => setNotificationsOpen(false)} />
              ) : null}
            </div>

            <HeaderIconLink href="/owner/customers" icon={MessageCircle} title="Messages" description="Open customer records and support conversations." />
            <HeaderIconLink href="/help" icon={CircleHelp} title="Help Center" description="Guides, FAQs, and support options for restaurant operations." />

            <div className="relative">
              <HeaderIconButton
                icon={Grid3X3}
                title="Quick Actions"
                description="Open common shortcuts for POS, menu, banners, offers, employees, and reports."
                onClick={() => {
                  setQuickActionsOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
              />
              {quickActionsOpen ? <QuickActionsPanel onClose={() => setQuickActionsOpen(false)} /> : null}
            </div>

            <HeaderIconButton
              icon={soundMuted ? VolumeX : Volume2}
              title={soundMuted ? "Operational sounds muted" : "Operational sounds on"}
              description={soundMuted ? "Unmute kitchen and order alert sounds." : "Mute kitchen and order alert sounds."}
              onClick={toggleMute}
            />

            <div ref={profileMenuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setQuickActionsOpen(false);
                  setNotificationsOpen(false);
                }}
                onMouseEnter={() => {
                  setProfileOpen(true);
                  setQuickActionsOpen(false);
                  setNotificationsOpen(false);
                }}
                className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                aria-label="Open account menu"
                title="Owner profile"
              >
                <span className="food-gradient grid size-8 place-items-center rounded-full text-xs font-black text-white">{getInitials(ownerName)}</span>
              </button>
              {profileOpen ? <OwnerProfileMenu onClose={() => setProfileOpen(false)} onLogout={handleLogout} /> : null}
            </div>

            <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 sm:hidden"
                  aria-label="Open account menu"
                >
                  <span className="food-gradient grid size-8 place-items-center rounded-full text-xs font-black text-white">{getInitials(ownerName)}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[86vh] overflow-y-auto rounded-t-3xl border-slate-200 bg-white p-0">
                <OwnerProfileSheet onClose={() => setProfileSheetOpen(false)} onLogout={handleLogout} />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="fixed inset-0 z-50 bg-white p-4 lg:hidden">
            <div className="flex items-center gap-2">
              <Search className="size-5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                placeholder="Search orders, customers, menu items..."
              />
              <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
                <X className="size-5" />
              </Button>
            </div>
            <div className="mt-4">
              <SearchResultsPanel results={searchResults} query={debouncedQuery} mobile onNavigate={() => setMobileSearchOpen(false)} />
            </div>
          </div>
        ) : null}
      </header>
    </TooltipProvider>
  );
}

function HeaderIconTooltip({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p className="font-black">{title}</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-200">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function HeaderIconButton({
  icon: Icon,
  title,
  description,
  onClick,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <HeaderIconTooltip title={title} description={description}>
      <button
        type="button"
        onClick={onClick}
        className={cn("grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200", className)}
        aria-label={title}
      >
        <Icon className="size-4" />
      </button>
    </HeaderIconTooltip>
  );
}

function HeaderIconLink({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <HeaderIconTooltip title={title} description={description}>
      <Link
        href={href}
        className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
        aria-label={title}
      >
        <Icon className="size-4" />
      </Link>
    </HeaderIconTooltip>
  );
}

function QuickActionsPanel({ onClose }: { onClose: () => void }) {
  const actions = [
    { href: "/owner/pos", icon: ReceiptText, title: "New Order", description: "Open POS billing and start an order." },
    { href: "/owner/menu", icon: Utensils, title: "Add Menu Item", description: "Create or update food items." },
    { href: "/owner/settings?tab=branding", icon: ImagePlus, title: "Add Banner", description: "Manage restaurant customer banners." },
    { href: "/owner/offers", icon: Percent, title: "Create Offer", description: "Set coupons and customer promotions." },
    { href: "/owner/employees", icon: Users, title: "Add Employee", description: "Invite staff and set role access." },
    { href: "/owner/reports", icon: BarChart3, title: "Generate Report", description: "Open sales and operations reports." },
  ];

  return (
    <div className="absolute right-0 top-14 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
      <div className="px-3 py-2">
        <p className="font-black text-slate-950">Quick Actions</p>
        <p className="text-xs font-semibold text-slate-500">Common restaurant shortcuts</p>
      </div>
      <div className="grid gap-1">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-orange-50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-950">{item.title}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OwnerProfileMenu({ onClose, onLogout }: { onClose: () => void; onLogout: () => void | Promise<void> }) {
  return (
    <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <OwnerProfileMenuContent onClose={onClose} onLogout={onLogout} />
    </div>
  );
}

function OwnerProfileSheet({ onClose, onLogout }: { onClose: () => void; onLogout: () => void | Promise<void> }) {
  return (
    <div>
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
      <SheetHeader className="border-b border-slate-100 px-5 py-4 text-center">
        <SheetTitle className="text-sm font-black text-slate-950">Account Menu</SheetTitle>
      </SheetHeader>
      <OwnerProfileMenuContent onClose={onClose} onLogout={onLogout} />
    </div>
  );
}

function OwnerProfileMenuContent({ onClose, onLogout }: { onClose: () => void; onLogout: () => void | Promise<void> }) {
  const authUser = useAppStore((state) => state.authUser);
  const restaurants = useAppStore((state) => state.restaurants);
  const ownerProfile = useAppStore((state) => state.ownerBusinessProfile);
  const currentRestaurant = restaurants.find((restaurant) => restaurant.slug === authUser.restaurantSlug || restaurant.id === authUser.restaurantSlug);
  const sessionEmail = isEmailLike(authUser.id) ? authUser.id : "";
  const ownerName = ownerProfile?.ownerName || (authUser.name && authUser.name !== "Anonymous" ? authUser.name : "Owner");
  const restaurantName = ownerProfile?.hotelName || currentRestaurant?.displayName || currentRestaurant?.name || "Restaurant";
  const mobile = ownerProfile?.phoneNumber || currentRestaurant?.contact?.phone || currentRestaurant?.ownerProfile?.businessPhone || "Not set";
  const email = ownerProfile?.supportEmail || currentRestaurant?.ownerProfile?.businessEmail || sessionEmail || "Not set";
  const plan = currentRestaurant?.subscriptionPlan || "Starter";
  const status = currentRestaurant ? getRestaurantOperatingStatus(currentRestaurant) : null;
  const joinedDate = formatJoinedDate((currentRestaurant as { createdAt?: string | Date } | undefined)?.createdAt);

  return (
    <div>
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start gap-3">
          <span className="food-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black text-white">{getInitials(ownerName)}</span>
          <span className="min-w-0">
            <span className="block truncate font-black text-slate-950">{ownerName}</span>
            <span className="block truncate text-sm font-semibold text-slate-500">{restaurantName}</span>
          </span>
        </div>
        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
          <OwnerProfileFact label="Mobile" value={mobile} />
          <OwnerProfileFact label="Email" value={email} />
          <OwnerProfileFact label="Plan" value={plan} />
          <OwnerProfileFact label="Status" value={status ? `${status.label}${status.detail ? `, ${status.detail}` : ""}` : "Not available"} />
          <OwnerProfileFact label="Joined" value={joinedDate} />
        </div>
      </div>
      <ProfileLink href="/owner/settings?tab=profile" icon={UserRound} label="Profile" description="View and manage your account" onClick={onClose} />
      <ProfileLink href="/owner/settings?tab=payments" icon={WalletCards} label="My Plan" description="View subscription plan" onClick={onClose} />
      <ProfileLink href="/owner/settings" icon={Settings2} label="Settings" description="Restaurant preferences" onClick={onClose} />
      <ProfileLink href="/owner/accounting" icon={CreditCard} label="Billing" description="Invoices and payments" onClick={onClose} />
      <ProfileLink href="/help" icon={Headphones} label="Help & Support" description="Support center" onClick={onClose} />
      <button
        type="button"
        onClick={() => {
          onClose();
          void onLogout();
        }}
        className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-4 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
      >
        <LogOut className="size-4" />
        <span>
          <span className="block">Logout</span>
          <span className="block text-xs font-semibold text-red-400">Sign out of your account</span>
        </span>
      </button>
    </div>
  );
}

function OwnerProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="truncate font-black text-slate-800">{value}</span>
    </div>
  );
}

function formatJoinedDate(value?: string | Date) {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isEmailLike(value?: string) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

type AdminAlert = {
  id: string;
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  tone: "red" | "orange" | "blue" | "green";
  description: string;
};

function AdminConsoleTopbar({ appName, navItems, homeHref }: DashboardTopbarProps) {
  const router = useRouter();
  const authUser = useAppStore((state) => state.authUser);
  const productName = useAppStore((state) => state.cmsSettings.appName?.trim() || "Sarva Food");
  const restaurants = useAppStore((state) => state.restaurants);
  const applications = useAppStore((state) => state.businessApplications);
  const socialPosts = useAppStore((state) => state.socialPosts);
  const cateringInquiries = useAppStore((state) => state.cateringInquiries);
  const offlineQueue = useAppStore((state) => state.offlineQueue);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [browserOnline, setBrowserOnline] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const updateOnlineState = () => setBrowserOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const alerts = useMemo(
    () => buildAdminAlerts({
      applicationsPending: applications.filter((item) => item.status === "pending").length,
      restaurantsPending: restaurants.filter((restaurant) => restaurant.approved === false || restaurant.adminStatus === "Pending Approval" || restaurant.adminStatus === "Under Review").length,
      subscriptionAlerts: restaurants.filter((restaurant) => restaurant.subscriptionStatus === "expired" || restaurant.subscriptionStatus === "suspended" || restaurant.adminStatus === "Expired" || restaurant.adminStatus === "Suspended").length,
      firebaseAlerts: (browserOnline ? 0 : 1) + offlineQueue.filter((item) => item.status === "failed" || item.status === "conflict").length,
      moderationQueue: socialPosts.filter((post) => post.status === "pending").length,
      supportRequests: cateringInquiries.filter((quote) => quote.status === "new" || quote.status === "quoted").length,
    }),
    [applications, browserOnline, cateringInquiries, offlineQueue, restaurants, socialPosts],
  );
  const unreadCount = alerts.reduce((sum, alert) => sum + alert.value, 0);
  const ownerName = authUser.name && authUser.name !== "Anonymous" ? authUser.name : "Platform Admin";
  const adminResults = useMemo(() => {
    const term = debouncedQuery.toLowerCase();
    if (term.length < 2) return [];
    return [
      ...restaurants
        .filter((restaurant) => `${restaurant.name} ${restaurant.slug} ${restaurant.cuisine} ${restaurant.location}`.toLowerCase().includes(term))
        .slice(0, 8)
        .map((restaurant) => ({ id: restaurant.slug, title: restaurant.name, subtitle: restaurant.cuisine || restaurant.location, href: "/admin/restaurants", icon: Building2 })),
      ...applications
        .filter((application) => `${application.businessName} ${application.ownerEmail} ${application.area}`.toLowerCase().includes(term))
        .slice(0, 5)
        .map((application) => ({ id: application.id, title: application.businessName, subtitle: application.status, href: "/admin/restaurants", icon: ShieldAlert })),
    ];
  }, [applications, debouncedQuery, restaurants]);

  async function handleLogout() {
    await fetch("/api/auth/session?surface=admin", { method: "DELETE" }).catch(() => undefined);
    router.push("/admin/login");
  }

  function openAlert(alert: AdminAlert) {
    setNotificationsOpen(false);
    router.push(alert.href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080b1a]/95 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="flex min-h-16 w-full items-center gap-3 px-3 py-2 sm:px-5 2xl:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden" aria-label="Open admin navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="rounded-r-3xl bg-[#0d1024] text-white">
            <SheetHeader>
              <SheetTitle className="text-white">{appName}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <SidebarLinks items={navItems} />
            </div>
          </SheetContent>
        </Sheet>

        <Link href={homeHref} className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" aria-label="Go to admin overview">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-indigo-500 text-sm font-black text-white shadow-lg">{getInitials(productName)}</span>
          <span className="hidden min-w-28 sm:block">
            <span className="block text-base font-black leading-5 text-white">{productName} Admin</span>
            <span className="text-xs font-semibold text-indigo-200">{appName}</span>
          </span>
        </Link>

        <div className="relative hidden min-w-72 flex-1 max-w-xl lg:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-indigo-200" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-white/8 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-indigo-200/70 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/20"
            placeholder="Search restaurants, owners, approvals..."
            aria-label="Admin search"
          />
          {debouncedQuery.length >= 2 ? (
            <div className="absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#11162e] shadow-2xl">
              {adminResults.length ? adminResults.map((result) => {
                const Icon = result.icon;
                return (
                  <Link key={`${result.id}-${result.title}`} href={result.href} onClick={() => setQuery("")} className="flex items-center gap-3 px-4 py-3 hover:bg-white/8">
                    <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-indigo-200"><Icon className="size-4" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">{result.title}</span>
                      <span className="block truncate text-xs font-semibold text-indigo-200">{result.subtitle}</span>
                    </span>
                  </Link>
                );
              }) : <p className="p-5 text-center text-sm font-semibold text-indigo-200">No matching admin records.</p>}
            </div>
          ) : null}
        </div>

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          {alerts.slice(0, 5).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => openAlert(alert)}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-left shadow-sm transition hover:bg-white/12"
              title={alert.description}
            >
              <span className={cn("grid size-7 place-items-center rounded-full", toneClass[alert.tone].bg, toneClass[alert.tone].text)}>
                <alert.icon className="size-4" />
              </span>
              <span>
                <span className="block text-[10px] font-bold leading-3 text-indigo-200">{alert.label}</span>
                <span className="block text-xs font-black text-white">{alert.value}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden" onClick={() => setMobileSearchOpen(true)} aria-label="Open admin search">
            <Search className="size-4" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open admin alerts">
              <Bell className="size-4" />
            </Button>
            {unreadCount ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-orange-500 text-[10px] font-black text-white">{unreadCount}</span> : null}
            {notificationsOpen ? (
              <div className="absolute right-0 top-14 z-50 w-[min(92vw,430px)] overflow-hidden rounded-2xl border border-white/10 bg-[#11162e] text-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <div>
                    <p className="font-black">Admin alerts</p>
                    <p className="text-xs font-semibold text-indigo-200">Onboarding, subscriptions, Firebase, moderation, and support</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setNotificationsOpen(false)} aria-label="Close alerts">
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-3">
                  {alerts.map((alert) => (
                    <button key={alert.id} type="button" onClick={() => openAlert(alert)} className="mb-2 grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:bg-white/8">
                      <span className={cn("grid size-9 place-items-center rounded-xl", toneClass[alert.tone].bg, toneClass[alert.tone].text)}><alert.icon className="size-4" /></span>
                      <span className="min-w-0">
                        <span className="block font-black text-white">{alert.label}</span>
                        <span className="block text-sm leading-5 text-indigo-200">{alert.description}</span>
                      </span>
                      <Badge variant={alert.value ? "warning" : "success"}>{alert.value}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-2 shadow-sm transition hover:bg-white/12 sm:px-3"
              aria-label="Open admin profile menu"
            >
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-indigo-500 text-xs font-black text-white">{getInitials(ownerName)}</span>
              <span className="hidden text-left md:block">
                <span className="block max-w-32 truncate text-sm font-black text-white">{ownerName}</span>
                <span className="text-xs font-semibold text-indigo-200">Super Admin</span>
              </span>
            </button>
            {profileOpen ? (
              <div className="absolute right-0 top-14 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#11162e] text-white shadow-2xl">
                <ProfileLink href="/admin/users" icon={UserRound} label="Admin users" onClick={() => setProfileOpen(false)} />
                <ProfileLink href="/admin/cms" icon={Settings2} label="System settings" onClick={() => setProfileOpen(false)} />
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-4 text-left text-sm font-black text-red-300 hover:bg-red-500/10">
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="fixed inset-0 z-50 bg-[#080b1a] p-4 text-white lg:hidden">
          <div className="flex items-center gap-2">
            <Search className="size-5 text-indigo-200" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/8 px-4 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/20"
              placeholder="Search admin records..."
            />
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
              <X className="size-5" />
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function buildAdminAlerts(input: {
  applicationsPending: number;
  restaurantsPending: number;
  subscriptionAlerts: number;
  firebaseAlerts: number;
  moderationQueue: number;
  supportRequests: number;
}): AdminAlert[] {
  return [
    { id: "onboarding", label: "Onboarding", value: input.applicationsPending, href: "/admin/restaurants", icon: Building2, tone: input.applicationsPending ? "orange" : "green", description: "Restaurant onboarding applications waiting for review." },
    { id: "approvals", label: "Approvals", value: input.restaurantsPending, href: "/admin/reviews", icon: ShieldAlert, tone: input.restaurantsPending ? "orange" : "green", description: "Profile, verification, banner, or restaurant approval requests." },
    { id: "subscriptions", label: "Subscriptions", value: input.subscriptionAlerts, href: "/admin/subscriptions", icon: WalletCards, tone: input.subscriptionAlerts ? "red" : "green", description: "Suspended, expired, or billing-risk restaurant subscriptions." },
    { id: "firebase", label: "Firebase", value: input.firebaseAlerts, href: "/admin/system/firebase-diagnostics", icon: DatabaseZap, tone: input.firebaseAlerts ? "red" : "green", description: "System, connectivity, and sync failure alerts." },
    { id: "moderation", label: "Moderation", value: input.moderationQueue, href: "/admin/social-queue", icon: MessageSquareWarning, tone: input.moderationQueue ? "blue" : "green", description: "Owner posts and marketing assets waiting for moderation." },
    { id: "support", label: "Support", value: input.supportRequests, href: "/catering/requests", icon: Headphones, tone: input.supportRequests ? "blue" : "green", description: "Customer support and catering follow-up requests." },
  ];
}

function ProfileLink({ href, icon: Icon, label, description, onClick }: { href: string; icon: LucideIcon; label: string; description?: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 px-4 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-50">
      <Icon className="size-4 shrink-0" />
      <span>
        <span className="block">{label}</span>
        {description ? <span className="block text-xs font-semibold text-slate-500">{description}</span> : null}
      </span>
    </Link>
  );
}

function SearchResultsPanel({ results, query, mobile = false, onNavigate }: { results: SearchResult[]; query: string; mobile?: boolean; onNavigate: () => void }) {
  if (query.length < 2) return null;
  const grouped = groupBy(results, (item) => item.group);
  const content = results.length ? (
    <div className="max-h-[70vh] overflow-y-auto p-2">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="py-2">
          <p className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-slate-400">{group}</p>
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href} onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-orange-50">
                  <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">{item.title}</span>
                    <span className="block truncate text-xs font-semibold text-slate-500">{item.subtitle}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="p-6 text-center">
      <p className="font-black text-slate-950">No matching results</p>
      <p className="mt-1 text-sm text-slate-500">Try order ID, table number, phone, customer or menu item.</p>
    </div>
  );

  if (mobile) return <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">{content}</div>;
  return <div className="absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">{content}</div>;
}

function NotificationPanel({ notifications, onClose }: { notifications: NotificationItem[]; onClose: () => void }) {
  const grouped = groupBy(notifications, (item) => item.group);
  return (
    <div className="absolute right-0 top-14 z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <p className="font-black text-slate-950">Notifications</p>
          <p className="text-xs font-semibold text-slate-500">Orders, kitchen and system alerts</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notifications">
          <X className="size-4" />
        </Button>
      </div>
      {notifications.length ? (
        <div className="max-h-[70vh] overflow-y-auto p-3">
          {Object.entries(grouped).map(([group, items]) => (
            <section key={group} className="py-2">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{group}</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <NotificationRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="font-black text-slate-950">All clear</p>
          <p className="mt-1 text-sm text-slate-500">No urgent operational alerts right now.</p>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const body = (
    <div className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", priorityClass[item.priority])} />
        <div className="min-w-0">
          <p className="font-black text-slate-950">{item.title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{item.description}</p>
          {item.createdAt ? <p className="mt-1 text-xs font-bold text-slate-400">{relativeOrderTime(item.createdAt)} · {actualOrderTime(item.createdAt)}</p> : null}
        </div>
      </div>
    </div>
  );
  if (!item.href) return body;
  if (item.href === "#sync") {
    return (
      <button type="button" className="w-full text-left" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
        {body}
      </button>
    );
  }
  return <Link href={item.href}>{body}</Link>;
}

function buildSearchResults(input: {
  query: string;
  orders: DemoOrder[];
  tableOrders: TableOrder[];
  loyaltyCustomers: ReturnType<typeof useAppStore.getState>["loyaltyCustomers"];
  posTables: ReturnType<typeof useAppStore.getState>["posTables"];
  menuItems: ReturnType<typeof useAppStore.getState>["menuItems"];
  staffMembers: ReturnType<typeof useAppStore.getState>["staffMembers"];
}) {
  const term = input.query.toLowerCase();
  const results: SearchResult[] = [];

  input.orders.forEach((order) => {
    const id = readableOrderId(order);
    const haystack = `${id} ${order.id} ${order.customer.name} ${order.customer.phone} ${order.channel} ${order.fulfillmentType ?? ""} ${order.lines.map((line) => line.name).join(" ")}`.toLowerCase();
    if (haystack.includes(term)) {
      results.push({
        id: `order-${order.id}`,
        group: "Orders",
        title: id,
        subtitle: `${order.customer.name} · ${formatCurrency(order.totals.total)} · ${relativeOrderTime(order.createdAt)}`,
        href: `/owner/orders?search=${encodeURIComponent(id)}`,
        icon: ShoppingBag,
      });
    }
  });

  input.tableOrders.forEach((order) => {
    const id = readableTableOrderId(order);
    const total = order.total ?? order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const haystack = `${id} ${order.id} ${order.tableNumber} ${order.customerName ?? ""} ${order.customerPhone ?? ""} ${order.waiterName ?? ""} ${order.lines.map((line) => line.name).join(" ")}`.toLowerCase();
    if (haystack.includes(term)) {
      results.push({
        id: `table-order-${order.id}`,
        group: "Orders",
        title: id,
        subtitle: `${order.tableNumber} · ${formatCurrency(total)} · ${relativeOrderTime(order.createdAt)}`,
        href: `/owner/orders?search=${encodeURIComponent(id)}`,
        icon: ShoppingBag,
      });
    }
  });

  input.loyaltyCustomers.forEach((customer) => {
    const haystack = `${customer.name} ${customer.phone} ${customer.email ?? ""}`.toLowerCase();
    if (haystack.includes(term)) {
      results.push({
        id: `customer-${customer.id}`,
        group: "Customers",
        title: customer.name,
        subtitle: `${customer.phone} · ${customer.totalOrders ?? 0} orders`,
        href: `/owner/loyalty?search=${encodeURIComponent(customer.phone)}`,
        icon: UserRound,
      });
    }
  });

  input.posTables.forEach((table) => {
    const haystack = `${table.table} ${table.status} ${table.floor ?? ""} ${table.note ?? ""}`.toLowerCase();
    if (haystack.includes(term)) {
      results.push({
        id: `table-${table.table}`,
        group: "Tables",
        title: table.table,
        subtitle: `${table.seats} seats · ${table.status}`,
        href: `/owner/tables?table=${encodeURIComponent(table.table)}`,
        icon: Table2,
      });
    }
  });

  input.menuItems.forEach((item) => {
    const haystack = `${item.name} ${item.description} ${item.category} ${item.cuisineIds?.join(" ") ?? ""} ${item.tags?.join(" ") ?? ""}`.toLowerCase();
    if (haystack.includes(term)) {
      results.push({
        id: `menu-${item.id}`,
        group: "Menu Items",
        title: item.name,
        subtitle: `${item.category} · ${formatCurrency(item.price)}`,
        href: `/owner/menu?search=${encodeURIComponent(item.name)}`,
        icon: Utensils,
      });
    }
  });

  input.staffMembers.forEach((member) => {
    const haystack = `${member.name} ${member.phone ?? ""} ${member.email ?? ""} ${member.role}`.toLowerCase();
    if (haystack.includes(term)) {
      results.push({
        id: `staff-${member.id}`,
        group: "Staff",
        title: member.name,
        subtitle: `${member.role} · ${member.status}`,
        href: `/owner/employees?search=${encodeURIComponent(member.name)}`,
        icon: Users,
      });
    }
  });

  return results.slice(0, 18);
}

function buildNotifications(input: {
  orders: DemoOrder[];
  tableOrders: TableOrder[];
  cateringInquiries: ReturnType<typeof useAppStore.getState>["cateringInquiries"];
  offlineQueue: ReturnType<typeof useAppStore.getState>["offlineQueue"];
  printerOffline: boolean;
  browserOnline: boolean;
}) {
  const notifications: NotificationItem[] = [];

  input.orders
    .filter((order) => order.status === "new" || order.status === "accepted")
    .slice(0, 6)
    .forEach((order) => {
      notifications.push({
        id: `order-${order.id}-${order.status}`,
        group: "New Orders",
        title: `${readableOrderId(order)} needs attention`,
        description: `${order.customer.name} · ${order.fulfillmentType ?? order.channel} · ${formatCurrency(order.totals.total)}`,
        priority: `${order.channel}`.toLowerCase() === "web" || order.fulfillmentType === "delivery" ? "critical" : "medium",
        href: `/owner/orders?search=${encodeURIComponent(readableOrderId(order))}`,
        createdAt: order.createdAt,
      });
    });

  input.tableOrders
    .filter((order) => order.status === "new")
    .slice(0, 6)
    .forEach((order) => {
      notifications.push({
        id: `kot-${order.id}-${order.status}`,
        group: "New Orders",
        title: `${readableTableOrderId(order)} is waiting`,
        description: `${order.tableNumber} · ${order.source} · ${(order.total ?? 0) ? formatCurrency(order.total ?? 0) : `${order.lines.length} items`}`,
        priority: "medium",
        href: `/owner/kitchen?search=${encodeURIComponent(readableTableOrderId(order))}`,
        createdAt: order.createdAt,
      });
    });

  input.tableOrders
    .filter((order) => ["new", "preparing", "occupied"].includes(order.status))
    .forEach((order) => {
      const minutes = elapsedMinutes(order.createdAt);
      if (minutes >= 30) {
        notifications.push({
          id: `critical-delay-${order.id}`,
          group: "Delayed Orders",
          title: `${readableTableOrderId(order)} is critically delayed`,
          description: `${order.tableNumber} order delayed by ${minutes} minutes.`,
          priority: "critical",
          href: `/owner/kitchen?search=${encodeURIComponent(readableTableOrderId(order))}`,
          createdAt: order.createdAt,
        });
      } else if (minutes >= 15) {
        notifications.push({
          id: `delay-${order.id}`,
          group: "Delayed Orders",
          title: `${readableTableOrderId(order)} is delayed`,
          description: `${order.tableNumber} order has crossed the prep warning threshold.`,
          priority: "medium",
          href: `/owner/kitchen?search=${encodeURIComponent(readableTableOrderId(order))}`,
          createdAt: order.createdAt,
        });
      }
    });

  input.cateringInquiries
    .filter((quote) => quote.status === "new" || quote.status === "quoted")
    .slice(0, 4)
    .forEach((quote) => {
      notifications.push({
        id: `catering-${quote.id}-${quote.status ?? "new"}`,
        group: "Catering",
        title: quote.status === "quoted" ? "Catering quotation pending customer response" : "New catering request",
        description: `${quote.name} · ${quote.guestCount} guests · ${formatCurrency(quote.total)}`,
        priority: "critical",
        href: "/owner/orders?tab=scheduled",
      });
    });

  const failedQueue = input.offlineQueue.filter((item) => item.status === "failed" || item.status === "conflict");
  if (failedQueue.length) {
    notifications.push({
      id: `sync-failed-${failedQueue.length}`,
      group: "System Alerts",
      title: "Sync needs attention",
      description: `${failedQueue.length} offline action${failedQueue.length === 1 ? "" : "s"} failed. Open sync center to retry.`,
      priority: "critical",
      href: "#sync",
    });
  }
  if (input.printerOffline) {
    notifications.push({
      id: "printer-offline",
      group: "System Alerts",
      title: "Printer offline",
      description: "Billing or kitchen printer is not connected.",
      priority: "medium",
      href: "/owner/settings?tab=printer",
    });
  }
  if (!input.browserOnline) {
    notifications.push({
      id: "internet-offline",
      group: "System Alerts",
      title: "Internet disconnected",
      description: "POS can continue locally. Sync will retry when connection returns.",
      priority: "critical",
    });
  }

  return notifications;
}

function elapsedMinutes(value?: string) {
  const time = value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function groupBy<T, K extends string>(items: T[], getKey: (item: T) => K) {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

const toneClass = {
  green: { bg: "bg-emerald-50", text: "text-emerald-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
};

const priorityClass = {
  critical: "bg-red-500",
  medium: "bg-orange-500",
  normal: "bg-blue-500",
  success: "bg-emerald-500",
};
