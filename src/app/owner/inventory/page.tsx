"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Edit3,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOwnerInventory } from "@/hooks/use-owner-repository-data";
import {
  generateInventorySku,
  getInventoryStatus,
  getInventoryTypeLabel,
  inventoryItemSchema,
  INVENTORY_TYPE_OPTIONS,
  INVENTORY_UNITS,
  predictStockDepletionDays,
  recipeSchema,
} from "@/lib/inventory-engine";
import type { InventoryItem, InventoryType, PurchaseOrder, RecipeIngredient, Supplier } from "@/lib/types";

type WorkspaceTab = "inventory" | "recipes" | "purchases" | "suppliers";
type InventoryFilter = InventoryType | "all";

type InventoryDraft = {
  inventoryType: InventoryType;
  name: string;
  sku: string;
  barcode: string;
  parentCategory: string;
  category: string;
  subcategory: string;
  unit: string;
  purchaseUnit: string;
  unitConversionFactor: string;
  currentStock: string;
  reorderLevel: string;
  lowStockAlert: string;
  costPerUnit: string;
  price: string;
  supplier: string;
  expiryDate: string;
  averageDailyUsage: string;
  wastageQuantity: string;
  equipmentSerial: string;
  maintenanceDueAt: string;
  centralKitchenBatchId: string;
  gstApplicable: boolean;
  gstRate: string;
  hsnCode: string;
  sellable: boolean;
  notes: string;
};

const emptyInventoryDraft: InventoryDraft = {
  inventoryType: "raw-ingredients",
  name: "",
  sku: "",
  barcode: "",
  parentCategory: "Kitchen",
  category: "",
  subcategory: "",
  unit: "g",
  purchaseUnit: "kg",
  unitConversionFactor: "1000",
  currentStock: "",
  reorderLevel: "",
  lowStockAlert: "",
  costPerUnit: "",
  price: "",
  supplier: "",
  expiryDate: "",
  averageDailyUsage: "",
  wastageQuantity: "",
  equipmentSerial: "",
  maintenanceDueAt: "",
  centralKitchenBatchId: "",
  gstApplicable: false,
  gstRate: "",
  hsnCode: "",
  sellable: false,
  notes: "",
};

const emptySupplier = {
  name: "",
  phone: "",
  category: "Food supplier",
  paymentTerms: "7 days",
  email: "",
  address: "",
  gstNumber: "",
  contactPerson: "",
};

const emptyPurchase = {
  supplierId: "",
  inventoryItemId: "",
  itemName: "",
  quantity: "",
  unit: "kg",
  costPerUnit: "",
  invoiceNumber: "",
  expectedAt: "",
  notes: "",
};

const emptyRecipe = {
  menuItemId: "",
  portionSize: "1",
  outputUnit: "portion",
  sizeLabel: "",
  ingredientId: "",
  ingredientQuantity: "",
  ingredientUnit: "g",
  wastagePercent: "0",
  ingredients: [] as RecipeIngredient[],
};

export default function OwnerInventoryPage() {
  const {
    items,
    branches,
    menuItems,
    recipes,
    suppliers,
    purchaseOrders,
    movements,
    auditLogs,
    status,
    error: apiMessage,
    retry,
    saveItem: updateInventoryItem,
    deleteItem: deleteInventoryItem,
    adjust: adjustInventoryStock,
    saveRecipe: upsertRecipe,
    deleteRecipe,
    saveSupplier: upsertSupplier,
    savePurchase: upsertPurchaseOrder,
    receivePurchase: receivePurchaseOrder,
  } = useOwnerInventory();
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("inventory");
  const [activeType, setActiveType] = useState<InventoryFilter>("all");
  const [draft, setDraft] = useState<InventoryDraft>(emptyInventoryDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recipeDraft, setRecipeDraft] = useState(emptyRecipe);
  const [supplierDraft, setSupplierDraft] = useState(emptySupplier);
  const [purchaseDraft, setPurchaseDraft] = useState(emptyPurchase);
  const [error, setError] = useState("");
  const [nowMs] = useState(() => Date.now());

  const filteredItems = useMemo(
    () => activeType === "all" ? items : items.filter((item) => (item.inventoryType ?? "sellable-products") === activeType),
    [activeType, items],
  );
  const rawIngredients = useMemo(
    () => items.filter((item) => (item.inventoryType ?? "sellable-products") === "raw-ingredients"),
    [items],
  );
  const lowStock = useMemo(() => items.filter((item) => item.currentStock <= (item.lowStockAlert ?? item.reorderLevel)), [items]);
  const outOfStock = useMemo(() => items.filter((item) => item.currentStock <= 0), [items]);
  const expiringSoon = useMemo(
    () => items.filter((item) => {
      if (!item.expiryDate) return false;
      const days = Math.ceil((Date.parse(item.expiryDate) - nowMs) / 86400000);
      return days >= 0 && days <= 3;
    }),
    [items, nowMs],
  );
  const stockValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.costPerUnit ?? item.price ?? 0) * item.currentStock, 0),
    [items],
  );
  const likelyTomorrow = useMemo(
    () => items.filter((item) => {
      const days = predictStockDepletionDays(item);
      return days !== null && days <= 1;
    }),
    [items],
  );
  const mostWasted = useMemo(
    () => [...items].sort((a, b) => (b.wastageQuantity ?? 0) - (a.wastageQuantity ?? 0))[0],
    [items],
  );
  const fastMoving = useMemo(
    () => [...items].filter((item) => (item.averageDailyUsage ?? 0) > 0).sort((a, b) => (b.averageDailyUsage ?? 0) - (a.averageDailyUsage ?? 0)).slice(0, 4),
    [items],
  );
  const unusedInventory = useMemo(
    () => items.filter((item) => item.currentStock > 0 && !item.averageDailyUsage && !item.lastMovementAt).slice(0, 4),
    [items],
  );

  const inventoryColumns: Array<AdvancedColumn<InventoryItem>> = [
    { key: "name", label: "Item", sortable: true, searchable: true },
    { key: "inventoryType", label: "Type", searchable: true, render: (item) => getInventoryTypeLabel(item.inventoryType) },
    { key: "sku", label: "SKU", searchable: true, render: (item) => item.sku ?? "-" },
    { key: "category", label: "Category", sortable: true, searchable: true },
    { key: "currentStock", label: "Stock", sortable: true, align: "right", render: (item) => `${item.currentStock} ${item.unit}` },
    {
      key: "reorderLevel",
      label: "Status",
      render: (item) => {
        const status = getInventoryStatus(item);
        return <Badge variant={status.tone}>{status.label}</Badge>;
      },
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="icon-sm" title="Add stock" onClick={() => void adjustInventoryStock(item.id, 1, "Quick stock count correction")}>
            <Plus className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" title="Edit" onClick={() => editItem(item)}>
            <Edit3 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  function editItem(item: InventoryItem) {
    setWorkspaceTab("inventory");
    setEditingId(item.id);
    setDraft({
      inventoryType: item.inventoryType ?? "sellable-products",
      name: item.name,
      sku: item.sku ?? "",
      barcode: item.barcode ?? "",
      parentCategory: item.parentCategory ?? "Kitchen",
      category: item.category,
      subcategory: item.subcategory ?? "",
      unit: item.unit,
      purchaseUnit: item.purchaseUnit ?? item.unit,
      unitConversionFactor: String(item.unitConversionFactor ?? ""),
      currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel),
      lowStockAlert: String(item.lowStockAlert ?? item.reorderLevel),
      costPerUnit: String(item.costPerUnit ?? ""),
      price: String(item.price ?? ""),
      supplier: item.supplier ?? "",
      expiryDate: item.expiryDate ?? "",
      averageDailyUsage: String(item.averageDailyUsage ?? ""),
      wastageQuantity: String(item.wastageQuantity ?? ""),
      equipmentSerial: item.equipmentSerial ?? "",
      maintenanceDueAt: item.maintenanceDueAt ?? "",
      centralKitchenBatchId: item.centralKitchenBatchId ?? "",
      gstApplicable: item.gstApplicable ?? false,
      gstRate: String(item.gstRate ?? ""),
      hsnCode: item.hsnCode ?? "",
      sellable: item.sellable ?? item.inventoryType === "sellable-products",
      notes: item.notes ?? "",
    });
  }

  async function saveInventory() {
    setError("");
    const branchId = branches[0]?.id;
    if (!branchId) return setError("Complete onboarding before adding inventory.");
    const sku = draft.sku.trim() || generateInventorySku({
      inventoryType: draft.inventoryType,
      category: draft.category,
      name: draft.name,
      existingSkus: items.map((item) => item.sku ?? "").filter(Boolean),
    });
    const duplicateSku = items.some((item) => item.id !== editingId && item.sku?.trim().toLowerCase() === sku.toLowerCase());
    if (duplicateSku) return setError("Duplicate SKU found. Change the SKU before saving.");
    if (draft.gstApplicable && (!draft.gstRate || !draft.hsnCode.trim())) {
      return setError("GST rate and HSN code are required when GST is applicable.");
    }
    if (draft.inventoryType === "sellable-products" && draft.sellable && draft.price === "") {
      return setError("Sellable products need a POS price.");
    }
    const parsed = inventoryItemSchema.safeParse({
      name: draft.name,
      category: draft.category,
      unit: draft.unit,
      currentStock: numberFrom(draft.currentStock),
      reorderLevel: numberFrom(draft.reorderLevel),
      sku,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Inventory details are incomplete.");
    const now = new Date().toISOString();
    const item: InventoryItem = {
      id: editingId ?? newId("inv"),
      branchId,
      inventoryType: draft.inventoryType,
      name: draft.name.trim(),
      sku,
      barcode: draft.barcode.trim() || undefined,
      parentCategory: draft.parentCategory.trim() || undefined,
      category: draft.category.trim(),
      subcategory: draft.subcategory.trim() || undefined,
      categoryPath: [draft.parentCategory, draft.category, draft.subcategory].map((part) => part.trim()).filter(Boolean),
      unit: draft.unit.trim(),
      purchaseUnit: draft.purchaseUnit.trim() || undefined,
      stockUnit: draft.unit.trim(),
      unitConversionFactor: optionalNumber(draft.unitConversionFactor),
      currentStock: numberFrom(draft.currentStock),
      reorderLevel: numberFrom(draft.reorderLevel),
      lowStockAlert: optionalNumber(draft.lowStockAlert) ?? numberFrom(draft.reorderLevel),
      costPerUnit: optionalNumber(draft.costPerUnit),
      price: optionalNumber(draft.price),
      supplier: draft.supplier || undefined,
      expiryDate: draft.expiryDate || undefined,
      averageDailyUsage: optionalNumber(draft.averageDailyUsage),
      wastageQuantity: optionalNumber(draft.wastageQuantity),
      equipmentSerial: draft.equipmentSerial.trim() || undefined,
      maintenanceDueAt: draft.maintenanceDueAt || undefined,
      centralKitchenBatchId: draft.centralKitchenBatchId.trim() || undefined,
      gstApplicable: draft.gstApplicable,
      gstRate: draft.gstApplicable ? optionalNumber(draft.gstRate) : undefined,
      hsnCode: draft.gstApplicable ? draft.hsnCode.trim() : undefined,
      sellable: draft.inventoryType === "sellable-products" ? draft.sellable : false,
      notes: draft.notes.trim() || undefined,
      createdAt: items.find((entry) => entry.id === editingId)?.createdAt ?? now,
      updatedAt: now,
    };
    await updateInventoryItem(item);
    setDraft(emptyInventoryDraft);
    setEditingId(null);
  }

  function addRecipeIngredient() {
    setError("");
    const ingredient = items.find((item) => item.id === recipeDraft.ingredientId);
    if (!ingredient) return setError("Select an ingredient before adding it to the recipe.");
    const quantity = numberFrom(recipeDraft.ingredientQuantity);
    if (quantity <= 0) return setError("Ingredient quantity is required.");
    setRecipeDraft((current) => ({
      ...current,
      ingredientId: "",
      ingredientQuantity: "",
      ingredients: [
        ...current.ingredients,
        {
          inventoryItemId: ingredient.id,
          inventoryItemName: ingredient.name,
          quantity,
          unit: recipeDraft.ingredientUnit || ingredient.unit,
          wastagePercent: optionalNumber(recipeDraft.wastagePercent),
        },
      ],
    }));
  }

  async function saveRecipe() {
    setError("");
    const menuItem = menuItems.find((item) => item.id === recipeDraft.menuItemId);
    const parsed = recipeSchema.safeParse({
      menuItemId: recipeDraft.menuItemId,
      menuItemName: menuItem?.name ?? "",
      ingredients: recipeDraft.ingredients,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Recipe is incomplete.");
    const now = new Date().toISOString();
    await upsertRecipe({
      id: `recipe-${recipeDraft.menuItemId}-${recipeDraft.sizeLabel || "base"}`,
      menuItemId: recipeDraft.menuItemId,
      menuItemName: menuItem?.name ?? "Menu item",
      portionSize: numberFrom(recipeDraft.portionSize, 1),
      outputUnit: recipeDraft.outputUnit || "portion",
      sizeLabel: recipeDraft.sizeLabel.trim() || undefined,
      ingredients: recipeDraft.ingredients,
      active: true,
      createdAt: recipes.find((recipe) => recipe.menuItemId === recipeDraft.menuItemId)?.createdAt ?? now,
      updatedAt: now,
    });
    setRecipeDraft(emptyRecipe);
  }

  async function saveSupplier() {
    setError("");
    if (!supplierDraft.name.trim()) return setError("Supplier name is required.");
    if (!supplierDraft.phone.trim()) return setError("Supplier phone is required.");
    const supplier: Supplier = {
      id: newId("sup"),
      name: supplierDraft.name.trim(),
      phone: supplierDraft.phone.trim(),
      category: supplierDraft.category.trim() || "Supplier",
      paymentTerms: supplierDraft.paymentTerms.trim() || "Due on receipt",
      email: supplierDraft.email.trim() || undefined,
      address: supplierDraft.address.trim() || undefined,
      gstNumber: supplierDraft.gstNumber.trim() || undefined,
      contactPerson: supplierDraft.contactPerson.trim() || undefined,
      active: true,
      outstandingAmount: 0,
    };
    await upsertSupplier(supplier);
    setSupplierDraft(emptySupplier);
  }

  async function savePurchase() {
    setError("");
    const supplier = suppliers.find((entry) => entry.id === purchaseDraft.supplierId);
    if (!supplier) return setError("Supplier is required.");
    if (numberFrom(purchaseDraft.quantity) <= 0) return setError("Purchase quantity must be greater than zero.");
    if (numberFrom(purchaseDraft.costPerUnit) < 0) return setError("Purchase rate cannot be negative.");
    const inventoryItem = items.find((item) => item.id === purchaseDraft.inventoryItemId);
    const subtotal = numberFrom(purchaseDraft.quantity) * numberFrom(purchaseDraft.costPerUnit);
    const now = new Date().toISOString();
    const order: PurchaseOrder = {
      id: newId("po"),
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: purchaseDraft.invoiceNumber.trim() || undefined,
      expectedAt: purchaseDraft.expectedAt || undefined,
      status: "ordered",
      paymentStatus: "unpaid",
      paidAmount: 0,
      items: [{
        inventoryItemId: inventoryItem?.id,
        itemName: inventoryItem?.name ?? purchaseDraft.itemName.trim(),
        quantity: numberFrom(purchaseDraft.quantity),
        unit: purchaseDraft.unit || inventoryItem?.unit || "piece",
        costPerUnit: numberFrom(purchaseDraft.costPerUnit),
      }],
      subtotal,
      total: subtotal,
      notes: purchaseDraft.notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    if (!order.items[0]?.itemName) return setError("Purchase item is required.");
    await upsertPurchaseOrder(order);
    setPurchaseDraft(emptyPurchase);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inventory ERP"
        description="Track ingredients, recipes, purchases, suppliers, stock deductions, wastage, and operational alerts from one workflow."
        action={
          <Button asChild>
            <Link href="/owner/pos">
              <ShoppingCart className="size-4" />
              Open POS
            </Link>
          </Button>
        }
      />
      {status === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Loading inventory">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : null}
      {apiMessage ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          <span>{apiMessage}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>Retry</Button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Inventory items" value={String(items.length)} icon={Boxes} />
        <Metric title="Low stock" value={String(lowStock.length)} tone="warning" icon={AlertTriangle} />
        <Metric title="Out of stock" value={String(outOfStock.length)} tone="danger" icon={PackageSearch} />
        <Metric title="Expiring soon" value={String(expiringSoon.length)} tone="warning" icon={RefreshCw} />
        <Metric title="Stock value" value={`₹${stockValue.toLocaleString("en-IN")}`} icon={BarChart3} />
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ["inventory", "Inventory", PackageCheck],
          ["recipes", "Recipes / BOM", ChefHat],
          ["purchases", "Purchases / GRN", ClipboardList],
          ["suppliers", "Suppliers", Truck],
        ].map(([key, label, Icon]) => (
          <Button
            key={String(key)}
            type="button"
            variant={workspaceTab === key ? "default" : "outline"}
            onClick={() => {
              setWorkspaceTab(key as WorkspaceTab);
              setError("");
            }}
          >
            <Icon className="size-4" />
            {String(label)}
          </Button>
        ))}
      </div>

      {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div> : null}

      {workspaceTab === "inventory" ? (
        <section className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_19rem]">
          <Card className="h-fit">
            <CardContent className="space-y-2 p-4">
              <h2 className="text-sm font-black">Inventory types</h2>
              <TypeButton label="All inventory" active={activeType === "all"} count={items.length} onClick={() => setActiveType("all")} />
              {INVENTORY_TYPE_OPTIONS.map((type) => (
                <TypeButton
                  key={type.value}
                  label={type.label}
                  helper={type.helper}
                  count={items.filter((item) => (item.inventoryType ?? "sellable-products") === type.value).length}
                  active={activeType === type.value}
                  onClick={() => setActiveType(type.value)}
                />
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-black">
                    <PackageCheck className="size-5 text-primary" />
                    {editingId ? "Edit inventory item" : "Create inventory item"}
                  </h2>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, sku: generateInventorySku({ inventoryType: draft.inventoryType, category: draft.category, name: draft.name, existingSkus: items.map((item) => item.sku ?? "").filter(Boolean) }) })}>
                    Generate SKU
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <SelectField label="Inventory type" value={draft.inventoryType} onChange={(value) => setDraft({ ...draft, inventoryType: value as InventoryType, sellable: value === "sellable-products" })} options={INVENTORY_TYPE_OPTIONS.map((type) => ({ value: type.value, label: type.label }))} />
                  <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
                  <Field label="SKU" value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} />
                  <Field label="Barcode" value={draft.barcode} onChange={(value) => setDraft({ ...draft, barcode: value })} />
                  <Field label="Parent category" value={draft.parentCategory} onChange={(value) => setDraft({ ...draft, parentCategory: value })} />
                  <Field label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
                  <Field label="Subcategory" value={draft.subcategory} onChange={(value) => setDraft({ ...draft, subcategory: value })} />
                  <SelectField label="Stock unit" value={draft.unit} onChange={(value) => setDraft({ ...draft, unit: value })} options={INVENTORY_UNITS.map((unit) => ({ value: unit, label: unit }))} />
                  <SelectField label="Purchase unit" value={draft.purchaseUnit} onChange={(value) => setDraft({ ...draft, purchaseUnit: value })} options={INVENTORY_UNITS.map((unit) => ({ value: unit, label: unit }))} />
                  <Field label="Unit conversion" value={draft.unitConversionFactor} inputMode="decimal" onChange={(value) => setDraft({ ...draft, unitConversionFactor: value })} />
                  <Field label="Current stock" value={draft.currentStock} inputMode="decimal" onChange={(value) => setDraft({ ...draft, currentStock: value })} />
                  <Field label="Reorder level" value={draft.reorderLevel} inputMode="decimal" onChange={(value) => setDraft({ ...draft, reorderLevel: value })} />
                  <Field label="Low stock alert" value={draft.lowStockAlert} inputMode="decimal" onChange={(value) => setDraft({ ...draft, lowStockAlert: value })} />
                  <Field label="Cost per unit" value={draft.costPerUnit} inputMode="decimal" onChange={(value) => setDraft({ ...draft, costPerUnit: value })} />
                  {draft.inventoryType === "sellable-products" ? (
                    <Field label="POS price" value={draft.price} inputMode="decimal" onChange={(value) => setDraft({ ...draft, price: value })} />
                  ) : null}
                  <SelectField label="Supplier" value={draft.supplier} onChange={(value) => setDraft({ ...draft, supplier: value })} options={[{ value: "", label: "No supplier" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]} />
                  {draft.inventoryType !== "equipment" ? (
                    <>
                      <Field label="Expiry date" type="date" value={draft.expiryDate} onChange={(value) => setDraft({ ...draft, expiryDate: value })} />
                      <Field label="Avg daily usage" value={draft.averageDailyUsage} inputMode="decimal" onChange={(value) => setDraft({ ...draft, averageDailyUsage: value })} />
                      <Field label="Wastage quantity" value={draft.wastageQuantity} inputMode="decimal" onChange={(value) => setDraft({ ...draft, wastageQuantity: value })} />
                    </>
                  ) : (
                    <>
                      <Field label="Equipment serial" value={draft.equipmentSerial} onChange={(value) => setDraft({ ...draft, equipmentSerial: value })} />
                      <Field label="Maintenance due" type="date" value={draft.maintenanceDueAt} onChange={(value) => setDraft({ ...draft, maintenanceDueAt: value })} />
                    </>
                  )}
                  {draft.inventoryType === "central-kitchen-stock" ? (
                    <Field label="Central batch ID" value={draft.centralKitchenBatchId} onChange={(value) => setDraft({ ...draft, centralKitchenBatchId: value })} />
                  ) : null}
                  <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
                    <input type="checkbox" checked={draft.gstApplicable} onChange={(event) => setDraft({ ...draft, gstApplicable: event.target.checked })} />
                    GST applicable
                  </label>
                  {draft.inventoryType === "sellable-products" ? (
                    <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
                      <input type="checkbox" checked={draft.sellable} onChange={(event) => setDraft({ ...draft, sellable: event.target.checked })} />
                      Available in POS
                    </label>
                  ) : null}
                  {draft.gstApplicable ? (
                    <>
                      <Field label="GST rate %" value={draft.gstRate} inputMode="decimal" onChange={(value) => setDraft({ ...draft, gstRate: value })} />
                      <Field label="HSN code" value={draft.hsnCode} onChange={(value) => setDraft({ ...draft, hsnCode: value })} />
                    </>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inventory-notes">Notes</Label>
                  <Textarea id="inventory-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Storage notes, supplier reminders, handling instructions" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void saveInventory()}>
                    <Save className="size-4" />
                    {editingId ? "Update item" : "Save item"}
                  </Button>
                  {editingId ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => { setEditingId(null); setDraft(emptyInventoryDraft); }}>
                        Cancel
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => { void deleteInventoryItem(editingId); setEditingId(null); setDraft(emptyInventoryDraft); }}>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <AdvancedDataTable title="Inventory ledger" columns={inventoryColumns} rows={filteredItems} exportFilename="inventory-ledger.csv" />

            <section className="grid gap-3 md:hidden">
              {filteredItems.map((item) => <InventoryMobileCard key={item.id} item={item} onEdit={() => editItem(item)} onAdjust={(delta) => void adjustInventoryStock(item.id, delta, "Mobile quick adjustment")} />)}
            </section>
          </div>

          <InventoryInsights
            lowStock={lowStock}
            likelyTomorrow={likelyTomorrow}
            mostWasted={mostWasted}
            fastMoving={fastMoving}
            unusedInventory={unusedInventory}
            movements={movements}
            auditCount={auditLogs.length}
          />
        </section>
      ) : null}

      {workspaceTab === "recipes" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <ChefHat className="size-5 text-primary" />
                Recipe / BOM builder
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <SelectField label="Menu item" value={recipeDraft.menuItemId} onChange={(value) => setRecipeDraft({ ...recipeDraft, menuItemId: value })} options={[{ value: "", label: "Select menu item" }, ...menuItems.map((item) => ({ value: item.id, label: item.name }))]} />
                <Field label="Portion size" value={recipeDraft.portionSize} inputMode="decimal" onChange={(value) => setRecipeDraft({ ...recipeDraft, portionSize: value })} />
                <Field label="Output unit" value={recipeDraft.outputUnit} onChange={(value) => setRecipeDraft({ ...recipeDraft, outputUnit: value })} />
                <Field label="Size label optional" value={recipeDraft.sizeLabel} onChange={(value) => setRecipeDraft({ ...recipeDraft, sizeLabel: value })} />
                <SelectField label="Ingredient" value={recipeDraft.ingredientId} onChange={(value) => {
                  const item = items.find((entry) => entry.id === value);
                  setRecipeDraft({ ...recipeDraft, ingredientId: value, ingredientUnit: item?.unit ?? recipeDraft.ingredientUnit });
                }} options={[{ value: "", label: "Select ingredient" }, ...rawIngredients.map((item) => ({ value: item.id, label: `${item.name} (${item.currentStock} ${item.unit})` }))]} />
                <Field label="Ingredient qty" value={recipeDraft.ingredientQuantity} inputMode="decimal" onChange={(value) => setRecipeDraft({ ...recipeDraft, ingredientQuantity: value })} />
                <SelectField label="Ingredient unit" value={recipeDraft.ingredientUnit} onChange={(value) => setRecipeDraft({ ...recipeDraft, ingredientUnit: value })} options={INVENTORY_UNITS.map((unit) => ({ value: unit, label: unit }))} />
                <Field label="Wastage %" value={recipeDraft.wastagePercent} inputMode="decimal" onChange={(value) => setRecipeDraft({ ...recipeDraft, wastagePercent: value })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={addRecipeIngredient}>
                  <Plus className="size-4" />
                  Add ingredient
                </Button>
                <Button type="button" onClick={() => void saveRecipe()}>
                  <Save className="size-4" />
                  Save recipe
                </Button>
              </div>
              <div className="grid gap-2">
                {recipeDraft.ingredients.map((ingredient, index) => (
                  <div key={`${ingredient.inventoryItemId}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <span className="font-semibold">{ingredient.inventoryItemName}</span>
                    <span className="text-sm text-muted-foreground">{ingredient.quantity} {ingredient.unit} {ingredient.wastagePercent ? `+ ${ingredient.wastagePercent}% waste` : ""}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index) }))}>Remove</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">Active recipes</h2>
              {recipes.length ? recipes.map((recipe) => (
                <div key={recipe.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">{recipe.menuItemName}</p>
                      <p className="text-sm text-muted-foreground">{recipe.ingredients.length} ingredients · Cost ₹{Math.round(recipe.totalCost ?? 0)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => void deleteRecipe(recipe.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )) : <EmptyState icon={ChefHat} title="No recipes yet" description="Create recipes to auto-deduct ingredient stock when POS bills are paid." />}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {workspaceTab === "purchases" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <ClipboardList className="size-5 text-primary" />
                Purchase order and GRN
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <SelectField label="Supplier" value={purchaseDraft.supplierId} onChange={(value) => setPurchaseDraft({ ...purchaseDraft, supplierId: value })} options={[{ value: "", label: "Select supplier" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]} />
                <SelectField label="Linked inventory" value={purchaseDraft.inventoryItemId} onChange={(value) => {
                  const item = items.find((entry) => entry.id === value);
                  setPurchaseDraft({ ...purchaseDraft, inventoryItemId: value, itemName: item?.name ?? purchaseDraft.itemName, unit: item?.unit ?? purchaseDraft.unit, costPerUnit: item?.costPerUnit ? String(item.costPerUnit) : purchaseDraft.costPerUnit });
                }} options={[{ value: "", label: "Manual item" }, ...items.map((item) => ({ value: item.id, label: item.name }))]} />
                <Field label="Item name" value={purchaseDraft.itemName} onChange={(value) => setPurchaseDraft({ ...purchaseDraft, itemName: value })} />
                <Field label="Quantity" value={purchaseDraft.quantity} inputMode="decimal" onChange={(value) => setPurchaseDraft({ ...purchaseDraft, quantity: value })} />
                <SelectField label="Unit" value={purchaseDraft.unit} onChange={(value) => setPurchaseDraft({ ...purchaseDraft, unit: value })} options={INVENTORY_UNITS.map((unit) => ({ value: unit, label: unit }))} />
                <Field label="Cost per unit" value={purchaseDraft.costPerUnit} inputMode="decimal" onChange={(value) => setPurchaseDraft({ ...purchaseDraft, costPerUnit: value })} />
                <Field label="Invoice number" value={purchaseDraft.invoiceNumber} onChange={(value) => setPurchaseDraft({ ...purchaseDraft, invoiceNumber: value })} />
                <Field label="Expected date" type="date" value={purchaseDraft.expectedAt} onChange={(value) => setPurchaseDraft({ ...purchaseDraft, expectedAt: value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchase-notes">Notes</Label>
                <Textarea id="purchase-notes" value={purchaseDraft.notes} onChange={(event) => setPurchaseDraft({ ...purchaseDraft, notes: event.target.value })} placeholder="Payment terms, delivery note, invoice remarks" />
              </div>
              <Button type="button" onClick={() => void savePurchase()}>
                <Save className="size-4" />
                Save purchase order
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">Recent purchase orders</h2>
              {purchaseOrders.length ? purchaseOrders.map((order) => (
                <div key={order.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">{order.supplierName}</p>
                      <p className="text-sm text-muted-foreground">{order.items[0]?.itemName} · ₹{order.total.toLocaleString("en-IN")}</p>
                    </div>
                    <Badge variant={order.status === "received" ? "success" : "warning"}>{order.status}</Badge>
                  </div>
                  {order.status !== "received" ? (
                    <Button type="button" className="mt-3 w-full" variant="outline" onClick={() => void receivePurchaseOrder(order.id)}>
                      <CheckCircle2 className="size-4" />
                      Receive stock
                    </Button>
                  ) : null}
                </div>
              )) : <EmptyState icon={ClipboardList} title="No purchases yet" description="Create purchase orders and receive them to update stock." />}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {workspaceTab === "suppliers" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Truck className="size-5 text-primary" />
                Supplier management
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Supplier name" value={supplierDraft.name} onChange={(value) => setSupplierDraft({ ...supplierDraft, name: value })} />
                <Field label="Phone" value={supplierDraft.phone} onChange={(value) => setSupplierDraft({ ...supplierDraft, phone: value })} />
                <Field label="Contact person" value={supplierDraft.contactPerson} onChange={(value) => setSupplierDraft({ ...supplierDraft, contactPerson: value })} />
                <Field label="Category" value={supplierDraft.category} onChange={(value) => setSupplierDraft({ ...supplierDraft, category: value })} />
                <Field label="Payment terms" value={supplierDraft.paymentTerms} onChange={(value) => setSupplierDraft({ ...supplierDraft, paymentTerms: value })} />
                <Field label="Email" value={supplierDraft.email} onChange={(value) => setSupplierDraft({ ...supplierDraft, email: value })} />
                <Field label="GST number" value={supplierDraft.gstNumber} onChange={(value) => setSupplierDraft({ ...supplierDraft, gstNumber: value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier-address">Address</Label>
                <Textarea id="supplier-address" value={supplierDraft.address} onChange={(event) => setSupplierDraft({ ...supplierDraft, address: event.target.value })} />
              </div>
              <Button type="button" onClick={() => void saveSupplier()}>
                <Save className="size-4" />
                Save supplier
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">Supplier cards</h2>
              {suppliers.length ? suppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-md border p-3">
                  <p className="font-black">{supplier.name}</p>
                  <p className="text-sm text-muted-foreground">{supplier.category} · {supplier.phone}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={supplier.active === false ? "destructive" : "success"}>{supplier.active === false ? "inactive" : "active"}</Badge>
                    <Badge variant="muted">{supplier.paymentTerms}</Badge>
                  </div>
                </div>
              )) : <EmptyState icon={Truck} title="No suppliers yet" description="Add supplier records before creating purchase orders." />}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "numeric";
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {options.map((option) => <option key={option.value || option.label} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function Metric({ title, value, tone, icon: Icon }: { title: string; value: string; tone?: "warning" | "danger"; icon: typeof Boxes }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{title}</p>
          <p className={tone === "danger" ? "mt-2 text-3xl font-black text-destructive" : tone === "warning" ? "mt-2 text-3xl font-black text-warning" : "mt-2 text-3xl font-black"}>{value}</p>
        </div>
        <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function TypeButton({ label, helper, count, active, onClick }: { label: string; helper?: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "w-full rounded-md border border-primary bg-primary/10 p-3 text-left text-primary" : "w-full rounded-md border bg-background p-3 text-left text-foreground hover:bg-muted"}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-black">{label}</span>
        <Badge variant={active ? "default" : "muted"}>{count}</Badge>
      </span>
      {helper ? <span className="mt-1 block text-xs font-semibold text-muted-foreground">{helper}</span> : null}
    </button>
  );
}

function InventoryInsights({
  lowStock,
  likelyTomorrow,
  mostWasted,
  fastMoving,
  unusedInventory,
  movements,
  auditCount,
}: {
  lowStock: InventoryItem[];
  likelyTomorrow: InventoryItem[];
  mostWasted?: InventoryItem;
  fastMoving: InventoryItem[];
  unusedInventory: InventoryItem[];
  movements: Array<{ id: string; inventoryItemName?: string; quantity: number; unit: string; reason: string; createdAt: string }>;
  auditCount: number;
}) {
  return (
    <aside className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-black">Smart alerts</h2>
          <InsightLine label="Likely to finish tomorrow" value={String(likelyTomorrow.length)} tone={likelyTomorrow.length ? "warning" : "success"} />
          <InsightLine label="Low stock items" value={String(lowStock.length)} tone={lowStock.length ? "warning" : "success"} />
          <InsightLine label="Most wasted" value={mostWasted?.wastageQuantity ? `${mostWasted.name} (${mostWasted.wastageQuantity})` : "No wastage"} />
          <InsightLine label="Audit events" value={String(auditCount)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-black">Fast moving</h2>
          {fastMoving.length ? fastMoving.map((item) => (
            <p key={item.id} className="text-sm font-semibold text-muted-foreground">{item.name}: {item.averageDailyUsage} {item.unit}/day</p>
          )) : <p className="text-sm font-semibold text-muted-foreground">Add average usage to see predictions.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-black">Unused inventory</h2>
          {unusedInventory.length ? unusedInventory.map((item) => (
            <p key={item.id} className="text-sm font-semibold text-muted-foreground">{item.name}: {item.currentStock} {item.unit}</p>
          )) : <p className="text-sm font-semibold text-muted-foreground">No dead stock detected.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-black">Recent movements</h2>
          {movements.slice(0, 5).map((movement) => (
            <div key={movement.id} className="rounded-md border p-3">
              <p className="text-sm font-black">{movement.inventoryItemName ?? "Inventory item"}</p>
              <p className="text-xs font-semibold text-muted-foreground">{movement.quantity} {movement.unit} · {movement.reason}</p>
            </div>
          ))}
          {!movements.length ? <p className="text-sm font-semibold text-muted-foreground">Stock movements appear after POS sales, GRN, or adjustments.</p> : null}
        </CardContent>
      </Card>
    </aside>
  );
}

function InventoryMobileCard({ item, onEdit, onAdjust }: { item: InventoryItem; onEdit: () => void; onAdjust: (delta: number) => void }) {
  const status = getInventoryStatus(item);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-black">{item.name}</h3>
            <p className="text-sm text-muted-foreground">{getInventoryTypeLabel(item.inventoryType)} · {item.category}</p>
          </div>
          <Badge variant={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-2xl font-black">{item.currentStock} {item.unit}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onAdjust(1)}>+1</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAdjust(-1)}>-1</Button>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>Edit</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightLine({ label, value, tone }: { label: string; value: string; tone?: "warning" | "success" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <Badge variant={tone ?? "muted"}>{value}</Badge>
    </div>
  );
}

function numberFrom(value: string, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
