"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/client-toast";
import { CalendarClock, Eye, EyeOff, Loader2, MessageCircle, Pause, Pencil, Plus, RotateCcw, Search, SlidersHorizontal, Star, Tag, Trash2 } from "lucide-react";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { SectionHeader } from "@/components/layout/section-header";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultRestaurantMarketingSettings } from "@/features/marketing/messageTemplates";
import { useWhatsAppShare } from "@/hooks/useWhatsAppShare";
import { useOwnerMenu, useOwnerOffers } from "@/hooks/use-owner-repository-data";
import { useAppStore } from "@/lib/app-store";
import { isOfferActive, sortOffers } from "@/lib/offer-engine";
import type { MenuItem, Offer } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { readStoredRestaurantMarketingSettings, writeStoredRestaurantMarketingSettings } from "@/services/whatsappTemplate";

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

type OfferFilter = "all" | "active" | "paused" | "expired" | "featured" | "sponsored" | "homepage";

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
const pageSize = 6;

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
  validFrom: todayInput(),
  validTo: futureInput(30),
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
  const restaurants = useAppStore((state) => state.restaurants);
  const authUser = useAppStore((state) => state.authUser);
  const updateRestaurantCapabilities = useAppStore((state) => state.updateRestaurantCapabilities);
  const restaurantSlug = authUser.restaurantSlug ?? restaurants[0]?.slug ?? "cafe-al-arab-thanisandra";
  const { items: menuItems, error: menuError, retry: retryMenu } = useOwnerMenu(restaurantSlug);
  const {
    offers,
    status: offerStatus,
    error: offerError,
    retry: retryOffers,
    create: createOffer,
    update: updateOffer,
    remove: deleteOffer,
  } = useOwnerOffers(restaurantSlug);
  const apiMessage = offerError || menuError;
  const restaurant = restaurants.find((item) => item.slug === restaurantSlug) ?? restaurants[0];
  const whatsappShare = useWhatsAppShare();
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<OfferForm>(emptyForm);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | OfferForm["offerType"]>("all");
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState(() => ({
    acceptsScheduledOrders: restaurant?.scheduling?.enabled ?? true,
    acceptsCatering: restaurant?.tags.some((tag) => tag.toLowerCase().includes("catering")) ?? true,
    acceptsBulkOrders: restaurant?.tags.some((tag) => tag.toLowerCase().includes("bulk")) ?? true,
    acceptsPreorder: restaurant?.advancedFeatures?.preorder ?? true,
    maxPreorderDays: 14,
    cateringNegotiationEnabled: true,
  }));
  const [restaurantMarketingSettings, setRestaurantMarketingSettings] = useState(() => ({
    ...defaultRestaurantMarketingSettings,
    ...readStoredRestaurantMarketingSettings(restaurantSlug),
  }));
  const ownerOffers = useMemo(() => sortOffers(offers.filter((offer) => !offer.restaurantSlug || offer.restaurantSlug === restaurantSlug)), [offers, restaurantSlug]);

  const categories = useMemo(() => {
    const itemCategories = menuItems.map((item) => item.category);
    return Array.from(new Set(itemCategories.filter(Boolean)));
  }, [menuItems]);
  const filteredOffers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return ownerOffers.filter((offer) => {
      const matchesSearch = !search || [offer.code, offer.title, offer.description, offer.promoTag, offer.category].some((value) => String(value ?? "").toLowerCase().includes(search));
      const active = isOfferActive(offer);
      const status = offer.status ?? "active";
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && active && status === "active") ||
        (filter === "paused" && status === "paused") ||
        (filter === "expired" && !active) ||
        (filter === "featured" && Boolean(offer.featured)) ||
        (filter === "sponsored" && Boolean(offer.sponsored)) ||
        (filter === "homepage" && offer.showOnHomepage !== false);
      const matchesType = typeFilter === "all" || offer.offerType === typeFilter;
      return matchesSearch && matchesFilter && matchesType;
    });
  }, [filter, ownerOffers, query, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / pageSize));
  const visibleOffers = filteredOffers.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = ownerOffers.filter((offer) => isOfferActive(offer) && (offer.status ?? "active") === "active").length;
  const expiredCount = ownerOffers.filter((offer) => !isOfferActive(offer)).length;

  function openNewOffer() {
    const nextForm = { ...emptyForm, code: `OFFER${Date.now().toString().slice(-4)}` };
    setEditingCode(null);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormOpen(true);
  }

  function editOffer(offer: Offer) {
    const nextForm = toOfferForm(offer);
    setEditingCode(offer.code);
    setForm(nextForm);
    setInitialForm(nextForm);
    setFormOpen(true);
  }

  function reuseOffer(offer: Offer) {
    const nextForm = { ...toOfferForm(offer), validFrom: todayInput(), validTo: futureInput(30), campaignStatus: "active" as const };
    setEditingCode(offer.code);
    setForm(nextForm);
    setInitialForm(toOfferForm(offer));
    setFormOpen(true);
    toast.success("Offer loaded with a fresh future validity window.");
  }

  async function saveOffer() {
    const normalizedCode = form.code.trim().toUpperCase();
    if (!normalizedCode || !form.title.trim()) {
      toast.error("Offer code and title are required.");
      return;
    }
    if (!form.validTo || new Date(form.validTo) <= startOfToday()) {
      toast.error("Offer end date must be a future date.");
      return;
    }
    const offer = buildOfferPayload(form, normalizedCode, restaurantSlug, restaurant?.name);
    setSavingOffer(true);
    try {
      if (editingCode) {
        await withOfferSaveTimeout(updateOffer(offer));
        toast.success(`${offer.code} updated.`);
      } else {
        await withOfferSaveTimeout(createOffer(offer));
        toast.success(`${offer.code} created.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to confirm update. Please contact administrator.");
      setSavingOffer(false);
      return;
    }
    setSavingOffer(false);
    setFormOpen(false);
    setEditingCode(null);
    setForm(emptyForm);
    setInitialForm(emptyForm);
  }

  async function changeStatus(offer: Offer, status: NonNullable<Offer["status"]>) {
    try {
      await updateOffer({ ...offer, status, campaignStatus: status === "active" ? "active" : "paused" });
      toast.success(`${offer.code} marked ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offer status could not be changed.");
    }
  }

  async function toggleVisibility(offer: Offer, field: "showOnHomepage" | "showOnRestaurantPage" | "featured") {
    try {
      await updateOffer({ ...offer, [field]: !offer[field] });
      toast.success(`${offer.code} updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offer visibility could not be changed.");
    }
  }

  async function removeOffer(offer: Offer) {
    try {
      await deleteOffer(offer.code);
      toast.success(`${offer.code} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offer could not be deleted.");
    }
  }

  async function saveSettings() {
    await updateRestaurantCapabilities(restaurantSlug, settings);
    toast.success("Restaurant customer options saved.");
  }

  function saveRestaurantMarketingSettings() {
    writeStoredRestaurantMarketingSettings(restaurantSlug, restaurantMarketingSettings);
    toast.success("WhatsApp marketing settings saved.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Marketing / Offers"
        description="Manage active offers, reuse expired campaigns, and control where customers see promotions."
        action={<Button onClick={openNewOffer}><Plus className="size-4" />Add New Offer</Button>}
      />
      {offerStatus === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2" aria-label="Loading offers">
          {[0, 1].map((item) => <div key={item} className="h-48 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : null}
      {apiMessage ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          <span>{apiMessage}</span>
          <Button variant="outline" size="sm" onClick={() => { retryOffers(); retryMenu(); }}>Retry</Button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Total offers" value={ownerOffers.length} />
        <Metric label="Active" value={activeCount} tone="success" />
        <Metric label="Expired" value={expiredCount} tone="warning" />
        <Metric label="Featured" value={ownerOffers.filter((offer) => offer.featured).length} tone="info" />
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <label className="relative block">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input className="pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search offers by code, title, category, or tag" />
            </label>
            <select className="h-10 rounded-md border bg-background px-3 text-sm font-semibold" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as typeof typeFilter); setPage(1); }}>
              <option value="all">All offer types</option>
              {offerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <Button variant="outline" type="button" onClick={() => { setFilter("all"); setTypeFilter("all"); setQuery(""); setPage(1); }}>
              <SlidersHorizontal className="size-4" />
              Reset
            </Button>
          </div>
          <div className="customer-scroll flex gap-2 overflow-x-auto pb-1">
            {(["all", "active", "paused", "expired", "featured", "sponsored", "homepage"] as OfferFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setFilter(item); setPage(1); }}
                className={filter === item ? "h-10 shrink-0 rounded-full bg-orange-500 px-4 text-sm font-black capitalize text-white" : "h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-black capitalize text-slate-700"}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {formOpen ? (
        <OfferConfigurator
          form={form}
          editing={Boolean(editingCode)}
          categories={categories}
          menuItems={menuItems}
          restaurantSlug={restaurantSlug}
          onForm={setForm}
          onSave={() => void saveOffer()}
          onCancel={() => {
            if (savingOffer) return;
            setFormOpen(false);
            setEditingCode(null);
          }}
          apiMessage={apiMessage}
          dirty={JSON.stringify(form) !== JSON.stringify(initialForm)}
          saving={savingOffer}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleOffers.map((offer) => (
              <OfferLibraryCard
                key={offer.code}
                offer={offer}
                relatedMenuItems={menuItems.filter((item) => offer.applicableItemIds?.includes(item.id)).slice(0, 3)}
                onEdit={() => editOffer(offer)}
                onReuse={() => reuseOffer(offer)}
                onActivate={() => void changeStatus(offer, "active")}
                onPause={() => void changeStatus(offer, "paused")}
                onToggleHomepage={() => void toggleVisibility(offer, "showOnHomepage")}
                onToggleFeatured={() => void toggleVisibility(offer, "featured")}
                onDelete={() => void removeOffer(offer)}
                onShareItem={(item) => void whatsappShare.openShare({ item, restaurant, template: offer.offerType === "festival" ? "festival" : "promotional" })}
              />
            ))}
          </div>
          {!visibleOffers.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-semibold text-muted-foreground">
              No offers match this filter. Add a new offer or reset filters.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-3">
            <p className="text-sm font-semibold text-slate-500">Showing {visibleOffers.length} of {filteredOffers.length} offers</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span className="rounded-md bg-orange-50 px-3 py-1 text-sm font-black text-orange-700">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <SectionHeader title="WhatsApp marketing settings" description="Restaurant defaults used by item share messages." />
              <Field label="Default CTA" value={restaurantMarketingSettings.defaultCtaText} onChange={(defaultCtaText) => setRestaurantMarketingSettings({ ...restaurantMarketingSettings, defaultCtaText })} placeholder="Order Now" />
              <div className="grid gap-2">
                <Label>Restaurant WhatsApp footer</Label>
                <Textarea
                  value={restaurantMarketingSettings.whatsappFooter}
                  onChange={(event) => setRestaurantMarketingSettings({ ...restaurantMarketingSettings, whatsappFooter: event.target.value })}
                  placeholder={"📍 Cafe Al Arab, Thanisandra\n📞 +91 98765 43210"}
                  rows={4}
                />
              </div>
              <Button onClick={saveRestaurantMarketingSettings} className="w-full">
                <MessageCircle className="size-4" />
                Save WhatsApp settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <SectionHeader title="Restaurant special options" description="These settings control schedule, catering, bulk, preorder, and negotiation visibility in customer screens." />
              <div className="grid gap-3">
                <Toggle label="Accept scheduled orders" checked={settings.acceptsScheduledOrders} onChange={(acceptsScheduledOrders) => setSettings({ ...settings, acceptsScheduledOrders })} />
                <Toggle label="Accept catering" checked={settings.acceptsCatering} onChange={(acceptsCatering) => setSettings({ ...settings, acceptsCatering })} />
                <Toggle label="Accept bulk orders" checked={settings.acceptsBulkOrders} onChange={(acceptsBulkOrders) => setSettings({ ...settings, acceptsBulkOrders })} />
                <Toggle label="Accept preorder" checked={settings.acceptsPreorder} onChange={(acceptsPreorder) => setSettings({ ...settings, acceptsPreorder })} />
                <Field label="Max preorder days" type="number" value={String(settings.maxPreorderDays)} onChange={(value) => setSettings({ ...settings, maxPreorderDays: Number(value) || 0 })} />
                <Toggle label="Catering negotiation" checked={settings.cateringNegotiationEnabled} onChange={(cateringNegotiationEnabled) => setSettings({ ...settings, cateringNegotiationEnabled })} />
              </div>
              <Button onClick={saveSettings} className="w-full">
                <CalendarClock className="size-4" />
                Save customer options
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <WhatsAppShareModal
        preview={whatsappShare.preview}
        open={Boolean(whatsappShare.preview) || whatsappShare.isPreparing}
        preparing={whatsappShare.isPreparing}
        onOpenChange={(open) => {
          if (!open) whatsappShare.closeShare();
        }}
        onCopy={() => void whatsappShare.copyMessage()}
        onWhatsApp={whatsappShare.openWhatsApp}
      />
    </div>
  );
}

function OfferConfigurator({
  form,
  editing,
  categories,
  menuItems,
  restaurantSlug,
  onForm,
  onSave,
  onCancel,
  apiMessage,
  dirty,
  saving,
}: {
  form: OfferForm;
  editing: boolean;
  categories: string[];
  menuItems: Array<{ id: string; name: string }>;
  restaurantSlug: string;
  onForm: (form: OfferForm) => void;
  onSave: () => void;
  onCancel: () => void;
  apiMessage?: string;
  dirty: boolean;
  saving: boolean;
}) {
  return (
    <Card className="border-orange-200 shadow-xl">
      <CardContent className="relative space-y-5 p-5">
        {saving ? (
          <div className="absolute inset-0 z-20 grid place-items-center rounded-lg bg-white/80 backdrop-blur-sm">
            <div className="rounded-2xl border bg-white p-5 text-center shadow-xl">
              <Loader2 className="mx-auto size-6 animate-spin text-orange-600" />
              <p className="mt-3 text-sm font-black">Saving offer...</p>
            </div>
          </div>
        ) : null}
        <SectionHeader title={editing ? "Edit offer" : "Add new offer"} description="Configure offer rules once. Homepage, restaurant page, and checkout surfaces update from this data." action={<Button variant="outline" onClick={onCancel} disabled={saving}>Close</Button>} />
        <fieldset disabled={saving} className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Coupon code" value={form.code} onChange={(code) => onForm({ ...form, code })} placeholder="DINING20" disabled={editing} />
              <label className="grid gap-2">
                <Label>Offer type</Label>
                <select className="h-11 rounded-md border bg-background px-3 text-sm" value={form.offerType} onChange={(event) => onForm({ ...form, offerType: event.target.value as OfferForm["offerType"] })}>
                  {offerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
            </div>
            <Field label="Offer title" value={form.title} onChange={(title) => onForm({ ...form, title })} placeholder="20% off dine-in" />
            <Field label="Short subtitle" value={form.subtitle} onChange={(subtitle) => onForm({ ...form, subtitle })} placeholder="Valid today at your restaurant" />
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => onForm({ ...form, description: event.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={form.offerType === "flat" ? "Discount amount" : "Discount % / value"} value={form.discount} onChange={(discount) => onForm({ ...form, discount })} />
              <Field label="Minimum order" value={form.minimumOrder} onChange={(minimumOrder) => onForm({ ...form, minimumOrder })} />
              <Field label="Max discount" value={form.maxDiscount} onChange={(maxDiscount) => onForm({ ...form, maxDiscount })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Promo tag" value={form.promoTag} onChange={(promoTag) => onForm({ ...form, promoTag })} placeholder="Happy hour" />
              <Field label="Priority" type="number" value={form.priority} onChange={(priority) => onForm({ ...form, priority })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Field label="Banner image URL" value={form.banner} onChange={(banner) => onForm({ ...form, banner })} />
                <CloudinaryUploadWidget folder="offers" restaurantId={restaurantSlug} aspectRatio={16 / 9} tags={["offer-banner"]} label="Upload banner" onUpload={(banner) => onForm({ ...form, banner })} />
              </div>
              <div className="grid gap-2">
                <Field label="Mobile image URL" value={form.mobileBanner} onChange={(mobileBanner) => onForm({ ...form, mobileBanner })} />
                <CloudinaryUploadWidget folder="offers" restaurantId={restaurantSlug} aspectRatio={4 / 5} tags={["offer-mobile"]} label="Upload mobile image" onUpload={(mobileBanner) => onForm({ ...form, mobileBanner })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ConfigBlock title="Validity">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date" type="date" value={form.validFrom} onChange={(validFrom) => onForm({ ...form, validFrom })} />
                <Field label="End date" type="date" min={futureInput(1)} value={form.validTo} onChange={(validTo) => onForm({ ...form, validTo })} />
                <Field label="Start time" type="time" value={form.startTime} onChange={(startTime) => onForm({ ...form, startTime })} />
                <Field label="End time" type="time" value={form.endTime} onChange={(endTime) => onForm({ ...form, endTime })} />
              </div>
              <CheckGrid options={weekdays} selected={form.daysOfWeek} onChange={(daysOfWeek) => onForm({ ...form, daysOfWeek })} />
            </ConfigBlock>
            <ConfigBlock title="Conditions">
              <CheckGrid options={["dine-in", "delivery", "parcel", "takeaway"]} selected={form.appliesTo} onChange={(appliesTo) => onForm({ ...form, appliesTo: appliesTo as OfferForm["appliesTo"] })} />
              <CheckGrid options={categories} selected={form.applicableCategories} onChange={(applicableCategories) => onForm({ ...form, applicableCategories })} emptyText="No menu categories configured yet." />
              <label className="grid gap-2">
                <Label>Applicable menu items</Label>
                <select className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" multiple value={form.applicableItemIds} onChange={(event) => onForm({ ...form, applicableItemIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>
                  {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Usage limit" value={form.usageLimit} onChange={(usageLimit) => onForm({ ...form, usageLimit })} />
                <Field label="Per-user limit" value={form.perUserLimit} onChange={(perUserLimit) => onForm({ ...form, perUserLimit })} />
                <Toggle label="New customers only" checked={form.newCustomersOnly} onChange={(newCustomersOnly) => onForm({ ...form, newCustomersOnly })} />
              </div>
            </ConfigBlock>
            <ConfigBlock title="Display and sponsored readiness">
              <div className="grid gap-2 sm:grid-cols-3">
                <Toggle label="Show homepage" checked={form.showOnHomepage} onChange={(showOnHomepage) => onForm({ ...form, showOnHomepage })} />
                <Toggle label="Show restaurant" checked={form.showOnRestaurantPage} onChange={(showOnRestaurantPage) => onForm({ ...form, showOnRestaurantPage })} />
                <Toggle label="Featured" checked={form.featured} onChange={(featured) => onForm({ ...form, featured })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="Sponsored" checked={form.sponsored} onChange={(sponsored) => onForm({ ...form, sponsored })} />
                <Field label="Sponsored priority" value={form.sponsoredPriority} onChange={(sponsoredPriority) => onForm({ ...form, sponsoredPriority })} />
                <Field label="Ad budget" value={form.adBudget} onChange={(adBudget) => onForm({ ...form, adBudget })} />
              </div>
              <label className="grid gap-2">
                <Label>Campaign status</Label>
                <select className="h-11 rounded-md border bg-background px-3 text-sm" value={form.campaignStatus} onChange={(event) => onForm({ ...form, campaignStatus: event.target.value as OfferForm["campaignStatus"] })}>
                  {["draft", "scheduled", "active", "paused", "ended"].map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
            </ConfigBlock>
            <div className="grid gap-2">
              <Label>Conditions copy</Label>
              <Textarea value={form.conditions} onChange={(event) => onForm({ ...form, conditions: event.target.value })} placeholder="Not valid with other coupons. Restaurant may pause during rush hours." />
            </div>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {apiMessage ? <p className="mr-auto text-sm font-semibold text-primary">{apiMessage}</p> : null}
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving || !dirty}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editing ? "Update offer" : "Save offer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OfferLibraryCard({
  offer,
  relatedMenuItems,
  onEdit,
  onReuse,
  onActivate,
  onPause,
  onToggleHomepage,
  onToggleFeatured,
  onDelete,
  onShareItem,
}: {
  offer: Offer;
  relatedMenuItems: MenuItem[];
  onEdit: () => void;
  onReuse: () => void;
  onActivate: () => void;
  onPause: () => void;
  onToggleHomepage: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
  onShareItem: (item: MenuItem) => void;
}) {
  const active = isOfferActive(offer) && (offer.status ?? "active") === "active";
  return (
    <Card className={active ? "overflow-hidden border-emerald-200" : "overflow-hidden border-slate-200 opacity-90"}>
      {offer.banner ? (
        <div className="relative h-24 overflow-hidden bg-muted">
          <SafeImage src={offer.banner} alt="" fill fallbackSrc={IMAGE_FALLBACKS.food} cloudinaryPreset="offerCard" sizes="420px" className="object-cover" />
        </div>
      ) : null}
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <OfferBadge offer={offer} />
          <Badge variant={active ? "success" : "muted"}>{active ? "active" : offer.status ?? "inactive"}</Badge>
          {offer.featured ? <Badge className="bg-amber-100 text-amber-800">Featured</Badge> : null}
          {offer.sponsored ? <Badge className="bg-blue-100 text-blue-800">Sponsored-ready</Badge> : null}
        </div>
        <div>
          <h2 className="text-lg font-black">{offer.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{offer.description}</p>
        </div>
        <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
          <span>{offer.offerType ?? offer.discountType ?? "percentage"} · Min {formatCurrency(offer.minimumOrder)}</span>
          <span>{offer.appliesTo?.join(" · ") ?? "delivery"} · Priority {offer.priority ?? 0}</span>
          <span>{offer.validFrom ? new Date(offer.validFrom).toLocaleDateString("en-IN") : "No start"} - {offer.validTo ? new Date(offer.validTo).toLocaleDateString("en-IN") : "No end"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="size-4" />Edit</Button>
          <Button variant="outline" size="sm" onClick={onReuse}><RotateCcw className="size-4" />Reuse</Button>
          <Button variant="outline" size="sm" onClick={onActivate}><Tag className="size-4" />Activate</Button>
          <Button variant="outline" size="sm" onClick={onPause}><Pause className="size-4" />Pause</Button>
          <Button variant="outline" size="sm" onClick={onToggleHomepage}>{offer.showOnHomepage === false ? <EyeOff className="size-4" /> : <Eye className="size-4" />}Homepage</Button>
          <Button variant="outline" size="sm" onClick={onToggleFeatured}><Star className="size-4" />Featured</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}><Trash2 className="size-4" />Delete</Button>
        </div>
        {relatedMenuItems.length ? (
          <div className="rounded-lg border bg-orange-50/50 p-3">
            <p className="text-xs font-black uppercase text-orange-700">Share campaign items</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {relatedMenuItems.map((item) => (
                <Button key={item.id} type="button" variant="outline" size="sm" onClick={() => onShareItem(item)}>
                  <MessageCircle className="size-4" />
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "info" }) {
  const toneClass = tone === "success" ? "text-emerald-700 bg-emerald-50" : tone === "warning" ? "text-orange-700 bg-orange-50" : tone === "info" ? "text-blue-700 bg-blue-50" : "text-slate-800 bg-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${toneClass}`}>{value}</p>
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

function Field({ label, value, onChange, placeholder, type = "text", min, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; min?: string; disabled?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} />
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

function buildOfferPayload(form: OfferForm, code: string, restaurantSlug: string, restaurantName?: string): Offer {
  const campaignStatus = form.campaignStatus === "draft" ? "active" : form.campaignStatus;
  return {
    code,
    title: form.title,
    subtitle: form.subtitle,
    description: form.description || form.subtitle || form.title,
    discount: Number(form.discount) || 0,
    minimumOrder: Number(form.minimumOrder) || 0,
    maxDiscount: Number(form.maxDiscount) || undefined,
    channel: form.offerType === "catering" ? "Catering" : "Web",
    restaurantSlug,
    restaurantName,
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
    status: campaignStatus === "active" || campaignStatus === "scheduled" ? "active" : campaignStatus === "paused" ? "paused" : "inactive",
    showOnHomepage: form.showOnHomepage,
    showOnRestaurantPage: form.showOnRestaurantPage,
    featured: form.featured,
    priority: Number(form.priority) || 0,
    sponsored: form.sponsored,
    sponsoredPriority: Number(form.sponsoredPriority) || 0,
    adBudget: Number(form.adBudget) || undefined,
    campaignStatus,
    conditions: form.conditions,
  };
}

function toOfferForm(offer: Offer): OfferForm {
  return {
    code: offer.code,
    title: offer.title ?? "",
    subtitle: offer.subtitle ?? "",
    description: offer.description ?? "",
    offerType: offer.offerType ?? "percentage",
    discount: String(offer.discount ?? ""),
    minimumOrder: String(offer.minimumOrder ?? ""),
    maxDiscount: String(offer.maxDiscount ?? ""),
    promoTag: offer.promoTag ?? "",
    banner: offer.banner ?? "",
    mobileBanner: offer.mobileBanner ?? "",
    validFrom: inputDate(offer.validFrom) || todayInput(),
    validTo: isFutureDate(offer.validTo) ? inputDate(offer.validTo) : futureInput(30),
    startTime: offer.startTime ?? "",
    endTime: offer.endTime ?? "",
    daysOfWeek: offer.daysOfWeek ?? [],
    appliesTo: offer.appliesTo ?? ["delivery"],
    applicableCategories: offer.applicableCategories ?? [],
    applicableItemIds: offer.applicableItemIds ?? [],
    newCustomersOnly: Boolean(offer.newCustomersOnly),
    usageLimit: String(offer.usageLimit ?? ""),
    perUserLimit: String(offer.perUserLimit ?? ""),
    showOnHomepage: offer.showOnHomepage !== false,
    showOnRestaurantPage: offer.showOnRestaurantPage !== false,
    featured: Boolean(offer.featured),
    priority: String(offer.priority ?? 0),
    sponsored: Boolean(offer.sponsored),
    sponsoredPriority: String(offer.sponsoredPriority ?? 0),
    adBudget: String(offer.adBudget ?? ""),
    campaignStatus: offer.campaignStatus ?? "active",
    conditions: offer.conditions ?? "",
  };
}

function todayInput() {
  return inputDate(new Date().toISOString());
}

function futureInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return inputDate(date.toISOString());
}

function inputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isFutureDate(value?: string) {
  return Boolean(value && new Date(value) > startOfToday());
}

function withOfferSaveTimeout<T>(promise: Promise<T>) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Unable to confirm update. Please contact administrator.")), 5 * 60_000);
    }),
  ]);
}
