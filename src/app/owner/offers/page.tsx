"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock, Eye, EyeOff, Pause, Plus, Star, Tag, Trash2 } from "lucide-react";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { isOfferActive, sortOffers } from "@/lib/offer-engine";
import type { Offer } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type OfferForm = {
  code: string;
  title: string;
  subtitle: string;
  description: string;
  offerType: NonNullable<Offer["offerType"]>;
  discount: string;
  minimumOrder: string;
  maxDiscount: string;
  promoTag: string;
  banner: string;
  mobileBanner: string;
  validFrom: string;
  validTo: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  appliesTo: Array<"dine-in" | "delivery" | "parcel" | "takeaway">;
  applicableCategories: string[];
  applicableItemIds: string[];
  newCustomersOnly: boolean;
  usageLimit: string;
  perUserLimit: string;
  showOnHomepage: boolean;
  showOnRestaurantPage: boolean;
  featured: boolean;
  priority: string;
  sponsored: boolean;
  sponsoredPriority: string;
  adBudget: string;
  campaignStatus: NonNullable<Offer["campaignStatus"]>;
  conditions: string;
};

const offerTypes: Array<{ value: OfferForm["offerType"]; label: string }> = [
  { value: "flat", label: "Flat discount" },
  { value: "percentage", label: "Percentage discount" },
  { value: "free-delivery", label: "Free delivery" },
  { value: "buy-x-get-y", label: "Buy X Get Y" },
  { value: "combo", label: "Combo offer" },
  { value: "festival", label: "Festival offer" },
  { value: "first-order", label: "First order offer" },
  { value: "bulk", label: "Bulk order offer" },
  { value: "catering", label: "Catering discount" },
  { value: "happy-hour", label: "Happy hour" },
];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const emptyForm: OfferForm = {
  code: "",
  title: "",
  subtitle: "",
  description: "",
  offerType: "percentage",
  discount: "10",
  minimumOrder: "299",
  maxDiscount: "",
  promoTag: "",
  banner: "",
  mobileBanner: "",
  validFrom: "",
  validTo: "",
  startTime: "",
  endTime: "",
  daysOfWeek: [],
  appliesTo: ["delivery"],
  applicableCategories: [],
  applicableItemIds: [],
  newCustomersOnly: false,
  usageLimit: "",
  perUserLimit: "",
  showOnHomepage: true,
  showOnRestaurantPage: true,
  featured: false,
  priority: "0",
  sponsored: false,
  sponsoredPriority: "0",
  adBudget: "",
  campaignStatus: "draft",
  conditions: "",
};

export default function OwnerOffersPage() {
  const offers = useAppStore((state) => state.offers);
  const menuItems = useAppStore((state) => state.menuItems);
  const menuCategories = useAppStore((state) => state.menuCategories);
  const restaurants = useAppStore((state) => state.restaurants);
  const authUser = useAppStore((state) => state.authUser);
  const createOffer = useAppStore((state) => state.createOffer);
  const updateOffer = useAppStore((state) => state.updateOffer);
  const deleteOffer = useAppStore((state) => state.deleteOffer);
  const updateRestaurantCapabilities = useAppStore((state) => state.updateRestaurantCapabilities);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const restaurantSlug = authUser.restaurantSlug ?? restaurants[0]?.slug ?? "test-owner";
  const restaurant = restaurants.find((item) => item.slug === restaurantSlug) ?? restaurants[0];
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [settings, setSettings] = useState(() => ({
    acceptsScheduledOrders: restaurant?.scheduling?.enabled ?? true,
    acceptsCatering: restaurant?.tags.some((tag) => tag.toLowerCase().includes("catering")) ?? true,
    acceptsBulkOrders: restaurant?.tags.some((tag) => tag.toLowerCase().includes("bulk")) ?? true,
    acceptsPreorder: restaurant?.advancedFeatures?.preorder ?? true,
    maxPreorderDays: 14,
    cateringNegotiationEnabled: true,
  }));
  const ownerOffers = useMemo(() => sortOffers(offers.filter((offer) => !offer.restaurantSlug || offer.restaurantSlug === restaurantSlug)), [offers, restaurantSlug]);
  const categories = useMemo(() => {
    const names = menuCategories.map((category) => category.name || category.id);
    const itemCategories = menuItems.map((item) => item.category);
    return Array.from(new Set([...names, ...itemCategories].filter(Boolean)));
  }, [menuCategories, menuItems]);

  async function saveOffer() {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error("Offer code and title are required.");
      return;
    }
    const offer: Offer = {
      code: form.code,
      title: form.title,
      subtitle: form.subtitle,
      description: form.description || form.subtitle || form.title,
      discount: Number(form.discount) || 0,
      minimumOrder: Number(form.minimumOrder) || 0,
      maxDiscount: Number(form.maxDiscount) || undefined,
      channel: form.offerType === "catering" ? "Catering" : "Web",
      restaurantSlug,
      restaurantName: restaurant?.name,
      validity: [form.validFrom, form.validTo].filter(Boolean).join(" to "),
      category: form.applicableCategories.length ? form.applicableCategories.join(", ") : "All menu",
      banner: form.banner,
      mobileBanner: form.mobileBanner,
      promoTag: form.promoTag,
      appliesTo: form.appliesTo,
      discountType: form.offerType === "flat" ? "flat" : form.offerType === "free-delivery" ? "free-delivery" : form.offerType === "combo" ? "combo" : "percentage",
      offerType: form.offerType,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      daysOfWeek: form.daysOfWeek,
      applicableCategories: form.applicableCategories,
      applicableItemIds: form.applicableItemIds,
      newCustomersOnly: form.newCustomersOnly,
      usageLimit: Number(form.usageLimit) || undefined,
      perUserLimit: Number(form.perUserLimit) || undefined,
      status: "active",
      showOnHomepage: form.showOnHomepage,
      showOnRestaurantPage: form.showOnRestaurantPage,
      featured: form.featured,
      priority: Number(form.priority) || 0,
      sponsored: form.sponsored,
      sponsoredPriority: Number(form.sponsoredPriority) || 0,
      adBudget: Number(form.adBudget) || undefined,
      campaignStatus: form.campaignStatus,
      conditions: form.conditions,
    };
    await createOffer(offer);
    toast.success(`${offer.code.trim().toUpperCase()} saved.`);
    setForm(emptyForm);
  }

  async function changeStatus(offer: Offer, status: NonNullable<Offer["status"]>) {
    await updateOffer({ ...offer, status });
    toast.success(`${offer.code} marked ${status}.`);
  }

  async function toggleVisibility(offer: Offer, field: "showOnHomepage" | "showOnRestaurantPage" | "featured") {
    await updateOffer({ ...offer, [field]: !offer[field] });
  }

  async function saveSettings() {
    await updateRestaurantCapabilities(restaurantSlug, settings);
    toast.success("Restaurant customer options saved.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Marketing / Offers"
        description="Owner-controlled coupons, campaign visibility, scheduling, and customer ordering capabilities."
      />
      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <SectionHeader title="Create offer" description="This controls homepage, restaurant page, checkout, and future sponsored placements." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Coupon code" value={form.code} onChange={(value) => setForm({ ...form, code: value })} placeholder="DINING20" />
              <label className="grid gap-2">
                <Label>Offer type</Label>
                <select className="h-11 rounded-md border bg-background px-3 text-sm" value={form.offerType} onChange={(event) => setForm({ ...form, offerType: event.target.value as OfferForm["offerType"] })}>
                  {offerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
            </div>
            <Field label="Offer title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="20% off dine-in" />
            <Field label="Short subtitle" value={form.subtitle} onChange={(value) => setForm({ ...form, subtitle: value })} placeholder="Valid today at Cafe Al Arab" />
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={form.offerType === "flat" ? "Discount amount" : "Discount % / value"} value={form.discount} onChange={(value) => setForm({ ...form, discount: value })} />
              <Field label="Minimum order" value={form.minimumOrder} onChange={(value) => setForm({ ...form, minimumOrder: value })} />
              <Field label="Max discount" value={form.maxDiscount} onChange={(value) => setForm({ ...form, maxDiscount: value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Promo tag" value={form.promoTag} onChange={(value) => setForm({ ...form, promoTag: value })} placeholder="Happy hour" />
              <Field label="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Banner image URL" value={form.banner} onChange={(value) => setForm({ ...form, banner: value })} />
              <Field label="Mobile image URL" value={form.mobileBanner} onChange={(value) => setForm({ ...form, mobileBanner: value })} />
            </div>

            <ConfigBlock title="Validity">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date" type="date" value={form.validFrom} onChange={(value) => setForm({ ...form, validFrom: value })} />
                <Field label="End date" type="date" value={form.validTo} onChange={(value) => setForm({ ...form, validTo: value })} />
                <Field label="Start time" type="time" value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} />
                <Field label="End time" type="time" value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} />
              </div>
              <CheckGrid options={weekdays} selected={form.daysOfWeek} onChange={(daysOfWeek) => setForm({ ...form, daysOfWeek })} />
            </ConfigBlock>

            <ConfigBlock title="Conditions">
              <CheckGrid options={["dine-in", "delivery", "parcel", "takeaway"]} selected={form.appliesTo} onChange={(appliesTo) => setForm({ ...form, appliesTo: appliesTo as OfferForm["appliesTo"] })} />
              <CheckGrid options={categories} selected={form.applicableCategories} onChange={(applicableCategories) => setForm({ ...form, applicableCategories })} emptyText="No menu categories configured yet." />
              <label className="grid gap-2">
                <Label>Applicable menu items</Label>
                <select className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" multiple value={form.applicableItemIds} onChange={(event) => setForm({ ...form, applicableItemIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>
                  {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Usage limit" value={form.usageLimit} onChange={(value) => setForm({ ...form, usageLimit: value })} />
                <Field label="Per-user limit" value={form.perUserLimit} onChange={(value) => setForm({ ...form, perUserLimit: value })} />
                <Toggle label="New customers only" checked={form.newCustomersOnly} onChange={(newCustomersOnly) => setForm({ ...form, newCustomersOnly })} />
              </div>
            </ConfigBlock>

            <ConfigBlock title="Display and sponsored readiness">
              <div className="grid gap-2 sm:grid-cols-3">
                <Toggle label="Show homepage" checked={form.showOnHomepage} onChange={(showOnHomepage) => setForm({ ...form, showOnHomepage })} />
                <Toggle label="Show restaurant" checked={form.showOnRestaurantPage} onChange={(showOnRestaurantPage) => setForm({ ...form, showOnRestaurantPage })} />
                <Toggle label="Featured" checked={form.featured} onChange={(featured) => setForm({ ...form, featured })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="Sponsored" checked={form.sponsored} onChange={(sponsored) => setForm({ ...form, sponsored })} />
                <Field label="Sponsored priority" value={form.sponsoredPriority} onChange={(value) => setForm({ ...form, sponsoredPriority: value })} />
                <Field label="Ad budget" value={form.adBudget} onChange={(value) => setForm({ ...form, adBudget: value })} />
              </div>
              <label className="grid gap-2">
                <Label>Campaign status</Label>
                <select className="h-11 rounded-md border bg-background px-3 text-sm" value={form.campaignStatus} onChange={(event) => setForm({ ...form, campaignStatus: event.target.value as OfferForm["campaignStatus"] })}>
                  {["draft", "scheduled", "active", "paused", "ended"].map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
            </ConfigBlock>

            <div className="grid gap-2">
              <Label>Conditions copy</Label>
              <Textarea value={form.conditions} onChange={(event) => setForm({ ...form, conditions: event.target.value })} placeholder="Not valid with other coupons. Restaurant may pause during rush hours." />
            </div>
            <Button className="w-full" onClick={saveOffer}>
              <Plus className="size-4" />
              Save offer
            </Button>
            {apiMessage ? <p className="text-sm font-semibold text-primary">{apiMessage}</p> : null}
          </CardContent>
        </Card>

        <section className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <SectionHeader title="Restaurant special options" description="These settings control schedule, catering, bulk, preorder, and negotiation visibility in customer screens." />
              <div className="grid gap-3 md:grid-cols-3">
                <Toggle label="Accept scheduled orders" checked={settings.acceptsScheduledOrders} onChange={(acceptsScheduledOrders) => setSettings({ ...settings, acceptsScheduledOrders })} />
                <Toggle label="Accept catering" checked={settings.acceptsCatering} onChange={(acceptsCatering) => setSettings({ ...settings, acceptsCatering })} />
                <Toggle label="Accept bulk orders" checked={settings.acceptsBulkOrders} onChange={(acceptsBulkOrders) => setSettings({ ...settings, acceptsBulkOrders })} />
                <Toggle label="Accept preorder" checked={settings.acceptsPreorder} onChange={(acceptsPreorder) => setSettings({ ...settings, acceptsPreorder })} />
                <Field label="Max preorder days" value={String(settings.maxPreorderDays)} onChange={(value) => setSettings({ ...settings, maxPreorderDays: Number(value) || 0 })} />
                <Toggle label="Catering negotiation" checked={settings.cateringNegotiationEnabled} onChange={(cateringNegotiationEnabled) => setSettings({ ...settings, cateringNegotiationEnabled })} />
              </div>
              <Button onClick={saveSettings}>
                <CalendarClock className="size-4" />
                Save customer options
              </Button>
            </CardContent>
          </Card>

          <SectionHeader title="Offer library" description="Expired offers disappear automatically from customer surfaces. Pause or hide without deleting history." />
          <div className="grid gap-4 lg:grid-cols-2">
            {ownerOffers.map((offer) => (
              <Card key={offer.code} className={isOfferActive(offer) ? "border-emerald-200" : "border-slate-200 opacity-80"}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <OfferBadge offer={offer} />
                    <Badge variant={isOfferActive(offer) ? "success" : "muted"}>{offer.status ?? "active"}</Badge>
                    {offer.featured ? <Badge className="bg-amber-100 text-amber-800">Featured</Badge> : null}
                    {offer.sponsored ? <Badge className="bg-blue-100 text-blue-800">Sponsored-ready</Badge> : null}
                  </div>
                  <div>
                    <h2 className="text-lg font-black">{offer.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p>
                  </div>
                  <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
                    <span>{offer.offerType ?? offer.discountType ?? "percentage"} · Min {formatCurrency(offer.minimumOrder)}</span>
                    <span>{offer.appliesTo?.join(" · ") ?? "delivery"} · Priority {offer.priority ?? 0}</span>
                    <span>{offer.validFrom ? new Date(offer.validFrom).toLocaleDateString("en-IN") : "No start"} - {offer.validTo ? new Date(offer.validTo).toLocaleDateString("en-IN") : "No end"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void changeStatus(offer, "active")}><Tag className="size-4" />Activate</Button>
                    <Button variant="outline" size="sm" onClick={() => void changeStatus(offer, "paused")}><Pause className="size-4" />Pause</Button>
                    <Button variant="outline" size="sm" onClick={() => void toggleVisibility(offer, "showOnHomepage")}>{offer.showOnHomepage === false ? <EyeOff className="size-4" /> : <Eye className="size-4" />}Homepage</Button>
                    <Button variant="outline" size="sm" onClick={() => void toggleVisibility(offer, "featured")}><Star className="size-4" />Featured</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { void deleteOffer(offer.code); toast.success(`${offer.code} deleted.`); }}><Trash2 className="size-4" />Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!ownerOffers.length ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground lg:col-span-2">
                No offers yet. Create the first owner-controlled offer above.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function ConfigBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <h3 className="text-sm font-black">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border bg-background p-3 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function CheckGrid({ options, selected, onChange, emptyText }: { options: string[]; selected: string[]; onChange: (values: string[]) => void; emptyText?: string }) {
  if (!options.length) return <p className="text-xs font-semibold text-muted-foreground">{emptyText ?? "No options configured."}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={active ? "rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground" : "rounded-full border bg-background px-3 py-1.5 text-xs font-black"}
            onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
