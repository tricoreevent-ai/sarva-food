"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/client-toast";
import { CheckCircle2, CreditCard, ImagePlus, Megaphone, MenuSquare, Palette, Route, Settings2, Store, XCircle } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import type { Restaurant } from "@/lib/types";

const reviewModules = [
  { key: "profile", label: "Restaurant profile", icon: Store },
  { key: "banners", label: "Banners", icon: ImagePlus },
  { key: "offers", label: "Offers", icon: Megaphone },
  { key: "menus", label: "Menus", icon: MenuSquare },
  { key: "payments", label: "Payment settings", icon: CreditCard },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "delivery", label: "Delivery rules", icon: Route },
  { key: "marketing", label: "Marketing links", icon: Settings2 },
];

export default function AdminOwnerReviewsPage() {
  const { restaurants, menuItems, offers, socialPosts, updateRestaurantAdminState } = useAdminRepositoryData();
  const [selectedSlug, setSelectedSlug] = useState(restaurants[0]?.slug ?? "");
  const [note, setNote] = useState("");
  const selected = restaurants.find((restaurant) => restaurant.slug === (selectedSlug || restaurants[0]?.slug)) ?? restaurants[0];

  const rows = useMemo(() => restaurants.map((restaurant) => ({
    restaurant,
    menuCount: menuItems.filter((item) => item.restaurantSlug === restaurant.slug).length,
    offerCount: offers.filter((offer) => offer.restaurantSlug === restaurant.slug).length,
    postCount: socialPosts.filter((post) => post.restaurantSlug === restaurant.slug).length,
    status: reviewStatus(restaurant),
  })), [menuItems, offers, restaurants, socialPosts]);

  async function review(action: "approved" | "rejected" | "changes") {
    if (!selected) return;
    const patch =
      action === "approved"
        ? { adminStatus: "Active" as const, approved: true, orderingEnabled: true, frozen: false, adminNote: note.trim() || "Approved by admin." }
        : action === "rejected"
          ? { adminStatus: "Under Review" as const, approved: false, orderingEnabled: false, adminNote: note.trim() || "Rejected by admin." }
          : { adminStatus: "Under Review" as const, approved: false, orderingEnabled: false, adminNote: note.trim() || "Changes requested by admin." };
    await updateRestaurantAdminState(selected.slug, patch);
    toast.success(action === "approved" ? "Owner settings approved." : action === "rejected" ? "Owner settings rejected." : "Change request saved.");
    setNote("");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Owner Settings Review"
        description="Review restaurant profile, banners, menus, offers, payment readiness, branding, delivery rules, and marketing links before customer visibility."
      />

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-black">Review queue</h2>
            {rows.length ? rows.map((row) => (
              <button
                key={row.restaurant.slug}
                type="button"
                onClick={() => setSelectedSlug(row.restaurant.slug)}
                className={`w-full rounded-xl border p-3 text-left transition hover:bg-muted ${selected?.slug === row.restaurant.slug ? "border-primary bg-primary/10" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{row.restaurant.name}</p>
                  <Badge variant={row.status === "Active" ? "success" : "warning"}>{row.status}</Badge>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{row.menuCount} menu items · {row.offerCount} offers · {row.postCount} posts</p>
              </button>
            )) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm font-semibold text-muted-foreground">
                No restaurant settings are waiting for review.
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{selected.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{selected.cuisine || "Cuisine not set"} · {selected.location || selected.address || "Address not set"}</p>
                  </div>
                  <Badge variant={reviewStatus(selected) === "Active" ? "success" : "warning"}>{reviewStatus(selected)}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <ReviewFact label="Phone" value={selected.contact?.phone || selected.ownerProfile?.businessPhone || "Missing"} />
                  <ReviewFact label="WhatsApp" value={selected.contact?.whatsapp || selected.ownerProfile?.businessWhatsapp || "Missing"} />
                  <ReviewFact label="Delivery radius" value={`${selected.deliveryRadiusKm ?? selected.deliverySettings?.radiusKm ?? 0} km`} />
                  <ReviewFact label="Min order" value={selected.minPrice ? `₹${selected.minPrice}` : "Not set"} />
                  <ReviewFact label="Operating hours" value={selected.operatingHours || "Not specified"} />
                  <ReviewFact label="GST/FSSAI" value={[selected.gstDetails, selected.fssaiLicense].filter(Boolean).join(" / ") || "Optional not set"} />
                  <ReviewFact label="Cloud kitchen" value={selected.cloudKitchen ? "Yes" : "No"} />
                  <ReviewFact label="Dining" value={selected.diningAvailable === false ? "No" : "Yes"} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reviewModules.map((module) => {
                const Icon = module.icon;
                const complete = moduleComplete(module.key, selected, {
                  menuCount: menuItems.filter((item) => item.restaurantSlug === selected.slug).length,
                  offerCount: offers.filter((offer) => offer.restaurantSlug === selected.slug).length,
                  postCount: socialPosts.filter((post) => post.restaurantSlug === selected.slug).length,
                });
                return (
                  <Card key={module.key}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
                        <Badge variant={complete ? "success" : "warning"}>{complete ? "Ready" : "Needs review"}</Badge>
                      </div>
                      <p className="font-black">{module.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="space-y-3 p-5">
                <h3 className="font-black">Admin decision</h3>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add approval note or requested changes for the owner." />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void review("approved")}>
                    <CheckCircle2 className="size-4" />
                    Approve
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void review("changes")}>
                    Request changes
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => void review("rejected")}>
                    <XCircle className="size-4" />
                    Reject
                  </Button>
                </div>
                {selected.adminNote ? <p className="rounded-xl bg-muted p-3 text-sm font-semibold text-muted-foreground">Last note: {selected.adminNote}</p> : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ReviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function reviewStatus(restaurant: Restaurant) {
  return restaurant.adminStatus ?? (restaurant.approved === false ? "Pending Approval" : "Active");
}

function moduleComplete(key: string, restaurant: Restaurant, counts: { menuCount: number; offerCount: number; postCount: number }) {
  if (key === "profile") return Boolean(restaurant.name && restaurant.location && restaurant.contact?.phone);
  if (key === "banners") return Boolean(restaurant.coverImages?.length || restaurant.coverImage || restaurant.image);
  if (key === "offers") return counts.offerCount > 0;
  if (key === "menus") return counts.menuCount > 0;
  if (key === "payments") return Boolean(restaurant.contact?.phone || restaurant.ownerProfile?.businessPhone);
  if (key === "branding") return Boolean(restaurant.logo || restaurant.image);
  if (key === "delivery") return Boolean(restaurant.deliveryRadiusKm || restaurant.deliverySettings?.radiusKm);
  if (key === "marketing") return counts.postCount > 0 || Boolean(restaurant.instagramHandle);
  return false;
}
