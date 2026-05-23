"use client";

import Link from "next/link";
import { AlertTriangle, PackageCheck, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";
import type { InventoryItem } from "@/lib/types";

const emptyDraft = {
  name: "",
  sku: "",
  category: "",
  price: "",
  currentStock: "",
  unit: "piece",
  lowStockAlert: "",
  gstApplicable: false,
  gstRate: "",
  hsnCode: "",
};

export default function OwnerInventoryPage() {
  const items = useAppStore((state) => state.inventoryItems);
  const branches = useAppStore((state) => state.branches);
  const updateInventoryItem = useAppStore((state) => state.updateInventoryItem);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const lowStock = items.filter((item) => item.currentStock <= (item.lowStockAlert ?? item.reorderLevel));
  const outOfStock = items.filter((item) => item.currentStock <= 0);
  const stockValue = items.reduce((sum, item) => sum + (item.price ?? 0) * item.currentStock, 0);
  const inventoryColumns: Array<AdvancedColumn<InventoryItem>> = [
    { key: "name", label: "Product", sortable: true, searchable: true },
    { key: "sku", label: "SKU", searchable: true, render: (item) => item.sku ?? "-" },
    { key: "category", label: "Category", sortable: true, searchable: true },
    { key: "price", label: "Price", sortable: true, align: "right", render: (item) => `₹${item.price ?? 0}` },
    { key: "currentStock", label: "Stock", sortable: true, align: "right", render: (item) => `${item.currentStock} ${item.unit}` },
    {
      key: "gstApplicable",
      label: "GST",
      render: (item) => item.gstApplicable ? `${item.gstRate ?? 0}% · ${item.hsnCode ?? "HSN pending"}` : "Not applicable",
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (item) => (
        <Button type="button" variant="outline" size="sm" onClick={() => editItem(item)}>
          Edit
        </Button>
      ),
    },
  ];

  function editItem(item: InventoryItem) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      sku: item.sku ?? "",
      category: item.category,
      price: String(item.price ?? ""),
      currentStock: String(item.currentStock),
      unit: item.unit,
      lowStockAlert: String(item.lowStockAlert ?? item.reorderLevel),
      gstApplicable: item.gstApplicable ?? false,
      gstRate: String(item.gstRate ?? ""),
      hsnCode: item.hsnCode ?? "",
    });
  }

  async function saveProduct() {
    setError("");
    if (!draft.name.trim()) return setError("Product name is required.");
    if (!draft.category.trim()) return setError("Category is required.");
    if (Number(draft.price) < 0 || draft.price === "") return setError("Price is required.");
    if (Number(draft.currentStock) < 0 || draft.currentStock === "") return setError("Stock quantity is required.");
    if (Number(draft.lowStockAlert) < 0 || draft.lowStockAlert === "") return setError("Low stock alert is required.");
    if (draft.gstApplicable && (!draft.gstRate || !draft.hsnCode.trim())) return setError("GST rate and HSN code are required when GST is applicable.");
    const branchId = branches[0]?.id;
    if (!branchId) return setError("Complete onboarding before adding inventory.");
    const item: InventoryItem = {
      id: editingId ?? `inv-${Date.now()}`,
      name: draft.name.trim(),
      sku: draft.sku.trim() || undefined,
      category: draft.category.trim(),
      branchId,
      price: Number(draft.price),
      currentStock: Number(draft.currentStock),
      unit: draft.unit.trim() || "piece",
      reorderLevel: Number(draft.lowStockAlert),
      lowStockAlert: Number(draft.lowStockAlert),
      gstApplicable: draft.gstApplicable,
      gstRate: draft.gstApplicable ? Number(draft.gstRate) : undefined,
      hsnCode: draft.gstApplicable ? draft.hsnCode.trim() : undefined,
      sellable: true,
    };
    await updateInventoryItem(item);
    setDraft(emptyDraft);
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inventory and purchasing"
        description="Manage sellable food products, stock alerts, GST, HSN, and stock deduction from POS sales."
        action={
          <Button asChild>
            <Link href="/owner/pos">
              <ShoppingCart className="size-4" />
              Sell Product
            </Link>
          </Button>
        }
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Products" value={String(items.length)} />
        <Metric title="Low stock" value={String(lowStock.length)} tone="warning" />
        <Metric title="Out of stock" value={String(outOfStock.length)} tone="danger" />
        <Metric title="Stock value" value={`₹${stockValue.toLocaleString("en-IN")}`} />
      </section>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <PackageCheck className="size-5 text-primary" />
            {editingId ? "Edit product" : "Add food product"}
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
            <Field label="SKU optional" value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} />
            <Field label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
            <Field label="Unit" value={draft.unit} onChange={(value) => setDraft({ ...draft, unit: value })} />
            <Field label="Price" value={draft.price} inputMode="decimal" onChange={(value) => setDraft({ ...draft, price: value })} />
            <Field label="Stock quantity" value={draft.currentStock} inputMode="decimal" onChange={(value) => setDraft({ ...draft, currentStock: value })} />
            <Field label="Low stock alert" value={draft.lowStockAlert} inputMode="decimal" onChange={(value) => setDraft({ ...draft, lowStockAlert: value })} />
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
              <input type="checkbox" checked={draft.gstApplicable} onChange={(event) => setDraft({ ...draft, gstApplicable: event.target.checked })} />
              GST applicable
            </label>
            {draft.gstApplicable ? (
              <>
                <Field label="GST rate %" value={draft.gstRate} inputMode="decimal" onChange={(value) => setDraft({ ...draft, gstRate: value })} />
                <Field label="HSN code" value={draft.hsnCode} onChange={(value) => setDraft({ ...draft, hsnCode: value })} />
              </>
            ) : null}
          </div>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          {apiMessage ? <p className="text-sm font-semibold text-muted-foreground">{apiMessage}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveProduct()}>
              <Plus className="size-4" />
              {editingId ? "Update product" : "Add product"}
            </Button>
            {editingId ? <Button type="button" variant="outline" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancel</Button> : null}
          </div>
        </CardContent>
      </Card>

      <AdvancedDataTable title="Inventory ledger" columns={inventoryColumns} rows={items} exportFilename="inventory-ledger.csv" />

      <section className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const low = item.currentStock <= (item.lowStockAlert ?? item.reorderLevel);
          return (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">{item.category} · {branches.find((branch) => branch.id === item.branchId)?.name}</p>
                  </div>
                  <Badge variant={item.currentStock <= 0 ? "destructive" : low ? "warning" : "success"}>{item.currentStock <= 0 ? "out" : low ? "low" : "ok"}</Badge>
                </div>
                <p className="text-2xl font-black">{item.currentStock} {item.unit}</p>
                <p className="text-sm text-muted-foreground">₹{item.price ?? 0} · Alert at {item.lowStockAlert ?? item.reorderLevel} {item.unit}</p>
                {item.gstApplicable ? <Badge variant="muted">GST {item.gstRate}% · HSN {item.hsnCode}</Badge> : <Badge variant="muted">GST not applicable</Badge>}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <EmptyState icon={AlertTriangle} title="Inventory controls active" description="Products added here are available in POS under Sell Product and stock decreases when a bill is paid." />
    </div>
  );
}

function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "decimal" | "numeric" }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone?: "warning" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-bold text-muted-foreground">{title}</p>
        <p className={tone === "danger" ? "mt-2 text-3xl font-black text-destructive" : tone === "warning" ? "mt-2 text-3xl font-black text-warning" : "mt-2 text-3xl font-black"}>{value}</p>
      </CardContent>
    </Card>
  );
}
