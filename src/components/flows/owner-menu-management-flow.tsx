"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, BarChart3, Boxes, Copy, Download, Edit3, ExternalLink, Eye, FileSpreadsheet, ImagePlus, Languages, Link2, Loader2, MessageCircle, PackageCheck, Plus, QrCode, Save, Search, SlidersHorizontal, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { SectionHeader } from "@/components/layout/section-header";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePublicCategories, usePublicCuisines } from "@/hooks/use-public-data";
import { useAppStore } from "@/lib/app-store";
import { buildQrPayload, calculateRestaurantTax, cloneMenuForChannel, getChannelPrice, getInventoryStatus, MENU_LANGUAGES, parsePricedTokens, shouldAutoSoldOut, type MenuChannel } from "@/lib/menu-engine";
import { advancedMenuItemSchema, comboSchema, taxSettingsSchema } from "@/lib/schemas/menu";
import type { ComboOffer, InventoryItem, MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID } from "@/lib/tenant";

type MenuFormValues = z.infer<typeof advancedMenuItemSchema>;
type MenuFoodType = MenuFormValues["foodType"];
type MenuSpiceLevel = MenuFormValues["spiceLevel"];

const fallbackImage: string = IMAGE_FALLBACKS.food;

type ItemWizardStepId = "basic" | "description" | "customization" | "info" | "visibility" | "review";
type ItemFilterChannel = "all" | MenuChannel;
type ItemFilterOption = "all" | string;

const ITEM_WIZARD_STEPS: Array<{
  id: ItemWizardStepId;
  label: string;
  description: string;
  meta: string;
  icon: React.ElementType;
}> = [
  { id: "basic", label: "Basic information", description: "Name, category, price", meta: "5 fields", icon: FileSpreadsheet },
  { id: "description", label: "Description", description: "Details about the item", meta: "3 fields", icon: Languages },
  { id: "customization", label: "Customization", description: "Modifiers and add-ons", meta: "2 sections", icon: Boxes },
  { id: "info", label: "Additional info", description: "Allergens, tags, badges", meta: "4 fields", icon: AlertTriangle },
  { id: "visibility", label: "Channel & visibility", description: "Where to show", meta: "3 channels", icon: PackageCheck },
  { id: "review", label: "Review & publish", description: "Review and publish", meta: "Review", icon: Save },
];

function createEmptyMenuDraft(): MenuFormValues {
  return {
    name: "",
    translations: {},
    category: "",
    categoryId: "",
    subcategory: "",
    cuisineIds: [],
    description: "",
    longDescription: "",
    price: undefined as unknown as number,
    prepTime: "",
    dineInPrice: undefined,
    parcelPrice: undefined,
    deliveryPrice: undefined,
    packingCharge: undefined,
    foodType: "" as MenuFoodType,
    spiceLevel: "" as MenuSpiceLevel,
    tags: "",
    badges: "",
    searchKeywords: "",
    allergens: "",
    modifiers: "",
    addOns: "",
    modifierGroups: [],
    recipeLinks: [],
    menuVisibility: { "dine-in": false, parcel: false, delivery: false },
  };
}

type ImportPreviewRow = {
  rowNumber: number;
  name: string;
  category: string;
  categoryId?: string;
  subcategory: string;
  cuisines: string;
  cuisineIds: string[];
  price: number;
  dineInPrice?: number;
  parcelPrice?: number;
  deliveryPrice?: number;
  packingCharge?: number;
  description: string;
  longDescription: string;
  foodType: MenuFoodType;
  prepTime: string;
  spiceLevel: MenuFormValues["spiceLevel"];
  imageUrl: string;
  tags: string;
  badges: string;
  searchKeywords: string;
  allergens: string;
  modifiers: string;
  addOns: string;
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
  const { categories: masterCategories } = usePublicCategories();
  const { cuisines: masterCuisines } = usePublicCuisines();
  const taxSettings = useAppStore((state) => state.taxSettings);
  const combos = useAppStore((state) => state.comboOffers);
  const inventoryItems = useAppStore((state) => state.inventoryItems);
  const authUser = useAppStore((state) => state.authUser);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const createMenuItem = useAppStore((state) => state.createMenuItem);
  const updateMenuItem = useAppStore((state) => state.updateMenuItem);
  const deleteMenuItem = useAppStore((state) => state.deleteMenuItem);
  const toggleSoldOut = useAppStore((state) => state.toggleSoldOut);
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
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [activeItemStep, setActiveItemStep] = useState<ItemWizardStepId>("basic");
  const [activeChannel, setActiveChannel] = useState<MenuChannel>("delivery");
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState<ItemFilterOption>("all");
  const [itemFoodFilter, setItemFoodFilter] = useState<ItemFilterOption>("all");
  const [itemChannelFilter, setItemChannelFilter] = useState<ItemFilterChannel>("all");
  const [itemVisibilityFilter, setItemVisibilityFilter] = useState<ItemFilterOption>("all");
  const [itemAvailabilityFilter, setItemAvailabilityFilter] = useState<ItemFilterOption>("all");
  const [itemPriceFilter, setItemPriceFilter] = useState<ItemFilterOption>("all");
  const [itemImageFilter, setItemImageFilter] = useState<ItemFilterOption>("all");
  const [itemModifierFilter, setItemModifierFilter] = useState<ItemFilterOption>("all");
  const [itemSort, setItemSort] = useState<ItemFilterOption>("name");
  const [activeLanguage, setActiveLanguage] = useState<"en" | "hi" | "ml" | "ta" | "kn" | "ar">("en");
  const [importSummary, setImportSummary] = useState("No import file selected.");
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
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
  const cuisineChoices = useMemo(() => {
    return masterCuisines
      .filter((item) => item.active)
      .map((item) => ({ id: item.id || item.slug, name: item.name }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [masterCuisines]);
  const categoryChoices = useMemo(() => {
    return masterCategories
      .filter((item) => item.active !== false)
      .map((item) => ({ id: item.id || item.slug, name: item.name }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [masterCategories]);
  const lowStock = useMemo(() => inventoryItems.filter((item) => getInventoryStatus(item) !== "ok"), [inventoryItems]);
  const channelRevenuePreview = useMemo(
    () => menuItems.reduce((sum, item) => sum + (isItemVisible(item, activeChannel) ? getChannelPrice(item, activeChannel) : 0), 0),
    [activeChannel, menuItems],
  );
  const itemCategoryFilters = useMemo(() => unique(menuItems.map((item) => item.category).filter(Boolean)), [menuItems]);
  const filteredMenuItems = useMemo(() => {
    const normalizedSearch = itemSearch.trim().toLowerCase();
    return menuItems
      .filter((item) => {
        const searchable = [
          item.name,
          item.category,
          item.subcategory,
          item.description,
          item.longDescription,
          item.foodType,
          ...(item.tags ?? []),
          ...(item.badges ?? []),
          ...(item.searchKeywords ?? []),
          ...(item.allergenLabels ?? []),
        ].filter(Boolean).join(" ").toLowerCase();
        const channelVisible = itemChannelFilter === "all" || isItemVisible(item, itemChannelFilter);
        const customerVisible = isItemVisible(item, "delivery") && !item.soldOut;
        const hasImage = hasCustomImage(item.image);
        const hasModifiers = Boolean(item.modifierGroups?.length || item.modifiers?.length || item.addOns?.length);
        const deliveryPrice = item.deliveryPrice ?? item.price;
        return (
          (!normalizedSearch || searchable.includes(normalizedSearch)) &&
          (itemCategoryFilter === "all" || item.category === itemCategoryFilter) &&
          (itemFoodFilter === "all" || item.foodType === itemFoodFilter || (itemFoodFilter === "veg" ? item.isVeg : !item.isVeg)) &&
          channelVisible &&
          (itemVisibilityFilter === "all" || (itemVisibilityFilter === "customer-visible" ? customerVisible : !customerVisible)) &&
          (itemAvailabilityFilter === "all" || (itemAvailabilityFilter === "available" ? !item.soldOut : item.soldOut)) &&
          matchesPriceBand(deliveryPrice, itemPriceFilter) &&
          (itemImageFilter === "all" || (itemImageFilter === "with-image" ? hasImage : !hasImage)) &&
          (itemModifierFilter === "all" || (itemModifierFilter === "with-modifiers" ? hasModifiers : !hasModifiers))
        );
      })
      .sort((first, second) => {
        if (itemSort === "price-high") return (second.deliveryPrice ?? second.price) - (first.deliveryPrice ?? first.price);
        if (itemSort === "price-low") return (first.deliveryPrice ?? first.price) - (second.deliveryPrice ?? second.price);
        if (itemSort === "category") return first.category.localeCompare(second.category) || first.name.localeCompare(second.name);
        return first.name.localeCompare(second.name);
      });
  }, [itemAvailabilityFilter, itemCategoryFilter, itemChannelFilter, itemFoodFilter, itemImageFilter, itemModifierFilter, itemPriceFilter, itemSearch, itemSort, itemVisibilityFilter, menuItems]);
  const filterActive = Boolean(
    itemSearch ||
      itemCategoryFilter !== "all" ||
      itemFoodFilter !== "all" ||
      itemChannelFilter !== "all" ||
      itemVisibilityFilter !== "all" ||
      itemAvailabilityFilter !== "all" ||
      itemPriceFilter !== "all" ||
      itemImageFilter !== "all" ||
      itemModifierFilter !== "all" ||
      itemSort !== "name",
  );
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(advancedMenuItemSchema) as Resolver<MenuFormValues>,
    defaultValues: createEmptyMenuDraft(),
  });
  const selectedCategoryId = useWatch({ control: form.control, name: "categoryId" }) ?? "";
  const selectedCuisineIds = useWatch({ control: form.control, name: "cuisineIds" }) ?? [];
  const watchedName = useWatch({ control: form.control, name: "name" }) ?? "";
  const watchedCategory = useWatch({ control: form.control, name: "category" }) ?? "";
  const watchedSubcategory = useWatch({ control: form.control, name: "subcategory" }) ?? "";
  const watchedBasePrice = useWatch({ control: form.control, name: "price" }) ?? 0;
  const watchedDineInPrice = useWatch({ control: form.control, name: "dineInPrice" });
  const watchedParcelPrice = useWatch({ control: form.control, name: "parcelPrice" });
  const watchedDeliveryPrice = useWatch({ control: form.control, name: "deliveryPrice" });
  const watchedPackingCharge = useWatch({ control: form.control, name: "packingCharge" });
  const watchedFoodType = useWatch({ control: form.control, name: "foodType" }) ?? "";
  const watchedVisibility = buildChannelVisibility(watchedDineInPrice, watchedParcelPrice, watchedDeliveryPrice);
  const watchedDisplayPrice = firstPositivePrice(watchedDeliveryPrice, watchedDineInPrice, watchedParcelPrice, watchedBasePrice) ?? 0;
  const activeItemStepIndex = Math.max(0, ITEM_WIZARD_STEPS.findIndex((step) => step.id === activeItemStep));

  function resetItemFilters() {
    setItemSearch("");
    setItemCategoryFilter("all");
    setItemFoodFilter("all");
    setItemChannelFilter("all");
    setItemVisibilityFilter("all");
    setItemAvailabilityFilter("all");
    setItemPriceFilter("all");
    setItemImageFilter("all");
    setItemModifierFilter("all");
    setItemSort("name");
  }

  function beginCreateItem() {
    setEditing(null);
    form.reset(createEmptyMenuDraft());
    setImagePreview(fallbackImage);
    setActiveItemStep("basic");
    setItemEditorOpen(true);
  }

  function closeItemEditor() {
    setEditing(null);
    form.reset(createEmptyMenuDraft());
    setImagePreview(fallbackImage);
    setActiveItemStep("basic");
    setItemEditorOpen(false);
  }

  function beginEdit(item: MenuItem) {
    setEditing(item);
    setActiveItemStep("basic");
    setItemEditorOpen(true);
    form.reset({
      name: item.name,
      category: item.category,
      categoryId: item.categoryId ?? "",
      subcategory: item.subcategory ?? "",
      cuisineIds: item.cuisineIds ?? [],
      description: item.description,
      longDescription: item.longDescription ?? "",
      price: item.price,
      prepTime: item.prepTime,
      dineInPrice: formChannelPrice(item, "dine-in"),
      parcelPrice: formChannelPrice(item, "parcel"),
      deliveryPrice: formChannelPrice(item, "delivery"),
      packingCharge: item.packingCharge && item.packingCharge > 0 ? item.packingCharge : undefined,
      foodType: item.foodType ?? (item.isVeg ? "veg" : "nonveg"),
      spiceLevel: item.spiceLevel ?? "medium",
      tags: item.tags?.join(", ") ?? "",
      badges: item.badges?.join(", ") ?? "",
      searchKeywords: item.searchKeywords?.join(", ") ?? "",
      allergens: item.allergenLabels?.join(", ") ?? "",
      modifiers: item.modifiers?.map((entry) => `${entry.name}:${entry.price}`).join(", ") ?? "",
      addOns: item.addOns?.map((entry) => `${entry.name}:${entry.price}`).join(", ") ?? "",
      translations: item.translations ?? {},
      modifierGroups: item.modifierGroups ?? [],
      recipeLinks: item.recipeLinks ?? [],
      menuVisibility: item.menuVisibility ?? buildChannelVisibility(item.dineInPrice, item.parcelPrice, item.deliveryPrice),
    });
    setImagePreview(item.image);
  }

  async function handleSubmit(values: MenuFormValues) {
    const validationError = validateMenuDraft(values, imagePreview, menuItems, editing?.id);
    if (validationError) {
      setActiveItemStep(validationError.step);
      toast.error(validationError.message);
      return;
    }
    const modifiers = parsePricedList(values.modifiers);
    const addOns = parsePricedList(values.addOns);
    const selectedCategory = categoryChoices.find((entry) => entry.id === values.categoryId) ??
      categoryChoices.find((entry) => entry.name.toLowerCase() === values.category.toLowerCase());
    const recipeLinks = inventoryItems.slice(0, 2).map((item) => ({ inventoryItemId: item.id, quantity: 1, unit: item.unit }));
    const tags = splitList(values.tags);
    const badges = splitList(values.badges);
    const searchKeywords = splitList(values.searchKeywords);
    const dineInPrice = normalizeOptionalPrice(values.dineInPrice);
    const parcelPrice = normalizeOptionalPrice(values.parcelPrice);
    const deliveryPrice = normalizeOptionalPrice(values.deliveryPrice);
    const channelVisibility = buildChannelVisibility(dineInPrice, parcelPrice, deliveryPrice);
    const packingCharge = channelVisibility.parcel || channelVisibility.delivery ? normalizeOptionalPrice(values.packingCharge) ?? 0 : 0;
    const fallbackChannelPrice = firstPositivePrice(deliveryPrice, dineInPrice, parcelPrice);
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
      category: selectedCategory?.name ?? values.category,
      categoryId: selectedCategory?.id ?? values.categoryId,
      subcategory: values.subcategory?.trim(),
      cuisineIds: values.cuisineIds,
      price: fallbackChannelPrice ?? values.price,
      modifiers,
      addOns,
      modifierGroups,
      recipeLinks,
      image: imagePreview,
      dineInPrice: dineInPrice ?? 0,
      parcelPrice: parcelPrice ?? 0,
      deliveryPrice: deliveryPrice ?? 0,
      packingCharge,
      foodType: values.foodType,
      isVeg: ["veg", "vegan", "jain"].includes(values.foodType),
      spiceLevel: values.spiceLevel,
      tags,
      badges,
      searchKeywords,
      dietaryLabels: values.foodType === "jain" ? ["jain"] : values.foodType === "vegan" ? ["vegan"] : [],
      allergenLabels: splitList(values.allergens),
      menuVisibility: channelVisibility,
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
      setActiveItemStep("basic");
      setItemEditorOpen(false);
      return;
    }

    await createMenuItem({
      restaurantSlug: restaurantId,
      ...common,
      isPopular: tags.some((tag) => ["popular", "bestseller"].includes(tag.toLowerCase())),
    });
    form.reset(createEmptyMenuDraft());
    setImagePreview(fallbackImage);
    setActiveItemStep("basic");
    setItemEditorOpen(false);
  }

  function handleInvalidSubmit(errors: typeof form.formState.errors) {
    const nextStep = stepForFormErrors(errors);
    setActiveItemStep(nextStep);
    setItemEditorOpen(true);
    toast.error("Please fix the highlighted menu item fields.");
  }

  function downloadExcelTemplate() {
    const headers = [
      "item name",
      "category",
      "sub category",
      "cuisines",
      "base price",
      "dine-in price",
      "parcel price",
      "delivery price",
      "packing charge",
      "food type",
      "spice level",
      "prep time",
      "short description",
      "long description",
      "image URL",
      "tags",
      "badges",
      "search keywords",
      "allergens",
      "modifiers",
      "add-ons",
    ];
    const exampleCategory = categoryChoices[0]?.name ?? "";
    const exampleCuisine = cuisineChoices[0]?.name ?? "";
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      [
        "Al Faham Chicken Half",
        exampleCategory,
        "Arabic Grills",
        exampleCuisine,
        442,
        442,
        "",
        479,
        10,
        "nonveg",
        "medium",
        "20 min",
        "Charcoal grilled chicken with house spice rub.",
        "Half chicken served with kuboos, garlic dip, hummus, and salad.",
        "https://res.cloudinary.com/.../alfaham.webp",
        "bestseller, grilled",
        "Chef special",
        "alfaham, arabic grill, chicken",
        "dairy",
        "Less spicy:0, Extra spicy:0",
        "Egg:30, Garlic dip:20",
      ],
    ]);
    worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(16, header.length + 4) }));
    const categoriesSheet = XLSX.utils.json_to_sheet(categoryChoices.map((item) => ({ id: item.id, name: item.name })));
    const cuisinesSheet = XLSX.utils.json_to_sheet(cuisineChoices.map((item) => ({ id: item.id, name: item.name })));
    const optionsSheet = XLSX.utils.aoa_to_sheet([
      ["Field", "Allowed values / notes"],
      ["category", "Use exactly one name from Master categories."],
      ["cuisines", "Comma-separated names or ids from Master cuisines."],
      ["food type", "veg, nonveg, egg, vegan, jain"],
      ["spice level", "mild, medium, hot"],
      ["channel price fields", "Optional. Blank or zero means unavailable for that channel."],
      ["modifiers/add-ons", "Comma-separated Name:Price pairs. Example: Egg:30, Garlic dip:20"],
      ["generated from", `Current owner menu item creation fields on ${new Date().toISOString()}`],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu template");
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Master categories");
    XLSX.utils.book_append_sheet(workbook, cuisinesSheet, "Master cuisines");
    XLSX.utils.book_append_sheet(workbook, optionsSheet, "Instructions");
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
      const categoryByName = new Map(categoryChoices.map((item) => [item.name.trim().toLowerCase(), item]));
      const parsed = rawRows.map((row, index) => {
        const parsedRow = parseImportRow(row, index + 2);
        const key = parsedRow.name.trim().toLowerCase();
        const matchedCategory = categoryByName.get(parsedRow.category.trim().toLowerCase());
        const cuisineMatch = resolveCuisineIds(parsedRow.cuisines, cuisineChoices);
        const duplicateErrors = [
          key && existingNames.has(key) ? "item already exists" : "",
          key && seenNames.has(key) ? "duplicate in file" : "",
          parsedRow.category && !matchedCategory ? "category must match Admin master list" : "",
          ...cuisineMatch.errors,
        ].filter(Boolean);
        if (key) seenNames.add(key);
        const nextRow = {
          ...parsedRow,
          categoryId: matchedCategory?.id,
          category: matchedCategory?.name ?? parsedRow.category,
          cuisineIds: cuisineMatch.ids,
        };
        return duplicateErrors.length
          ? { ...nextRow, valid: false, errors: [...nextRow.errors, ...duplicateErrors] }
          : nextRow;
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

    for (const row of validRows) {
      const channelVisibility = buildChannelVisibility(row.dineInPrice, row.parcelPrice, row.deliveryPrice);
      await createMenuItem({
        restaurantSlug: restaurantId,
        ownerId: authUser.id,
        name: row.name,
        category: row.category,
        categoryId: row.categoryId,
        subcategory: row.subcategory,
        cuisineIds: row.cuisineIds,
        description: row.description,
        longDescription: row.longDescription || row.description,
        price: row.price,
        dineInPrice: row.dineInPrice ?? 0,
        parcelPrice: row.parcelPrice ?? 0,
        deliveryPrice: row.deliveryPrice ?? 0,
        packingCharge: channelVisibility.parcel || channelVisibility.delivery ? row.packingCharge ?? 0 : 0,
        image: row.imageUrl || fallbackImage,
        isVeg: ["veg", "vegan", "jain"].includes(row.foodType),
        foodType: row.foodType,
        isPopular: splitList(row.tags).some((tag) => ["popular", "bestseller"].includes(tag.toLowerCase())),
        prepTime: row.prepTime,
        spiceLevel: row.spiceLevel,
        dietaryLabels: row.foodType === "jain" ? ["jain"] : row.foodType === "vegan" ? ["vegan"] : [],
        allergenLabels: splitList(row.allergens),
        tags: splitList(row.tags),
        badges: splitList(row.badges),
        searchKeywords: splitList(row.searchKeywords),
        modifiers: parsePricedList(row.modifiers),
        addOns: parsePricedList(row.addOns),
        modifierGroups: parsePricedTokens(row.modifiers).length
          ? [{
              id: `mod-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "import"}`,
              name: "Customisations",
              required: false,
              min: 0,
              max: Math.max(1, parsePricedTokens(row.modifiers).length),
              options: parsePricedTokens(row.modifiers),
            }]
          : [],
        menuVisibility: channelVisibility,
        soldOut: false,
      });
    }
    setImportSummary(`${validRows.length} menu items imported.`);
    setImportRows([]);
  }

  async function bulkSetDeliveryAvailability(enabled: boolean) {
    const targets = menuItems.filter((item) => isItemVisible(item, "delivery") !== enabled);
    if (!targets.length) return;
    await Promise.all(targets.map((item) =>
      updateMenuItem(applyChannelAvailability(item, "delivery", enabled)),
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
    <Tabs defaultValue="items" className="owner-menu-page space-y-5">
      <SectionHeader
        title="Enterprise menu engine"
        description="Dine-in, parcel, and delivery menus with GST, admin master categories/cuisines, modifiers, combos, inventory links, QR menus, and Firestore-ready persistence."
      />
      <TabsList className="customer-scroll max-w-full overflow-x-auto">
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="tax">GST & menus</TabsTrigger>
        <TabsTrigger value="combos">Combos</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="qr">QR & languages</TabsTrigger>
        <TabsTrigger value="bulk">Import/Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="items" className="space-y-6">
        {itemEditorOpen ? (
        <section className="owner-menu-wizard overflow-hidden rounded-lg border bg-card text-[#182230] shadow-sm">
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-primary">Menu items</p>
              <h2 className="text-2xl font-black">{editing ? "Edit menu item" : "Create new menu item"}</h2>
              <p className="text-sm text-muted-foreground">Add item details for dine-in, parcel, and customer delivery menus.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={closeItemEditor}>
                <X className="size-4" />
                Back to list
              </Button>
              <Button type="button" variant="outline" onClick={() => setActiveItemStep("review")}>
                <Eye className="size-4" />
                Preview item
              </Button>
            </div>
          </div>

          <form className="grid lg:grid-cols-[290px_minmax(0,1fr)]" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}>
            <aside className="hidden border-r bg-muted/20 p-4 lg:block">
              <div className="space-y-2">
                {ITEM_WIZARD_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const active = step.id === activeItemStep;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`grid w-full grid-cols-[36px_1fr] gap-3 rounded-md border p-3 text-left transition ${active ? "border-primary bg-primary/8 shadow-sm" : "bg-card hover:border-primary/40"}`}
                      onClick={() => setActiveItemStep(step.id)}
                    >
                      <span className={`grid size-9 place-items-center rounded-full text-sm font-black ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-black">
                          <Icon className="size-4" />
                          {step.label}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-muted-foreground">{step.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-w-0 p-4 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-2 lg:hidden">
                {ITEM_WIZARD_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`grid size-9 place-items-center rounded-full border text-sm font-black ${step.id === activeItemStep ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    onClick={() => setActiveItemStep(step.id)}
                    aria-label={step.label}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-5">
                  <div>
                    <p className="text-sm font-black text-primary">Step {activeItemStepIndex + 1} of {ITEM_WIZARD_STEPS.length}</p>
                    <h3 className="mt-1 text-xl font-black">{ITEM_WIZARD_STEPS[activeItemStepIndex]?.label}</h3>
                  </div>

                  {activeItemStep === "basic" ? (
                    <div className="grid gap-5">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_170px]">
                        <div className="relative min-h-64 overflow-hidden rounded-lg bg-muted">
                          <SafeImage src={imagePreview} alt="Menu image preview" fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="720px" className="object-cover" />
                          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">Cover</Badge>
                          {imagePreview !== fallbackImage ? (
                            <Button type="button" size="icon" variant="secondary" className="absolute right-3 top-3" aria-label="Remove image" onClick={() => setImagePreview(fallbackImage)}>
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid gap-3">
                          <div className="relative min-h-24 overflow-hidden rounded-md bg-muted">
                            <SafeImage src={imagePreview} alt="Menu thumbnail" fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="170px" className="object-cover" />
                          </div>
                          <CloudinaryUploadWidget
                            folder="menu"
                            restaurantId={restaurantId}
                            aspectRatio={4 / 3}
                            tags={["menu-item"]}
                            label="Add image"
                            className="min-h-24 border-dashed"
                            onUpload={(url) => setImagePreview(url)}
                          />
                          <div className="grid gap-2">
                            <FieldLabel htmlFor="menu-image-url" help="Use this if upload is unavailable. Paste a public image URL from Cloudinary or another HTTPS image source. Example: https://res.cloudinary.com/.../alfaham.webp">Image URL</FieldLabel>
                            <Input
                              id="menu-image-url"
                              value={imagePreview === fallbackImage ? "" : imagePreview}
                              placeholder="https://res.cloudinary.com/.../item.webp"
                              className="font-semibold text-foreground"
                              onChange={(event) => setImagePreview(event.target.value.trim() || fallbackImage)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <FieldLabel htmlFor="menu-name" help="Customer-facing item name. Keep it clear and under 100 characters. Example: Al Faham Chicken Half.">Item name</FieldLabel>
                          <Input id="menu-name" placeholder="Al Faham Chicken Half" maxLength={100} className="font-semibold text-foreground" {...form.register("name")} />
                          <FieldError message={form.formState.errors.name?.message} />
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel htmlFor="menu-price" help="Default price used when a channel-specific price is not set. Example: 442.">Base price</FieldLabel>
                          <Input id="menu-price" inputMode="numeric" className="font-semibold text-foreground" {...form.register("price", { valueAsNumber: true })} />
                          <FieldError message={form.formState.errors.price?.message} />
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel htmlFor="menu-category" help="Choose a category from the Admin master list. Example: Grills.">Category</FieldLabel>
                          <select
                            id="menu-category"
                            className="h-11 rounded-md border bg-background px-3 text-sm font-semibold text-foreground"
                            value={selectedCategoryId}
                            onChange={(event) => {
                              const selected = categoryChoices.find((item) => item.id === event.target.value);
                              form.setValue("categoryId", selected?.id ?? "");
                              form.setValue("category", selected?.name ?? "");
                            }}
                          >
                            <option value="">Select category</option>
                            {categoryChoices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel htmlFor="menu-category-name" help="Auto-filled from the selected Admin master category and saved on the item. Example: Grills.">Category name</FieldLabel>
                          <Input id="menu-category-name" placeholder="Select a category first" className="font-semibold text-foreground" readOnly {...form.register("category")} />
                          <FieldError message={form.formState.errors.category?.message} />
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel htmlFor="menu-subcategory" help="Optional finer grouping shown in filters/search. Example: Arabic Grills.">Sub category</FieldLabel>
                          <Input id="menu-subcategory" placeholder="Arabic Grills" className="font-semibold text-foreground" {...form.register("subcategory")} />
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel help="Diet classification used for customer filters and badges. Example: nonveg for chicken grill.">Food type</FieldLabel>
                          <select className="h-11 rounded-md border bg-background px-3 text-sm font-semibold text-foreground" {...form.register("foodType")}>
                            <option value="">Select food type</option>
                            {(["veg", "nonveg", "egg", "vegan", "jain"] as MenuFoodType[]).map((item) => <option key={item} value={item}>{formatFoodTypeLabel(item)}</option>)}
                          </select>
                          <FieldError message={form.formState.errors.foodType?.message} />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                          <FieldLabel help="Optional cuisine tags for search and filters. Hold Ctrl to select multiple. Example: Arabic, Grills.">Cuisines</FieldLabel>
                          <select
                            multiple
                            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm font-semibold text-foreground"
                            value={selectedCuisineIds}
                            onChange={(event) => {
                              const selected = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
                              form.setValue("cuisineIds", selected);
                            }}
                          >
                            {cuisineChoices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeItemStep === "description" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <FieldLabel htmlFor="menu-description" help="Required customer-facing summary. Minimum 8 characters. Example: Charcoal grilled chicken with house spice rub.">Short description</FieldLabel>
                        <Textarea id="menu-description" rows={4} placeholder="Charcoal grilled chicken with house spice rub." className="font-semibold text-foreground" {...form.register("description")} />
                        <FieldError message={form.formState.errors.description?.message} />
                      </div>
                      <div className="grid gap-2">
                        <FieldLabel htmlFor="menu-long-description" help="Optional detail for item pages. Include serving size, preparation style, and taste notes. Example: Half chicken, serves 1-2.">Long description</FieldLabel>
                        <Textarea id="menu-long-description" rows={6} placeholder="Add preparation, serving size, and taste notes." className="font-semibold text-foreground" {...form.register("longDescription")} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <FieldLabel htmlFor="menu-prep" help="Kitchen preparation estimate shown in operations. Example: 20 min.">Prep time</FieldLabel>
                          <Input id="menu-prep" placeholder="20 min" className="font-semibold text-foreground" {...form.register("prepTime")} />
                          <FieldError message={form.formState.errors.prepTime?.message} />
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel help="Spice level used for filtering and customer expectation. Example: medium.">Spice</FieldLabel>
                          <select className="h-11 rounded-md border bg-background px-3 text-sm font-semibold text-foreground" {...form.register("spiceLevel")}>
                            <option value="">Select spice level</option>
                            {(["mild", "medium", "hot"] as MenuSpiceLevel[]).map((item) => <option key={item} value={item}>{formatSpiceLabel(item)}</option>)}
                          </select>
                          <FieldError message={form.formState.errors.spiceLevel?.message} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeItemStep === "customization" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <FieldLabel htmlFor="menu-modifiers" help="Optional choices that adjust preparation. Use Name:Price and commas. Example: Less spicy:0, Extra cheese:40.">Modifiers</FieldLabel>
                        <Input id="menu-modifiers" placeholder="Less spicy:0, Extra cheese:40" className="font-semibold text-foreground" {...form.register("modifiers")} />
                      </div>
                      <div className="grid gap-2">
                        <FieldLabel htmlFor="menu-addons" help="Optional paid extras shown to customers/POS. Use Name:Price and commas. Example: Egg:30, Paneer:60.">Add-ons</FieldLabel>
                        <Input id="menu-addons" placeholder="Egg:30, Paneer:60" className="font-semibold text-foreground" {...form.register("addOns")} />
                      </div>
                      <div className="rounded-md border bg-muted/30 p-4 text-sm font-semibold text-foreground/75">
                        Add prices after a colon. Example: Extra mayo:20, Cheese:35.
                      </div>
                    </div>
                  ) : null}

                  {activeItemStep === "info" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <FieldLabel help="Search/filter labels and popularity flags. Include bestseller to mark popular. Example: bestseller, spicy, family pack.">Tags</FieldLabel>
                        <Input placeholder="bestseller, chef special, spicy, shawarma, family pack" className="font-semibold text-foreground" {...form.register("tags")} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <FieldLabel help="Short visual badges for campaign/menu highlights. Example: New item, Ramadan special.">Badges</FieldLabel>
                          <Input placeholder="New item, Ramadan special" className="font-semibold text-foreground" {...form.register("badges")} />
                        </div>
                        <div className="grid gap-2">
                          <FieldLabel help="Extra words customers may search for. Example: jumbo meal, friday special, kids.">Search keywords</FieldLabel>
                          <Input placeholder="jumbo meal, friday special, kids" className="font-semibold text-foreground" {...form.register("searchKeywords")} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <FieldLabel help="Comma-separated allergen labels. Example: dairy, nuts, gluten.">Allergens</FieldLabel>
                        <Input placeholder="nuts, dairy, gluten" className="font-semibold text-foreground" {...form.register("allergens")} />
                      </div>
                    </div>
                  ) : null}

                  {activeItemStep === "visibility" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-md border p-4">
                        <FieldLabel help="Channel visibility is calculated from price. Example: leave Parcel price empty when the item is not available for takeaway.">Channel availability</FieldLabel>
                        <p className="text-sm font-semibold text-foreground/75">
                          Enter a price only for the channels where this item is available. Blank or zero channel price means the item is hidden for that channel.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <ChannelAvailabilityPill label="Dine-in" enabled={watchedVisibility["dine-in"]} price={watchedDineInPrice} />
                          <ChannelAvailabilityPill label="Parcel" enabled={watchedVisibility.parcel} price={watchedParcelPrice} />
                          <ChannelAvailabilityPill label="Delivery" enabled={watchedVisibility.delivery} price={watchedDeliveryPrice} />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <PriceField label="Dine-in price" id="dine-price" register={form.register("dineInPrice", { valueAsNumber: true })} help="Optional. Price charged for tables and in-house orders. Leave blank when dine-in is not available. Example: 442." />
                        <PriceField label="Parcel price" id="parcel-price" register={form.register("parcelPrice", { valueAsNumber: true })} help="Optional. Pickup/takeaway price. Leave blank when parcel is not available. Example: 459." />
                        <PriceField label="Delivery price" id="delivery-price" register={form.register("deliveryPrice", { valueAsNumber: true })} help="Optional. Customer online delivery price. Leave blank to hide this item from customer delivery menus. Example: 479." />
                        <PriceField label="Packing charge" id="packing-charge" register={form.register("packingCharge", { valueAsNumber: true })} help="Optional per-item parcel/delivery packing charge. Leave blank for zero. Example: 10." />
                      </div>
                      <FieldError message={form.formState.errors.dineInPrice?.message ?? form.formState.errors.parcelPrice?.message ?? form.formState.errors.deliveryPrice?.message ?? form.formState.errors.packingCharge?.message} />
                    </div>
                  ) : null}

                  {activeItemStep === "review" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[140px_1fr]">
                        <div className="relative min-h-32 overflow-hidden rounded-md bg-muted">
                          <SafeImage src={imagePreview} alt={watchedName || "Menu item preview"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="160px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={watchedFoodType === "nonveg" ? "warning" : "success"}>{watchedFoodType}</Badge>
                            <Badge variant="outline">{watchedCategory || "Category pending"}</Badge>
                            {watchedVisibility.delivery ? <Badge variant="success">Customer visible</Badge> : <Badge variant="warning">Delivery hidden</Badge>}
                          </div>
                          <h3 className="mt-3 text-xl font-black">{watchedName || "Item name pending"}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{[watchedSubcategory, watchedCategory].filter(Boolean).join(" - ") || "Menu placement pending"}</p>
                          <p className="mt-3 text-lg font-black">{formatCurrency(watchedDisplayPrice)}</p>
                        </div>
                      </div>
                      {Object.keys(form.formState.errors).length ? (
                        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive">
                          Some required fields are missing. Check name, category, description, price, and prep time.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs font-black uppercase text-muted-foreground">Live preview</p>
                    <div className="mt-3 overflow-hidden rounded-md border bg-card">
                      <div className="relative aspect-[4/3] bg-muted">
                        <SafeImage src={imagePreview} alt={watchedName || "Menu preview"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="320px" className="object-cover" />
                        <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">{formatFoodTypeLabel(watchedFoodType)}</Badge>
                      </div>
                      <div className="space-y-2 p-3">
                        <h3 className="line-clamp-1 font-black">{watchedName || "New menu item"}</h3>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{watchedCategory || "Category pending"}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black">{formatCurrency(watchedDisplayPrice)}</span>
                          <Badge variant={watchedVisibility.delivery ? "success" : "warning"}>{watchedVisibility.delivery ? "Live" : "Hidden"}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-lg border p-4 text-sm">
                    <p className="font-black">Channel prices</p>
                    <SummaryRow label="Dine-in" value={formatOptionalChannelPrice(watchedDineInPrice)} />
                    <SummaryRow label="Parcel" value={formatOptionalChannelPrice(watchedParcelPrice)} />
                    <SummaryRow label="Delivery" value={formatOptionalChannelPrice(watchedDeliveryPrice)} />
                    <SummaryRow label="Packing" value={formatOptionalChannelPrice(watchedPackingCharge, "No charge")} />
                  </div>
                </aside>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={activeItemStepIndex === 0}
                    onClick={() => setActiveItemStep(ITEM_WIZARD_STEPS[Math.max(0, activeItemStepIndex - 1)]?.id ?? "basic")}
                  >
                    Back
                  </Button>
                  {editing ? (
                    <Button type="button" variant="outline" onClick={closeItemEditor}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button
                    type={activeItemStep === "review" ? "submit" : "button"}
                    disabled={apiPhase === "loading"}
                    onClick={activeItemStep === "review" ? undefined : () => setActiveItemStep(ITEM_WIZARD_STEPS[Math.min(ITEM_WIZARD_STEPS.length - 1, activeItemStepIndex + 1)]?.id ?? "review")}
                    className="min-w-36"
                  >
                    {apiPhase === "loading" ? <Loader2 className="size-4 animate-spin" /> : activeItemStep === "review" ? editing ? <Save className="size-4" /> : <Plus className="size-4" /> : <ImagePlus className="size-4" />}
                    {activeItemStep === "review" ? editing ? "Save item" : "Create item" : "Next"}
                  </Button>
                  {apiMessage ? <p className="text-sm font-semibold text-primary">{apiMessage}</p> : null}
                </div>
              </div>
            </div>
          </form>
        </section>
        ) : null}

        {!itemEditorOpen ? (
        <section className="space-y-4">
          <SectionHeader
            title="Menu items"
            description="Review created items, filter by every operational status, and keep dine-in, parcel, and delivery prices visible before publishing to customers."
            action={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadExcelTemplate}>
                  <Download className="size-4" />
                  Template
                </Button>
                <Button type="button" onClick={beginCreateItem}>
                  <Plus className="size-4" />
                  Add item
                </Button>
              </div>
            }
          />
          <div className="grid gap-3 md:grid-cols-4">
            <Metric icon={PackageCheck} label="Customer visible" value={menuItems.filter((item) => isItemVisible(item, "delivery") && !item.soldOut).length} />
            <Metric icon={BarChart3} label={`${activeChannel} value`} value={formatCurrency(channelRevenuePreview)} />
            <Metric icon={AlertTriangle} label="Stock risks" value={menuItems.filter((item) => shouldAutoSoldOut(item, inventoryItems)).length} />
            <Metric icon={Eye} label="Filtered" value={`${filteredMenuItems.length}/${menuItems.length}`} />
          </div>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/60" />
                  <Input
                    className="h-11 pl-10 font-semibold text-foreground placeholder:text-foreground/50"
                    placeholder="Search item, category, tag, allergen, cuisine..."
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["dine-in", "parcel", "delivery"] as MenuChannel[]).map((channel) => (
                    <Button key={channel} type="button" size="sm" variant={activeChannel === channel ? "default" : "outline"} onClick={() => setActiveChannel(channel)}>
                      {channel}
                    </Button>
                  ))}
                  <Button type="button" variant={filterActive ? "secondary" : "outline"} onClick={resetItemFilters}>
                    {filterActive ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
                    {filterActive ? "Clear filters" : "Filters ready"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <FilterSelect label="Category" value={itemCategoryFilter} onChange={setItemCategoryFilter} options={[{ value: "all", label: "All categories" }, ...itemCategoryFilters.map((item) => ({ value: item, label: item }))]} />
                <FilterSelect label="Food type" value={itemFoodFilter} onChange={setItemFoodFilter} options={[
                  { value: "all", label: "All food types" },
                  { value: "veg", label: "Veg" },
                  { value: "nonveg", label: "Non-veg" },
                  { value: "egg", label: "Egg" },
                  { value: "vegan", label: "Vegan" },
                  { value: "jain", label: "Jain" },
                ]} />
                <FilterSelect label="Channel" value={itemChannelFilter} onChange={(value) => setItemChannelFilter(value as ItemFilterChannel)} options={[
                  { value: "all", label: "All channels" },
                  { value: "dine-in", label: "Dine-in visible" },
                  { value: "parcel", label: "Parcel visible" },
                  { value: "delivery", label: "Delivery visible" },
                ]} />
                <FilterSelect label="Customer visibility" value={itemVisibilityFilter} onChange={setItemVisibilityFilter} options={[
                  { value: "all", label: "All visibility" },
                  { value: "customer-visible", label: "Visible to customer" },
                  { value: "customer-hidden", label: "Hidden from customer" },
                ]} />
                <FilterSelect label="Availability" value={itemAvailabilityFilter} onChange={setItemAvailabilityFilter} options={[
                  { value: "all", label: "All availability" },
                  { value: "available", label: "Available" },
                  { value: "sold-out", label: "Sold out" },
                ]} />
                <FilterSelect label="Delivery price" value={itemPriceFilter} onChange={setItemPriceFilter} options={[
                  { value: "all", label: "Any price" },
                  { value: "under-150", label: "Under Rs 150" },
                  { value: "150-300", label: "Rs 150 - Rs 300" },
                  { value: "300-500", label: "Rs 300 - Rs 500" },
                  { value: "above-500", label: "Above Rs 500" },
                ]} />
                <FilterSelect label="Image" value={itemImageFilter} onChange={setItemImageFilter} options={[
                  { value: "all", label: "All images" },
                  { value: "with-image", label: "Has image" },
                  { value: "missing-image", label: "Missing image" },
                ]} />
                <FilterSelect label="Modifiers" value={itemModifierFilter} onChange={setItemModifierFilter} options={[
                  { value: "all", label: "All modifier states" },
                  { value: "with-modifiers", label: "Has modifiers" },
                  { value: "without-modifiers", label: "No modifiers" },
                ]} />
                <FilterSelect label="Sort" value={itemSort} onChange={setItemSort} options={[
                  { value: "name", label: "Name A-Z" },
                  { value: "category", label: "Category" },
                  { value: "price-low", label: "Price low-high" },
                  { value: "price-high", label: "Price high-low" },
                ]} />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            {filteredMenuItems.length ? filteredMenuItems.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                activeChannel={activeChannel}
                taxRate={taxSettings.defaultGstRate}
                onEdit={() => beginEdit(item)}
                onToggleSoldOut={() => void toggleSoldOut(item.id)}
                onToggleDelivery={() => void updateMenuItem(applyChannelAvailability(item, "delivery", !isItemVisible(item, "delivery")))}
                onToggleParcel={() => void updateMenuItem(applyChannelAvailability(item, "parcel", !isItemVisible(item, "parcel")))}
                onClonePrice={() => void updateMenuItem(cloneMenuForChannel(item, "dine-in", activeChannel))}
                onDelete={() => void deleteMenuItem(item.id)}
              />
            )) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Search className="size-10 text-foreground/50" />
                  <h3 className="text-lg font-black text-foreground">No menu items match these filters</h3>
                  <p className="max-w-xl text-sm font-semibold text-foreground/70">Clear filters or add a new item. Customer pages only show items that are available and delivery-visible.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="outline" onClick={resetItemFilters}>Clear filters</Button>
                    <Button type="button" onClick={beginCreateItem}>Add item</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
        ) : null}

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-black">Wizard style - Step by step item creation</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {ITEM_WIZARD_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button key={step.id} type="button" className="grid min-h-36 gap-3 rounded-md border bg-background p-4 text-left hover:border-primary/50" onClick={() => {
                  if (!itemEditorOpen) beginCreateItem();
                  setActiveItemStep(step.id);
                }}>
                  <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-black">{step.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{step.description}</span>
                  </span>
                  <span className="mt-auto rounded-md bg-muted px-3 py-2 text-xs font-bold">{step.meta}</span>
                </button>
              );
            })}
          </div>
        </section>
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
              <CloudinaryUploadWidget folder="combos" restaurantId={restaurantId} aspectRatio={4 / 3} tags={["combo"]} label="Upload combo image" onUpload={(url) => setComboDraft({ ...comboDraft, image: url })} />
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
              <p className="rounded-md bg-muted p-3 text-sm font-bold">
                Import uses the same fields as item creation. Dine-in, parcel, and delivery prices are optional; blank price means that channel is unavailable.
              </p>
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
            ["Delivery-enabled", menuItems.filter((entry) => isItemVisible(entry, "delivery") && !entry.soldOut).length],
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
  const value = (...keys: string[]) => {
    const normalizedKeys = keys.map((key) => key.trim().toLowerCase());
    const normalizedKey = Object.keys(row).find((entry) => normalizedKeys.includes(entry.trim().toLowerCase()));
    return normalizedKey ? String(row[normalizedKey] ?? "").trim() : "";
  };
  const name = value("item name") || value("name");
  const category = value("category");
  const subcategory = value("sub category", "subcategory");
  const cuisines = value("cuisines", "cuisine");
  const price = parseOptionalPriceValue(value("base price", "price")) ?? 0;
  const legacyDineInEnabled = parseYesNo(value("dine-in enabled"));
  const legacyParcelEnabled = parseYesNo(value("parcel enabled"));
  const legacyDeliveryEnabled = parseYesNo(value("delivery enabled"));
  const dineInPrice = parseOptionalPriceValue(value("dine-in price", "dine in price")) ?? (legacyDineInEnabled ? price : undefined);
  const parcelPrice = parseOptionalPriceValue(value("parcel price")) ?? (legacyParcelEnabled ? price : undefined);
  const deliveryPrice = parseOptionalPriceValue(value("delivery price")) ?? (legacyDeliveryEnabled ? price : undefined);
  const packingCharge = parseOptionalPriceValue(value("packing charge"));
  const description = value("short description", "description");
  const longDescription = value("long description");
  const foodType = normalizeFoodType(value("veg/non-veg") || value("food type"));
  const spiceLevel = normalizeSpiceLevel(value("spice level"));
  const prepTime = value("prep time") || "20 min";
  const imageUrl = value("image url");
  const tags = value("tags");
  const badges = value("badges");
  const searchKeywords = value("search keywords");
  const allergens = value("allergens");
  const modifiers = value("modifiers");
  const addOns = value("add-ons", "addons", "add ons");
  const dineInEnabled = isPositivePrice(dineInPrice);
  const parcelEnabled = isPositivePrice(parcelPrice);
  const deliveryEnabled = isPositivePrice(deliveryPrice);
  const errors = [
    !name ? "item name is required" : "",
    !category ? "category is required" : "",
    Number.isFinite(price) && price > 0 ? "" : "base price must be greater than zero",
    description.length >= 8 ? "" : "description must be at least 8 characters",
    !imageUrl ? "image URL is required" : "",
    imageUrl && !isValidUrl(imageUrl) ? "image URL must be valid" : "",
    !dineInEnabled && !parcelEnabled && !deliveryEnabled ? "enter at least one channel price" : "",
    !isPricedTokenList(modifiers) ? "modifier format must be Name:Price" : "",
    !isPricedTokenList(addOns) ? "add-on format must be Name:Price" : "",
  ].filter(Boolean);

  return {
    rowNumber,
    name,
    category,
    subcategory,
    cuisines,
    cuisineIds: [],
    price: Number.isFinite(price) ? price : 0,
    dineInPrice,
    parcelPrice,
    deliveryPrice,
    packingCharge,
    description,
    longDescription,
    foodType,
    spiceLevel,
    prepTime,
    imageUrl,
    tags,
    badges,
    searchKeywords,
    allergens,
    modifiers,
    addOns,
    dineInEnabled,
    parcelEnabled,
    deliveryEnabled,
    valid: errors.length === 0,
    errors,
  };
}

function normalizeFoodType(value: string): MenuFoodType {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "nonveg" || normalized === "nonvegetarian") return "nonveg";
  if (normalized === "egg") return "egg";
  if (normalized === "vegan") return "vegan";
  if (normalized === "jain") return "jain";
  return "veg";
}

function normalizeSpiceLevel(value: string): MenuFormValues["spiceLevel"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "mild" || normalized === "hot") return normalized;
  return "medium";
}

function formatFoodTypeLabel(value?: MenuFoodType | "") {
  if (value === "nonveg") return "Non-veg";
  if (value === "egg") return "Egg";
  if (value === "vegan") return "Vegan";
  if (value === "jain") return "Jain";
  if (value === "veg") return "Veg";
  return "Food type pending";
}

function formatSpiceLabel(value?: MenuSpiceLevel | "") {
  if (value === "mild") return "Mild";
  if (value === "medium") return "Medium";
  if (value === "hot") return "Hot";
  return "Spice level pending";
}

function parseYesNo(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return ["yes", "y", "true", "1", "enabled", "active"].includes(normalized);
}

function parseOptionalPriceValue(value: string) {
  if (!value.trim()) return undefined;
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned) return undefined;
  const normalized = Number(cleaned);
  return Number.isFinite(normalized) ? normalized : undefined;
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
  const explicit = item.menuVisibility?.[channel];
  if (typeof explicit === "boolean") return explicit && (isPositivePrice(channelPriceValue(item, channel)) || item.price > 0);
  return isPositivePrice(channelPriceValue(item, channel)) || item.price > 0;
}

function channelPriceValue(item: MenuItem, channel: MenuChannel) {
  if (channel === "dine-in") return item.dineInPrice;
  if (channel === "parcel") return item.parcelPrice;
  return item.deliveryPrice;
}

function formChannelPrice(item: MenuItem, channel: MenuChannel) {
  if (item.menuVisibility?.[channel] === false) return undefined;
  const channelPrice = channelPriceValue(item, channel);
  return isPositivePrice(channelPrice) ? channelPrice : item.menuVisibility?.[channel] ? item.price : undefined;
}

function applyChannelAvailability(item: MenuItem, channel: MenuChannel, enabled: boolean): MenuItem {
  const nextVisibility = {
    ...buildChannelVisibility(item.dineInPrice, item.parcelPrice, item.deliveryPrice),
    ...item.menuVisibility,
    [channel]: enabled,
  };
  const nextPrice = enabled ? channelPriceValue(item, channel) || item.price : 0;
  const next = { ...item, menuVisibility: nextVisibility };
  if (channel === "dine-in") return { ...next, dineInPrice: nextPrice };
  if (channel === "parcel") return { ...next, parcelPrice: nextPrice };
  return { ...next, deliveryPrice: nextPrice };
}

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeOptionalPrice(value?: number) {
  return isPositivePrice(value) ? value : undefined;
}

function buildChannelVisibility(dineInPrice?: number, parcelPrice?: number, deliveryPrice?: number): Record<MenuChannel, boolean> {
  return {
    "dine-in": isPositivePrice(dineInPrice),
    parcel: isPositivePrice(parcelPrice),
    delivery: isPositivePrice(deliveryPrice),
  };
}

function firstPositivePrice(...values: Array<number | undefined>) {
  return values.find((value) => isPositivePrice(value));
}

function formatOptionalChannelPrice(value?: number, emptyLabel = "Not available") {
  return isPositivePrice(value) ? formatCurrency(value) : emptyLabel;
}

function formatChannelItemPrice(item: MenuItem, channel: MenuChannel) {
  const channelPrice = channelPriceValue(item, channel);
  return isItemVisible(item, channel) ? formatCurrency(isPositivePrice(channelPrice) ? channelPrice : item.price) : "Not available";
}

function resolveCuisineIds(value: string, choices: Array<{ id: string; name: string }>) {
  const ids: string[] = [];
  const errors: string[] = [];
  if (!value.trim()) return { ids, errors };
  const byId = new Map(choices.map((item) => [item.id.trim().toLowerCase(), item]));
  const byName = new Map(choices.map((item) => [item.name.trim().toLowerCase(), item]));
  for (const token of splitList(value)) {
    const normalized = token.trim().toLowerCase();
    const match = byId.get(normalized) ?? byName.get(normalized);
    if (match) ids.push(match.id);
    else errors.push(`unknown cuisine: ${token}`);
  }
  return { ids: unique(ids), errors };
}

function PriceField({ label, id, register, help }: { label: string; id: string; register: ReturnType<typeof useForm<MenuFormValues>>["register"] extends (...args: never[]) => infer R ? R : never; help?: string }) {
  return (
    <div className="grid gap-2">
      <FieldLabel htmlFor={id} help={help ?? `${label} shown for this channel. Example: 459.`}>{label}</FieldLabel>
      <Input id={id} inputMode="numeric" className="font-semibold text-foreground" {...register} />
    </div>
  );
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function ChannelAvailabilityPill({ label, enabled, price }: { label: string; enabled: boolean; price?: number }) {
  return (
    <div className={`rounded-md border px-3 py-3 text-sm font-bold ${enabled ? "border-success/30 bg-success/10 text-success" : "bg-muted text-foreground/70"}`}>
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <Badge variant={enabled ? "success" : "muted"}>{enabled ? "Available" : "Hidden"}</Badge>
      </div>
      <p className="mt-1 text-xs font-black uppercase">{formatOptionalChannelPrice(price)}</p>
    </div>
  );
}

function FieldLabel({ children, htmlFor, help }: { children: React.ReactNode; htmlFor?: string; help: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-black text-foreground">{children}</Label>
      <InfoTooltip label={help} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-bold text-destructive">{message}</p> : null;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase text-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-bold text-foreground">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MenuItemRow({
  item,
  activeChannel,
  taxRate,
  onEdit,
  onToggleSoldOut,
  onToggleDelivery,
  onToggleParcel,
  onClonePrice,
  onDelete,
}: {
  item: MenuItem;
  activeChannel: MenuChannel;
  taxRate: number;
  onEdit: () => void;
  onToggleSoldOut: () => void;
  onToggleDelivery: () => void;
  onToggleParcel: () => void;
  onClonePrice: () => void;
  onDelete: () => void;
}) {
  const customerVisible = isItemVisible(item, "delivery") && !item.soldOut;
  return (
    <Card>
      <CardContent className="grid gap-4 p-3 lg:grid-cols-[112px_minmax(0,1fr)_minmax(280px,360px)_auto] lg:items-center">
        <div className="relative min-h-28 overflow-hidden rounded-md bg-muted">
          <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="160px" className="object-cover" />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{item.category}</Badge>
            <Badge variant={customerVisible ? "success" : "warning"}>{customerVisible ? "Customer visible" : "Customer hidden"}</Badge>
            <Badge variant={item.isVeg ? "success" : "warning"}>{item.foodType ?? (item.isVeg ? "veg" : "nonveg")}</Badge>
            {item.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
          </div>
          <h2 className="line-clamp-1 text-base font-black text-foreground">{item.name}</h2>
          <p className="line-clamp-2 text-sm font-semibold text-foreground/70">{item.description || "No description added."}</p>
          <p className="text-xs font-bold text-foreground/70">GST {item.taxRate ?? taxRate}% · Prep {item.prepTime} · Active audit: {activeChannel} {formatCurrency(getChannelPrice(item, activeChannel))}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <PricePill label="Dine-in" value={formatChannelItemPrice(item, "dine-in")} active={isItemVisible(item, "dine-in")} />
          <PricePill label="Parcel" value={formatChannelItemPrice(item, "parcel")} active={isItemVisible(item, "parcel")} />
          <PricePill label="Delivery" value={formatChannelItemPrice(item, "delivery")} active={isItemVisible(item, "delivery")} />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button size="sm" variant="outline" onClick={() => void copyCustomerItemLink(item)}>
            <Link2 className="size-4" />
            Copy link
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={buildCustomerItemPath(item)} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open
            </a>
          </Button>
          <Button size="sm" variant="outline" onClick={() => shareCustomerItemOnWhatsApp(item)}>
            <MessageCircle className="size-4" />
            WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit3 className="size-4" />
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={onToggleSoldOut}>
            {item.soldOut ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
            {item.soldOut ? "Restock" : "Sold out"}
          </Button>
          <Button size="sm" variant="outline" onClick={onToggleDelivery}>Delivery {isItemVisible(item, "delivery") ? "off" : "on"}</Button>
          <Button size="sm" variant="outline" onClick={onToggleParcel}>Parcel {isItemVisible(item, "parcel") ? "off" : "on"}</Button>
          <Button size="sm" variant="outline" onClick={onClonePrice}>
            <Copy className="size-4" />
            Clone
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function buildCustomerItemPath(item: MenuItem) {
  const slug = item.restaurantSlug || DEFAULT_RESTAURANT_ID;
  const itemId = item.id.split("::")[0];
  return `/restaurant/${encodeURIComponent(slug)}/item/${encodeURIComponent(itemId)}`;
}

function buildCustomerItemUrl(item: MenuItem) {
  const path = buildCustomerItemPath(item);
  if (typeof window !== "undefined" && window.location.origin) return `${window.location.origin}${path}`;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return configuredOrigin ? `${configuredOrigin}${path}` : path;
}

async function copyCustomerItemLink(item: MenuItem) {
  const url = buildCustomerItemUrl(item);
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) throw new Error("Clipboard is not available.");
    await navigator.clipboard.writeText(url);
    toast.success("Customer item link copied.");
  } catch {
    if (typeof window !== "undefined") window.prompt("Copy customer item link", url);
  }
}

function shareCustomerItemOnWhatsApp(item: MenuItem) {
  const url = buildCustomerItemUrl(item);
  const href = `https://wa.me/?text=${encodeURIComponent(buildMenuItemPromotionMessage(item, url))}`;
  if (typeof window !== "undefined") {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}

function buildMenuItemPromotionMessage(item: MenuItem, url: string) {
  const restaurantName = humanizeRestaurantSlug(item.restaurantSlug || DEFAULT_RESTAURANT_ID);
  const price = firstPositivePrice(item.deliveryPrice, item.parcelPrice, item.dineInPrice, item.price);
  return [
    `Try ${item.name} from ${restaurantName}.`,
    item.description ? item.description.slice(0, 140) : "",
    price ? `Price starts at ${formatCurrency(price)}.` : "",
    `Order now or schedule later: ${url}`,
  ].filter(Boolean).join("\n");
}

function humanizeRestaurantSlug(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PricePill({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${active ? "bg-primary/5" : "bg-muted/40 opacity-70"}`}>
      <p className="text-xs font-black uppercase text-foreground/70">{label}</p>
      <p className="mt-1 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function validateMenuDraft(values: MenuFormValues, image: string, menuItems: MenuItem[], editingId?: string): { step: ItemWizardStepId; message: string } | null {
  if (!hasCustomImage(image)) return { step: "basic", message: "Add a real item image by upload or image URL." };
  if (menuItems.some((item) => item.id !== editingId && item.name.trim().toLowerCase() === values.name.trim().toLowerCase())) {
    return { step: "basic", message: "An item with this name already exists." };
  }
  const channelVisibility = buildChannelVisibility(values.dineInPrice, values.parcelPrice, values.deliveryPrice);
  if (!channelVisibility["dine-in"] && !channelVisibility.parcel && !channelVisibility.delivery) {
    return { step: "visibility", message: "Enter a price for at least one channel. Blank channel prices are treated as unavailable." };
  }
  if (!isPricedTokenList(values.modifiers)) return { step: "customization", message: "Modifier format must be Name:Price, separated by commas." };
  if (!isPricedTokenList(values.addOns)) return { step: "customization", message: "Add-on format must be Name:Price, separated by commas." };
  return null;
}

function stepForFormErrors(errors: ReturnType<typeof useForm<MenuFormValues>>["formState"]["errors"]): ItemWizardStepId {
  const keys = Object.keys(errors);
  if (keys.some((key) => ["name", "category", "categoryId", "price", "foodType"].includes(key))) return "basic";
  if (keys.some((key) => ["description", "longDescription", "prepTime", "spiceLevel"].includes(key))) return "description";
  if (keys.some((key) => ["modifiers", "addOns", "modifierGroups"].includes(key))) return "customization";
  if (keys.some((key) => ["tags", "badges", "searchKeywords", "allergens"].includes(key))) return "info";
  if (keys.some((key) => ["menuVisibility", "dineInPrice", "parcelPrice", "deliveryPrice", "packingCharge"].includes(key))) return "visibility";
  return "basic";
}

function isPricedTokenList(value?: string) {
  return splitList(value).every((entry) => {
    const [name, price] = entry.split(":");
    return Boolean(name?.trim()) && price !== undefined && Number.isFinite(Number(price)) && Number(price) >= 0;
  });
}

function hasCustomImage(value?: string) {
  return Boolean(value && value !== fallbackImage && value !== IMAGE_FALLBACKS.food && value.trim().length > 8);
}

function matchesPriceBand(price: number, band: string) {
  if (band === "under-150") return price < 150;
  if (band === "150-300") return price >= 150 && price <= 300;
  if (band === "300-500") return price > 300 && price <= 500;
  if (band === "above-500") return price > 500;
  return true;
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
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
