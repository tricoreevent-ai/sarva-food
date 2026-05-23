"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, BarChart3, Boxes, Copy, Download, Edit3, FileSpreadsheet, ImagePlus, Languages, Loader2, PackageCheck, Plus, QrCode, Save, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { SectionHeader } from "@/components/layout/section-header";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { buildQrPayload, calculateRestaurantTax, cloneMenuForChannel, getChannelPrice, getInventoryStatus, MENU_LANGUAGES, parsePricedTokens, shouldAutoSoldOut, type MenuChannel } from "@/lib/menu-engine";
import { advancedMenuItemSchema, comboSchema, cuisineSchema, menuCategorySchema, taxSettingsSchema } from "@/lib/schemas/menu";
import { uploadMenuItemImage } from "@/services/advanced-menu-service";
import type { ComboOffer, InventoryItem, MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID } from "@/lib/tenant";

type MenuFormValues = z.infer<typeof advancedMenuItemSchema>;

const fallbackImage: string = IMAGE_FALLBACKS.food;

type ImportPreviewRow = {
  rowNumber: number;
  name: string;
  category: string;
  price: number;
  description: string;
  foodType: "veg" | "nonveg";
  imageUrl: string;
  dineInEnabled: boolean;
  parcelEnabled: boolean;
  deliveryEnabled: boolean;
  valid: boolean;
  errors: string[];
};

type ComboDraft = {
  editingId: string;
  name: string;
  description: string;
  image: string;
  price: string;
  discount: string;
  itemIds: string[];
  available: boolean;
};

export function OwnerMenuManagementFlow() {
  const allMenuItems = useAppStore((state) => state.menuItems);
  const allCategories = useAppStore((state) => state.menuCategories);
  const allCuisines = useAppStore((state) => state.cuisines);
  const taxSettings = useAppStore((state) => state.taxSettings);
  const combos = useAppStore((state) => state.comboOffers);
  const inventoryItems = useAppStore((state) => state.inventoryItems);
  const authUser = useAppStore((state) => state.authUser);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const createMenuItem = useAppStore((state) => state.createMenuItem);
  const updateMenuItem = useAppStore((state) => state.updateMenuItem);
  const deleteMenuItem = useAppStore((state) => state.deleteMenuItem);
  const toggleSoldOut = useAppStore((state) => state.toggleSoldOut);
  const createMenuCategory = useAppStore((state) => state.createMenuCategory);
  const updateMenuCategory = useAppStore((state) => state.updateMenuCategory);
  const deleteMenuCategory = useAppStore((state) => state.deleteMenuCategory);
  const createCuisine = useAppStore((state) => state.createCuisine);
  const updateCuisine = useAppStore((state) => state.updateCuisine);
  const deleteCuisine = useAppStore((state) => state.deleteCuisine);
  const updateTaxSettings = useAppStore((state) => state.updateTaxSettings);
  const createComboOffer = useAppStore((state) => state.createComboOffer);
  const updateComboOffer = useAppStore((state) => state.updateComboOffer);
  const deleteComboOffer = useAppStore((state) => state.deleteComboOffer);
  const updateInventoryItem = useAppStore((state) => state.updateInventoryItem);
  const deleteInventoryItem = useAppStore((state) => state.deleteInventoryItem);
  const apiPhase = useAppStore((state) => state.apiPhase);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [imagePreview, setImagePreview] = useState(fallbackImage);
  const [activeChannel, setActiveChannel] = useState<MenuChannel>("delivery");
  const [activeLanguage, setActiveLanguage] = useState<"en" | "hi" | "ml" | "ta" | "kn" | "ar">("en");
  const [importSummary, setImportSummary] = useState("No import file selected.");
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [copyImportToAllChannels, setCopyImportToAllChannels] = useState(true);
  const [categoryDraft, setCategoryDraft] = useState({ id: "", name: "", image: "", banner: "", enabled: true, startTime: "07:00", endTime: "23:00" });
  const [cuisineDraft, setCuisineDraft] = useState({ id: "", name: "", image: "", icon: "", enabled: true });
  const [comboDraft, setComboDraft] = useState<ComboDraft>({ editingId: "", name: "", description: "", image: "", price: "499", discount: "50", itemIds: [], available: true });
  const [editingInventoryId, setEditingInventoryId] = useState("");
  const [sellableDraft, setSellableDraft] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    unit: "piece",
    lowStockAlert: "",
    gstApplicable: false,
    gstRate: "",
    hsnCode: "",
  });
  const [taxDraft, setTaxDraft] = useState({
    gstEnabled: taxSettings.gstEnabled,
    gstin: taxSettings.gstin ?? "",
    pricingMode: taxSettings.pricingMode,
    defaultGstRate: taxSettings.defaultGstRate,
    cgstRate: String(taxSettings.cgstRate),
    sgstRate: String(taxSettings.sgstRate),
    igstRate: String(taxSettings.igstRate),
    serviceChargeRate: String(taxSettings.serviceChargeRate),
    defaultPackingCharge: String(taxSettings.defaultPackingCharge),
  });
  const menuItems = useMemo(
    () => allMenuItems.filter((item) => item.restaurantSlug === restaurantId),
    [allMenuItems, restaurantId],
  );
  const categories = useMemo(() => allCategories.filter((item) => item.restaurantSlug === restaurantId).sort((a, b) => a.sortOrder - b.sortOrder), [allCategories, restaurantId]);
  const cuisines = useMemo(() => allCuisines.filter((item) => item.restaurantSlug === restaurantId), [allCuisines, restaurantId]);
  const lowStock = useMemo(() => inventoryItems.filter((item) => getInventoryStatus(item) !== "ok"), [inventoryItems]);
  const channelRevenuePreview = useMemo(
    () => menuItems.reduce((sum, item) => sum + (isItemVisible(item, activeChannel) ? getChannelPrice(item, activeChannel) : 0), 0),
    [activeChannel, menuItems],
  );
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(advancedMenuItemSchema) as Resolver<MenuFormValues>,
    defaultValues: {
      name: "",
      translations: {},
      category: "Specials",
      categoryId: "",
      cuisineIds: [],
      description: "",
      longDescription: "",
      price: 199,
      prepTime: "15 min",
      dineInPrice: 199,
      parcelPrice: 209,
      deliveryPrice: 229,
      packingCharge: 10,
      foodType: "veg",
      spiceLevel: "medium",
      tags: "bestseller",
      allergens: "",
      modifiers: "",
      addOns: "",
      modifierGroups: [],
      recipeLinks: [],
      menuVisibility: { "dine-in": true, parcel: true, delivery: true },
    },
  });

  function beginEdit(item: MenuItem) {
    setEditing(item);
    form.reset({
      name: item.name,
      category: item.category,
      categoryId: item.categoryId ?? "",
      cuisineIds: item.cuisineIds ?? [],
      description: item.description,
      longDescription: item.longDescription ?? "",
      price: item.price,
      prepTime: item.prepTime,
      dineInPrice: item.dineInPrice ?? item.price,
      parcelPrice: item.parcelPrice ?? item.price,
      deliveryPrice: item.deliveryPrice ?? item.price,
      packingCharge: item.packingCharge ?? 0,
      foodType: item.foodType ?? (item.isVeg ? "veg" : "nonveg"),
      spiceLevel: item.spiceLevel ?? "medium",
      tags: item.tags?.join(", ") ?? "",
      allergens: item.allergenLabels?.join(", ") ?? "",
      modifiers: item.modifiers?.map((entry) => `${entry.name}:${entry.price}`).join(", ") ?? "",
      addOns: item.addOns?.map((entry) => `${entry.name}:${entry.price}`).join(", ") ?? "",
      translations: item.translations ?? {},
      modifierGroups: item.modifierGroups ?? [],
      recipeLinks: item.recipeLinks ?? [],
      menuVisibility: item.menuVisibility ?? { "dine-in": true, parcel: true, delivery: true },
    });
    setImagePreview(item.image);
  }

  async function handleSubmit(values: MenuFormValues) {
    const modifiers = parsePricedList(values.modifiers);
    const addOns = parsePricedList(values.addOns);
    const category = categories.find((entry) => entry.name.toLowerCase() === values.category.toLowerCase());
    const recipeLinks = inventoryItems.slice(0, 2).map((item) => ({ inventoryItemId: item.id, quantity: 1, unit: item.unit }));
    const modifierGroups = [
      {
        id: editing?.modifierGroups?.[0]?.id ?? `mod-${values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "custom"}`,
        name: "Customisations",
        required: false,
        min: 0,
        max: Math.max(1, modifiers.length),
        options: parsePricedTokens(values.modifiers),
      },
    ].filter((group) => group.options.length > 0);
    const common = {
      ...values,
      ownerId: authUser.id,
      categoryId: category?.id,
      cuisineIds: cuisines.slice(0, 2).map((item) => item.id),
      modifiers,
      addOns,
      modifierGroups,
      recipeLinks,
      image: imagePreview,
      dineInPrice: values.dineInPrice,
      parcelPrice: values.parcelPrice,
      deliveryPrice: values.deliveryPrice,
      packingCharge: values.packingCharge,
      foodType: values.foodType,
      isVeg: ["veg", "vegan", "jain"].includes(values.foodType),
      spiceLevel: values.spiceLevel,
      tags: splitList(values.tags),
      dietaryLabels: values.foodType === "jain" ? ["jain"] : values.foodType === "vegan" ? ["vegan"] : [],
      allergenLabels: splitList(values.allergens),
      menuVisibility: values.menuVisibility,
      soldOut: recipeLinks.some((link) => {
        const stock = inventoryItems.find((entry) => entry.id === link.inventoryItemId);
        return stock ? stock.currentStock < link.quantity : false;
      }),
    };
    if (editing) {
      await updateMenuItem({
        ...editing,
        ...common,
      });
      setEditing(null);
      return;
    }

      await createMenuItem({
      restaurantSlug: restaurantId,
      ...common,
      isPopular: false,
    });
    form.reset();
    setImagePreview(fallbackImage);
  }

  async function handleImageFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
    const uploaded = await uploadMenuItemImage(restaurantId, file).catch(() => null);
    if (uploaded?.downloadUrl) setImagePreview(uploaded.downloadUrl);
  }

  function downloadExcelTemplate() {
    const rows = [
      {
        "item name": "Malabar Chicken Biryani",
        category: "biryani",
        price: 340,
        description: "Dum-cooked chicken biryani with raita and salna.",
        "veg/non-veg": "nonveg",
        "image URL": "https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=900&q=80",
        "dine-in enabled": "yes",
        "parcel enabled": "yes",
        "delivery enabled": "yes",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu template");
    XLSX.writeFile(workbook, "sarva-menu-import-template.xlsx");
  }

  async function previewImportFile(file?: File) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!worksheet) {
        setImportRows([]);
        setImportSummary("No worksheet found in the selected file.");
        return;
      }
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
      const existingNames = new Set(menuItems.map((item) => item.name.trim().toLowerCase()));
      const seenNames = new Set<string>();
      const parsed = rawRows.map((row, index) => {
        const parsedRow = parseImportRow(row, index + 2);
        const key = parsedRow.name.trim().toLowerCase();
        const duplicateErrors = [
          key && existingNames.has(key) ? "item already exists" : "",
          key && seenNames.has(key) ? "duplicate in file" : "",
        ].filter(Boolean);
        if (key) seenNames.add(key);
        return duplicateErrors.length
          ? { ...parsedRow, valid: false, errors: [...parsedRow.errors, ...duplicateErrors] }
          : parsedRow;
      });
      setImportRows(parsed);
      const validCount = parsed.filter((row) => row.valid).length;
      setImportSummary(`${file.name}: ${validCount}/${parsed.length} rows ready to import.`);
    } catch {
      setImportRows([]);
      setImportSummary("Could not read this Excel file. Download the template and try again.");
    }
  }

  async function importPreviewRows() {
    const validRows = importRows.filter((row) => row.valid);
    if (!validRows.length) {
      setImportSummary("No valid rows to import.");
      return;
    }

    const categoryNames = new Set(categories.map((item) => item.name.toLowerCase()));
    for (const row of validRows) {
      if (!categoryNames.has(row.category.toLowerCase())) {
        await createMenuCategory({
          restaurantSlug: restaurantId,
          name: row.category,
          enabled: true,
          schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "07:00", endTime: "23:00" },
        });
        categoryNames.add(row.category.toLowerCase());
      }
      await createMenuItem({
        restaurantSlug: restaurantId,
        ownerId: authUser.id,
        name: row.name,
        category: row.category,
        categoryId: categories.find((item) => item.name.toLowerCase() === row.category.toLowerCase())?.id,
        cuisineIds: cuisines.slice(0, 1).map((item) => item.id),
        description: row.description,
        longDescription: row.description,
        price: row.price,
        dineInPrice: row.price,
        parcelPrice: copyImportToAllChannels ? row.price : row.price + 10,
        deliveryPrice: copyImportToAllChannels ? row.price : row.price + 20,
        packingCharge: row.parcelEnabled || row.deliveryEnabled ? 10 : 0,
        image: row.imageUrl || fallbackImage,
        isVeg: row.foodType === "veg",
        foodType: row.foodType,
        isPopular: false,
        prepTime: "20 min",
        spiceLevel: "medium",
        dietaryLabels: row.foodType === "veg" ? ["veg"] : [],
        allergenLabels: [],
        tags: [],
        menuVisibility: {
          "dine-in": copyImportToAllChannels ? true : row.dineInEnabled,
          parcel: copyImportToAllChannels ? true : row.parcelEnabled,
          delivery: copyImportToAllChannels ? true : row.deliveryEnabled,
        },
        soldOut: false,
      });
    }
    setImportSummary(`${validRows.length} menu items imported.`);
    setImportRows([]);
  }

  async function bulkSetDeliveryAvailability(enabled: boolean) {
    const targets = menuItems.filter((item) => (item.menuVisibility?.delivery ?? true) !== enabled);
    if (!targets.length) return;
    await Promise.all(targets.map((item) =>
      updateMenuItem({
        ...item,
        menuVisibility: {
          ...{ "dine-in": true, parcel: true, delivery: true },
          ...item.menuVisibility,
          delivery: enabled,
        },
      }),
    ));
  }

  async function saveSellableInventory() {
    if (!sellableDraft.name.trim() || !sellableDraft.category.trim()) {
      toast.error("Product name and category are required.");
      return;
    }
    if (!sellableDraft.price || Number(sellableDraft.price) < 0 || !sellableDraft.stock || Number(sellableDraft.stock) < 0) {
      toast.error("Enter valid price and stock quantity.");
      return;
    }
    if (sellableDraft.gstApplicable && (!sellableDraft.gstRate || !sellableDraft.hsnCode.trim())) {
      toast.error("Enter GST rate and HSN code.");
      return;
    }
    const item: InventoryItem = {
      id: editingInventoryId || `inv-${Date.now()}`,
      name: sellableDraft.name.trim(),
      sku: sellableDraft.sku.trim() || undefined,
      category: sellableDraft.category.trim(),
      branchId: DEFAULT_BRANCH_ID,
      price: Number(sellableDraft.price),
      currentStock: Number(sellableDraft.stock),
      unit: sellableDraft.unit.trim() || "piece",
      reorderLevel: Number(sellableDraft.lowStockAlert) || 1,
      lowStockAlert: Number(sellableDraft.lowStockAlert) || 1,
      gstApplicable: sellableDraft.gstApplicable,
      gstRate: sellableDraft.gstApplicable ? Number(sellableDraft.gstRate) : undefined,
      hsnCode: sellableDraft.gstApplicable ? sellableDraft.hsnCode.trim() : undefined,
      sellable: true,
    };
    await updateInventoryItem(item);
    setEditingInventoryId("");
    setSellableDraft({ name: "", sku: "", category: "", price: "", stock: "", unit: "piece", lowStockAlert: "", gstApplicable: false, gstRate: "", hsnCode: "" });
    toast.success(`${item.name} is now available in POS Custom Items.`);
  }

  function beginInventoryEdit(item: InventoryItem) {
    setEditingInventoryId(item.id);
    setSellableDraft({
      name: item.name,
      sku: item.sku ?? "",
      category: item.category,
      price: String(item.price ?? ""),
      stock: String(item.currentStock),
      unit: item.unit,
      lowStockAlert: String(item.lowStockAlert ?? item.reorderLevel ?? ""),
      gstApplicable: item.gstApplicable ?? false,
      gstRate: item.gstRate !== undefined ? String(item.gstRate) : "",
      hsnCode: item.hsnCode ?? "",
    });
  }

  function resetComboDraft() {
    setComboDraft({ editingId: "", name: "", description: "", image: "", price: "499", discount: "50", itemIds: [], available: true });
  }

  function beginComboEdit(combo: ComboOffer) {
    setComboDraft({
      editingId: combo.id,
      name: combo.name,
      description: combo.description ?? "",
      image: combo.image ?? "",
      price: String(combo.price),
      discount: String(combo.discount),
      itemIds: combo.itemIds,
      available: combo.available,
    });
  }

  async function saveComboDraft() {
    const next = {
      restaurantSlug: restaurantId,
      name: comboDraft.name,
      description: comboDraft.description,
      image: comboDraft.image,
      itemIds: comboDraft.itemIds,
      price: Number(comboDraft.price),
      discount: Number(comboDraft.discount),
      available: comboDraft.available,
    };
    const parsed = comboSchema.safeParse(next);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Select at least one item and enter valid combo details.");
      return;
    }
    if (comboDraft.editingId) {
      await updateComboOffer({ ...next, id: comboDraft.editingId });
      toast.success("Combo updated.");
    } else {
      await createComboOffer(next);
      toast.success("Combo created.");
    }
    resetComboDraft();
  }

  // Owner writes update local state immediately and sync to Firestore/Storage when Firebase is configured.
  return (
    <Tabs defaultValue="items" className="space-y-5">
      <SectionHeader
        title="Enterprise menu engine"
        description="Dine-in, parcel, and delivery menus with GST, categories, cuisines, modifiers, combos, inventory links, QR menus, and Firestore-ready persistence."
      />
      <TabsList className="customer-scroll max-w-full overflow-x-auto">
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="cuisines">Cuisines</TabsTrigger>
        <TabsTrigger value="tax">GST & menus</TabsTrigger>
        <TabsTrigger value="combos">Combos</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="qr">QR & languages</TabsTrigger>
        <TabsTrigger value="bulk">Import/Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="items" className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <SectionHeader
            title={editing ? "Edit item" : "Create item"}
            description="Create, edit, mark sold out, and preview image uploads."
          />
          <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
              <SafeImage src={imagePreview} alt="Menu image preview" fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="420px" className="object-cover" />
            </div>
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm font-semibold">
              <ImagePlus className="size-4" aria-hidden="true" />
              Upload image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleImageFile(event.target.files?.[0])}
              />
            </label>
            <div className="grid gap-2">
              <Label htmlFor="menu-name">Name</Label>
              <Input id="menu-name" {...form.register("name")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="menu-category">Category</Label>
                <Input id="menu-category" {...form.register("category")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="menu-price">Price</Label>
                <Input
                  id="menu-price"
                  inputMode="numeric"
                  {...form.register("price", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <PriceField label="Dine-in" id="dine-price" register={form.register("dineInPrice", { valueAsNumber: true })} />
              <PriceField label="Parcel" id="parcel-price" register={form.register("parcelPrice", { valueAsNumber: true })} />
              <PriceField label="Delivery" id="delivery-price" register={form.register("deliveryPrice", { valueAsNumber: true })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <PriceField label="Packing charge" id="packing-charge" register={form.register("packingCharge", { valueAsNumber: true })} />
              <div className="grid gap-2">
                <Label>Food type</Label>
                <select className="h-11 rounded-md border bg-background px-3 text-sm" {...form.register("foodType")}>
                  {["veg", "nonveg", "egg", "vegan", "jain"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Spice</Label>
                <select className="h-11 rounded-md border bg-background px-3 text-sm" {...form.register("spiceLevel")}>
                  {["mild", "medium", "hot"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-prep">Prep time</Label>
              <Input id="menu-prep" {...form.register("prepTime")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-description">Description</Label>
              <Textarea id="menu-description" {...form.register("description")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-long-description">Long description</Label>
              <Textarea id="menu-long-description" {...form.register("longDescription")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-modifiers">Modifiers</Label>
              <Input id="menu-modifiers" placeholder="Less spicy:0, Extra cheese:40" {...form.register("modifiers")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-addons">Add-ons</Label>
              <Input id="menu-addons" placeholder="Egg:30, Paneer:60" {...form.register("addOns")} />
            </div>
            <div className="grid gap-2">
              <Label>Tags</Label>
              <Input placeholder="bestseller, chef special, spicy" {...form.register("tags")} />
            </div>
            <div className="grid gap-2">
              <Label>Allergens</Label>
              <Input placeholder="nuts, dairy, gluten" {...form.register("allergens")} />
            </div>
            <div className="grid gap-2 rounded-md border p-3">
              <Label>Channel visibility</Label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {(["dine-in", "parcel", "delivery"] as MenuChannel[]).map((channel) => (
                  <label key={channel} className="flex items-center gap-2 rounded-md bg-muted px-2 py-2">
                    <input type="checkbox" {...form.register(`menuVisibility.${channel}`)} />
                    {channel}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={apiPhase === "loading"}>
              {apiPhase === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editing ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editing ? "Save item" : "Create item"}
            </Button>
            {apiMessage ? <p className="text-sm font-semibold text-primary">{apiMessage}</p> : null}
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <SectionHeader
          title="Menu catalogue"
          description="Switch channels to audit dine-in, parcel, and delivery pricing without leaving the owner surface."
          action={
            <div className="flex flex-wrap gap-2">
              {(["dine-in", "parcel", "delivery"] as MenuChannel[]).map((channel) => (
                <Button key={channel} size="sm" variant={activeChannel === channel ? "default" : "outline"} onClick={() => setActiveChannel(channel)}>
                  {channel}
                </Button>
              ))}
            </div>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Metric icon={PackageCheck} label={`${activeChannel} visible`} value={menuItems.filter((item) => isItemVisible(item, activeChannel)).length} />
          <Metric icon={BarChart3} label="Catalogue value" value={formatCurrency(channelRevenuePreview)} />
          <Metric icon={AlertTriangle} label="Stock risks" value={menuItems.filter((item) => shouldAutoSoldOut(item, inventoryItems)).length} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid grid-cols-[96px_1fr] gap-3 p-3">
                <div className="relative overflow-hidden rounded-md bg-muted">
                  <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="320px" className="object-cover" />
                </div>
                <div className="min-w-0 space-y-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{item.category}</Badge>
                      {item.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
                    </div>
                    <h2 className="mt-2 font-bold">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">{activeChannel} {formatCurrency(getChannelPrice(item, activeChannel))}</p>
                    <p className="text-xs font-semibold text-muted-foreground">Dine-in {formatCurrency(item.dineInPrice ?? item.price)} · Parcel {formatCurrency(item.parcelPrice ?? item.price)} · Delivery {formatCurrency(item.deliveryPrice ?? item.price)}</p>
                    <p className="text-xs font-semibold text-muted-foreground">GST {item.taxRate ?? taxSettings.defaultGstRate}% · Prep {item.prepTime} min · {item.modifierGroups?.length ?? 0} modifier groups</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => beginEdit(item)}>
                      <Edit3 className="size-4" />
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleSoldOut(item.id)}>
                      {item.soldOut ? (
                        <ToggleRight className="size-4" />
                      ) : (
                        <ToggleLeft className="size-4" />
                      )}
                      {item.soldOut ? "Restock" : "Sold out"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateMenuItem({ ...item, menuVisibility: { ...{ "dine-in": true, parcel: true, delivery: true }, ...item.menuVisibility, delivery: !(item.menuVisibility?.delivery ?? true) } })}>
                      Delivery {item.menuVisibility?.delivery === false ? "off" : "on"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateMenuItem({ ...item, menuVisibility: { ...{ "dine-in": true, parcel: true, delivery: true }, ...item.menuVisibility, parcel: !(item.menuVisibility?.parcel ?? true) } })}>
                      Parcel {item.menuVisibility?.parcel === false ? "off" : "on"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateMenuItem(cloneMenuForChannel(item, "dine-in", activeChannel))}>
                      <Copy className="size-4" />
                      Clone price
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteMenuItem(item.id)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      </TabsContent>
      <TabsContent value="categories">
        <EngineGrid>
          <Card><CardContent className="space-y-3 p-5">
            <h2 className="font-black">Create category</h2>
            <Input placeholder="Kerala Specials" value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} />
            <Input placeholder="Banner URL" value={categoryDraft.banner} onChange={(event) => setCategoryDraft({ ...categoryDraft, banner: event.target.value })} />
            <div className="grid grid-cols-2 gap-2"><Input type="time" value={categoryDraft.startTime} onChange={(event) => setCategoryDraft({ ...categoryDraft, startTime: event.target.value })} /><Input type="time" value={categoryDraft.endTime} onChange={(event) => setCategoryDraft({ ...categoryDraft, endTime: event.target.value })} /></div>
            <div className="flex gap-2">
              <Button onClick={() => {
                const parsed = menuCategorySchema.safeParse(categoryDraft);
                if (!parsed.success) return toast.error("Enter a valid category name.");
                const existing = categories.find((item) => item.id === categoryDraft.id);
                const next = { restaurantSlug: restaurantId, name: categoryDraft.name, image: categoryDraft.image, banner: categoryDraft.banner, enabled: categoryDraft.enabled, schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: categoryDraft.startTime, endTime: categoryDraft.endTime } };
                if (existing) void updateMenuCategory({ ...existing, ...next });
                else void createMenuCategory(next);
                setCategoryDraft({ id: "", name: "", image: "", banner: "", enabled: true, startTime: "07:00", endTime: "23:00" });
              }}>{categoryDraft.id ? "Save category" : "Add category"}</Button>
              {categoryDraft.id ? <Button variant="outline" onClick={() => setCategoryDraft({ id: "", name: "", image: "", banner: "", enabled: true, startTime: "07:00", endTime: "23:00" })}>Cancel</Button> : null}
            </div>
          </CardContent></Card>
          <Card><CardContent className="space-y-3 p-5">
            <h2 className="font-black">Category order</h2>
            {categories.map((category, index) => (
              <div key={category.id} className="flex items-center justify-between rounded-md border p-3">
                <div><p className="font-bold">{index + 1}. {category.name}</p><p className="text-xs text-muted-foreground">{category.schedule ? `${category.schedule.startTime}-${category.schedule.endTime}` : "All day"}</p></div>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => updateMenuCategory({ ...category, enabled: !category.enabled })}>{category.enabled ? "Disable" : "Enable"}</Button><Button size="sm" variant="outline" onClick={() => setCategoryDraft({ id: category.id, name: category.name, image: category.image ?? "", banner: category.banner ?? "", enabled: category.enabled, startTime: category.schedule?.startTime ?? "07:00", endTime: category.schedule?.endTime ?? "23:00" })}>Edit</Button><Button size="sm" variant="outline" onClick={() => deleteMenuCategory(category.id)}>Delete</Button></div>
              </div>
            ))}
          </CardContent></Card>
        </EngineGrid>
      </TabsContent>
      <TabsContent value="cuisines">
        <EngineGrid>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">{cuisineDraft.id ? "Edit cuisine" : "Create cuisine"}</h2>
              <Input placeholder="Arabic" value={cuisineDraft.name} onChange={(event) => setCuisineDraft({ ...cuisineDraft, name: event.target.value })} />
              <Input placeholder="Image/icon URL" value={cuisineDraft.image} onChange={(event) => setCuisineDraft({ ...cuisineDraft, image: event.target.value })} />
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold">
                <input type="checkbox" checked={cuisineDraft.enabled} onChange={(event) => setCuisineDraft({ ...cuisineDraft, enabled: event.target.checked })} />
                Active
              </label>
              <div className="flex gap-2">
                <Button onClick={() => {
                  const parsed = cuisineSchema.safeParse(cuisineDraft);
                  if (!parsed.success) return toast.error("Enter a valid cuisine name.");
                  if (cuisineDraft.id) void updateCuisine({ restaurantSlug: restaurantId, ...cuisineDraft });
                  else void createCuisine({ restaurantSlug: restaurantId, name: cuisineDraft.name, image: cuisineDraft.image, icon: cuisineDraft.icon, enabled: cuisineDraft.enabled });
                  setCuisineDraft({ id: "", name: "", image: "", icon: "", enabled: true });
                }}>
                  {cuisineDraft.id ? "Save cuisine" : "Add cuisine"}
                </Button>
                {cuisineDraft.id ? <Button variant="outline" onClick={() => setCuisineDraft({ id: "", name: "", image: "", icon: "", enabled: true })}>Cancel</Button> : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">Cuisine tags</h2>
              {cuisines.map((cuisine) => (
                <div key={cuisine.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-bold">{cuisine.name}</p>
                    <p className="text-xs text-muted-foreground">{cuisine.image || "No image"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant={cuisine.enabled ? "success" : "muted"}>{cuisine.enabled ? "active" : "hidden"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => void updateCuisine({ ...cuisine, enabled: !cuisine.enabled })}>{cuisine.enabled ? "Disable" : "Enable"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setCuisineDraft({ id: cuisine.id, name: cuisine.name, image: cuisine.image ?? "", icon: cuisine.icon ?? "", enabled: cuisine.enabled })}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => void deleteCuisine(cuisine.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </EngineGrid>
      </TabsContent>
      <TabsContent value="tax">
        <EngineGrid>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">Indian GST setup</h2><Input placeholder="GSTIN" value={taxDraft.gstin} onChange={(event) => setTaxDraft({ ...taxDraft, gstin: event.target.value.toUpperCase() })} /><div className="grid grid-cols-2 gap-2"><Input value={taxDraft.cgstRate} onChange={(event) => setTaxDraft({ ...taxDraft, cgstRate: event.target.value })} /><Input value={taxDraft.sgstRate} onChange={(event) => setTaxDraft({ ...taxDraft, sgstRate: event.target.value })} /></div><div className="grid grid-cols-2 gap-2"><Input value={taxDraft.serviceChargeRate} onChange={(event) => setTaxDraft({ ...taxDraft, serviceChargeRate: event.target.value })} /><Input value={taxDraft.defaultPackingCharge} onChange={(event) => setTaxDraft({ ...taxDraft, defaultPackingCharge: event.target.value })} /></div><Button onClick={() => saveTaxDraft(taxDraft, taxSettings, updateTaxSettings)}>Save GST setup</Button>{apiMessage ? <p className="text-sm font-bold text-primary">{apiMessage}</p> : null}</CardContent></Card>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">Dual menu architecture</h2>{(["dine-in", "parcel", "delivery"] as MenuChannel[]).map((channel) => <div key={channel} className="rounded-md border p-3"><p className="font-bold">{channel}</p><p className="text-sm text-muted-foreground">Separate pricing, tax, packing charge, visibility, availability, and offers.</p><p className="mt-2 text-xs font-bold text-primary">Preview total: {formatCurrency(calculateRestaurantTax({ amount: 500, settings: taxSettings, packingCharge: channel === "dine-in" ? 0 : taxSettings.defaultPackingCharge }).total)}</p></div>)}<Badge variant="secondary">Default SAC 996331</Badge></CardContent></Card>
        </EngineGrid>
      </TabsContent>
      <TabsContent value="combos">
        <EngineGrid>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">{comboDraft.editingId ? "Edit combo" : "Create combo"}</h2>
              <Input placeholder="Family grill pack" value={comboDraft.name} onChange={(event) => setComboDraft({ ...comboDraft, name: event.target.value })} />
              <Textarea placeholder="Short description" value={comboDraft.description} onChange={(event) => setComboDraft({ ...comboDraft, description: event.target.value })} />
              <Input placeholder="Image URL" value={comboDraft.image} onChange={(event) => setComboDraft({ ...comboDraft, image: event.target.value })} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Combo price" inputMode="decimal" value={comboDraft.price} onChange={(event) => setComboDraft({ ...comboDraft, price: event.target.value })} />
                <Input placeholder="Discount amount" inputMode="decimal" value={comboDraft.discount} onChange={(event) => setComboDraft({ ...comboDraft, discount: event.target.value })} />
              </div>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold">
                <input type="checkbox" checked={comboDraft.available} onChange={(event) => setComboDraft({ ...comboDraft, available: event.target.checked })} />
                Available in menu
              </label>
              <div className="max-h-80 space-y-2 overflow-auto rounded-md border p-2">
                {menuItems.map((item) => {
                  const selected = comboDraft.itemIds.includes(item.id);
                  return (
                    <label key={item.id} className="grid cursor-pointer grid-cols-[auto_48px_1fr_auto] items-center gap-3 rounded-md border p-2 text-sm">
                      <input type="checkbox" checked={selected} onChange={(event) => setComboDraft((current) => ({
                        ...current,
                        itemIds: event.target.checked ? [...current.itemIds, item.id] : current.itemIds.filter((id) => id !== item.id),
                      }))} />
                      <span className="relative size-12 overflow-hidden rounded-md bg-muted">
                        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="48px" className="object-cover" />
                      </span>
                      <span>
                        <span className="block font-bold">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </span>
                      <span className="font-black">{formatCurrency(item.price)}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveComboDraft()}>{comboDraft.editingId ? "Save combo" : "Create combo"}</Button>
                {comboDraft.editingId ? <Button variant="outline" onClick={resetComboDraft}>Cancel</Button> : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">Active bundles</h2>
              {combos.map((combo) => (
                <div key={combo.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                  <span className="relative size-16 overflow-hidden rounded-md bg-muted">
                    <SafeImage src={combo.image || fallbackImage} alt={combo.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="72px" className="object-cover" />
                  </span>
                  <div>
                    <p className="font-bold">{combo.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(combo.price)} · discount {formatCurrency(combo.discount)} · {combo.itemIds.length} items</p>
                    <p className="text-xs text-muted-foreground">{combo.itemIds.map((id) => menuItems.find((item) => item.id === id)?.name).filter(Boolean).join(", ") || "No items selected"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => void updateComboOffer({ ...combo, available: !combo.available })}>{combo.available ? "Hide" : "Show"}</Button>
                    <Button size="sm" variant="outline" onClick={() => beginComboEdit(combo)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => void deleteComboOffer(combo.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </EngineGrid>
      </TabsContent>
      <TabsContent value="inventory">
        <EngineGrid>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-black">{editingInventoryId ? "Edit sellable product" : "Add sellable product"}</h2>
              <p className="text-sm text-muted-foreground">Products such as pickles, bottled drinks, chocolates, or packed sweets appear in POS under Custom Items.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Product name" value={sellableDraft.name} onChange={(event) => setSellableDraft({ ...sellableDraft, name: event.target.value })} />
                <Input placeholder="SKU optional" value={sellableDraft.sku} onChange={(event) => setSellableDraft({ ...sellableDraft, sku: event.target.value })} />
                <Input placeholder="Category" value={sellableDraft.category} onChange={(event) => setSellableDraft({ ...sellableDraft, category: event.target.value })} />
                <Input placeholder="Unit" value={sellableDraft.unit} onChange={(event) => setSellableDraft({ ...sellableDraft, unit: event.target.value })} />
                <Input placeholder="Price" inputMode="decimal" value={sellableDraft.price} onChange={(event) => setSellableDraft({ ...sellableDraft, price: event.target.value })} />
                <Input placeholder="Stock quantity" inputMode="decimal" value={sellableDraft.stock} onChange={(event) => setSellableDraft({ ...sellableDraft, stock: event.target.value })} />
                <Input placeholder="Low stock alert" inputMode="decimal" value={sellableDraft.lowStockAlert} onChange={(event) => setSellableDraft({ ...sellableDraft, lowStockAlert: event.target.value })} />
                <label className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-bold">
                  <input type="checkbox" checked={sellableDraft.gstApplicable} onChange={(event) => setSellableDraft({ ...sellableDraft, gstApplicable: event.target.checked })} />
                  GST applicable
                </label>
                {sellableDraft.gstApplicable ? (
                  <>
                    <Input placeholder="GST rate %" inputMode="decimal" value={sellableDraft.gstRate} onChange={(event) => setSellableDraft({ ...sellableDraft, gstRate: event.target.value })} />
                    <Input placeholder="HSN code" value={sellableDraft.hsnCode} onChange={(event) => setSellableDraft({ ...sellableDraft, hsnCode: event.target.value })} />
                  </>
                ) : null}
              </div>
              <Button type="button" onClick={() => void saveSellableInventory()}>
                <PackageCheck className="size-4" />
                {editingInventoryId ? "Save product" : "Add to POS"}
              </Button>
              {editingInventoryId ? <Button type="button" variant="outline" onClick={() => {
                setEditingInventoryId("");
                setSellableDraft({ name: "", sku: "", category: "", price: "", stock: "", unit: "piece", lowStockAlert: "", gstApplicable: false, gstRate: "", hsnCode: "" });
              }}>Cancel edit</Button> : null}
            </CardContent>
          </Card>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">Ingredient linkage</h2>{inventoryItems.map((item) => <div key={item.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-bold">{item.name}</p><p className="text-sm text-muted-foreground">{item.currentStock} {item.unit} · reorder at {item.reorderLevel} · {item.branchId}</p><p className="text-xs text-muted-foreground">{item.sellable !== false ? `POS item · ${formatCurrency(item.price ?? 0)}${item.gstApplicable ? ` · GST ${item.gstRate ?? 0}%` : ""}` : "Ingredient only"}</p></div><div className="flex flex-wrap justify-end gap-2"><Badge variant={getInventoryStatus(item) === "ok" ? "success" : "destructive"}>{getInventoryStatus(item)}</Badge><Button size="sm" variant="outline" onClick={() => beginInventoryEdit(item)}>Edit</Button><Button size="sm" variant="outline" onClick={() => void deleteInventoryItem(item.id)}>Delete</Button></div></div>)}</CardContent></Card>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">Stock operations</h2>{lowStock.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-bold">{item.name}</p><p className="text-xs text-muted-foreground">Low stock alert</p></div><Button size="sm" variant="outline" onClick={() => updateInventoryItem({ ...item, currentStock: item.currentStock + item.reorderLevel })}>Stock inward</Button></div>)}<p className="text-sm text-muted-foreground">Recipe deduction, wastage, and branch transfer hooks are preserved for the inventory module.</p></CardContent></Card>
        </EngineGrid>
      </TabsContent>
      <TabsContent value="qr">
        <EngineGrid>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">QR menu payloads</h2>{(["table", "dine-in", "parcel", "delivery"] as const).map((kind) => <div key={kind} className="rounded-md border p-3"><div className="flex items-center gap-2 font-bold"><QrCode className="size-4" />{kind}</div><p className="mt-1 break-all text-sm text-muted-foreground">{buildQrPayload(kind, restaurantId, kind === "table" ? "T04" : undefined)}</p></div>)}</CardContent></Card>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">Menu languages</h2><div className="flex flex-wrap gap-2">{MENU_LANGUAGES.map((language) => <Button key={language.code} size="sm" variant={activeLanguage === language.code ? "default" : "outline"} onClick={() => setActiveLanguage(language.code)}><Languages className="size-4" />{language.label}</Button>)}</div><p className="text-sm text-muted-foreground">English remains canonical. Hindi and Malayalam are active translation targets; Tamil, Kannada, and Arabic are architecture-ready.</p></CardContent></Card>
        </EngineGrid>
      </TabsContent>
      <TabsContent value="bulk">
        <EngineGrid>
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="font-black">Excel import</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={downloadExcelTemplate}>
                  <Download className="size-4" />
                  Download template
                </Button>
                <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm font-semibold">
                  <FileSpreadsheet className="size-4" />
                  Upload Excel
                  <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => void previewImportFile(event.target.files?.[0])} />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm font-bold">
                <input type="checkbox" checked={copyImportToAllChannels} onChange={(event) => setCopyImportToAllChannels(event.target.checked)} />
                Copy to all menu types
              </label>
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-sm font-black">Bulk delivery availability</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={() => void bulkSetDeliveryAvailability(true)}>
                    Enable delivery for all
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void bulkSetDeliveryAvailability(false)}>
                    Disable delivery for all
                  </Button>
                </div>
              </div>
              <p className="rounded-md bg-muted p-3 text-sm font-bold">{importSummary}</p>
              {importRows.length ? (
                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr>
                        {["Row", "Item", "Category", "Price", "Menu types", "Status"].map((heading) => (
                          <th key={heading} className="border-b p-3 font-black">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row) => (
                        <tr key={row.rowNumber} className={!row.valid ? "bg-destructive/5" : undefined}>
                          <td className="border-b p-3">{row.rowNumber}</td>
                          <td className="border-b p-3 font-bold">{row.name}</td>
                          <td className="border-b p-3">{row.category}</td>
                          <td className="border-b p-3">{formatCurrency(row.price)}</td>
                          <td className="border-b p-3">
                            {[
                              row.dineInEnabled ? "dine-in" : "",
                              row.parcelEnabled ? "parcel" : "",
                              row.deliveryEnabled ? "delivery" : "",
                            ].filter(Boolean).join(", ")}
                          </td>
                          <td className="border-b p-3">
                            <Badge variant={row.valid ? "success" : "destructive"}>{row.valid ? "ready" : row.errors.join(", ")}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <Button type="button" disabled={!importRows.some((row) => row.valid)} onClick={() => void importPreviewRows()}>
                <Boxes className="size-4" />
                Import valid rows
              </Button>
            </CardContent>
          </Card>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-black">Menu health</h2>{[
            ["Total items", menuItems.length],
            ["Delivery-enabled", menuItems.filter((entry) => entry.menuVisibility?.delivery !== false && !entry.soldOut).length],
            ["Sold out", menuItems.filter((entry) => entry.soldOut).length],
            ["Missing images", menuItems.filter((entry) => !entry.image).length],
            ["Low-stock linked", menuItems.filter((entry) => shouldAutoSoldOut(entry, inventoryItems)).length],
          ].map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-md border p-3 text-sm font-bold"><span>{label}</span><Badge variant="muted">{value}</Badge></div>)}</CardContent></Card>
        </EngineGrid>
      </TabsContent>
    </Tabs>
  );
}

function parsePricedList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, price] = entry.split(":");
      return { name: name.trim(), price: Number(price) || 0 };
    });
}

function splitList(value?: string) {
  return (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

function parseImportRow(row: Record<string, unknown>, rowNumber: number): ImportPreviewRow {
  const value = (key: string) => {
    const normalizedKey = Object.keys(row).find((entry) => entry.trim().toLowerCase() === key);
    return normalizedKey ? String(row[normalizedKey] ?? "").trim() : "";
  };
  const name = value("item name") || value("name");
  const category = value("category");
  const price = Number(value("price"));
  const description = value("description");
  const foodType = normalizeFoodType(value("veg/non-veg") || value("food type"));
  const imageUrl = value("image url");
  const dineInEnabled = parseYesNo(value("dine-in enabled"));
  const parcelEnabled = parseYesNo(value("parcel enabled"));
  const deliveryEnabled = parseYesNo(value("delivery enabled"));
  const errors = [
    !name ? "item name is required" : "",
    !category ? "category is required" : "",
    Number.isFinite(price) && price > 0 ? "" : "price must be greater than zero",
    description.length >= 8 ? "" : "description must be at least 8 characters",
    imageUrl && !isValidUrl(imageUrl) ? "image URL must be valid" : "",
    !dineInEnabled && !parcelEnabled && !deliveryEnabled ? "enable at least one menu type" : "",
  ].filter(Boolean);

  return {
    rowNumber,
    name,
    category,
    price: Number.isFinite(price) ? price : 0,
    description,
    foodType,
    imageUrl,
    dineInEnabled,
    parcelEnabled,
    deliveryEnabled,
    valid: errors.length === 0,
    errors,
  };
}

function normalizeFoodType(value: string): "veg" | "nonveg" {
  return value.trim().toLowerCase().includes("non") ? "nonveg" : "veg";
}

function parseYesNo(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return ["yes", "y", "true", "1", "enabled", "active"].includes(normalized);
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isItemVisible(item: MenuItem, channel: MenuChannel) {
  return item.menuVisibility?.[channel] ?? true;
}

function PriceField({ label, id, register }: { label: string; id: string; register: ReturnType<typeof useForm<MenuFormValues>>["register"] extends (...args: never[]) => infer R ? R : never }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} inputMode="numeric" {...register} /></div>;
}

function EngineGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 xl:grid-cols-2">{children}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
          <p className="text-xl font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function saveTaxDraft(
  draft: {
    gstEnabled: boolean;
    gstin: string;
    pricingMode: "inclusive" | "exclusive";
    defaultGstRate: 5 | 18;
    cgstRate: string;
    sgstRate: string;
    igstRate: string;
    serviceChargeRate: string;
    defaultPackingCharge: string;
  },
  current: ReturnType<typeof useAppStore.getState>["taxSettings"],
  save: ReturnType<typeof useAppStore.getState>["updateTaxSettings"],
) {
  const next = {
    ...current,
    gstEnabled: draft.gstEnabled,
    gstin: draft.gstin,
    pricingMode: draft.pricingMode,
    defaultGstRate: draft.defaultGstRate,
    cgstRate: Number(draft.cgstRate),
    sgstRate: Number(draft.sgstRate),
    igstRate: Number(draft.igstRate),
    serviceChargeRate: Number(draft.serviceChargeRate),
    defaultPackingCharge: Number(draft.defaultPackingCharge),
  };
  const parsed = taxSettingsSchema.safeParse(next);
  if (parsed.success) void save(next);
}
