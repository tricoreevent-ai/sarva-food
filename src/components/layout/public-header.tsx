"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, CircleHelp, Crown, Heart, LogOut, MapPinned, Menu, MapPin, Search, Settings2, ShoppingBag, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { SafeImage } from "@/components/media/safe-image";
import { AppPreferences } from "@/components/settings/app-preferences";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppStore } from "@/lib/app-store";
import { useCartStore } from "@/lib/cart-store";
import { customerNav } from "@/lib/navigation";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { signOutUser } from "@/services/auth-service";

export function PublicHeader() {
  const router = useRouter();
  const auth = useAuthUser();
  const localAuthUser = useAppStore((state) => state.authUser);
  const branding = useAppStore((state) => state.cmsSettings.branding);
  const cmsAppName = useAppStore((state) => state.cmsSettings.appName?.trim() || "Sarva Food");
  const productName = branding?.appName?.trim() || cmsAppName;
  const logoUrl = branding?.logoUrl?.trim();
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const clearCart = useCartStore((state) => state.clearCart);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loggedIn = auth.user
    ? auth.profile?.role === "customer"
    : localAuthUser.role === "customer" && localAuthUser.id !== "anonymous";
  const displayName = loggedIn ? (auth.profile?.displayName ?? localAuthUser.name) : "Guest";
  const initials = getInitials(displayName);

  async function handleLogout() {
    setProfileOpen(false);
    await signOutUser().catch(() => undefined);
    await fetch("/api/auth/session?surface=customer", { method: "DELETE" }).catch(() => undefined);
    clearCart();
    window.localStorage.removeItem("sarva-customer-auth");
    setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-background/92 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-3 md:h-20">
        <Link href="/" className="flex items-center gap-3" aria-label={`${productName} home`}>
          <span className="relative grid size-10 place-items-center overflow-hidden rounded-full food-gradient text-sm font-black text-white shadow-sm md:size-12">
            {logoUrl ? (
              <SafeImage src={logoUrl} alt={`${productName} logo`} fill sizes="48px" className="object-cover" />
            ) : (
              <>
                <span className="hidden md:inline">SF</span>
                <span className="md:hidden">SF</span>
              </>
            )}
          </span>
          <span>
            <span className="block text-sm font-black leading-tight md:text-xl">{productName}</span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex">
          <Button asChild variant="outline" size="sm" className="h-11 max-w-56 rounded-lg bg-white px-4 shadow-sm">
            <Link href="/restaurants" className="min-w-0">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="truncate">Choose location</span>
            </Link>
          </Button>
          <form
            className="flex h-11 min-w-[20rem] max-w-xl flex-1 items-center gap-3 rounded-lg border bg-white px-4 text-sm font-semibold text-muted-foreground shadow-sm transition focus-within:border-primary/40"
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchQuery.trim();
              router.push(query ? `/restaurants?query=${encodeURIComponent(query)}` : "/restaurants");
            }}
          >
            <Search className="size-4 shrink-0" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent outline-none"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search restaurants, cuisines or dishes"
              aria-label="Search restaurants"
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden font-black md:inline-flex">
            <Link href="/offers">Deals</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden font-black md:inline-flex">
            <Link href="/schedule">Schedule</Link>
          </Button>
          {loggedIn ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden font-black md:inline-flex">
                <Link href="/orders">Orders</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden font-black md:inline-flex">
                <Link href="/account/profile?tab=favorites">
                  <Heart className="size-4" />
                  Favorites
                </Link>
              </Button>
            </>
          ) : null}
          <Button asChild variant="ghost" size="icon" aria-label="Search" className="md:hidden">
            <Link href="/restaurants">
              <Search className="size-4" />
            </Link>
          </Button>
          <CartDrawer
            trigger={
              <Button variant="ghost" size="icon" aria-label="Open cart" className="relative bg-card">
                <ShoppingBag className="size-4" />
              </Button>
            }
          />
          {loggedIn ? (
            <div className="relative hidden md:block">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg bg-white px-3 shadow-sm"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-black text-white">{initials}</span>
                <span className="max-w-28 truncate">{displayName}</span>
                <ChevronDown className="size-4" />
              </Button>
              {profileOpen ? (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-white p-3 shadow-2xl">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <span className="grid size-11 place-items-center rounded-full bg-primary text-sm font-black text-white">{initials}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{displayName}</p>
                      <p className="text-xs font-semibold text-muted-foreground">Customer account</p>
                    </div>
                  </div>
                  <Link href="/loyalty" className="my-3 flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm font-bold hover:bg-orange-100">
                    <span className="flex items-center gap-2"><Crown className="size-4 text-orange-600" /> Gold Member</span>
                    <span className="text-xs text-muted-foreground">120 pts</span>
                  </Link>
                  <div className="grid gap-1 py-2">
                    <HeaderMenuLink href="/account/profile" icon={UserRound} label="Profile" description="Manage your personal info" />
                    <HeaderMenuLink href="/account/profile?tab=addresses" icon={MapPinned} label="My addresses" description="Manage saved addresses" />
                    <HeaderMenuLink href="/account/profile?tab=payments" icon={WalletCards} label="Wallet & points" description="View balance and history" />
                    <HeaderMenuLink href="/orders" icon={ShoppingBag} label="Orders" description="View your order history" />
                    <HeaderMenuLink href="/account/profile?tab=favorites" icon={Heart} label="Favorites" description="Favourite restaurants and items" />
                    <HeaderMenuLink href="/account/profile?tab=settings" icon={Settings2} label="Settings" description="App preferences and notifications" />
                    <HeaderMenuLink href="/help" icon={CircleHelp} label="Help & support" description="FAQs and support center" />
                  </div>
                  <AppPreferences compact />
                  <Button type="button" variant="outline" className="mt-2 w-full justify-start" onClick={() => void handleLogout()}>
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="outline" size="sm" className="h-11 rounded-lg bg-white px-4">
                <Link href="/signup">Create account</Link>
              </Button>
              <Button asChild size="sm" className="h-11 rounded-lg px-5 shadow-lg shadow-primary/20">
                <Link href="/login">
                  <UserRound className="size-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl pb-8">
              <SheetHeader>
                <SheetTitle>{productName}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 grid gap-2">
                {loggedIn ? (
                  <div className="mb-3 rounded-2xl border bg-orange-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-full bg-primary text-sm font-black text-white">{initials}</span>
                      <div>
                        <p className="font-black">{displayName}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Customer account</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-bold">
                      <QuickMenuLink href="/account/profile" icon={UserRound} label="Profile" />
                      <QuickMenuLink href="/orders" icon={ShoppingBag} label="Orders" />
                      <QuickMenuLink href="/account/profile?tab=payments" icon={WalletCards} label="Wallet" />
                      <QuickMenuLink href="/account/profile?tab=addresses" icon={MapPinned} label="Addresses" />
                    </div>
                  </div>
                ) : null}
                {(loggedIn ? customerNav : customerNav.filter((item) => !["/profile", "/account/profile", "/orders", "/cart"].includes(item.href))).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted"
                    >
                      <Icon className="size-4 text-primary" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
                {loggedIn ? (
                  <>
                    <AppPreferences compact />
                    <Button type="button" variant="outline" onClick={() => void handleLogout()}>
                      <LogOut className="size-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <div className="grid gap-2">
                    <Link href="/login" className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted">Sign in</Link>
                    <Link href="/signup" className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted">Create account</Link>
                    <Link href="/terms" className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted">Terms & Conditions</Link>
                    <Link href="/privacy" className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted">Privacy Policy</Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function HeaderMenuLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
  description?: string;
}) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-bold hover:bg-orange-50">
      <Icon className="size-4 text-primary" />
      <span>
        <span className="block">{label}</span>
        {description ? <span className="block text-xs font-semibold text-muted-foreground">{description}</span> : null}
      </span>
    </Link>
  );
}

function QuickMenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <Link href={href} className="grid gap-1 rounded-xl bg-white px-2 py-3">
      <Icon className="mx-auto size-5 text-primary" />
      <span>{label}</span>
    </Link>
  );
}

function getInitials(name?: string) {
  return (name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}
