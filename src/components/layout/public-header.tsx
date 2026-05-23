"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Heart, LogOut, Menu, MapPin, Search, Settings2, ShoppingBag, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { AppPreferences } from "@/components/settings/app-preferences";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppStore } from "@/lib/app-store";
import { customerNav } from "@/lib/navigation";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { signOutUser } from "@/services/auth-service";

export function PublicHeader() {
  const router = useRouter();
  const auth = useAuthUser();
  const localAuthUser = useAppStore((state) => state.authUser);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loggedIn = Boolean(auth.user || localAuthUser.id !== "anonymous");
  const displayName = auth.profile?.displayName ?? localAuthUser.name;
  const initials = getInitials(displayName);

  async function handleLogout() {
    setProfileOpen(false);
    await signOutUser().catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
    window.location.href = "/login?next=/profile";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-background/92 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-3 md:h-20">
        <Link href="/" className="flex items-center gap-3" aria-label="Sarva Food home">
          <span className="grid size-10 place-items-center rounded-full food-gradient text-sm font-black text-white shadow-sm md:size-12">
            <span className="hidden md:inline">SF</span>
            <span className="md:hidden">SF</span>
          </span>
          <span>
            <span className="block text-sm font-black leading-tight md:text-xl">Sarva Food</span>
            <span className="hidden text-[11px] font-bold text-muted-foreground sm:block">
              Fresh food, delivered fast
            </span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex">
          <Button asChild variant="outline" size="sm" className="h-11 max-w-56 rounded-lg bg-white px-4 shadow-sm">
            <Link href="/restaurants" className="min-w-0">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="truncate">Bengaluru, Karnataka</span>
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
          <Button asChild variant="ghost" size="sm" className="hidden font-black md:inline-flex">
            <Link href="/orders">Orders</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden font-black md:inline-flex">
            <Link href="/profile">
              <Heart className="size-4" />
              Favorites
            </Link>
          </Button>
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
                  <div className="grid gap-1 py-2">
                    <HeaderMenuLink href="/profile" icon={UserRound} label="Profile" />
                    <HeaderMenuLink href="/profile?tab=settings" icon={Settings2} label="Settings" />
                    <HeaderMenuLink href="/profile?tab=payments" icon={ShoppingBag} label="Wallet & points" />
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
            <Button asChild size="sm" className="hidden h-11 rounded-lg px-5 shadow-lg shadow-primary/20 md:inline-flex">
              <Link href="/login">
                <UserRound className="size-4" />
                Login
              </Link>
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Sarva Food</SheetTitle>
              </SheetHeader>
              <div className="mt-6 grid gap-2">
                {customerNav.map((item) => {
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
                    <div className="rounded-lg border bg-orange-50 p-3">
                      <p className="text-sm font-black">{displayName}</p>
                      <p className="text-xs text-muted-foreground">Signed in</p>
                    </div>
                    <AppPreferences compact />
                    <Button type="button" variant="outline" onClick={() => void handleLogout()}>
                      <LogOut className="size-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted"
                  >
                    Login
                  </Link>
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
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <Link href={href} className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold hover:bg-orange-50">
      <Icon className="size-4 text-primary" />
      {label}
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
