"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/client-toast";
import { Archive, Copy, Download, Eye, FileJson, FileSpreadsheet, PackageOpen, RotateCcw, Search, ShieldCheck, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeMasterTemplate, parseTemplatePayload } from "@/lib/master-menu-template-normalizer";
import { formatCurrency } from "@/lib/utils";

type Template = Record<string, unknown> & {
  id: string;
  displayName?: string;
  categoryId?: string;
  cuisineIds?: string[];
  foodType?: string;
  tags?: string[];
  badges?: string[];
  primaryImage?: string;
  thumbnail?: string;
  description?: string;
  recommendedPrice?: number;
  prepTime?: number | string;
  version?: number;
  usageCount?: number;
  favoriteCount?: number;
  active?: boolean;
  archived?: boolean;
  versionHistory?: Array<Record<string, unknown>>;
  auditLog?: Array<Record<string, unknown>>;
};

type ApiResult = {
  data?: Template[];
  count?: number;
  limit?: number;
  offset?: number;
  summary?: { imported: number; updated?: number; merged: number; skipped: number; duplicates: number; failed: number; errors: string[] };
  error?: string;
};

type PreviewRow = Template & { importStatus: "New" | "Duplicate" | "Merged" | "Skipped" };

const pageSize = 20;

export default function AdminMenuLibraryPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Template | null>(null);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [cuisineId, setCuisineId] = useState("");
  const [foodType, setFoodType] = useState("");
  const [tag, setTag] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxPrepTime, setMaxPrepTime] = useState("");
  const [sort, setSort] = useState("");
  const [exportScope, setExportScope] = useState<"filtered" | "selected" | "all">("filtered");
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "csv" | "xlsx">("json");
  const [importMode, setImportMode] = useState<"merge" | "overwrite" | "create-only">("merge");
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOffset(0);
      setSearch(q);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const duplicateKeys = useMemo(() => rows.reduce((map, row) => {
    const key = duplicateKey(row);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>()), [rows]);

  const stats = useMemo(() => ({
    total: count,
    categories: new Set(rows.map((row) => row.categoryId).filter(Boolean)).size,
    cuisines: new Set(rows.flatMap((row) => row.cuisineIds ?? [])).size,
    recent: rows.filter((row) => isRecent(row.createdAt) || isRecent(row.updatedAt)).length,
    duplicates: Array.from(duplicateKeys.values()).filter((value) => value > 1).length,
  }), [count, duplicateKeys, rows]);

  const importPreview = useMemo<PreviewRow[]>(() => {
    if (!importText.trim()) return [];
    try {
      const batchKeys = new Map<string, number>();
      return parseTemplatePayload(importText, importFormat === "xlsx" ? "json" : importFormat).map((input, index) => {
        const row = normalizeMasterTemplate(input, index) as PreviewRow;
        const key = duplicateKey(row);
        batchKeys.set(key, (batchKeys.get(key) ?? 0) + 1);
        const exists = duplicateKeys.has(key);
        row.importStatus = batchKeys.get(key)! > 1 ? "Skipped" : exists ? (importMode === "create-only" ? "Duplicate" : "Merged") : "New";
        return row;
      });
    } catch {
      return [];
    }
  }, [duplicateKeys, importFormat, importMode, importText]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        status,
        categoryId,
        subcategoryId,
        cuisineId,
        foodType,
        tag,
        minRating,
        maxPrice,
        maxPrepTime,
        sort,
        limit: String(pageSize),
        offset: String(offset),
        includeArchived: "1",
      });
      const response = await fetch(`/api/admin/master-menu-templates?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResult;
      if (!response.ok) throw new Error(payload.error || "Could not load templates.");
      setRows(payload.data ?? []);
      setCount(payload.count ?? 0);
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, cuisineId, foodType, maxPrepTime, maxPrice, minRating, offset, search, sort, status, subcategoryId, tag]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function runAction(action: string, id?: string) {
    const ids = id ? [id] : selected;
    if (!ids.length) return toast.error("Select templates first.");
    const response = await fetch("/api/admin/master-menu-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id, action } : { ids, action }),
    });
    const payload = (await response.json()) as ApiResult;
    if (!response.ok) return toast.error(payload.error || "Template action failed.");
    toast.success("Template library updated.");
    await load();
  }

  async function seedKerala() {
    const response = await fetch("/api/admin/master-menu-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed-kerala" }),
    });
    const payload = (await response.json()) as ApiResult;
    if (!response.ok) return toast.error(payload.error || "Seed import failed.");
      toast.success(formatImportSummary(payload.summary));
    await load();
  }

  async function importTemplates() {
    setImporting(true);
    try {
      const response = await fetch("/api/admin/master-menu-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", payload: importText, format: importFormat === "xlsx" ? "json" : importFormat, mode: importMode }),
      });
      const payload = (await response.json()) as ApiResult;
      if (!response.ok) return toast.error(payload.error || "Import failed.");
      const summary = payload.summary;
      toast.success(formatImportSummary(summary));
      if (summary?.errors?.length) toast.error(summary.errors.slice(0, 3).join(" "));
      await load();
    } catch (error) {
      console.error("[admin-menu-library] import failed", { reason: error instanceof Error ? error.name : typeof error });
      toast.error("Import failed. Check the file and try again.");
    } finally {
      setImporting(false);
    }
  }

  async function loadXlsx() {
    return import("xlsx");
  }

  async function handleImportFile(file?: File) {
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await loadXlsx();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        setImportFormat("xlsx");
        setImportText(JSON.stringify({ templates: rows }, null, 2));
        toast.success(`Loaded ${rows.length} spreadsheet row${rows.length === 1 ? "" : "s"} for preview.`);
        return;
      }
      const text = await file.text();
      setImportFormat(name.endsWith(".csv") ? "csv" : "json");
      setImportText(text);
      toast.success("Import file loaded for preview.");
    } catch (error) {
      console.error("[admin-menu-library] import file read failed", { reason: error instanceof Error ? error.name : typeof error });
      toast.error("Import file could not be read.");
    }
  }

  function download(format: "json" | "csv" | "xlsx", sample = false) {
    const params = sample
      ? new URLSearchParams({ sample: "1", format })
      : new URLSearchParams({
        format,
        ...(exportScope !== "all" ? { q: search, status, categoryId, subcategoryId, cuisineId, foodType, tag, minRating, maxPrice, maxPrepTime, sort } : {}),
        ...(exportScope === "selected" ? { ids: selected.join(",") } : {}),
        includeArchived: "1",
      });
    window.location.href = `/api/admin/master-menu-templates?${params}`;
  }

  function startImport(format: "json" | "csv" | "xlsx") {
    setImportFormat(format);
    importInputRef.current?.click();
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Master Data"
        title="Menu Library"
        description="Reusable enterprise menu templates for faster restaurant onboarding and consistent item setup."
        action={(
          <>
            <select value={exportScope} onChange={(event) => setExportScope(event.target.value as "filtered" | "selected" | "all")} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              <option value="filtered">Filtered</option>
              <option value="selected">Selected</option>
              <option value="all">Entire Library</option>
            </select>
            <Button type="button" variant="outline" onClick={() => download("json")}><FileJson className="size-4" />Export JSON</Button>
            <Button type="button" variant="outline" onClick={() => download("csv")}><FileSpreadsheet className="size-4" />Export CSV</Button>
            <Button type="button" variant="outline" onClick={() => download("xlsx")}><Download className="size-4" />Export Excel</Button>
            <Button type="button" onClick={seedKerala}><ShieldCheck className="size-4" />Seed Kerala</Button>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="Total Items" value={stats.total} />
        <Stat label="Categories" value={stats.categories} />
        <Stat label="Cuisines" value={stats.cuisines} />
        <Stat label="Recently Imported" value={stats.recent} />
        <Stat label="Duplicates" value={stats.duplicates} />
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_repeat(5,150px)]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(event) => setQ(event.target.value)} className="pl-9" placeholder="Search name, keywords, category, cuisine, tags, ingredients, description" />
            </label>
            <Input value={categoryId} onChange={(event) => setCategoryId(event.target.value)} placeholder="Category" />
            <Input value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} placeholder="Subcategory" />
            <Input value={cuisineId} onChange={(event) => setCuisineId(event.target.value)} placeholder="Cuisine" />
            <Input value={foodType} onChange={(event) => setFoodType(event.target.value)} placeholder="Food type" />
            <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Tag" />
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="archived">Archived</option>
            </select>
            <Input value={minRating} onChange={(event) => setMinRating(event.target.value)} inputMode="decimal" placeholder="Min rating" />
            <Input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} inputMode="numeric" placeholder="Max price" />
            <Input value={maxPrepTime} onChange={(event) => setMaxPrepTime(event.target.value)} inputMode="numeric" placeholder="Max prep min" />
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              <option value="">Default</option>
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Rating</option>
              <option value="price">Price</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void runAction("enable")}><ToggleRight className="size-4" />Enable</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void runAction("disable")}><ToggleLeft className="size-4" />Disable</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void runAction("archive")}><Archive className="size-4" />Archive</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void runAction("restore")}><RotateCcw className="size-4" />Restore</Button>
          </div>

          <div className="overflow-hidden rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3"><input type="checkbox" aria-label="Select all templates" checked={rows.length > 0 && selected.length === rows.length} onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])} /></th>
                  <th className="p-3">Template</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Cuisine</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Stats</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-6 text-center font-semibold text-muted-foreground">Loading templates...</td></tr>
                ) : rows.length ? rows.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="p-3"><input type="checkbox" aria-label={`Select ${row.displayName}`} checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} /></td>
                    <td className="p-3">
                      <div className="flex gap-3">
                        <div className="relative size-14 overflow-hidden rounded-md bg-muted">
                          <SafeImage src={row.primaryImage || row.thumbnail || IMAGE_FALLBACKS.food} alt={row.displayName || "Menu template"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="56px" className="object-cover" />
                        </div>
                        <div>
                          <p className="font-black">{row.displayName}</p>
                          <p className="text-xs text-muted-foreground">v{row.version ?? 1} · {formatCurrency(Number(row.recommendedPrice ?? 0))}</p>
                          <div className="mt-1 flex flex-wrap gap-1">{(row.badges ?? []).slice(0, 3).map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{row.categoryId}</td>
                    <td className="p-3">{row.cuisineIds?.join(", ")}</td>
                    <td className="p-3"><Badge variant={row.archived ? "outline" : row.active === false ? "secondary" : "default"}>{row.archived ? "Archived" : row.active === false ? "Disabled" : "Active"}</Badge></td>
                    <td className="p-3 text-xs font-semibold text-muted-foreground">Used {row.usageCount ?? 0}<br />Fav {row.favoriteCount ?? 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" size="icon" variant="ghost" aria-label="Preview" onClick={() => setPreview(row)}><Eye className="size-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" aria-label="Duplicate" onClick={() => void runAction("duplicate", row.id)}><Copy className="size-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={row.archived ? "Restore" : "Archive"} onClick={() => void runAction(row.archived ? "restore" : "archive", row.id)}>{row.archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}</Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={row.active === false ? "Enable" : "Disable"} onClick={() => void runAction(row.active === false ? "enable" : "disable", row.id)}>{row.active === false ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}</Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <div className="mx-auto grid max-w-2xl justify-items-center gap-4 text-center">
                        <div className="grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
                          <PackageOpen className="size-10" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black">Master Library is empty</h3>
                          <p className="mt-1 text-sm font-semibold text-muted-foreground">Import templates or download a sample file to start.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button type="button" variant="outline" onClick={() => startImport("json")}>Import JSON</Button>
                          <Button type="button" variant="outline" onClick={() => startImport("csv")}>Import CSV</Button>
                          <Button type="button" variant="outline" onClick={() => startImport("xlsx")}>Import Excel</Button>
                          <Button type="button" variant="ghost" onClick={() => download("json", true)}>Download Sample JSON</Button>
                          <Button type="button" variant="ghost" onClick={() => download("csv", true)}>Download Sample CSV</Button>
                          <Button type="button" variant="ghost" onClick={() => download("xlsx", true)}>Download Sample Excel</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">Showing {offset + 1}-{Math.min(offset + pageSize, count)} of {count}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</Button>
              <Button type="button" variant="outline" disabled={offset + pageSize >= count} onClick={() => setOffset(offset + pageSize)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <div className="grid gap-2">
            <Label>Import Format</Label>
            <select value={importFormat} onChange={(event) => setImportFormat(event.target.value as "json" | "csv" | "xlsx")} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              <option value="json">JSON Upload</option>
              <option value="csv">CSV Upload</option>
              <option value="xlsx">Excel Upload</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Import Payload</Label>
            <Input ref={importInputRef} type="file" accept=".json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => void handleImportFile(event.target.files?.[0])} />
            <Textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste JSON or CSV template data" className="min-h-28 font-mono text-xs" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={importMode} onChange={(event) => setImportMode(event.target.value as "merge" | "overwrite" | "create-only")} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              <option value="merge">Merge</option>
              <option value="overwrite">Overwrite</option>
              <option value="create-only">Create only</option>
            </select>
            <Button type="button" disabled={!importText.trim() || importing} onClick={importTemplates}><Upload className="size-4" />{importing ? "Importing..." : "Import"}</Button>
            <Button type="button" variant="outline" onClick={() => download("json", true)}>Sample JSON</Button>
            <Button type="button" variant="outline" onClick={() => download("csv", true)}>Sample CSV</Button>
            <Button type="button" variant="outline" onClick={() => download("xlsx", true)}>Sample Excel</Button>
          </div>
        </CardContent>
      </Card>

      {importPreview.length ? (
        <Card>
          <CardContent className="grid gap-3 p-4">
            <div>
              <p className="text-xs font-black uppercase text-primary">Import Preview</p>
              <h3 className="text-lg font-black">{importPreview.length} item{importPreview.length === 1 ? "" : "s"} ready</h3>
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Image</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Cuisine</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 25).map((row) => (
                    <tr key={`${row.id}-${row.importStatus}`} className="border-t">
                      <td className="p-3">
                        <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                          <SafeImage src={row.primaryImage || row.thumbnail || IMAGE_FALLBACKS.food} alt={row.displayName || "Import item"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="48px" className="object-cover" />
                        </div>
                      </td>
                      <td className="p-3 font-black">{row.displayName}</td>
                      <td className="p-3">{row.categoryId}</td>
                      <td className="p-3">{row.cuisineIds?.join(", ")}</td>
                      <td className="p-3">{formatCurrency(Number(row.recommendedPrice ?? 0))}</td>
                      <td className="p-3"><Badge variant={row.importStatus === "New" ? "default" : row.importStatus === "Merged" ? "secondary" : "outline"}>{row.importStatus}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {preview ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l bg-background p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">Template Preview</p>
              <h2 className="text-2xl font-black">{preview.displayName}</h2>
              <p className="text-sm text-muted-foreground">{preview.categoryId} · {preview.foodType} · v{preview.version ?? 1}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>Close</Button>
          </div>
          <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <SafeImage src={preview.primaryImage || preview.thumbnail || IMAGE_FALLBACKS.food} alt={preview.displayName || "Template image"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="540px" className="object-cover" />
          </div>
          <p className="mt-4 text-sm leading-6">{preview.description}</p>
          <div className="mt-4 grid gap-2 text-sm">
            <p><b>Cuisines:</b> {preview.cuisineIds?.join(", ")}</p>
            <p><b>Prep:</b> {String(preview.prepTime ?? "-")}</p>
            <p><b>Suggested:</b> {formatCurrency(Number(preview.recommendedPrice ?? 0))}</p>
          </div>
          <h3 className="mt-6 font-black">Version History</h3>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">{(preview.versionHistory ?? []).slice(-6).map((entry, index) => <p key={index}>{String(entry.action ?? "updated")} · v{String(entry.version ?? "")} · {String(entry.at ?? "")}</p>)}</div>
          <h3 className="mt-6 font-black">Audit History</h3>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">{(preview.auditLog ?? []).slice(-8).map((entry, index) => <p key={index}>{String(entry.action ?? "changed")} · {String(entry.by ?? "")} · {String(entry.at ?? "")}</p>)}</div>
        </aside>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function duplicateKey(row: Record<string, unknown>) {
  return [row.displayName, row.categoryId, Array.isArray(row.cuisineIds) ? row.cuisineIds.join("|") : "", row.foodType].map((value) => String(value ?? "").trim().toLowerCase()).join("::");
}

function isRecent(value: unknown) {
  const time = value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate().getTime()
    : Date.parse(String(value ?? ""));
  return Number.isFinite(time) && Date.now() - time < 7 * 24 * 60 * 60 * 1000;
}

function formatImportSummary(summary?: ApiResult["summary"]) {
  return `Imported ${summary?.imported ?? 0}, skipped ${summary?.skipped ?? 0}, merged ${summary?.merged ?? summary?.updated ?? 0}, duplicates ${summary?.duplicates ?? 0}, failed ${summary?.failed ?? summary?.errors?.length ?? 0}.`;
}
