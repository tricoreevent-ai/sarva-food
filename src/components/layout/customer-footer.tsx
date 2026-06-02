"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Building2, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SafeImage } from "@/components/media/safe-image";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";

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

export function CustomerFooter() {
  const cmsSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const branding = cmsSettings.branding ?? defaultCmsSettings.branding!;
  const brandInitials = (branding.shortName || branding.appName || "SF").slice(0, 2).toUpperCase();
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
      toast.success("Restaurant onboarding request sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="border-t border-orange-100 bg-white">
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 place-items-center overflow-hidden rounded-full food-gradient text-sm font-black text-white">
                {branding.logoUrl ? <SafeImage src={branding.logoUrl} alt={`${branding.appName} logo`} fill sizes="44px" className="object-cover" /> : brandInitials}
              </span>
              <div>
                <p className="text-lg font-black">{branding.appName}</p>
                <p className="text-xs font-semibold text-muted-foreground">{branding.appDescription}</p>
              </div>
            </div>
          </div>
          <FooterColumn title="Company" links={[["About Us", "/about"], ["Careers", "/careers"], ["Contact", "/help"], ["Press", "/press"], ["Partner With Us", "/register-restaurant"]]} />
          <FooterColumn title="Customers" links={[["Help Center", "/help"], ["Refund Policy", "/refund-policy"], ["Track Order", "/track-order"], ["Safety", "/terms"], ["FAQs", "/help#faqs"]]} />
          <FooterColumn title="Restaurant Owners" links={[["Register Restaurant", "/register-restaurant"], ["Owner Login", "/owner/login"], ["POS Features", "/owner/login"], ["Delivery Tools", "/register-restaurant"], ["Marketing Tools", "/register-restaurant"]]} />
          <FooterColumn title="Legal" links={[["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Refund Policy", "/refund-policy"], ["Cancellation Policy", "/cancellation-policy"], ["Cookie Policy", "/cookie-policy"]]} />
        </section>

        <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></span>
            <div>
              <h2 className="font-black">Partner with us</h2>
              <p className="text-xs font-semibold text-muted-foreground">Share your restaurant details and our onboarding team will call back.</p>
            </div>
          </div>
          {submitted ? (
            <div className="mt-4 rounded-xl border bg-white p-4 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="mb-2 size-5" />
              Request received. We will contact you shortly.
            </div>
          ) : (
            <form className="mt-4 grid gap-3" onSubmit={submitLead}>
              <input className="hidden" tabIndex={-1} autoComplete="off" value={lead.website} onChange={(event) => setLead({ ...lead, website: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <LeadField label="Restaurant name" value={lead.restaurantName} onChange={(restaurantName) => setLead({ ...lead, restaurantName })} required />
                <LeadField label="Owner name" value={lead.ownerName} onChange={(ownerName) => setLead({ ...lead, ownerName })} required />
                <LeadField label="Phone" value={lead.phone} onChange={(phone) => setLead({ ...lead, phone })} required />
                <LeadField label="WhatsApp" value={lead.whatsapp} onChange={(whatsapp) => setLead({ ...lead, whatsapp })} />
                <LeadField label="Email" type="email" value={lead.email} onChange={(email) => setLead({ ...lead, email })} required />
                <LeadField label="Location" value={lead.location} onChange={(location) => setLead({ ...lead, location })} required />
                <LeadField label="Cuisine type" value={lead.cuisineType} onChange={(cuisineType) => setLead({ ...lead, cuisineType })} required />
                <LeadField label="Restaurant type" value={lead.restaurantType} onChange={(restaurantType) => setLead({ ...lead, restaurantType })} />
                <LeadField label="Seats count" type="number" value={lead.seatsCount} onChange={(seatsCount) => setLead({ ...lead, seatsCount })} />
                <LeadField label="Current POS system" value={lead.currentPosSystem} onChange={(currentPosSystem) => setLead({ ...lead, currentPosSystem })} />
                <LeadField label="Delivery platforms" value={lead.existingDeliveryPlatforms} onChange={(existingDeliveryPlatforms) => setLead({ ...lead, existingDeliveryPlatforms })} />
                <LeadField label="Monthly orders" value={lead.monthlyOrdersEstimate} onChange={(monthlyOrdersEstimate) => setLead({ ...lead, monthlyOrdersEstimate })} />
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
          <p className="mt-3 flex gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            We use this only for restaurant onboarding support.
          </p>
        </section>
      </div>
      <div className="border-t border-orange-100 px-4 py-4 text-center text-xs font-semibold text-muted-foreground">
        {cmsSettings.footer?.copyright || defaultCmsSettings.footer.copyright}
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-3 grid gap-2">
        {links.map(([label, href]) => (
          <Link key={href + label} href={href} className="text-sm font-semibold text-muted-foreground hover:text-primary">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function LeadField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  const id = `lead-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}
