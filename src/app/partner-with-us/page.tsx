"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Building2, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialLead = {
  restaurantName: "",
  ownerName: "",
  phone: "",
  whatsapp: "",
  email: "",
  location: "",
  cuisineType: "",
  restaurantType: "",
  seatsCount: "",
  deliveryAvailable: true,
  cloudKitchen: false,
  currentPosSystem: "",
  existingDeliveryPlatforms: "",
  monthlyOrdersEstimate: "",
  notes: "",
  website: "",
};

export default function PartnerWithUsPage() {
  const [lead, setLead] = useState(initialLead);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/restaurant-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...lead,
          seatsCount: lead.seatsCount ? Number(lead.seatsCount) : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not submit onboarding request.");
      setLead(initialLead);
      setSubmitted(true);
      toast.success("Restaurant callback request sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CustomerShell>
      <main className="container-page grid gap-6 py-6 lg:grid-cols-[1fr_520px] lg:items-start">
        <section className="space-y-4">
          <div className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <SectionHeader
            title="Partner With Us"
            description="Share your restaurant details and the onboarding team will call you back."
          />
        </section>

        <Card className="customer-surface">
          <CardContent className="space-y-4 p-5">
            {submitted ? (
              <div className="rounded-xl border bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="mb-2 size-5" />
                Request received. Our onboarding team will contact you shortly.
              </div>
            ) : (
              <form className="grid gap-4" onSubmit={submitLead}>
                <input className="hidden" tabIndex={-1} autoComplete="off" value={lead.website} onChange={(event) => setLead({ ...lead, website: event.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Restaurant name" value={lead.restaurantName} onChange={(restaurantName) => setLead({ ...lead, restaurantName })} required />
                  <Field label="Owner name" value={lead.ownerName} onChange={(ownerName) => setLead({ ...lead, ownerName })} required />
                  <Field label="Phone" value={lead.phone} onChange={(phone) => setLead({ ...lead, phone })} required />
                  <Field label="WhatsApp" value={lead.whatsapp} onChange={(whatsapp) => setLead({ ...lead, whatsapp })} />
                  <Field label="Email" type="email" value={lead.email} onChange={(email) => setLead({ ...lead, email })} required />
                  <Field label="Location" value={lead.location} onChange={(location) => setLead({ ...lead, location })} required />
                  <Field label="Cuisine type" value={lead.cuisineType} onChange={(cuisineType) => setLead({ ...lead, cuisineType })} required />
                  <Field label="Restaurant type" value={lead.restaurantType} onChange={(restaurantType) => setLead({ ...lead, restaurantType })} />
                  <Field label="Seats count" type="number" value={lead.seatsCount} onChange={(seatsCount) => setLead({ ...lead, seatsCount })} />
                  <Field label="Current POS system" value={lead.currentPosSystem} onChange={(currentPosSystem) => setLead({ ...lead, currentPosSystem })} />
                  <Field label="Delivery platforms" value={lead.existingDeliveryPlatforms} onChange={(existingDeliveryPlatforms) => setLead({ ...lead, existingDeliveryPlatforms })} />
                  <Field label="Monthly orders" value={lead.monthlyOrdersEstimate} onChange={(monthlyOrdersEstimate) => setLead({ ...lead, monthlyOrdersEstimate })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-bold">
                    <input type="checkbox" checked={lead.deliveryAvailable} onChange={(event) => setLead({ ...lead, deliveryAvailable: event.target.checked })} />
                    Delivery available
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-bold">
                    <input type="checkbox" checked={lead.cloudKitchen} onChange={(event) => setLead({ ...lead, cloudKitchen: event.target.checked })} />
                    Cloud kitchen
                  </label>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea value={lead.notes} onChange={(event) => setLead({ ...lead, notes: event.target.value })} placeholder="Seats, current POS, delivery platforms, or preferred callback time" />
                </div>
                <Button type="submit" disabled={submitting}>
                  <Send className="size-4" />
                  {submitting ? "Sending..." : "Request callback"}
                </Button>
              </form>
            )}
            <p className="flex gap-2 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              We use this only for restaurant onboarding support.
            </p>
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  const id = `partner-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}
