"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
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
import type { CmsBanner, CmsSettings } from "@/lib/types";

type BannerSurface = "banners" | "announcements" | "sponsoredAds";

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
  const [settings, setSettings] = useState<CmsSettings>({ ...defaultCmsSettings, ...storedSettings });
  const [surface, setSurface] = useState<BannerSurface>("banners");
  const [draft, setDraft] = useState<CmsBanner>(emptyBanner);
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
        const next = mergeCmsSettings(data);
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
      const next = mergeCmsSettings(payload.data as CmsSettings);
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
            <Field label="Application name" value={settings.appName ?? "Sarva Food"} onChange={(appName) => setSettings({ ...settings, appName })} />
            <Field label="Homepage title" value={settings.homepage.title} onChange={(title) => setSettings({ ...settings, homepage: { ...settings.homepage, title } })} />
            <Field label="Homepage subtitle" value={settings.homepage.subtitle} onChange={(subtitle) => setSettings({ ...settings, homepage: { ...settings.homepage, subtitle } })} />
            <Toggle label="Homepage CMS visible" checked={settings.homepage.visible} onChange={(visible) => setSettings({ ...settings, homepage: { ...settings.homepage, visible } })} />
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
            <div className="grid gap-2">
              <Label>Privacy copy</Label>
              <Textarea className="min-h-24" value={settings.legalPages.privacy} onChange={(event) => setSettings({ ...settings, legalPages: { ...settings.legalPages, privacy: event.target.value } })} />
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
                <CloudinaryUploadWidget folder="cms" aspectRatio={16 / 9} tags={["cms-desktop", surface]} label="Upload desktop image" onUpload={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))} />
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

function mergeCmsSettings(input?: Partial<CmsSettings>): CmsSettings {
  return {
    ...defaultCmsSettings,
    ...(input ?? {}),
    homepage: {
      ...defaultCmsSettings.homepage,
      ...(input?.homepage ?? {}),
    },
    footer: {
      ...defaultCmsSettings.footer,
      ...(input?.footer ?? {}),
    },
    legalPages: {
      ...defaultCmsSettings.legalPages,
      ...(input?.legalPages ?? {}),
    },
    banners: input?.banners?.length ? input.banners : defaultCmsSettings.banners,
    announcements: input?.announcements?.length ? input.announcements : defaultCmsSettings.announcements,
    sponsoredAds: input?.sponsoredAds?.length ? input.sponsoredAds : defaultCmsSettings.sponsoredAds,
  };
}
