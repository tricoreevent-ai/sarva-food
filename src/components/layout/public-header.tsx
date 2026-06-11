"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import {
  Check,
  ChevronDown,
  CircleHelp,
  Heart,
  LocateFixed,
  LogOut,
  MapPinned,
  Menu,
  MapPin,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { SafeImage } from "@/components/media/safe-image";
import { AppPreferences } from "@/components/settings/app-preferences";
import { getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { COLLECTIONS } from "@/firebase/collections";
import { useAuthUser } from "@/hooks/use-auth-user";
import { defaultLocation, useLocationCommerce, type CommerceLocation } from "@/hooks/use-location-commerce";
import { useAppStore } from "@/lib/app-store";
import { useCartStore } from "@/lib/cart-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { APP_NAME } from "@/lib/constants";
import {
  CUSTOMER_LOCAL_ADDRESSES_EVENT,
  CUSTOMER_LOCAL_PROFILE_EVENT,
  localAddressesKey,
  localProfileKey,
  readLocalAddresses,
  readLocalProfile,
  type LocalProfileDraft,
} from "@/lib/customer-address-storage";
import { shouldUseFirebase } from "@/lib/env";
import { customerNav } from "@/lib/navigation";
import { PUBLIC_CMS_CACHE_EVENT, PUBLIC_CMS_CACHE_KEY, readCachedPublicCmsSettings } from "@/lib/public-cms-cache";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import { signOutUser } from "@/services/auth-service";
import { signOutStackCustomer } from "@/services/auth/stack-auth-client";
import type { CmsSettings } from "@/lib/types";
import type { CustomerAddressDoc } from "@/types/firebase";

export function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthUser();
  const localAuthUser = useAppStore((state) => state.authUser);
  const storeCmsSettings = useAppStore((state) => state.cmsSettings);
  const cachedCmsSettings = useSyncExternalStore(subscribePublicCmsSettings, readCachedPublicCmsSettings, emptyPublicCmsSnapshot);
  const hydrated = useSyncExternalStore(subscribeHydration, browserHydratedSnapshot, serverHydratedSnapshot);
  const cmsSettingsSource = hydrated ? cachedCmsSettings ?? storeCmsSettings : defaultCmsSettings;
  const cmsSettings = useMemo(
    () => resolveCmsSettings(cmsSettingsSource),
    [cmsSettingsSource],
  );
  const branding = cmsSettings.branding;
  const productName = branding?.appName?.trim() || cmsSettings.appName?.trim() || APP_NAME;
  const logoUrl = branding?.logoUrl?.trim();
  const brandInitials = getInitials(branding?.shortName || productName);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const clearCart = useCartStore((state) => state.clearCart);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localProfile, setLocalProfile] = useState<LocalProfileDraft | null>(null);
  const [localAddresses, setLocalAddresses] = useState<CustomerAddressDoc[]>([]);
  const [remoteAddresses, setRemoteAddresses] = useState<CustomerAddressDoc[]>([]);
  const {
    location,
    suggestions,
    status: locationStatus,
    detecting,
    detectLocation,
    searchPlaces,
    selectLocation,
  } = useLocationCommerce([]);

  const resolvedProfile = auth.profile;
  const customerProfile = resolvedProfile?.role === "customer" ? resolvedProfile : null;
  const profileResolvedToOtherRole = auth.profileState === "success" && resolvedProfile !== null && resolvedProfile.role !== "customer";
  const localCustomerSession = localAuthUser.role === "customer" && localAuthUser.id !== "anonymous";
  const loggedIn = !signingOut && Boolean(customerProfile || (auth.user && !profileResolvedToOtherRole) || localCustomerSession);
  const restaurantRoute = pathname.startsWith("/restaurant/");
  const customerId = loggedIn ? (customerProfile?.uid || customerProfile?.id || auth.user?.uid || localAuthUser.id) : null;
  const displayName = loggedIn
    ? customerProfile?.displayName?.trim()
      || auth.user?.displayName?.trim()
      || localProfile?.displayName?.trim()
      || localAuthUser.name?.trim()
      || "Customer"
    : "Guest";
  const profileImageUrl = loggedIn
    ? (customerProfile?.photoURL || auth.user?.photoURL || localProfile?.photoURL || "").trim() || undefined
    : undefined;
  const savedAddresses = useMemo(
    () => uniqueAddresses(remoteAddresses.length ? remoteAddresses : localAddresses),
    [localAddresses, remoteAddresses],
  );
  const locationOptions = useMemo(() => {
    const currentLocation = location.source === "fallback" ? [] : [location];
    const searchResults = locationQuery.trim() ? suggestions : [];
    const fallbackLocations = currentLocation.length || savedAddresses.length || searchResults.length ? [] : [defaultLocation];
    return uniqueCommerceLocations([
      ...currentLocation,
      ...savedAddresses.map(addressToCommerceLocation),
      ...searchResults,
      ...fallbackLocations,
    ]);
  }, [location, locationQuery, savedAddresses, suggestions]);

  useEffect(() => {
    if (!customerId || customerId === "anonymous") {
      const resetTimerId = window.setTimeout(() => {
        setLocalAddresses([]);
        setRemoteAddresses([]);
      }, 0);
      return () => window.clearTimeout(resetTimerId);
    }

    let active = true;
    const refreshLocalAddresses = () => {
      if (!active) return;
      setLocalAddresses(readLocalAddresses(customerId));
    };
    const localTimerId = window.setTimeout(() => {
      refreshLocalAddresses();
      if (!shouldUseFirebase() || !isFirebaseConfigured) {
        setRemoteAddresses([]);
      }
    }, 0);
    const handleLocalAddressUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ customerId?: string }>).detail;
      if (!detail?.customerId || detail.customerId === customerId) refreshLocalAddresses();
    };
    const handleAddressStorage = (event: StorageEvent) => {
      if (event.key === localAddressesKey(customerId)) refreshLocalAddresses();
    };
    window.addEventListener(CUSTOMER_LOCAL_ADDRESSES_EVENT, handleLocalAddressUpdate);
    window.addEventListener("storage", handleAddressStorage);

    if (!shouldUseFirebase() || !isFirebaseConfigured) {
      return () => {
        active = false;
        window.clearTimeout(localTimerId);
        window.removeEventListener(CUSTOMER_LOCAL_ADDRESSES_EVENT, handleLocalAddressUpdate);
        window.removeEventListener("storage", handleAddressStorage);
      };
    }

    const unsubscribe = onSnapshot(
      query(collection(getFirebaseDb(), COLLECTIONS.customerAddresses), where("customerId", "==", customerId), limit(12)),
      (snapshot) => {
        setRemoteAddresses(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as CustomerAddressDoc));
      },
      () => {
        setRemoteAddresses([]);
      },
    );

    return () => {
      active = false;
      window.clearTimeout(localTimerId);
      window.removeEventListener(CUSTOMER_LOCAL_ADDRESSES_EVENT, handleLocalAddressUpdate);
      window.removeEventListener("storage", handleAddressStorage);
      unsubscribe();
    };
  }, [customerId]);

  useEffect(() => {
    if (!customerId || customerId === "anonymous") {
      const resetTimerId = window.setTimeout(() => setLocalProfile(null), 0);
      return () => window.clearTimeout(resetTimerId);
    }

    let active = true;
    const refreshLocalProfile = () => {
      if (!active) return;
      setLocalProfile(readLocalProfile(customerId));
    };
    const timerId = window.setTimeout(refreshLocalProfile, 0);
    const handleLocalProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ customerId?: string }>).detail;
      if (!detail?.customerId || detail.customerId === customerId) refreshLocalProfile();
    };
    const handleProfileStorage = (event: StorageEvent) => {
      if (event.key === localProfileKey(customerId)) refreshLocalProfile();
    };
    window.addEventListener(CUSTOMER_LOCAL_PROFILE_EVENT, handleLocalProfileUpdate);
    window.addEventListener("storage", handleProfileStorage);

    return () => {
      active = false;
      window.clearTimeout(timerId);
      window.removeEventListener(CUSTOMER_LOCAL_PROFILE_EVENT, handleLocalProfileUpdate);
      window.removeEventListener("storage", handleProfileStorage);
    };
  }, [customerId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void searchPlaces(locationQuery);
    }, 180);
    return () => window.clearTimeout(timerId);
  }, [locationQuery, searchPlaces]);

  async function handleLogout() {
    setSigningOut(true);
    setProfileOpen(false);
    await Promise.all([
      signOutUser().catch(() => undefined),
      signOutStackCustomer().catch(() => undefined),
      fetch("/api/auth/session?surface=customer", { method: "DELETE" }).catch(() => undefined),
    ]);
    clearCart();
    setLocalProfile(null);
    setLocalAddresses([]);
    setRemoteAddresses([]);
    window.localStorage.removeItem("sarva-customer-auth");
    setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
    window.location.href = "/";
  }

  function chooseLocation(nextLocation: CommerceLocation) {
    selectLocation(nextLocation);
    setLocationOpen(false);
    setLocationQuery("");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-background/94 backdrop-blur-xl">
      <div className="container-page flex min-h-16 items-center justify-between gap-3 py-2 md:min-h-20">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${productName} home`}>
          <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full food-gradient text-sm font-black text-white shadow-sm md:size-12">
            {logoUrl ? (
              <SafeImage src={logoUrl} alt={`${productName} logo`} fill sizes="48px" className="object-cover" />
            ) : (
              brandInitials
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black leading-tight md:text-xl">{productName}</span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex">
          <LocationPicker
            compact={false}
            open={locationOpen}
            setOpen={setLocationOpen}
            location={location}
            locationStatus={locationStatus}
            locationQuery={locationQuery}
            setLocationQuery={setLocationQuery}
            locationOptions={locationOptions}
            detecting={detecting}
            detectLocation={detectLocation}
            chooseLocation={chooseLocation}
            loggedIn={loggedIn}
          />
          <form
            className="flex h-11 min-w-[20rem] max-w-2xl flex-1 items-center gap-3 rounded-lg border bg-white px-4 text-sm font-semibold text-muted-foreground shadow-sm transition focus-within:border-primary/40"
            onSubmit={(event) => {
              event.preventDefault();
              const queryText = searchQuery.trim();
              router.push(queryText ? `/restaurants?query=${encodeURIComponent(queryText)}` : "/restaurants");
            }}
          >
            <Search className="size-4 shrink-0" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
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
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open cart"
                className={`relative bg-card ${restaurantRoute ? "hidden md:inline-flex" : ""}`}
              >
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
                <CustomerAvatar displayName={displayName} photoURL={profileImageUrl} />
                <span className="max-w-28 truncate">{displayName}</span>
                <ChevronDown className="size-4" />
              </Button>
              {profileOpen ? (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-card p-3 text-card-foreground shadow-2xl">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <CustomerAvatar displayName={displayName} photoURL={profileImageUrl} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{displayName}</p>
                      <p className="text-xs font-semibold text-muted-foreground">Customer account</p>
                    </div>
                  </div>
                  <Link href="/loyalty" className="my-3 flex items-center justify-between rounded-xl bg-muted p-3 text-sm font-bold text-foreground hover:bg-orange-50 dark:hover:bg-slate-800">
                    <span className="flex items-center gap-2"><WalletCards className="size-4 text-orange-600" /> Loyalty rewards</span>
                    <span className="text-xs text-muted-foreground">View points</span>
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
                      <CustomerAvatar displayName={displayName} photoURL={profileImageUrl} size="lg" />
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
                      className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold text-foreground hover:bg-muted"
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
      <div className="container-page pb-2 md:hidden">
        <LocationPicker
          compact
          open={locationOpen}
          setOpen={setLocationOpen}
          location={location}
          locationStatus={locationStatus}
          locationQuery={locationQuery}
          setLocationQuery={setLocationQuery}
          locationOptions={locationOptions}
          detecting={detecting}
          detectLocation={detectLocation}
          chooseLocation={chooseLocation}
          loggedIn={loggedIn}
        />
      </div>
    </header>
  );
}

function subscribePublicCmsSettings(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === PUBLIC_CMS_CACHE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PUBLIC_CMS_CACHE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PUBLIC_CMS_CACHE_EVENT, onStoreChange);
  };
}

function emptyPublicCmsSnapshot(): CmsSettings | null {
  return null;
}

function subscribeHydration() {
  return () => undefined;
}

function browserHydratedSnapshot() {
  return true;
}

function serverHydratedSnapshot() {
  return false;
}

function LocationPicker({
  compact,
  open,
  setOpen,
  location,
  locationStatus,
  locationQuery,
  setLocationQuery,
  locationOptions,
  detecting,
  detectLocation,
  chooseLocation,
  loggedIn,
}: {
  compact: boolean;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  location: CommerceLocation;
  locationStatus: string;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  locationOptions: CommerceLocation[];
  detecting: boolean;
  detectLocation: () => void;
  chooseLocation: (location: CommerceLocation) => void;
  loggedIn: boolean;
}) {
  const label = location.source === "fallback" ? "Choose location" : location.label;

  return (
    <div className={compact ? "relative w-full" : "relative shrink-0"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={compact ? "h-10 w-full justify-start rounded-lg bg-white px-3 shadow-sm" : "h-11 max-w-64 rounded-lg bg-white px-4 shadow-sm"}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-4 shrink-0" />
      </Button>
      {open ? (
        <div className={compact ? "absolute left-0 right-0 top-11 z-50 rounded-xl border bg-white p-3 shadow-2xl" : "absolute left-0 top-12 z-50 w-96 rounded-xl border bg-white p-3 shadow-2xl"}>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Search address, area, or landmark"
              aria-label="Search delivery location"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-semibold text-muted-foreground">{locationStatus}</p>
            <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={detectLocation} disabled={detecting}>
              <LocateFixed className="size-4" />
              {detecting ? "Detecting" : "Detect"}
            </Button>
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto">
            {locationOptions.map((option) => {
              const selected = sameLocation(option, location);
              return (
                <button
                  key={`${option.source}-${option.placeId || option.address}`}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-orange-50"
                  onClick={() => chooseLocation(option)}
                >
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-orange-50 text-primary">
                    {selected ? <Check className="size-4" /> : <MapPinned className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-foreground">{option.label}</span>
                    <span className="line-clamp-2 text-xs font-semibold leading-5 text-muted-foreground">{option.address}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Link
            href={loggedIn ? "/account/profile?tab=addresses" : "/login?next=/account/profile?tab=addresses"}
            className="mt-2 flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-orange-200 px-3 text-sm font-black text-primary hover:bg-orange-50"
          >
            <Plus className="size-4" />
            Add new address
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function HeaderMenuLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-bold text-foreground hover:bg-muted">
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
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link href={href} className="grid gap-1 rounded-xl bg-card px-2 py-3 text-card-foreground">
      <Icon className="mx-auto size-5 text-primary" />
      <span>{label}</span>
    </Link>
  );
}

function CustomerAvatar({
  displayName,
  photoURL,
  size = "sm",
}: {
  displayName: string;
  photoURL?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-12" : size === "md" ? "size-11" : "size-7";
  const iconClass = size === "sm" ? "size-4" : "size-5";
  const imageSize = size === "lg" ? "48px" : size === "md" ? "44px" : "28px";

  if (photoURL) {
    return (
      <span className={`relative grid ${sizeClass} shrink-0 place-items-center overflow-hidden rounded-full bg-orange-50 text-primary`}>
        <SafeImage src={photoURL} alt="" fill sizes={imageSize} className="object-cover" />
      </span>
    );
  }

  return (
    <span className={`grid ${sizeClass} shrink-0 place-items-center rounded-full bg-primary text-white`}>
      <UserRound className={iconClass} aria-hidden="true" />
      <span className="sr-only">{displayName}</span>
    </span>
  );
}

function addressToCommerceLocation(address: CustomerAddressDoc): CommerceLocation {
  return {
    label: address.label || "Saved address",
    address: address.fullAddress || address.address || address.label || defaultLocation.address,
    latitude: typeof address.latitude === "number" ? address.latitude : defaultLocation.latitude,
    longitude: typeof address.longitude === "number" ? address.longitude : defaultLocation.longitude,
    placeId: address.placeId || address.id,
    source: "manual",
  };
}

function uniqueAddresses(addresses: CustomerAddressDoc[]) {
  const seen = new Set<string>();
  return addresses.filter((address) => {
    const key = (address.id || address.fullAddress || address.address || address.label).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueCommerceLocations(locations: CommerceLocation[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = (location.placeId || location.address || location.label).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameLocation(first: CommerceLocation, second: CommerceLocation) {
  return (first.placeId || first.address).trim().toLowerCase() === (second.placeId || second.address).trim().toLowerCase();
}

function getInitials(name?: string) {
  return (name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}
