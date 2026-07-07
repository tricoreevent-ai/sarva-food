"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/client-toast";
import { Eye, EyeOff, Save, Sparkles, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultAppCuisines, slugifyCuisine } from "@/lib/default-app-cuisines";
import type { AppCuisine } from "@/lib/types";

type ApiResponse = {
  cuisines?: AppCuisine[];
  error?: string;
};

const emptyDraft: AppCuisine = {
  id: "",
  name: "",
  slug: "",
  image: "",
  icon: "",
  color: "#0f8a5f",
  sortOrder: 1,
  active: true,
  description: "",
};

export default function AdminCuisinesPage() {
  const [cuisines, setCuisines] = useState<AppCuisine[]>([]);
  const [draft, setDraft] = useState<AppCuisine>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sortedCuisines = useMemo(
    () => [...cuisines].sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name)),
    [cuisines],
  );

  useEffect(() => {
    void loadCuisines();
  }, []);

  async function loadCuisines() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cuisines", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not load cuisine types.");
      setCuisines(payload.cuisines ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load cuisine types.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCuisine(cuisine: AppCuisine) {
    if (!cuisine.name.trim()) {
      toast.error("Cuisine name is required.");
      return;
    }
    setSaving(true);
    try {
      const slug = slugifyCuisine(cuisine.slug || cuisine.name);
      const response = await fetch("/api/admin/cuisines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuisine: {
            ...cuisine,
            id: cuisine.id || slug,
            slug,
            sortOrder: Number(cuisine.sortOrder) || sortedCuisines.length + 1,
          },
        }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not save cuisine type.");
      await loadCuisines();
      setDraft(emptyDraft);
      toast.success("Cuisine type saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save cuisine type.");
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    try {
      const existing = new Set(cuisines.map((item) => item.slug));
      const missing = defaultAppCuisines.filter((item) => !existing.has(item.slug));
      if (!missing.length) {
        toast.success("Default cuisine types are already present.");
        return;
      }
      const response = await fetch("/api/admin/cuisines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuisines: missing }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not seed cuisine types.");
      await loadCuisines();
      toast.success(`${missing.length} cuisine types added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not seed cuisine types.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCuisine(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/cuisines?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not delete cuisine type.");
      setCuisines((current) => current.filter((item) => item.id !== id));
      toast.success("Cuisine type removed from owner selection.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete cuisine type.");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(cuisine: AppCuisine) {
    setDraft({
      ...cuisine,
      image: cuisine.image ?? "",
      icon: cuisine.icon ?? "",
      color: cuisine.color ?? "#0f8a5f",
      description: cuisine.description ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Cuisine Types"
        description="Admin-managed cuisine master used by owner settings, restaurant filters, and menu metadata."
        action={
          <Button type="button" variant="outline" onClick={() => void seedDefaults()} disabled={saving}>
            <Sparkles className="size-4" />
            Seed defaults
          </Button>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-black">{draft.id ? "Edit cuisine type" : "Create cuisine type"}</h2>
            <Field label="Cuisine name" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name, slug: current.id ? current.slug : slugifyCuisine(name) }))} />
            <Field label="Slug" value={draft.slug} onChange={(slug) => setDraft((current) => ({ ...current, slug: slugifyCuisine(slug) }))} />
            <Field label="Icon name" value={draft.icon ?? ""} onChange={(icon) => setDraft((current) => ({ ...current, icon }))} />
            <Field label="Image URL" value={draft.image ?? ""} onChange={(image) => setDraft((current) => ({ ...current, image }))} />
            <CloudinaryUploadWidget folder="cuisines" aspectRatio={4 / 3} tags={["app-cuisine"]} label="Upload cuisine image" onUpload={(image) => setDraft((current) => ({ ...current, image }))} />
            <label className="grid gap-2">
              <Label>Color</Label>
              <input
                type="color"
                value={draft.color ?? "#0f8a5f"}
                onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
                className="h-11 w-full rounded-xl border bg-white p-1"
              />
            </label>
            <Field label="Sort order" type="number" value={String(draft.sortOrder)} onChange={(sortOrder) => setDraft((current) => ({ ...current, sortOrder: Number(sortOrder) || 1 }))} />
            <label className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={draft.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border p-3 text-sm font-bold">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
              Active for owner selection
            </label>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
              <SafeImage src={draft.image || IMAGE_FALLBACKS.food} alt={draft.name || "Cuisine preview"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="360px" className="object-cover" />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => void saveCuisine(draft)} disabled={saving}>
                <Save className="size-4" />
                Save cuisine
              </Button>
              {draft.id ? <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Cancel</Button> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Master list</h2>
              <Badge variant="secondary">{sortedCuisines.length} cuisine types</Badge>
            </div>
            {loading ? <p className="text-sm font-semibold text-muted-foreground">Loading cuisine types...</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              {sortedCuisines.map((cuisine) => (
                <article key={cuisine.id} className="grid grid-cols-[72px_1fr_auto] items-start gap-3 rounded-2xl border p-3">
                  <div className="relative size-[72px] overflow-hidden rounded-xl border bg-muted">
                    <SafeImage src={cuisine.image || IMAGE_FALLBACKS.food} alt={cuisine.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="72px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black">{cuisine.name}</p>
                      <Badge variant={cuisine.active ? "success" : "muted"}>{cuisine.active ? "Active" : "Hidden"}</Badge>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{cuisine.slug} · {cuisine.icon || "no icon"} · order {cuisine.sortOrder}</p>
                    {cuisine.color ? <span className="mt-2 inline-flex h-2 w-16 rounded-full" style={{ backgroundColor: cuisine.color }} /> : null}
                    {cuisine.description ? <p className="mt-2 text-sm font-semibold text-muted-foreground">{cuisine.description}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="outline" aria-label={`Edit ${cuisine.name}`} onClick={() => beginEdit(cuisine)}>
                      {cuisine.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${cuisine.name}`} onClick={() => void deleteCuisine(cuisine.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {!loading && !sortedCuisines.length ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-semibold text-muted-foreground">
                No cuisine types yet. Seed defaults or create the first cuisine type.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
