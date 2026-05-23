"use client";

import { useState } from "react";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { SimpleDataTable } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";

export default function AdminRestaurantsPage() {
  const restaurants = useAppStore((state) => state.restaurants);
  const applications = useAppStore((state) => state.businessApplications);
  const submitBusinessApplication = useAppStore((state) => state.submitBusinessApplication);
  const reviewBusinessApplication = useAppStore((state) => state.reviewBusinessApplication);
  const [draft, setDraft] = useState({
    restaurantName: "",
    ownerEmail: "",
    ownerName: "",
    city: "",
    phone: "",
    cuisine: "",
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <SectionHeader title="Onboard restaurant" description="Create the initial profile shell." />
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const application = await submitBusinessApplication({
                businessName: draft.restaurantName,
                ownerName: draft.ownerName || "Primary owner",
                ownerEmail: draft.ownerEmail,
                mobile: draft.phone || undefined,
                cuisine: draft.cuisine || "Multi cuisine",
                area: draft.city,
                address: draft.city,
                hotelName: draft.restaurantName,
                logo: "/icons/sarva-icon.svg",
                googleMapLocation: "",
                latitude: 12.9719,
                longitude: 77.6412,
                locationVerified: false,
                gstDetails: undefined,
                phoneNumber: draft.phone,
                operatingHours: "",
                fssaiLicense: undefined,
                diningAvailable: true,
                cloudKitchen: false,
                deliveryRadiusKm: 5,
                restaurantImages: [],
                foodImages: [],
              });
              await reviewBusinessApplication(application.id, "approved");
              setDraft({ restaurantName: "", ownerEmail: "", ownerName: "", city: "", phone: "", cuisine: "" });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="restaurant-name">Restaurant name</Label>
              <Input id="restaurant-name" value={draft.restaurantName} onChange={(event) => setDraft({ ...draft, restaurantName: event.target.value })} placeholder="New restaurant" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-email">Owner email</Label>
              <Input id="owner-email" value={draft.ownerEmail} onChange={(event) => setDraft({ ...draft, ownerEmail: event.target.value })} type="email" placeholder="owner@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-name">Owner name</Label>
              <Input id="owner-name" value={draft.ownerName} onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })} placeholder="Primary owner" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City / area</Label>
              <Input id="city" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder="Bengaluru, Indiranagar" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+91..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cuisine">Cuisine</Label>
              <Input id="cuisine" value={draft.cuisine} onChange={(event) => setDraft({ ...draft, cuisine: event.target.value })} placeholder="Coastal Indian" />
            </div>
            <Button className="w-full">
              <Plus className="size-4" />
              Create tenant draft
            </Button>
          </form>
          <p className="text-xs leading-5 text-muted-foreground">
            Approval creates the tenant shell, restaurant profile, primary branch record, and owner invitation record. Firebase Auth owner creation remains admin-only.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <SectionHeader title="Business applications" description="Approve listings before they appear in customer discovery." />
        <div className="grid gap-3">
          {applications.length ? (
            applications.map((application) => (
              <Card key={application.id}>
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black">{application.businessName}</h2>
                      <Badge variant={application.status === "approved" ? "success" : application.status === "rejected" ? "warning" : "muted"}>
                        {application.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {application.cuisine} in {application.area} · {application.deliveryRadiusKm} km delivery
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{application.ownerEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewBusinessApplication(application.id, "approved")}>
                      <CheckCircle2 className="size-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewBusinessApplication(application.id, "rejected")}>
                      <XCircle className="size-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                No pending applications yet. Submissions from owner onboarding appear here.
              </CardContent>
            </Card>
          )}
        </div>

        <SectionHeader title="Restaurants" description="Approved and draft restaurant profiles." />
        <Card>
          <CardContent className="p-0">
            <SimpleDataTable
              columns={["name", "location", "status", "plan"]}
              rows={restaurants.map((restaurant) => ({
                name: restaurant.name,
                location: restaurant.location,
                status: restaurant.approved === false ? "Pending" : restaurant.isOpen ? "Live" : "Paused",
                plan: "Growth",
              }))}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
