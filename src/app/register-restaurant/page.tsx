"use client";

import { useState } from "react";
import { Building2, Send } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";

export default function RegisterRestaurantPage() {
  const submitBusinessApplication = useAppStore((state) => state.submitBusinessApplication);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    ownerEmail: "",
    mobile: "",
    cuisine: "",
    area: "",
    address: "",
    deliveryRadiusKm: "5",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <CustomerShell>
      <main className="container-page grid gap-6 py-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="space-y-4">
          <div className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <SectionHeader
            title="Register Your Restaurant"
            description="Submit the public inquiry. Sarva admin reviews the details, then creates the tenant, owner account, primary branch, and subscription record."
          />
        </section>
        <Card className="customer-surface">
          <CardContent className="space-y-4 p-5">
            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await submitBusinessApplication({
                  ...form,
                  mobile: form.mobile,
                  hotelName: form.businessName,
                  logo: "/icons/sarva-icon.svg",
                  googleMapLocation: "",
                  latitude: 12.9719,
                  longitude: 77.6412,
                  locationVerified: false,
                  gstDetails: undefined,
                  phoneNumber: form.mobile,
                  operatingHours: "",
                  fssaiLicense: undefined,
                  diningAvailable: true,
                  cloudKitchen: false,
                  deliveryRadiusKm: Number(form.deliveryRadiusKm) || 5,
                  restaurantImages: [],
                  foodImages: [],
                });
                setForm({
                  businessName: "",
                  ownerName: "",
                  ownerEmail: "",
                  mobile: "",
                  cuisine: "",
                  area: "",
                  address: "",
                  deliveryRadiusKm: "5",
                });
              }}
            >
              <Field label="Restaurant or hotel name" id="businessName" value={form.businessName} onChange={(value) => update("businessName", value)} required />
              <Field label="Owner name" id="ownerName" value={form.ownerName} onChange={(value) => update("ownerName", value)} required />
              <Field label="Owner email" id="ownerEmail" type="email" value={form.ownerEmail} onChange={(value) => update("ownerEmail", value)} required />
              <Field label="Phone" id="mobile" value={form.mobile} onChange={(value) => update("mobile", value)} required />
              <Field label="Cuisine" id="cuisine" value={form.cuisine} onChange={(value) => update("cuisine", value)} required />
              <Field label="City or area" id="area" value={form.area} onChange={(value) => update("area", value)} required />
              <Field label="Address" id="address" value={form.address} onChange={(value) => update("address", value)} required />
              <Field label="Delivery radius km" id="deliveryRadiusKm" type="number" value={form.deliveryRadiusKm} onChange={(value) => update("deliveryRadiusKm", value)} required />
              <Button type="submit">
                <Send className="size-4" />
                Submit for review
              </Button>
            </form>
            {apiMessage ? <p className="text-sm font-semibold text-muted-foreground">{apiMessage}</p> : null}
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}
