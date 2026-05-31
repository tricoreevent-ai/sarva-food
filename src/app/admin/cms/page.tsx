"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Eye, EyeOff, Monitor, Plus, Save, Smartphone, Tablet, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { resolveCmsSettings } from "@/services/cms/cms-homepage-service";
import type { CmsBanner, CmsSettings } from "@/lib/types";

type BannerSurface = "banners" | "announcements" | "sponsoredAds";
type PreviewMode = "desktop" | "tablet" | "mobile";

const surfaces: Array<{ key: BannerSurface; title: string; description: string }> = [
  { key: "banners", title: "Homepage banners", description: "Hero and campaign placements with mobile and desktop images." },
  { key: "announcements", title: "Announcements", description: "Scheduled notices for customer and restaurant pages." },
  { key: "sponsoredAds", title: "Sponsored ads", description: "Future paid placements; payment is not active yet." },
];

const emptyBanner: CmsBanner = {
  id: "",
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  visible: true,
  publishFrom: "",
  publishTo: "",
  sortOrder: 0,
};

export default function AdminCmsPage() {
  const storedSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const updateCmsSettings = useAppStore((state) => state.updateCmsSettings);
  const [settings, setSettings] = useState<CmsSettings>(() => resolveCmsSettings({ ...defaultCmsSettings, ...storedSettings }));
  const [surface, setSurface] = useState<BannerSurface>("banners");
  const [draft, setDraft] = useState<CmsBanner>(emptyBanner);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const activeItems = [...(settings[surface] ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/cms", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Could not load CMS settings.");
        return payload.data as CmsSettings;
      })
      .then((data) => {
        if (!active) return;
        const next = resolveCmsSettings(data);
        setSettings(next);
        void updateCmsSettings(next);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not load CMS settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [updateCmsSettings]);

  async function saveCms() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save CMS settings.");
      const next = resolveCmsSettings(payload.data as CmsSettings);
      setSettings(next);
      await updateCmsSettings(next);
      toast.success("CMS settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save CMS settings.");
    } finally {
      setSaving(false);
    }
  }

  function addBanner() {
    if (!draft.title.trim()) {
      toast.error("Add a title before saving this CMS item.");
      return;
    }
    const item = {
      ...draft,
      id: draft.id || `${surface}-${Date.now()}`,
      sortOrder: Number(draft.sortOrder) || activeItems.length + 1,
    };
    setSettings((current) => ({
      ...current,
      [surface]: [...current[surface].filter((entry) => entry.id !== item.id), item],
    }));
    setDraft(emptyBanner);
    toast.success("CMS item added.");
  }

  function updateBanner(id: string, patch: Partial<CmsBanner>) {
    setSettings((current) => ({
      ...current,
      [surface]: current[surface].map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function moveBanner(id: string, direction: -1 | 1) {
    const next = activeItems.map((item, index) => ({ ...item, sortOrder: index + 1 }));
    const index = next.findIndex((item) => item.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= next.length) return;
    [next[index].sortOrder, next[swapIndex].sortOrder] = [next[swapIndex].sortOrder, next[index].sortOrder];
    setSettings((current) => ({ ...current, [surface]: next }));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="System Settings"
        description="Configure application name, homepage content, banners, footer, legal copy, announcements, and sponsored placements."
        action={<Button onClick={saveCms} disabled={saving}><Save className="size-4" />{saving ? "Saving..." : "Save CMS"}</Button>}
      />
      {loading ? <div className="rounded-xl border bg-card p-4 text-sm font-semibold text-muted-foreground">Loading CMS content...</div> : null}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-black">Platform copy</h2>
            <Field
              label="Application name"
              value={settings.branding?.appName ?? settings.appName ?? "Sarva Food"}
              onChange={(appName) => setSettings({
                ...settings,
                appName,
                branding: { ...settings.branding!, appName },
              })}
            />
            <div className="rounded-xl border bg-background/60 p-3">
              <h3 className="font-black">Branding</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Short name" value={settings.branding?.shortName ?? ""} onChange={(shortName) => setSettings({ ...settings, branding: { ...settings.branding!, shortName } })} />
                <Field label="Logo URL" value={settings.branding?.logoUrl ?? ""} onChange={(logoUrl) => setSettings({ ...settings, branding: { ...settings.branding!, logoUrl } })} />
                <Field label="Favicon URL" value={settings.branding?.faviconUrl ?? ""} onChange={(faviconUrl) => setSettings({ ...settings, branding: { ...settings.branding!, faviconUrl } })} />
                <Field label="Support email" value={settings.branding?.supportEmail ?? ""} onChange={(supportEmail) => setSettings({ ...settings, branding: { ...settings.branding!, supportEmail } })} />
                <Field label="Support phone" value={settings.branding?.supportPhone ?? ""} onChange={(supportPhone) => setSettings({ ...settings, branding: { ...settings.branding!, supportPhone } })} />
                <Field label="Owner onboarding WhatsApp" value={settings.branding?.onboardingWhatsapp ?? ""} onChange={(onboardingWhatsapp) => setSettings({ ...settings, branding: { ...settings.branding!, onboardingWhatsapp } })} />
              </div>
              <div className="mt-3">
                <CloudinaryUploadWidget folder="branding" aspectRatio={1} tags={["branding-logo"]} label="Upload logo" onUpload={(logoUrl) => setSettings((current) => ({ ...current, branding: { ...current.branding!, logoUrl } }))} />
              </div>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <h3 className="font-black">Customer service alerts</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                Send a throttled email when customer restaurant data cannot be loaded. Add the same address as `DATABASE_ALERT_EMAIL` in hosting for alerts during a full database outage.
              </p>
              <div className="mt-3 grid gap-3">
                <Toggle
                  label="Email database outage alerts"
                  checked={settings.operations?.databaseAlertsEnabled !== false}
                  onChange={(databaseAlertsEnabled) => setSettings({ ...settings, operations: { ...settings.operations!, databaseAlertsEnabled } })}
                />
                <Field
                  label="Database alert email"
                  type="email"
                  value={settings.operations?.databaseAlertEmail ?? ""}
                  onChange={(databaseAlertEmail) => setSettings({ ...settings, operations: { ...settings.operations!, databaseAlertEmail } })}
                />
                <Field
                  label="Customer unavailable title"
                  value={settings.operations?.customerUnavailableTitle ?? ""}
                  onChange={(customerUnavailableTitle) => setSettings({ ...settings, operations: { ...settings.operations!, customerUnavailableTitle } })}
                />
                <div className="grid gap-2">
                  <Label>Customer unavailable message</Label>
                  <Textarea
                    className="min-h-20"
                    value={settings.operations?.customerUnavailableMessage ?? ""}
                    onChange={(event) => setSettings({ ...settings, operations: { ...settings.operations!, customerUnavailableMessage: event.target.value } })}
                  />
                </div>
              </div>
            </div>
            <Field label="Homepage title" value={settings.homepage.title} onChange={(title) => setSettings({ ...settings, homepage: { ...settings.homepage, title } })} />
            <Field label="Homepage subtitle" value={settings.homepage.subtitle} onChange={(subtitle) => setSettings({ ...settings, homepage: { ...settings.homepage, subtitle } })} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Hero CTA text" value={settings.homepage.ctaText ?? ""} onChange={(ctaText) => setSettings({ ...settings, homepage: { ...settings.homepage, ctaText } })} />
              <Field label="Hero CTA link" value={settings.homepage.ctaLink ?? ""} onChange={(ctaLink) => setSettings({ ...settings, homepage: { ...settings.homepage, ctaLink } })} />
            </div>
            <Field label="Hero background image" value={settings.homepage.backgroundImage ?? ""} onChange={(backgroundImage) => setSettings({ ...settings, homepage: { ...settings.homepage, backgroundImage } })} />
            <CloudinaryUploadWidget folder="cms" aspectRatio={16 / 6} tags={["homepage-hero"]} label="Upload hero background" onUpload={(backgroundImage) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, backgroundImage } }))} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Overlay opacity" value={String(settings.homepage.overlayOpacity ?? 0.1)} onChange={(value) => setSettings({ ...settings, homepage: { ...settings.homepage, overlayOpacity: Number(value) || 0 } })} />
              <div className="grid gap-2">
                <Label>Hero animation</Label>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm font-semibold text-foreground"
                  value={settings.homepage.animationStyle ?? "float"}
                  onChange={(event) => setSettings({ ...settings, homepage: { ...settings.homepage, animationStyle: event.target.value as CmsSettings["homepage"]["animationStyle"] } })}
                >
                  <option value="float">Float</option>
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <Toggle label="Homepage CMS visible" checked={settings.homepage.visible} onChange={(visible) => setSettings({ ...settings, homepage: { ...settings.homepage, visible } })} />
            <div className="rounded-xl border bg-background/60 p-3">
              <h3 className="font-black">Homepage sections</h3>
              <div className="mt-3 grid gap-2">
                <Toggle label="Show categories" checked={settings.sections?.categoriesVisible !== false} onChange={(categoriesVisible) => setSettings({ ...settings, sections: { ...settings.sections!, categoriesVisible } })} />
                <Toggle label="Show offers" checked={settings.sections?.offersVisible !== false} onChange={(offersVisible) => setSettings({ ...settings, sections: { ...settings.sections!, offersVisible } })} />
                <Toggle label="Show featured restaurants" checked={settings.sections?.featuredRestaurantsVisible !== false} onChange={(featuredRestaurantsVisible) => setSettings({ ...settings, sections: { ...settings.sections!, featuredRestaurantsVisible } })} />
                <Toggle label="Show popular items" checked={settings.sections?.popularItemsVisible !== false} onChange={(popularItemsVisible) => setSettings({ ...settings, sections: { ...settings.sections!, popularItemsVisible } })} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Recommended title" value={settings.sections?.recommendedTitle ?? ""} onChange={(recommendedTitle) => setSettings({ ...settings, sections: { ...settings.sections!, recommendedTitle } })} />
                <Field label="Popular title" value={settings.sections?.popularTitle ?? ""} onChange={(popularTitle) => setSettings({ ...settings, sections: { ...settings.sections!, popularTitle } })} />
              </div>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <h3 className="font-black">Restaurant listing</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Section label" value={settings.restaurantListing?.eyebrow ?? ""} onChange={(eyebrow) => setSettings({ ...settings, restaurantListing: { ...settings.restaurantListing!, eyebrow } })} />
                <Field label="Search placeholder" value={settings.restaurantListing?.searchPlaceholder ?? ""} onChange={(searchPlaceholder) => setSettings({ ...settings, restaurantListing: { ...settings.restaurantListing!, searchPlaceholder } })} />
                <Field label="Nearby count text" value={settings.restaurantListing?.nearbyTitle ?? ""} onChange={(nearbyTitle) => setSettings({ ...settings, restaurantListing: { ...settings.restaurantListing!, nearbyTitle } })} />
                <Field label="Area count text" value={settings.restaurantListing?.areaTitle ?? ""} onChange={(areaTitle) => setSettings({ ...settings, restaurantListing: { ...settings.restaurantListing!, areaTitle } })} />
              </div>
            </div>
            <div className="rounded-xl border bg-background/60 p-3">
              <h3 className="font-black">Announcement bar</h3>
              <div className="mt-3 grid gap-3">
                <Toggle label="Show announcement bar" checked={settings.announcementBar?.visible === true} onChange={(visible) => setSettings({ ...settings, announcementBar: { ...settings.announcementBar!, visible } })} />
                <Field label="Message" value={settings.announcementBar?.message ?? ""} onChange={(message) => setSettings({ ...settings, announcementBar: { ...settings.announcementBar!, message } })} />
                <Field label="Redirect URL" value={settings.announcementBar?.redirectUrl ?? ""} onChange={(redirectUrl) => setSettings({ ...settings, announcementBar: { ...settings.announcementBar!, redirectUrl } })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Responsibility disclaimer</Label>
              <Textarea
                className="min-h-28"
                value={settings.disclaimer}
                onChange={(event) => setSettings({
                  ...settings,
                  disclaimer: event.target.value,
                  footer: { ...settings.footer, note: event.target.value },
                  legalPages: { ...settings.legalPages, terms: event.target.value },
                })}
              />
            </div>
            <Toggle label="Show footer disclaimer" checked={settings.footer.visible} onChange={(visible) => setSettings({ ...settings, footer: { ...settings.footer, visible } })} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Support email" value={settings.footer.supportEmail ?? ""} onChange={(supportEmail) => setSettings({ ...settings, footer: { ...settings.footer, supportEmail } })} />
              <Field label="Copyright" value={settings.footer.copyright ?? ""} onChange={(copyright) => setSettings({ ...settings, footer: { ...settings.footer, copyright } })} />
            </div>
            <div className="grid gap-2">
              <Label>Privacy copy</Label>
              <Textarea className="min-h-24" value={settings.legalPages.privacy} onChange={(event) => setSettings({ ...settings, legalPages: { ...settings.legalPages, privacy: event.target.value } })} />
            </div>
            <div className="grid gap-2">
              <Label>Refund policy</Label>
              <Textarea className="min-h-20" value={settings.legalPages.refund ?? ""} onChange={(event) => setSettings({ ...settings, legalPages: { ...settings.legalPages, refund: event.target.value } })} />
            </div>
            <div className="grid gap-2">
              <Label>Cancellation policy</Label>
              <Textarea className="min-h-20" value={settings.legalPages.cancellation ?? ""} onChange={(event) => setSettings({ ...settings, legalPages: { ...settings.legalPages, cancellation: event.target.value } })} />
            </div>
            <div className="grid gap-2">
              <Label>Delivery policy</Label>
              <Textarea className="min-h-20" value={settings.legalPages.delivery ?? ""} onChange={(event) => setSettings({ ...settings, legalPages: { ...settings.legalPages, delivery: event.target.value } })} />
            </div>
            <div className="grid gap-2">
              <Label>Cookie policy</Label>
              <Textarea className="min-h-20" value={settings.legalPages.cookie ?? ""} onChange={(event) => setSettings({ ...settings, legalPages: { ...settings.legalPages, cookie: event.target.value } })} />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {surfaces.map((item) => (
              <Button key={item.key} type="button" variant={surface === item.key ? "default" : "outline"} onClick={() => setSurface(item.key)}>
                {item.title}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <SectionHeader title={surfaces.find((item) => item.key === surface)?.title ?? "CMS items"} description={surfaces.find((item) => item.key === surface)?.description ?? ""} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
                <Field label="Subtitle" value={draft.subtitle ?? ""} onChange={(subtitle) => setDraft({ ...draft, subtitle })} />
                <Field label="Desktop image URL" value={draft.imageUrl} onChange={(imageUrl) => setDraft({ ...draft, imageUrl })} />
                <Field label="Mobile image URL" value={draft.mobileImageUrl ?? ""} onChange={(mobileImageUrl) => setDraft({ ...draft, mobileImageUrl })} />
                <CloudinaryUploadWidget folder="cms" aspectRatio={surface === "banners" ? 16 / 6 : 4 / 3} tags={["cms-desktop", surface]} label="Upload desktop image" onUpload={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))} />
                <CloudinaryUploadWidget folder="cms" aspectRatio={4 / 5} tags={["cms-mobile", surface]} label="Upload mobile image" onUpload={(mobileImageUrl) => setDraft((current) => ({ ...current, mobileImageUrl }))} />
                <Field label="CTA label" value={draft.ctaLabel ?? ""} onChange={(ctaLabel) => setDraft({ ...draft, ctaLabel })} />
                <Field label="CTA link" value={draft.ctaHref ?? ""} onChange={(ctaHref) => setDraft({ ...draft, ctaHref })} />
                <Field label="Publish from" type="datetime-local" value={draft.publishFrom ?? ""} onChange={(publishFrom) => setDraft({ ...draft, publishFrom })} />
                <Field label="Publish to" type="datetime-local" value={draft.publishTo ?? ""} onChange={(publishTo) => setDraft({ ...draft, publishTo })} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle label="Visible" checked={draft.visible} onChange={(visible) => setDraft({ ...draft, visible })} />
                <Button type="button" onClick={addBanner}>
                  <Plus className="size-4" />
                  Add CMS item
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeader title="Homepage preview" description="Live CMS-bound preview before publishing." />
                <div className="flex gap-2">
                  <Button type="button" size="icon-sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")} aria-label="Desktop preview"><Monitor className="size-4" /></Button>
                  <Button type="button" size="icon-sm" variant={previewMode === "tablet" ? "default" : "outline"} onClick={() => setPreviewMode("tablet")} aria-label="Tablet preview"><Tablet className="size-4" /></Button>
                  <Button type="button" size="icon-sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")} aria-label="Mobile preview"><Smartphone className="size-4" /></Button>
                </div>
              </div>
              <HomepagePreview settings={settings} mode={previewMode} />
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {activeItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{item.title}</h3>
                      <Badge variant={item.visible ? "success" : "muted"}>{item.visible ? "Visible" : "Hidden"}</Badge>
                      <Badge variant="secondary">Priority {item.sortOrder}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.subtitle || "No subtitle"}</p>
                    <p className="mt-2 break-all text-xs font-semibold text-muted-foreground">{item.ctaHref || item.imageUrl || "No link/image configured"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="icon" variant="outline" aria-label="Move up" onClick={() => moveBanner(item.id, -1)}><ArrowUp className="size-4" /></Button>
                    <Button size="icon" variant="outline" aria-label="Move down" onClick={() => moveBanner(item.id, 1)}><ArrowDown className="size-4" /></Button>
                    <Button size="icon" variant="outline" aria-label="Toggle visibility" onClick={() => updateBanner(item.id, { visible: !item.visible })}>{item.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</Button>
                    <Button size="icon" variant="ghost" className="text-destructive" aria-label="Delete CMS item" onClick={() => setSettings((current) => ({ ...current, [surface]: current[surface].filter((entry) => entry.id !== item.id) }))}><Trash2 className="size-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!activeItems.length ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No CMS items here yet.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
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

function HomepagePreview({ settings, mode }: { settings: CmsSettings; mode: PreviewMode }) {
  const widthClass = mode === "mobile" ? "max-w-[390px]" : mode === "tablet" ? "max-w-[760px]" : "max-w-full";
  const banner = settings.banners.find((item) => item.visible) ?? settings.sponsoredAds.find((item) => item.visible);
  return (
    <div className={`mx-auto overflow-hidden rounded-2xl border bg-[#fffaf5] text-[#231510] shadow-inner ${widthClass}`}>
      {settings.announcementBar?.visible && settings.announcementBar.message ? (
        <div className="px-4 py-2 text-xs font-black" style={{ backgroundColor: settings.announcementBar.backgroundColor || "#fff7ed" }}>
          {settings.announcementBar.message}
        </div>
      ) : null}
      <div className={mode === "mobile" ? "p-4" : "grid grid-cols-[1fr_42%] gap-4 p-6"}>
        <div className="space-y-3">
          <h3 className={mode === "mobile" ? "text-2xl font-black" : "text-4xl font-black"}>{settings.homepage.title}</h3>
          <p className="text-sm font-semibold leading-6 text-[#7a5d4b]">{settings.homepage.subtitle}</p>
          <span className="inline-flex rounded-lg bg-orange-600 px-4 py-2 text-sm font-black text-white">{settings.homepage.ctaText || "Find Food"}</span>
        </div>
        <div className={mode === "mobile" ? "mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-orange-100" : "aspect-[16/10] overflow-hidden rounded-2xl bg-orange-100"}>
          {settings.homepage.backgroundImage || banner?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.homepage.backgroundImage || banner?.imageUrl} alt="Homepage preview" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {settings.sections?.categoriesVisible !== false ? <PreviewChip label="Categories" /> : null}
        {settings.sections?.offersVisible !== false ? <PreviewChip label="Offers" /> : null}
        {settings.sections?.featuredRestaurantsVisible !== false ? <PreviewChip label="Restaurants" /> : null}
      </div>
    </div>
  );
}

function PreviewChip({ label }: { label: string }) {
  return <span className="rounded-xl border bg-white px-3 py-2 text-center text-xs font-black text-orange-700">{label}</span>;
}
