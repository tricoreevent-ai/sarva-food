"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ImageIcon, LogOut, MapPin, Percent, Phone, Save, Settings2, ShieldCheck, Store, Trash2, UserRound } from "lucide-react";
import { RestaurantOnboardingFlow } from "@/components/flows/restaurant-onboarding-flow";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import type { Offer } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { signOutUser } from "@/services/auth-service";

type ProfileTab = "profile" | "onboarding" | "offers" | "account";

const allowedTabs = new Set<ProfileTab>(["profile", "onboarding", "offers", "account"]);

export default function OwnerProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useAppStore((state) => state.authUser);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const profile = useAppStore((state) => state.ownerBusinessProfile);
  const saveOwnerBusinessProfile = useAppStore((state) => state.saveOwnerBusinessProfile);
  const branches = useAppStore((state) => state.branches);
  const restaurants = useAppStore((state) => state.restaurants);
  const restaurant = restaurants.find((item) => item.slug === authUser.restaurantSlug) ?? restaurants[0];
  const [signingOut, setSigningOut] = useState(false);
  const [coverImage, setCoverImage] = useState(profile?.coverImage ?? restaurant?.image ?? "");
  const activeTab = parseTab(searchParams.get("tab"));
  const primaryBranch = branches[0];

  function selectTab(tab: string) {
    const nextTab = parseTab(tab);
    router.replace(nextTab === "profile" ? "/owner/profile" : `/owner/profile?tab=${nextTab}`, { scroll: false });
  }

  async function handleLogout() {
    setSigningOut(true);
    await signOutUser().catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
    setSigningOut(false);
    router.replace("/owner/login");
    router.refresh();
  }

  async function saveCoverImage() {
    if (!profile) return;
    await saveOwnerBusinessProfile({ ...profile, coverImage: coverImage.trim() || profile.coverImage || profile.logo });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Owner profile"
        description="Business identity, onboarding details, access, and sign-out for the owner workspace."
        action={
          <Button type="button" variant="outline" onClick={() => void handleLogout()} disabled={signingOut}>
            <LogOut className="size-4" />
            {signingOut ? "Signing out" : "Logout"}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={selectTab} className="space-y-5">
        <TabsList className="customer-scroll max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-5">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric icon={Store} label="Business" value={profile?.hotelName ?? restaurant?.name ?? "Not configured"} />
            <Metric icon={Building2} label="Branches" value={String(branches.length)} />
            <Metric icon={ShieldCheck} label="Status" value={profile?.completed ? "Onboarded" : "Setup pending"} />
            <Metric icon={Phone} label="Phone" value={profile?.phoneNumber ?? restaurant?.contact?.phone ?? "Not added"} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="overflow-hidden rounded-md border bg-muted/30">
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${profile?.coverImage || restaurant?.image || "/images/fallback-restaurant.svg"})` }}
                  />
                  <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor="cover-image">Banner / cover image URL</Label>
                      <Input id="cover-image" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder="/images/fallback-restaurant.svg" />
                    </div>
                    <Button type="button" variant="outline" onClick={() => void saveCoverImage()} disabled={!profile}>
                      <ImageIcon className="size-4" />
                      Save banner
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="grid size-16 shrink-0 place-items-center rounded-md bg-primary text-xl font-black text-primary-foreground">
                    {getInitials(profile?.hotelName ?? restaurant?.name ?? authUser.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black">{profile?.hotelName ?? restaurant?.name ?? "Business profile pending"}</h2>
                      <Badge variant={profile?.completed ? "success" : "warning"}>{profile?.completed ? "Complete" : "Pending"}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {profile?.cuisineType ?? restaurant?.cuisine ?? "Complete onboarding to publish cuisine and service details."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Address" value={profile?.businessAddress ?? primaryBranch?.address ?? restaurant?.location} />
                  <Info label="Operating hours" value={profile?.operatingHours} />
                  <Info label="GST" value={profile?.gstDetails} />
                  <Info label="FSSAI" value={profile?.fssaiLicense} />
                  <Info label="Delivery radius" value={profile?.deliveryRadiusKm ? `${profile.deliveryRadiusKm} km` : restaurant?.deliveryRadiusKm ? `${restaurant.deliveryRadiusKm} km` : undefined} />
                  <Info label="Support email" value={profile?.supportEmail ?? restaurant?.contact?.supportEmail} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={profile?.diningAvailable ? "success" : "muted"}>Dine-in {profile?.diningAvailable ? "enabled" : "disabled"}</Badge>
                  <Badge variant={profile?.cloudKitchen ? "secondary" : "muted"}>{profile?.cloudKitchen ? "Cloud kitchen" : "Restaurant"}</Badge>
                  {profile?.locationVerified ? <Badge variant="success"><MapPin className="mr-1 size-3" />Location verified</Badge> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="flex items-center gap-2 font-black">
                  <UserRound className="size-5 text-primary" />
                  Owner access
                </h2>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-bold text-muted-foreground">Signed in as</p>
                  <p className="mt-1 text-xl font-black">{authUser.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{authUser.role}</p>
                </div>
                <Button type="button" className="w-full" variant="outline" onClick={() => selectTab("onboarding")}>
                  <Settings2 className="size-4" />
                  Edit onboarding details
                </Button>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="onboarding">
          <RestaurantOnboardingFlow />
        </TabsContent>

        <TabsContent value="offers">
          <OwnerOffersManager />
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-xl font-black">Session and account</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use logout when switching between owner, admin, waiter, and customer workspaces.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => void handleLogout()} disabled={signingOut}>
                <LogOut className="size-4" />
                {signingOut ? "Signing out" : "Logout"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OwnerOffersManager() {
  const offers = useAppStore((state) => state.offers);
  const createOffer = useAppStore((state) => state.createOffer);
  const updateOffer = useAppStore((state) => state.updateOffer);
  const deleteOffer = useAppStore((state) => state.deleteOffer);
  const restaurant = useAppStore((state) => state.restaurants[0]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    code: "",
    image: "",
    title: "",
    description: "",
    discount: "",
    minimumOrder: "",
    validFrom: "",
    validTo: "",
    conditions: "",
    appliesTo: ["delivery"] as Array<"dine-in" | "delivery" | "parcel">,
  });

  function loadOffer(offer: Offer) {
    setEditingCode(offer.code);
    setDraft({
      code: offer.code,
      image: offer.image ?? offer.banner ?? "",
      title: offer.title,
      description: offer.description,
      discount: String(offer.discount),
      minimumOrder: String(offer.minimumOrder),
      validFrom: offer.validFrom ?? "",
      validTo: offer.validTo ?? "",
      conditions: offer.conditions ?? "",
      appliesTo: (offer.appliesTo?.filter((item) => item !== "takeaway") as Array<"dine-in" | "delivery" | "parcel"> | undefined) ?? ["delivery"],
    });
  }

  function toggleAppliesTo(value: "dine-in" | "delivery" | "parcel") {
    setDraft((current) => ({
      ...current,
      appliesTo: current.appliesTo.includes(value)
        ? current.appliesTo.filter((item) => item !== value)
        : [...current.appliesTo, value],
    }));
  }

  async function saveOffer() {
    if (!draft.code.trim() || !draft.title.trim() || !draft.description.trim() || !draft.appliesTo.length) return;
    const offer: Offer = {
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      image: draft.image.trim() || undefined,
      banner: draft.image.trim() || undefined,
      discount: Number(draft.discount) || 0,
      minimumOrder: Number(draft.minimumOrder) || 0,
      channel: "POS",
      restaurantSlug: restaurant?.slug,
      restaurantName: restaurant?.name,
      validity: draft.validTo ? `Valid till ${draft.validTo}` : undefined,
      validFrom: draft.validFrom || undefined,
      validTo: draft.validTo || undefined,
      conditions: draft.conditions.trim() || undefined,
      appliesTo: draft.appliesTo,
      discountType: "percentage",
    };
    if (editingCode) {
      await updateOffer(offer);
    } else {
      await createOffer(offer);
    }
    setEditingCode(null);
    setDraft({ code: "", image: "", title: "", description: "", discount: "", minimumOrder: "", validFrom: "", validTo: "", conditions: "", appliesTo: ["delivery"] });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Percent className="size-5 text-primary" />
            {editingCode ? "Edit offer" : "Create offer"}
          </h2>
          <div className="grid gap-3">
            <Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="Offer code" disabled={Boolean(editingCode)} />
            <Input value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="Image URL" />
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Title" />
            <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Description" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={draft.discount} onChange={(event) => setDraft({ ...draft, discount: event.target.value })} inputMode="decimal" placeholder="Discount %" />
              <Input value={draft.minimumOrder} onChange={(event) => setDraft({ ...draft, minimumOrder: event.target.value })} inputMode="decimal" placeholder="Minimum order" />
              <Input type="date" value={draft.validFrom} onChange={(event) => setDraft({ ...draft, validFrom: event.target.value })} />
              <Input type="date" value={draft.validTo} onChange={(event) => setDraft({ ...draft, validTo: event.target.value })} />
            </div>
            <Textarea value={draft.conditions} onChange={(event) => setDraft({ ...draft, conditions: event.target.value })} placeholder="Conditions" />
            <div className="flex flex-wrap gap-2">
              {(["dine-in", "delivery", "parcel"] as const).map((type) => (
                <button key={type} type="button" onClick={() => toggleAppliesTo(type)} className={draft.appliesTo.includes(type) ? "rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" : "rounded-md border px-3 py-2 text-sm font-bold text-muted-foreground"}>
                  {type}
                </button>
              ))}
            </div>
            <Button type="button" onClick={() => void saveOffer()}>
              <Save className="size-4" />
              Save offer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-xl font-black">Active offers</h2>
          {offers.length ? offers.map((offer) => (
            <div key={offer.code} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black">{offer.title}</p>
                  <Badge variant="secondary">{offer.code}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {offer.discount}% off · Min ₹{offer.minimumOrder} · {(offer.appliesTo ?? []).join(", ")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => loadOffer(offer)}>Edit</Button>
                <Button type="button" variant="outline" size="icon" onClick={() => void deleteOffer(offer.code)} aria-label={`Delete ${offer.code}`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )) : (
            <div className="rounded-md border border-dashed p-6 text-sm font-semibold text-muted-foreground">
              No offers created yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parseTab(value: string | null): ProfileTab {
  return value && allowedTabs.has(value as ProfileTab) ? value as ProfileTab : "profile";
}

function Metric({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "Not added"}</p>
    </div>
  );
}
