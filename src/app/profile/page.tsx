"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  Bell,
  Building2,
  CalendarClock,
  Camera,
  ChevronRight,
  CreditCard,
  Edit3,
  Heart,
  History,
  Home,
  LogIn,
  LogOut,
  Mail,
  MapPinned,
  PackageOpen,
  Plus,
  RefreshCw,
  Settings2,
  ShoppingBag,
  TicketPercent,
  Trash2,
  Star,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "@/lib/client-toast";
import type { MapboxPickedLocation } from "@/components/maps/address-autocomplete";
import { CustomerShell } from "@/components/layout/customer-shell";
import { InlineLoading, RetryState } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData, type CustomerCouponDoc } from "@/hooks/use-customer-data";
import { usePublicAppName } from "@/hooks/use-public-app-name";
import { useAlert } from "@/hooks/useAlert";
import { parseFirestoreDate } from "@/lib/firestore-date";
import { isFirebaseConfigured } from "@/firebase/config";
import { shouldUseFirebase } from "@/lib/env";
import { useAppStore } from "@/lib/app-store";
import { APP_NAME } from "@/lib/constants";
import { resetCustomerOrderingSession } from "@/lib/customer-session-reset";
import { resolveCustomerPhotoURL } from "@/lib/customer-profile-image";
import { captureException } from "@/services/analytics-service";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { CateringQuote } from "@/lib/types";
import type { CustomerAddressDoc, CustomerOrderDoc, CustomerProfileDoc, FirestoreDate } from "@/types/firebase";

type CustomerProfileDetails = {
  photoURL?: string;
  phoneVerified?: boolean;
};

type AddressDraft = {
  label: string;
  address: string;
  apartment: string;
  floor: string;
  landmark: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  deliveryRadiusKm?: number;
};

const emptyAddressDraft: AddressDraft = {
  label: "Home",
  address: "",
  apartment: "",
  floor: "",
  landmark: "",
};
const LazyAddressAutocomplete = dynamic(() => import("@/components/maps/address-autocomplete").then((module) => module.AddressAutocomplete), {
  ssr: false,
  loading: () => <Input placeholder="Search delivery area or street address" disabled />,
});
const AppPreferences = dynamic(() => import("@/components/settings/app-preferences").then((module) => module.AppPreferences), {
  ssr: false,
  loading: () => <div className="rounded-md border bg-muted/30 p-3 text-sm font-semibold text-muted-foreground">Loading preferences</div>,
});

export default function ProfilePage() {
  return <ProfilePageContent />;
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useAlert();
  const auth = useAuthUser();
  const appName = usePublicAppName();
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
  const { user, loading } = auth;
  const customer = useCustomerData(user?.uid);
  const { profile: customerProfile, retry: retryCustomer, status: customerStatus } = customer;
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const phoneRequired = searchParams.get("phoneRequired") === "1";
  const [activeTab, setActiveTab] = useState(() => phoneRequired ? "settings" : profileTabFromUrl(searchParams.get("tab")));
  const [signingOut, setSigningOut] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddressDraft);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [accountDraft, setAccountDraft] = useState({ displayName: "", email: "", phone: "", photoURL: "", password: "" });
  const [accountMessage, setAccountMessage] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const blockedByRole = Boolean(user && auth.profileState === "success" && auth.profile?.role !== "customer");

  useEffect(() => {
    if (!user?.uid || customerStatus === "loading" || customerProfile || auth.profile?.role === "customer") return;
    if (!shouldUseFirebase() || !isFirebaseConfigured) return;
    const expectedUid = user.uid;
    const id = window.setTimeout(() => {
      void Promise.all([
        import("@/firebase/client"),
        import("@/services/auth-service"),
      ])
        .then(([firebaseClient, authService]) => {
          const authUser = firebaseClient.getFirebaseAuth().currentUser;
          if (!authUser || authUser.uid !== expectedUid) return;
          return authService.ensureCustomerProfile(authUser, "customer").then(() => retryCustomer());
        })
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(id);
  }, [auth.profile?.role, customerProfile, customerStatus, retryCustomer, user?.uid]);

  useEffect(() => {
    if (!blockedByRole) return;
    void signOutProfileServices().finally(() => {
      void resetCustomerOrderingSession({ clearRemoteCart: true });
      setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
      router.replace("/login?next=/profile");
    });
  }, [blockedByRole, router, setAuthUser]);

  async function handleLogout() {
    setSigningOut(true);
    await resetCustomerOrderingSession({ clearRemoteCart: true });
    await signOutProfileServices();
    window.localStorage.removeItem("sarva-customer-auth");
    setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
    setSigningOut(false);
    router.replace("/login?next=/profile");
    router.refresh();
  }

  async function handleSaveAddress() {
    if (!user || !addressDraft.label.trim() || !addressDraft.address.trim() || !addressDraft.apartment.trim()) {
      setAddressMessage("Search an area, add house or apartment details, and add a label.");
      return;
    }
    setSavingAddress(true);
    setAddressMessage("");
    try {
      const id = editingAddressId ?? `${user.uid}-${Date.now()}`;
      const isFirstAddress = customer.addresses.length === 0;
      const fullAddress = buildFullAddress(addressDraft);
      const payload = {
        id,
        customerId: user.uid,
        label: addressDraft.label.trim(),
        address: addressDraft.address.trim(),
        fullAddress,
        apartment: addressDraft.apartment.trim(),
        floor: addressDraft.floor.trim() || undefined,
        landmark: addressDraft.landmark.trim() || undefined,
        latitude: addressDraft.latitude,
        longitude: addressDraft.longitude,
        placeId: addressDraft.placeId,
        geo: typeof addressDraft.latitude === "number" && typeof addressDraft.longitude === "number"
          ? { lat: addressDraft.latitude, lng: addressDraft.longitude }
          : undefined,
        verified: true,
        isDefault: isFirstAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const { getFirebaseAuth } = await import("@/firebase/client");
      if (!shouldUseFirebase() || !isFirebaseConfigured || !getFirebaseAuth().currentUser) {
        setAddressMessage("Could not connect to Firebase. Please refresh and try again.");
        return;
      }
      const response = await fetch("/api/customer/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resource: "addresses", id, data: payload }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Address save failed.");
      saveSelectedDeliveryLocation(payload);
      await customer.retry();
      setAddressDraft(emptyAddressDraft);
      setEditingAddressId(null);
      const message = editingAddressId ? "Address updated." : "Address added.";
      setAddressMessage(message);
      toast.success(message);
    } catch (error) {
      void captureException(error, { surface: "customer-profile-address-save" });
      setAddressMessage(friendlyProfileMessage(error, "Could not save address. Check the details and try again."));
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(addressId: string) {
    if (!user) return;
    const confirmed = await confirm("Delete this saved address?", {
      title: "Delete address",
      confirmText: "Delete",
      confirmVariant: "danger",
      cancelText: "Keep",
      tone: "danger",
    });
    if (!confirmed) return;
    setAddressMessage("");
    if (!shouldUseFirebase() || !isFirebaseConfigured || !customer.addresses.some((item) => item.id === addressId)) {
      setAddressMessage("Could not find this address in Firebase. Refresh and try again.");
      return;
    }
    try {
      const response = await fetch(`/api/customer/account?resource=addresses&id=${encodeURIComponent(addressId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Address delete failed.");
      customer.retry();
      setAddressMessage("Address deleted.");
    } catch (error) {
      void captureException(error, { surface: "customer-profile-address-delete" });
      setAddressMessage("Could not delete address. Refresh and try again.");
    }
  }

  async function handleDeleteSavedRestaurant(favoriteId: string) {
    if (!user) return;
    const confirmed = await confirm("Remove this restaurant from favorites?", {
      title: "Remove favorite",
      confirmText: "Remove",
      confirmVariant: "danger",
      cancelText: "Keep",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/customer/account?resource=savedRestaurants&id=${encodeURIComponent(favoriteId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Favorite removal failed.");
      customer.retry();
    } catch {
      customer.retry();
    }
  }

  function handleEditAddress(address: CustomerAddressDoc) {
    const details = address as CustomerAddressDoc & { fullAddress?: string; apartment?: string; floor?: string; landmark?: string };
    setEditingAddressId(address.id);
    setAddressDraft({
      label: address.label ?? "Home",
      address: address.address ?? "",
      apartment: details.apartment ?? "",
      floor: details.floor ?? "",
      landmark: details.landmark ?? "",
      latitude: address.latitude ?? details.geo?.lat,
      longitude: address.longitude ?? details.geo?.lng,
      placeId: address.placeId,
    });
    selectProfileTab("addresses");
  }

  function handleSelectAddressLocation(location: MapboxPickedLocation) {
    setAddressDraft((current) => ({
      ...current,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      placeId: location.placeId,
      deliveryRadiusKm: location.deliveryRadiusKm,
    }));
    setAddressMessage("Address selected. Add flat, floor, and label to save.");
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setAddressMessage("Location access is not available in this browser.");
      return;
    }
    setLocating(true);
    setAddressMessage("Getting your current location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        let placeId: string | undefined;
        if (mapboxToken) {
          try {
            const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`);
            url.searchParams.set("access_token", mapboxToken);
            url.searchParams.set("limit", "1");
            const response = await fetch(url.toString());
            const payload = (await response.json()) as { features?: Array<{ id?: string; place_name?: string }> };
            address = payload.features?.[0]?.place_name ?? address;
            placeId = payload.features?.[0]?.id;
          } catch {
            setAddressMessage("GPS found, but address lookup failed. Coordinates were added.");
          }
        }
        setAddressDraft((current) => ({
          ...current,
          address,
          latitude,
          longitude,
          placeId,
          deliveryRadiusKm: 5,
        }));
        setAddressMessage("Current location added. Add flat, floor, and label to save.");
        setLocating(false);
      },
      () => {
        setAddressMessage("Location permission was blocked. Search and select the address instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (loading || blockedByRole || (user && auth.profileState === "loading")) {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <InlineLoading label="Checking customer account" />
        </main>
      </CustomerShell>
    );
  }

  if (!user) {
    return (
      <CustomerShell>
        <LoggedOutProfile />
      </CustomerShell>
    );
  }

  if (customer.status === "loading") {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <InlineLoading label="Loading customer profile" />
        </main>
      </CustomerShell>
    );
  }

  if (customer.status === "error") {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <RetryState
            title="Could not load customer profile"
            description="Your customer profile data could not be loaded from Firestore."
            onRetry={customer.retry}
          />
        </main>
      </CustomerShell>
    );
  }

  const fallbackProfile = createCustomerProfileFallback(user);
  const baseProfile = customer.profile ?? (auth.profile?.role === "customer" ? auth.profile : null) ?? fallbackProfile;
  const effectiveProfile = {
    ...baseProfile,
    photoURL: resolveCustomerPhotoURL(user.photoURL, baseProfile.photoURL),
  };
  const effectiveAddresses = customer.addresses;

  const profileDetails = effectiveProfile as typeof effectiveProfile & CustomerProfileDetails;
  const stableProfile = effectiveProfile;
  const activeCoupons = customer.coupons.filter(isCouponActive);
  const currentEmail = effectiveProfile.email ?? "";
  const currentPhone = effectiveProfile.phone ?? "";
  const phoneMissing = !currentPhone.trim();
  const profileCateringInquiries = filterProfileCatering(customer.cateringInquiries, currentEmail, currentPhone, effectiveProfile.displayName);

  function selectProfileTab(tab: string) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `/profile?${query}` : "/profile", { scroll: false });
  }

  async function handleSaveAccount() {
    setSavingAccount(true);
    setAccountMessage("");
    try {
      if (!user) {
        setAccountMessage("Sign in again before changing account details.");
        return;
      }
      const nextEmail = accountDraft.email.trim();
      const nextPhone = accountDraft.phone.trim();
      const nextDisplayName = accountDraft.displayName.trim();
      const nextPhotoURL = accountDraft.photoURL.trim();
      const nextPassword = accountDraft.password.trim();
      const nextLocalProfile = {
        displayName: nextDisplayName || stableProfile.displayName,
        email: nextEmail || currentEmail || undefined,
        phone: nextPhone || currentPhone || undefined,
        photoURL: resolveCustomerPhotoURL(nextPhotoURL, user.photoURL, profileDetails.photoURL),
      };
      if (!isFirebaseConfigured || !shouldUseFirebase()) {
        setAccountMessage("Could not connect to Firebase. Please refresh and try again.");
        return;
      }
      const [{ getFirebaseAuth }, { updateEmail, updatePassword, updateProfile }] = await Promise.all([
        import("@/firebase/client"),
        import("firebase/auth"),
      ]);
      const authUser = getFirebaseAuth().currentUser;
      if (!authUser) {
        setAccountMessage("Sign in again before saving profile changes.");
        return;
      }
      if (nextDisplayName || nextPhotoURL) await updateProfile(authUser, { displayName: nextLocalProfile.displayName, photoURL: nextLocalProfile.photoURL });
      if (nextEmail && nextEmail !== currentEmail) await updateEmail(authUser, nextEmail);
      if (nextPassword) await updatePassword(authUser, nextPassword);
      const response = await fetch("/api/customer/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resource: "profile",
          id: user.uid,
          data: { ...nextLocalProfile, phoneVerified: Boolean(nextPhone || currentPhone) },
        }),
      });
      if (!response.ok) throw new Error("Profile save failed.");
      setAccountDraft({ displayName: "", email: "", phone: "", photoURL: "", password: "" });
      setAccountMessage("Account details updated.");
      customer.retry();
    } catch (error) {
      const message = error instanceof Error && /requires-recent-login/i.test(error.message)
        ? "For security, sign out and sign in again before changing email or password."
        : "Could not save profile. Please check the details and try again.";
      void captureException(error, { surface: "customer-profile-save" });
      setAccountMessage(message);
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <CustomerShell>
      <main className="container-page space-y-5 py-4 sm:py-8">
        {customer.error ? (
          <div className="flex items-start gap-3 rounded-md border border-warning/35 bg-warning/10 p-3 text-sm font-semibold text-warning">
            <RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{customer.error}</p>
            <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={customer.retry}>
              Retry
            </Button>
          </div>
        ) : null}

        {phoneMissing ? <PhoneRequiredNotice onOpenSettings={() => selectProfileTab("settings")} /> : null}

        <Tabs value={activeTab} onValueChange={selectProfileTab} className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="hidden space-y-4 lg:block">
            <Card className="customer-surface">
              <CardContent className="p-3">
                <TabsList className="grid h-auto gap-1 bg-transparent p-0">
                  <ProfileNavTrigger value="overview" icon={UserRound} label="Profile Overview" />
                  <ProfileNavTrigger value="addresses" icon={MapPinned} label="Addresses" />
                  <ProfileNavTrigger value="payments" icon={CreditCard} label="Payments" />
                  <ProfileNavTrigger value="orders" icon={ShoppingBag} label="Orders" />
                  <ProfileNavTrigger value="catering" icon={CalendarClock} label="Catering" />
                  <ProfileNavTrigger value="saved" icon={Heart} label="Saved Restaurants" />
                  <ProfileNavTrigger value="reviews" icon={Star} label="Reviews" />
                  <ProfileNavTrigger value="offers" icon={TicketPercent} label="Offers & Coupons" />
                  <ProfileNavTrigger value="settings" icon={Settings2} label="Settings" />
                </TabsList>
              </CardContent>
            </Card>
            <Card className="hidden customer-surface lg:block">
              <CardContent className="space-y-3 p-5">
                <div className="grid size-11 place-items-center rounded-full bg-orange-100 text-primary">
                  <WalletCards className="size-5" />
                </div>
                <h2 className="text-lg font-black">{appName} One</h2>
                <p className="text-sm leading-6 text-muted-foreground">Wallet rewards, loyalty points, and better offers after every purchase.</p>
                <Button asChild size="sm">
                  <Link href="/loyalty">Explore Now</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>

          <section className="min-w-0 space-y-5">
            <ProfileHero
              name={effectiveProfile.displayName}
              email={effectiveProfile.email}
              phone={effectiveProfile.phone}
              photoURL={profileDetails.photoURL}
              emailVerified={Boolean("emailVerified" in effectiveProfile ? effectiveProfile.emailVerified : effectiveProfile.email)}
              phoneVerified={Boolean(profileDetails.phoneVerified && effectiveProfile.phone)}
              onEditProfile={() => selectProfileTab("settings")}
              onLogout={handleLogout}
              signingOut={signingOut}
              points={customer.loyalty?.points ?? 0}
              tier={customer.loyalty?.tier ?? "Regular"}
              walletValue={Math.round((customer.loyalty?.points ?? 0) / 10)}
            />
            <TabsContent value="overview" className="mt-0 space-y-5">
              <QuickActions onSelect={selectProfileTab} />
              <MobileSavedAddressesPreview addresses={effectiveAddresses} onOpen={() => selectProfileTab("addresses")} />
              <RecentOrdersPanel orders={customer.orders} />
            </TabsContent>
            <TabsContent value="addresses" className="mt-0">
              <AddressesPanel
                addresses={effectiveAddresses}
                draft={addressDraft}
                onDraftChange={setAddressDraft}
                editingAddressId={editingAddressId}
                onCancelEdit={() => {
                  setEditingAddressId(null);
                  setAddressDraft(emptyAddressDraft);
                }}
                onSaveAddress={handleSaveAddress}
                onSelectLocation={handleSelectAddressLocation}
                onUseCurrentLocation={() => void handleUseCurrentLocation()}
                onEditAddress={handleEditAddress}
                onDeleteAddress={(addressId) => void handleDeleteAddress(addressId)}
                saving={savingAddress}
                locating={locating}
                message={addressMessage}
              />
            </TabsContent>
            <TabsContent value="payments" className="mt-0">
              <PaymentsPanel payments={customer.payments} walletValue={Math.round((customer.loyalty?.points ?? 0) / 10)} points={customer.loyalty?.points ?? 0} />
            </TabsContent>
            <TabsContent value="orders" className="mt-0">
              <OrdersPanel orders={customer.orders} />
            </TabsContent>
            <TabsContent value="catering" className="mt-0">
              <CateringRequestsPanel inquiries={profileCateringInquiries} />
            </TabsContent>
            <TabsContent value="saved" className="mt-0">
              <SavedPanel savedRestaurants={customer.savedRestaurants} onDelete={handleDeleteSavedRestaurant} />
            </TabsContent>
            <TabsContent value="reviews" className="mt-0">
              <ReviewsPanel reviews={customer.reviews} />
            </TabsContent>
            <TabsContent value="offers" className="mt-0">
              <OffersPanel coupons={activeCoupons} />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <SettingsPanel
                displayName={accountDraft.displayName}
                email={accountDraft.email}
                phone={accountDraft.phone}
                photoURL={accountDraft.photoURL}
                password={accountDraft.password}
                currentName={effectiveProfile.displayName}
                currentEmail={currentEmail}
                currentPhone={currentPhone}
                currentPhotoURL={profileDetails.photoURL}
                message={accountMessage}
                saving={savingAccount}
                focusPhone={phoneRequired && phoneMissing}
                onChange={setAccountDraft}
                onSave={handleSaveAccount}
              />
            </TabsContent>
          </section>
        </Tabs>
      </main>
    </CustomerShell>
  );
}

function LoggedOutProfile() {
  return (
    <main className="container-page grid min-h-[calc(100svh-8rem)] place-items-center py-8">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <UserRound className="size-12" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-black">Customer account</h1>
        <div className="mt-6 grid gap-3">
          <Button asChild size="lg">
            <Link href="/login?next=/profile">
              <LogIn className="size-4" />
              Sign in
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup?next=/profile">
              <UserPlus className="size-4" />
              Create account
            </Link>
          </Button>
        </div>
        <AppPreferences compact />
      </section>
    </main>
  );
}

function PhoneRequiredNotice({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Card className="border-orange-200 bg-orange-50/70 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black">Add your mobile number to complete your profile</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            We need it for delivery updates, order support, and restaurant callback confirmation.
          </p>
        </div>
        <Button type="button" onClick={onOpenSettings}>
          <Plus className="size-4" />
          Add mobile number
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileAvatar({ name, photoURL, size = "lg" }: { name: string; photoURL?: string; size?: "sm" | "lg" }) {
  const className = size === "sm" ? "size-11" : "mx-auto size-24";
  const [failedPhotoURL, setFailedPhotoURL] = useState<string | null>(null);

  if (photoURL && failedPhotoURL !== photoURL) {
    return (
      <Image
        src={photoURL}
        alt=""
        width={size === "sm" ? 44 : 96}
        height={size === "sm" ? 44 : 96}
        unoptimized
        className={`${className} rounded-full object-cover ring-4 ring-primary/10`}
        onError={() => setFailedPhotoURL(photoURL)}
      />
    );
  }

  return (
    <div className={`${className} grid place-items-center rounded-full bg-primary text-xl font-black text-primary-foreground ring-4 ring-primary/10`}>
      {getInitials(name)}
    </div>
  );
}

function ProfileNavTrigger({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="justify-start gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </TabsTrigger>
  );
}

function ProfileHero({
  name,
  email,
  phone,
  photoURL,
  emailVerified,
  phoneVerified,
  onEditProfile,
  onLogout,
  signingOut,
  points,
  tier,
  walletValue,
}: {
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onEditProfile: () => void;
  onLogout: () => void;
  signingOut: boolean;
  points: number;
  tier: string;
  walletValue: number;
}) {
  return (
    <Card className="customer-surface overflow-hidden">
      <CardContent className="relative grid gap-5 p-5 md:grid-cols-[1fr_auto] md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar name={name} photoURL={photoURL} />
          <div className="min-w-0">
            <h1 className="text-xl font-black md:text-2xl">Hello, {name} <span aria-hidden="true">👋</span></h1>
            <p className="mt-2 text-xs font-semibold text-muted-foreground md:text-sm">{email ?? "Email not added"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={emailVerified ? "success" : "secondary"}>{emailVerified ? "Email verified" : "Email pending"}</Badge>
              <Badge variant={phoneVerified ? "success" : "secondary"}>{phoneVerified ? "Phone verified" : "Phone not added"}</Badge>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground md:text-sm">{phone ?? "Phone not added"}</p>
            <Button type="button" variant="ghost" size="sm" className="-ml-3 mt-1 text-primary" onClick={onEditProfile}>
              <Edit3 className="size-4" />
              {phone ? "Edit profile" : "Add phone number"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:min-w-80">
          <RewardStat label="Wallet" value={formatCurrency(walletValue)} />
          <RewardStat label="Rewards" value={`${points} pts`} />
          <RewardStat label="Tier" value={tier} />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onLogout} disabled={signingOut} className="absolute right-4 top-4 hidden md:inline-flex">
          <LogOut className="size-4" />
          {signingOut ? "Logging out" : "Logout"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RewardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white/70 p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function QuickActions({ onSelect }: { onSelect: (tab: string) => void }) {
  const actions = [
    { tab: "orders", label: "My Orders", text: "View all orders", icon: ShoppingBag, tone: "bg-red-100 text-primary" },
    { tab: "catering", label: "Catering", text: "Track quotes", icon: CalendarClock, tone: "bg-orange-100 text-orange-700" },
    { tab: "addresses", label: "Addresses", text: "Manage addresses", icon: MapPinned, tone: "bg-blue-100 text-blue-700" },
    { tab: "payments", label: "Payments", text: "Cards & UPI", icon: CreditCard, tone: "bg-green-100 text-green-700" },
    { tab: "offers", label: "Coupons", text: "View offers", icon: TicketPercent, tone: "bg-amber-100 text-amber-700" },
  ];

  return (
    <ProfileSection title="My Shortcuts" icon={Bell}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onSelect(action.tab)}
              className="flex h-auto items-center justify-start gap-3 rounded-lg border bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className={`grid size-11 place-items-center rounded-lg ${action.tone}`}>
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-black">{action.label}</span>
                <span className="text-sm text-muted-foreground">{action.text}</span>
              </span>
            </button>
          );
        })}
      </div>
    </ProfileSection>
  );
}

function MobileSavedAddressesPreview({ addresses, onOpen }: { addresses: CustomerAddressDoc[]; onOpen: () => void }) {
  const firstAddress = addresses[0];
  return (
    <ProfileSection title="Saved addresses" icon={MapPinned}>
      {firstAddress ? (
        <button type="button" onClick={onOpen} className="flex w-full gap-3 rounded-xl border bg-white p-3 text-left shadow-sm">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-primary">
            <Home className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black">{firstAddress.label}</p>
              <Badge variant="success">Default</Badge>
              <Badge variant="muted">Verified</Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{firstAddress.fullAddress ?? firstAddress.address}</p>
          </div>
          <ChevronRight className="mt-4 size-5 text-primary" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-white p-3 font-black text-primary"
        >
          <Plus className="size-5" />
          Add new address
        </button>
      )}
    </ProfileSection>
  );
}

function RecentOrdersPanel({ orders }: { orders: CustomerOrderDoc[] }) {
  return (
    <ProfileSection title="Recent Orders" icon={History}>
      {orders.length ? orders.slice(0, 4).map((order) => <OrderRow key={order.id} order={order} />) : (
        <ProfileEmpty icon={PackageOpen} title="No recent orders" description="Your latest restaurant orders will appear here." />
      )}
    </ProfileSection>
  );
}

function AddressesPanel({
  addresses,
  draft,
  onDraftChange,
  editingAddressId,
  onCancelEdit,
  onSaveAddress,
  onSelectLocation,
  onUseCurrentLocation,
  onEditAddress,
  onDeleteAddress,
  saving,
  locating,
  message,
}: {
  addresses: CustomerAddressDoc[];
  draft: AddressDraft;
  onDraftChange: (draft: AddressDraft) => void;
  editingAddressId: string | null;
  onCancelEdit: () => void;
  onSaveAddress: () => void;
  onSelectLocation: (location: MapboxPickedLocation) => void;
  onUseCurrentLocation: () => void;
  onEditAddress: (address: CustomerAddressDoc) => void;
  onDeleteAddress: (addressId: string) => void;
  saving: boolean;
  locating: boolean;
  message: string;
}) {
  return (
    <ProfileSection title="Saved addresses" icon={MapPinned}>
      <div className="grid gap-3 rounded-xl border bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-black">{editingAddressId ? "Edit delivery address" : "Add new address"}</p>
            <p className="text-sm text-muted-foreground">Search the delivery area first, then add apartment or street details.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onUseCurrentLocation} disabled={locating}>
            <MapPinned className="size-4" />
            {locating ? "Locating" : "Use map location"}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <LazyAddressAutocomplete
              value={draft.address}
              placeholder="Search delivery area or street address"
              proximity={typeof draft.latitude === "number" && typeof draft.longitude === "number" ? { latitude: draft.latitude, longitude: draft.longitude } : undefined}
              onSelect={onSelectLocation}
            />
          </div>
          <Input
            placeholder="House, flat, tower, block"
            value={draft.apartment}
            onChange={(event) => onDraftChange({ ...draft, apartment: event.target.value })}
          />
          <Input
            placeholder="Floor optional"
            value={draft.floor}
            onChange={(event) => onDraftChange({ ...draft, floor: event.target.value })}
          />
          <Input
            placeholder="Label: Home, Work, Family"
            value={draft.label}
            onChange={(event) => onDraftChange({ ...draft, label: event.target.value })}
          />
          <Input
            placeholder="Landmark optional"
            value={draft.landmark}
            onChange={(event) => onDraftChange({ ...draft, landmark: event.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="button" onClick={onSaveAddress} disabled={saving}>
            <Plus className="size-4" />
            {saving ? "Saving" : editingAddressId ? "Update address" : "Add address"}
          </Button>
          {editingAddressId ? <Button type="button" variant="outline" onClick={onCancelEdit}>Cancel edit</Button> : null}
          {message ? <p className="text-sm font-bold text-primary">{message}</p> : null}
        </div>
      </div>
      <div className="grid gap-3">
        {addresses.length ? addresses.map((address) => (
          <AddressRow
            key={address.id}
            address={address}
            onEdit={() => onEditAddress(address)}
            onDelete={() => onDeleteAddress(address.id)}
          />
        )) : (
          <ProfileEmpty icon={MapPinned} title="No saved addresses" description="Add multiple home, work, event, and family delivery addresses here." />
        )}
      </div>
    </ProfileSection>
  );
}

function AddressRow({ address, onEdit, onDelete }: { address: CustomerAddressDoc; onEdit: () => void; onDelete: () => void }) {
  const details = address as CustomerAddressDoc & {
    fullAddress?: string;
    apartment?: string;
    floor?: string;
    landmark?: string;
    geo?: { lat?: number; lng?: number };
    verified?: boolean;
    isDefault?: boolean;
  };
  const lat = details.geo?.lat ?? address.latitude;
  const lng = details.geo?.lng ?? address.longitude;

  return (
    <div className="flex gap-3 rounded-xl border bg-white p-3 text-sm shadow-sm">
      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {address.label?.toLowerCase().includes("work") ? <Building2 className="size-5" /> : <Home className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black">{address.label}</p>
          {details.isDefault ? <Badge variant="success">Default</Badge> : null}
          {details.verified ? <Badge variant="muted">Verified</Badge> : null}
        </div>
        <p className="mt-1 leading-6 text-muted-foreground">{details.fullAddress ?? address.address}</p>
        {details.landmark ? <p className="mt-1 text-xs font-semibold text-muted-foreground">Landmark: {details.landmark}</p> : null}
        {typeof lat === "number" && typeof lng === "number" ? (
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Edit address" onClick={onEdit}>
          <Edit3 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Delete address" onClick={onDelete}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function PaymentsPanel({ payments, walletValue = 0, points = 0 }: { payments: Array<{ id: string; label?: string; brand?: string; type?: string; last4?: string; isDefault?: boolean }>; walletValue?: number; points?: number }) {
  return (
    <ProfileSection title="Payment methods" icon={CreditCard}>
      <div className="grid gap-3 rounded-lg border bg-primary/5 p-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{APP_NAME} Wallet</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(walletValue)}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-muted-foreground">Loyalty points</p>
          <p className="mt-1 text-2xl font-black text-primary">{points} pts</p>
        </div>
      </div>
      {payments.length ? payments.map((payment) => (
        <div key={payment.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
          <WalletCards className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-black">{payment.label ?? payment.brand ?? payment.type ?? "Payment method"}</p>
            <p className="mt-1 text-muted-foreground">{payment.last4 ? `Ending ${payment.last4}` : payment.isDefault ? "Default method" : "Saved method"}</p>
          </div>
        </div>
      )) : (
        <ProfileEmpty icon={CreditCard} title="No payment methods" description="Payment methods saved during checkout will appear here." />
      )}
    </ProfileSection>
  );
}

function OrdersPanel({ orders }: { orders: CustomerOrderDoc[] }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const visibleOrders = orders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <ProfileSection title="Order history" icon={History}>
      {orders.length ? visibleOrders.map((order) => <OrderRow key={order.id} order={order} />) : (
        <ProfileEmpty icon={PackageOpen} title="No orders yet" description="Orders placed after customer login will appear here." />
      )}
      {orders.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </Button>
          <p className="text-sm font-bold text-muted-foreground">Page {page} of {totalPages}</p>
          <Button type="button" variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            Next
          </Button>
        </div>
      ) : null}
    </ProfileSection>
  );
}

function CateringRequestsPanel({ inquiries }: { inquiries: CateringQuote[] }) {
  return (
    <ProfileSection title="Catering requests" icon={CalendarClock}>
      {inquiries.length ? inquiries.map((quote) => (
        <div key={quote.id} className="rounded-xl border bg-white p-4 text-sm shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{quote.id.slice(0, 10)}</Badge>
            <Badge variant="outline" className="capitalize">{quote.status ?? "new"}</Badge>
            <span className="text-xs font-semibold text-muted-foreground">{[quote.eventDate, quote.eventTime].filter(Boolean).join(" • ") || "Date pending"}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p className="flex items-center gap-2 font-black"><Users className="size-4 text-primary" />{quote.guestCount} guests</p>
            <p className="flex items-center gap-2 font-semibold text-muted-foreground"><Mail className="size-4 text-primary" />{quote.email ?? "Email not added"}</p>
          </div>
          <p className="mt-3 font-black">{quote.eventType ?? "Catering event"}</p>
          <p className="mt-2 line-clamp-4 whitespace-pre-line leading-6 text-muted-foreground">{quote.eventNotes}</p>
          <div className="mt-3 rounded-lg bg-orange-50 p-3">
            <p className="text-xs font-black uppercase text-orange-700">Quotation</p>
            <p className="mt-1 font-black">{quote.total ? formatCurrency(quote.total) : "Waiting for restaurant revised quote"}</p>
          </div>
        </div>
      )) : (
        <ProfileEmpty icon={CalendarClock} title="No catering requests" description="Catering requests from Schedule will appear here with owner quotations." />
      )}
    </ProfileSection>
  );
}

function SavedPanel({
  savedRestaurants,
  onDelete,
}: {
  savedRestaurants: Array<{ id: string; name?: string; slug?: string; restaurantId?: string }>;
  onDelete: (favoriteId: string) => void;
}) {
  return (
    <ProfileSection title="Saved restaurants" icon={Heart}>
      {savedRestaurants.length ? savedRestaurants.map((restaurant) => {
        const href = restaurant.slug ? `/restaurant/${restaurant.slug}` : restaurant.restaurantId ? `/restaurant/${restaurant.restaurantId}` : "/restaurants";
        return (
          <div key={restaurant.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <Link href={href} className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate font-black">{restaurant.name ?? restaurant.slug ?? restaurant.restaurantId ?? restaurant.id}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove saved restaurant" onClick={() => onDelete(restaurant.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        );
      }) : (
        <ProfileEmpty icon={Heart} title="No saved restaurants" description="Restaurants saved from live listings will appear here." />
      )}
    </ProfileSection>
  );
}

function OffersPanel({ coupons }: { coupons: CustomerCouponDoc[] }) {
  return (
    <ProfileSection title="Offers" icon={TicketPercent}>
      {coupons.length ? coupons.map((coupon) => (
        <div key={coupon.id} className="rounded-md border p-3 text-sm">
          <p className="font-black">{coupon.code ?? coupon.title ?? coupon.id}</p>
          <p className="mt-1 text-muted-foreground">{coupon.title ?? "Customer offer"}</p>
        </div>
      )) : (
        <ProfileEmpty icon={TicketPercent} title="No saved offers" description="Active customer offers from Firestore will appear here." />
      )}
    </ProfileSection>
  );
}

function ReviewsPanel({ reviews }: { reviews: Array<{ id: string; restaurantId?: string; rating?: number; createdAt?: FirestoreDate }> }) {
  return (
    <ProfileSection title="Reviews" icon={Star}>
      {reviews.length ? reviews.map((review) => (
        <div key={review.id} className="rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">
              <Star className="mr-1 size-3 fill-current" />
              {review.rating ?? "New"}
            </Badge>
            <span className="text-xs font-semibold text-muted-foreground">{formatShortDate(review.createdAt)}</span>
          </div>
          <p className="mt-2 font-black">{review.restaurantId ?? "Restaurant review"}</p>
        </div>
      )) : (
        <ProfileEmpty icon={Star} title="No reviews yet" description="Verified-order restaurant and item reviews will appear here." />
      )}
    </ProfileSection>
  );
}

function SettingsPanel({
  displayName,
  email,
  phone,
  photoURL,
  password,
  currentName,
  currentEmail,
  currentPhone,
  currentPhotoURL,
  message,
  saving,
  focusPhone,
  onChange,
  onSave,
}: {
  displayName: string;
  email: string;
  phone: string;
  photoURL: string;
  password: string;
  currentName: string;
  currentEmail: string;
  currentPhone: string;
  currentPhotoURL?: string;
  message: string;
  saving: boolean;
  focusPhone?: boolean;
  onChange: (next: { displayName: string; email: string; phone: string; photoURL: string; password: string }) => void;
  onSave: () => void;
}) {
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusPhone) return;
    const timerId = window.setTimeout(() => phoneInputRef.current?.focus(), 120);
    return () => window.clearTimeout(timerId);
  }, [focusPhone]);

  return (
    <ProfileSection title="App settings" icon={Settings2}>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <h3 className="flex items-center gap-2 font-black">
            <UserRound className="size-5 text-primary" />
            Profile details
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={currentName || "Your name"}
              value={displayName}
              onChange={(event) => onChange({ displayName: event.target.value, email, phone, photoURL, password })}
            />
            <Input
              type="email"
              placeholder={currentEmail || "New email"}
              value={email}
              onChange={(event) => onChange({ displayName, email: event.target.value, phone, photoURL, password })}
            />
            <Input
              ref={phoneInputRef}
              type="tel"
              id="customer-profile-phone"
              placeholder={currentPhone || "Add phone number"}
              value={phone}
              onChange={(event) => onChange({ displayName, email, phone: event.target.value, photoURL, password })}
            />
            <Input
              type="url"
              placeholder={currentPhotoURL || "Profile image URL"}
              value={photoURL}
              onChange={(event) => onChange({ displayName, email, phone, photoURL: event.target.value, password })}
            />
            <Input
              className="sm:col-span-2"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => onChange({ displayName, email, phone, photoURL, password: event.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onSave} disabled={saving}>
              <Camera className="size-4" />
              {saving ? "Saving" : "Save account"}
            </Button>
            {message ? <p className="text-sm font-bold text-primary">{message}</p> : null}
          </div>
        </div>
        <AppPreferences />
      </div>
    </ProfileSection>
  );
}

function ProfileSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Card className="customer-surface">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-black">
          <Icon className="size-5 text-primary" aria-hidden="true" />
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order }: { order: CustomerOrderDoc }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="muted">{order.id.slice(0, 8)}</Badge>
        <Badge variant="outline">{order.status}</Badge>
        <span className="text-xs font-semibold text-muted-foreground">{formatShortDate(order.createdAt)}</span>
      </div>
      <p className="mt-2 font-semibold">{order.lines.map((line) => `${line.name} x${line.quantity}`).join(", ")}</p>
      <p className="mt-1 font-black">{formatCurrency(order.total)}</p>
    </div>
  );
}

function ProfileEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed p-5 text-center">
      <Icon className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function isCouponActive(coupon: CustomerCouponDoc) {
  if (coupon.active === false || coupon.status === "expired" || coupon.status === "used") return false;
  const expiry = dateFromFirestore(coupon.expiresAt);
  return expiry ? expiry.getTime() >= Date.now() : true;
}

function dateFromFirestore(value?: FirestoreDate) {
  return parseFirestoreDate(value);
}

function formatShortDate(value?: FirestoreDate) {
  const date = dateFromFirestore(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date pending";
}

function buildFullAddress(draft: AddressDraft) {
  return [
    draft.apartment.trim(),
    draft.floor.trim() ? `Floor ${draft.floor.trim()}` : "",
    draft.address.trim(),
    draft.landmark.trim() ? `Near ${draft.landmark.trim()}` : "",
  ].filter(Boolean).join(", ");
}

function saveSelectedDeliveryLocation(address: {
  label: string;
  fullAddress?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}) {
  if (typeof window === "undefined" || typeof address.latitude !== "number" || typeof address.longitude !== "number") return;
  window.localStorage.setItem("sarva-commerce-location", JSON.stringify({
    label: address.label,
    address: address.fullAddress || address.address,
    latitude: address.latitude,
    longitude: address.longitude,
    placeId: address.placeId,
    source: "manual",
  }));
}

function createCustomerProfileFallback(user: User): CustomerProfileDoc {
  const now = new Date();
  const displayName = user.displayName || user.email?.split("@")[0] || "Customer";
  return {
    id: user.uid,
    createdAt: now,
    updatedAt: now,
    uid: user.uid,
    displayName,
    email: user.email ?? undefined,
    photoURL: resolveCustomerPhotoURL(user.photoURL),
    emailVerified: user.emailVerified,
    active: true,
  };
}

function filterProfileCatering(inquiries: CateringQuote[], email: string, phone: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.replace(/\D/g, "");
  const normalizedName = name.trim().toLowerCase();
  const matched = inquiries.filter((quote) => {
    const quoteEmail = quote.email?.trim().toLowerCase();
    const quotePhone = quote.phone.replace(/\D/g, "");
    const quoteName = quote.name.trim().toLowerCase();
    return Boolean(
      (normalizedEmail && quoteEmail === normalizedEmail) ||
      (normalizedPhone && quotePhone.endsWith(normalizedPhone.slice(-8))) ||
      (normalizedName && quoteName === normalizedName),
    );
  });
  return matched.length ? matched : inquiries;
}

function profileTabFromUrl(tab: string | null) {
  const allowed = new Set(["overview", "addresses", "payments", "orders", "catering", "saved", "reviews", "offers", "settings"]);
  return tab && allowed.has(tab) ? tab : "overview";
}
async function signOutProfileServices() {
  const [{ signOutUser }, { signOutStackCustomer }] = await Promise.all([
    import("@/services/auth-service"),
    import("@/services/auth/stack-auth-client"),
  ]);
  await Promise.all([
    signOutUser().catch(() => undefined),
    signOutStackCustomer().catch(() => undefined),
    fetch("/api/auth/session?surface=customer", { method: "DELETE" }).catch(() => undefined),
  ]);
}

function friendlyProfileMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/already saved/i.test(message)) return "This delivery address is already saved.";
  if (/not found/i.test(message)) return "That saved item could not be found. Refresh and try again.";
  return fallback;
}
