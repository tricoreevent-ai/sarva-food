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
import { defaultAppCategories, slugifyCategory } from "@/lib/default-app-categories";
import type { AppCategory } from "@/lib/types";

type ApiResponse = {
  categories?: AppCategory[];
  error?: string;
};

const emptyDraft: AppCategory = {
  id: "",
  name: "",
  slug: "",
  image: "",
  icon: "",
  sortOrder: 1,
  active: true,
  colorTheme: "#f97316",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [draft, setDraft] = useState<AppCategory>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sortedCategories = useMemo(
    () => [...categories].sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name)),
    [categories],
  );

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not load categories.");
      setCategories(payload.categories ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory(category: AppCategory) {
    if (!category.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      const slug = slugifyCategory(category.slug || category.name);
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: {
            ...category,
            id: category.id || slug,
            slug,
            sortOrder: Number(category.sortOrder) || sortedCategories.length + 1,
          },
        }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not save category.");
      await loadCategories();
      setDraft(emptyDraft);
      toast.success("Food category saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category.");
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    try {
      const existing = new Set(categories.map((item) => item.slug));
      const missing = defaultAppCategories.filter((item) => !existing.has(item.slug));
      if (!missing.length) {
        toast.success("Default categories are already present.");
        return;
      }
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: missing }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not seed categories.");
      await loadCategories();
      toast.success(`${missing.length} default categories added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not seed categories.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not delete category.");
      setCategories((current) => current.filter((item) => item.id !== id));
      toast.success("Category removed from customer surfaces.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category.");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(category: AppCategory) {
    setDraft({
      ...category,
      image: category.image ?? "",
      icon: category.icon ?? "",
      colorTheme: category.colorTheme ?? "#f97316",
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Food Categories"
        description="Admin-managed master categories for customer homepage circles and owner menu category selection."
        action={
          <Button type="button" variant="outline" onClick={() => void seedDefaults()} disabled={saving}>
            <Sparkles className="size-4" />
            Seed Indian defaults
          </Button>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-black">{draft.id ? "Edit category" : "Create category"}</h2>
            <Field label="Category name" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name, slug: current.id ? current.slug : slugifyCategory(name) }))} />
            <Field label="Slug" value={draft.slug} onChange={(slug) => setDraft((current) => ({ ...current, slug: slugifyCategory(slug) }))} />
            <Field label="Icon name" value={draft.icon ?? ""} onChange={(icon) => setDraft((current) => ({ ...current, icon }))} />
            <Field label="Image URL" value={draft.image ?? ""} onChange={(image) => setDraft((current) => ({ ...current, image }))} />
            <CloudinaryUploadWidget folder="categories" aspectRatio={1} tags={["app-category"]} label="Upload category image" onUpload={(image) => setDraft((current) => ({ ...current, image }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sort order" type="number" value={String(draft.sortOrder)} onChange={(sortOrder) => setDraft((current) => ({ ...current, sortOrder: Number(sortOrder) || 1 }))} />
              <label className="grid gap-2">
                <Label>Color theme</Label>
                <input
                  type="color"
                  value={draft.colorTheme ?? "#f97316"}
                  onChange={(event) => setDraft((current) => ({ ...current, colorTheme: event.target.value }))}
                  className="h-11 w-full rounded-xl border bg-white p-1"
                />
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border p-3 text-sm font-bold">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
              Active on customer surfaces
            </label>
            <div className="relative aspect-square overflow-hidden rounded-full border bg-muted">
              <SafeImage src={draft.image || IMAGE_FALLBACKS.food} alt={draft.name || "Category preview"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="280px" className="object-cover" />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => void saveCategory(draft)} disabled={saving}>
                <Save className="size-4" />
                Save category
              </Button>
              {draft.id ? <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Cancel</Button> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Master list</h2>
              <Badge variant="secondary">{sortedCategories.length} categories</Badge>
            </div>
            {loading ? <p className="text-sm font-semibold text-muted-foreground">Loading categories...</p> : null}
            <div className="grid gap-3 md:grid-cols-2">
              {sortedCategories.map((category) => (
                <article key={category.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-2xl border p-3">
                  <div className="relative size-16 overflow-hidden rounded-full border bg-muted">
                    <SafeImage src={category.image || IMAGE_FALLBACKS.food} alt={category.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black">{category.name}</p>
                      <Badge variant={category.active ? "success" : "muted"}>{category.active ? "Active" : "Hidden"}</Badge>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{category.slug} · order {category.sortOrder}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="icon" variant="outline" aria-label={`Edit ${category.name}`} onClick={() => beginEdit(category)}>
                      {category.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${category.name}`} onClick={() => void deleteCategory(category.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {!loading && !sortedCategories.length ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-semibold text-muted-foreground">
                No food categories yet. Seed defaults or create the first category.
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
