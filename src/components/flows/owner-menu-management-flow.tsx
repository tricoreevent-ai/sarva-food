"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Boxes, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Edit3, Eye, FileSpreadsheet, ImagePlus, Languages, Link2, Loader2, MessageCircle, PackageCheck, Plus, QrCode, Save, Search, SlidersHorizontal, Trash2, ToggleLeft, ToggleRight, Upload, X } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { SectionHeader } from "@/components/layout/section-header";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePublicCategories, usePublicCuisines } from "@/hooks/use-public-data";
import { useAlert } from "@/hooks/useAlert";
import { useWhatsAppShare } from "@/hooks/useWhatsAppShare";
import { useAppStore } from "@/lib/app-store";
import { buildQrPayload, calculateRestaurantTax, getChannelPrice, getInventoryStatus, MENU_LANGUAGES, parsePricedTokens, shouldAutoSoldOut, type MenuChannel } from "@/lib/menu-engine";
import { advancedMenuItemSchema, comboSchema, taxSettingsSchema } from "@/lib/schemas/menu";
import type { ComboOffer, InventoryItem, MenuItem } from "@/lib/types";
import type { AlertApi } from "@/types/alert.types";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID } from "@/lib/tenant";

type MenuFormValues = z.infer<typeof advancedMenuItemSchema>;
type MenuFoodType = MenuFormValues["foodType"];
type MenuSpiceLevel = MenuFormValues["spiceLevel"];

const fallbackImage: string = IMAGE_FALLBACKS.food;

type ItemWizardStepId = "basic" | "description" | "customization" | "info" | "visibility" | "review";
type ItemFilterChannel = "all" | MenuChannel;
type ItemFilterOption = "all" | string;
type ItemQuickFilter = "all" | "active" | "sold-out" | "veg" | "nonveg" | "delivery" | "parcel" | "dine-in";

const itemListPageSize = 10;

const quickFilterOptions: Array<{ value: ItemQuickFilter; label: string; help: string }> = [
  { value: "all", label: "All", help: "Show all menu items" },
  { value: "active", label: "Active", help: "Show customer-visible available items" },
  { value: "sold-out", label: "Sold Out", help: "Show items hidden as sold out" },
  { value: "veg", label: "Veg", help: "Show vegetarian items" },
  { value: "nonveg", label: "Non Veg", help: "Show non-vegetarian items" },
  { value: "delivery", label: "Delivery", help: "Show delivery-enabled items" },
  { value: "parcel", label: "Parcel", help: "Show parcel-enabled items" },
  { value: "dine-in", label: "Dine-In", help: "Show dine-in-enabled items" },
];

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
  const { confirm, prompt } = useAlert();
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
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [activeItemStep, setActiveItemStep] = useState<ItemWizardStepId>("basic");
  const [activeChannel, setActiveChannel] = useState<MenuChannel>("delivery");
  const [itemSearch, setItemSearch] = useState("");
  const [debouncedItemSearch, setDebouncedItemSearch] = useState("");
  const [itemQuickFilter, setItemQuickFilter] = useState<ItemQuickFilter>("all");
  const [itemCategoryFilter, setItemCategoryFilter] = useState<ItemFilterOption>("all");
  const [itemCuisineFilter, setItemCuisineFilter] = useState<ItemFilterOption>("all");
  const [itemFoodFilter, setItemFoodFilter] = useState<ItemFilterOption>("all");
  const [itemChannelFilter, setItemChannelFilter] = useState<ItemFilterChannel>("all");
  const [itemVisibilityFilter, setItemVisibilityFilter] = useState<ItemFilterOption>("all");
  const [itemAvailabilityFilter, setItemAvailabilityFilter] = useState<ItemFilterOption>("all");
  const [itemPriceFilter, setItemPriceFilter] = useState<ItemFilterOption>("all");
  const [itemImageFilter, setItemImageFilter] = useState<ItemFilterOption>("all");
  const [itemModifierFilter, setItemModifierFilter] = useState<ItemFilterOption>("all");
  const [itemAllergenFilter, setItemAllergenFilter] = useState<ItemFilterOption>("all");
  const [itemTagFilter, setItemTagFilter] = useState<ItemFilterOption>("all");
  const [itemPrepFilter, setItemPrepFilter] = useState<ItemFilterOption>("all");
  const [itemSort, setItemSort] = useState<ItemFilterOption>("name");
  const [cuisineQuery, setCuisineQuery] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemPage, setItemPage] = useState(1);
  const [imagePreviewItem, setImagePreviewItem] = useState<MenuItem | null>(null);
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
  const whatsappShare = useWhatsAppShare();
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
  const itemCategoryFilters = useMemo(() => unique(menuItems.map((item) => item.category).filter(Boolean)), [menuItems]);
  const itemCuisineFilters = useMemo(() => unique(menuItems.flatMap((item) => item.cuisineIds ?? [])), [menuItems]);
  const itemAllergenFilters = useMemo(() => unique(menuItems.flatMap((item) => item.allergenLabels ?? [])), [menuItems]);
  const itemTagFilters = useMemo(() => unique(menuItems.flatMap((item) => [...(item.tags ?? []), ...(item.badges ?? [])])), [menuItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedItemSearch(itemSearch), 250);
    return () => window.clearTimeout(timer);
  }, [itemSearch]);

  const filteredMenuItems = useMemo(() => {
    const normalizedSearch = debouncedItemSearch.trim().toLowerCase();
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
        const quickFilterMatch =
          itemQuickFilter === "all" ||
          (itemQuickFilter === "active" && !item.soldOut && customerVisible) ||
          (itemQuickFilter === "sold-out" && Boolean(item.soldOut)) ||
          (itemQuickFilter === "veg" && (item.foodType === "veg" || item.isVeg)) ||
          (itemQuickFilter === "nonveg" && (item.foodType === "nonveg" || !item.isVeg)) ||
          (itemQuickFilter === "delivery" && isItemVisible(item, "delivery")) ||
          (itemQuickFilter === "parcel" && isItemVisible(item, "parcel")) ||
          (itemQuickFilter === "dine-in" && isItemVisible(item, "dine-in"));
        return (
          (!normalizedSearch || searchable.includes(normalizedSearch)) &&
          quickFilterMatch &&
          (itemCategoryFilter === "all" || item.category === itemCategoryFilter) &&
          (itemCuisineFilter === "all" || item.cuisineIds?.includes(itemCuisineFilter)) &&
          (itemFoodFilter === "all" || item.foodType === itemFoodFilter || (itemFoodFilter === "veg" ? item.isVeg : !item.isVeg)) &&
          channelVisible &&
          (itemVisibilityFilter === "all" || (itemVisibilityFilter === "customer-visible" ? customerVisible : !customerVisible)) &&
          (itemAvailabilityFilter === "all" || (itemAvailabilityFilter === "available" ? !item.soldOut : item.soldOut)) &&
          matchesPriceBand(deliveryPrice, itemPriceFilter) &&
          (itemImageFilter === "all" || (itemImageFilter === "with-image" ? hasImage : !hasImage)) &&
          (itemModifierFilter === "all" || (itemModifierFilter === "with-modifiers" ? hasModifiers : !hasModifiers)) &&
          (itemAllergenFilter === "all" || item.allergenLabels?.includes(itemAllergenFilter)) &&
          (itemTagFilter === "all" || item.tags?.includes(itemTagFilter) || item.badges?.includes(itemTagFilter)) &&
          matchesPrepBand(item.prepTime, itemPrepFilter)
        );
      })
      .sort((first, second) => {
        if (itemSort === "price-high") return (second.deliveryPrice ?? second.price) - (first.deliveryPrice ?? first.price);
        if (itemSort === "price-low") return (first.deliveryPrice ?? first.price) - (second.deliveryPrice ?? second.price);
        if (itemSort === "category") return first.category.localeCompare(second.category) || first.name.localeCompare(second.name);
        return first.name.localeCompare(second.name);
      });
  }, [debouncedItemSearch, itemAllergenFilter, itemAvailabilityFilter, itemCategoryFilter, itemChannelFilter, itemCuisineFilter, itemFoodFilter, itemImageFilter, itemModifierFilter, itemPrepFilter, itemPriceFilter, itemQuickFilter, itemSort, itemTagFilter, itemVisibilityFilter, menuItems]);
  const filterActive = Boolean(
    itemSearch ||
      itemQuickFilter !== "all" ||
      itemCategoryFilter !== "all" ||
      itemCuisineFilter !== "all" ||
      itemFoodFilter !== "all" ||
      itemChannelFilter !== "all" ||
      itemVisibilityFilter !== "all" ||
      itemAvailabilityFilter !== "all" ||
      itemPriceFilter !== "all" ||
      itemImageFilter !== "all" ||
      itemModifierFilter !== "all" ||
      itemAllergenFilter !== "all" ||
      itemTagFilter !== "all" ||
      itemPrepFilter !== "all" ||
      itemSort !== "name",
  );
  const totalItemPages = Math.max(1, Math.ceil(filteredMenuItems.length / itemListPageSize));
  const currentItemPage = Math.min(itemPage, totalItemPages);
  const paginatedMenuItems = useMemo(
    () => filteredMenuItems.slice((currentItemPage - 1) * itemListPageSize, currentItemPage * itemListPageSize),
    [currentItemPage, filteredMenuItems],
  );
  const selectedItems = useMemo(
    () => menuItems.filter((item) => selectedItemIds.includes(item.id)),
    [menuItems, selectedItemIds],
  );
  const currentPageSelected = paginatedMenuItems.length > 0 && paginatedMenuItems.every((item) => selectedItemIds.includes(item.id));

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
  const visibleCuisineChoices = useMemo(() => {
    const query = cuisineQuery.trim().toLowerCase();
    if (!query) return cuisineChoices;
    return cuisineChoices.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(query));
  }, [cuisineChoices, cuisineQuery]);

  function resetItemFilters() {
    setItemSearch("");
    setDebouncedItemSearch("");
    setItemQuickFilter("all");
    setItemCategoryFilter("all");
    setItemCuisineFilter("all");
    setItemFoodFilter("all");
    setItemChannelFilter("all");
    setItemVisibilityFilter("all");
    setItemAvailabilityFilter("all");
    setItemPriceFilter("all");
    setItemImageFilter("all");
    setItemModifierFilter("all");
    setItemAllergenFilter("all");
    setItemTagFilter("all");
    setItemPrepFilter("all");
    setItemSort("name");
  }

  function toggleItemSelection(itemId: string, selected: boolean) {
    setSelectedItemIds((current) => selected ? unique([...current, itemId]) : current.filter((id) => id !== itemId));
  }

  function toggleCurrentPageSelection(selected: boolean) {
    const pageIds = paginatedMenuItems.map((item) => item.id);
    setSelectedItemIds((current) => selected ? unique([...current, ...pageIds]) : current.filter((id) => !pageIds.includes(id)));
  }

  async function applyBulkAction(action: "active" | "sold-out" | "enable-delivery" | "disable-delivery" | "enable-parcel" | "disable-parcel" | "delete") {
    if (!selectedItems.length) return;
    if (action === "delete") {
      const confirmed = await confirm(`Delete ${selectedItems.length} selected menu item${selectedItems.length === 1 ? "" : "s"}?`, {
        title: "Delete selected items",
        confirmText: "Delete",
        confirmVariant: "danger",
        cancelText: "Keep",
        tone: "danger",
      });
      if (!confirmed) return;
    }

    await Promise.all(selectedItems.map((item) => {
      if (action === "active") return item.soldOut ? toggleSoldOut(item.id) : Promise.resolve();
      if (action === "sold-out") return item.soldOut ? Promise.resolve() : toggleSoldOut(item.id);
      if (action === "enable-delivery") return updateMenuItem(applyChannelAvailability(item, "delivery", true));
      if (action === "disable-delivery") return updateMenuItem(applyChannelAvailability(item, "delivery", false));
      if (action === "enable-parcel") return updateMenuItem(applyChannelAvailability(item, "parcel", true));
      if (action === "disable-parcel") return updateMenuItem(applyChannelAvailability(item, "parcel", false));
      return deleteMenuItem(item.id);
    }));
    toast.success(`Bulk action applied to ${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}.`);
    setSelectedItemIds([]);
  }

  async function duplicateMenuItem(item: MenuItem) {
    const draft = { ...item } as Partial<MenuItem>;
    delete draft.id;
    await createMenuItem({
      ...(draft as Omit<MenuItem, "id">),
      name: uniqueCloneName(item.name, menuItems),
      soldOut: item.soldOut ?? false,
    });
    toast.success(`${item.name} duplicated.`);
  }

  function beginCreateItem() {
    setEditing(null);
    form.reset(createEmptyMenuDraft());
    setImagePreview(fallbackImage);
    setImageGallery([]);
    setCuisineQuery("");
    setActiveItemStep("basic");
    setItemEditorOpen(true);
  }

  function closeItemEditor() {
    setEditing(null);
    form.reset(createEmptyMenuDraft());
    setImagePreview(fallbackImage);
    setImageGallery([]);
    setCuisineQuery("");
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
    setImageGallery(uniqueImageUrls([item.image, ...(item.images ?? [])]));
    setCuisineQuery("");
  }

  function addMenuImage(url: string) {
    const next = url.trim();
    if (!next) return;
    setImagePreview(next);
    setImageGallery((current) => uniqueImageUrls([next, ...current]));
  }

  function removeMenuImage(url: string) {
    const next = imageGallery.filter((item) => item !== url);
    setImageGallery(next);
    if (imagePreview === url) setImagePreview(next[0] ?? fallbackImage);
  }

  async function handleSubmit(values: MenuFormValues) {
    const galleryImages = uniqueImageUrls([imagePreview, ...imageGallery]);
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
      images: galleryImages,
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
                            <Button type="button" size="icon" variant="secondary" className="absolute right-3 top-3" aria-label="Remove image" onClick={() => removeMenuImage(imagePreview)}>
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
                            onUpload={addMenuImage}
                          />
                          <div className="grid gap-2">
                            <FieldLabel htmlFor="menu-image-url" help="Use this if upload is unavailable. Paste a public image URL from Cloudinary or another HTTPS image source. Example: https://res.cloudinary.com/.../alfaham.webp">Image URL</FieldLabel>
                            <Input
                              id="menu-image-url"
                              value={imagePreview === fallbackImage ? "" : imagePreview}
                              placeholder="https://res.cloudinary.com/.../item.webp"
                              className="font-semibold text-foreground"
                              onChange={(event) => setImagePreview(event.target.value.trim() || fallbackImage)}
                              onBlur={(event) => addMenuImage(event.target.value)}
                            />
                          </div>
                          {imageGallery.length ? (
                            <div className="grid gap-2">
                              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Item images</p>
                              <div className="grid grid-cols-3 gap-2">
                                {imageGallery.map((url) => (
                                  <div
                                    key={url}
                                    className={`relative aspect-square overflow-hidden rounded-md bg-muted shadow-sm transition hover:-translate-y-0.5 ${url === imagePreview ? "ring-2 ring-primary" : ""}`}
                                  >
                                    <button
                                      type="button"
                                      className="absolute inset-0"
                                      onClick={() => setImagePreview(url)}
                                      aria-label="Use image as cover"
                                      title="Use as cover image"
                                    >
                                      <SafeImage src={url} alt="Menu item gallery image" fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="80px" className="object-cover" />
                                    </button>
                                    <button
                                      type="button"
                                      className="absolute right-1 top-1 z-10 grid size-6 place-items-center rounded-full bg-white/90 text-red-600 shadow"
                                      onClick={() => removeMenuImage(url)}
                                      aria-label="Remove image"
                                      title="Remove image"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
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
                          <FieldLabel help="Required cuisine tags used for customer search and filters. Search and select at least one. Example: Arabic, Grills.">Cuisines</FieldLabel>
                          <div className="rounded-md border bg-background p-2">
                            <div className="flex items-center gap-2 rounded-md bg-white px-3">
                              <Search className="size-4 text-muted-foreground" />
                              <input
                                value={cuisineQuery}
                                onChange={(event) => setCuisineQuery(event.target.value)}
                                placeholder="Search cuisines"
                                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
                              />
                            </div>
                            {selectedCuisineIds.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedCuisineIds.map((id) => {
                                  const choice = cuisineChoices.find((item) => item.id === id);
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary"
                                      onClick={() => form.setValue("cuisineIds", selectedCuisineIds.filter((item) => item !== id), { shouldValidate: true })}
                                      title="Remove cuisine"
                                    >
                                      {choice?.name ?? id}
                                      <X className="size-3" />
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                            <div className="mt-2 grid max-h-40 gap-1 overflow-y-auto">
                              {visibleCuisineChoices.map((item) => {
                                const checked = selectedCuisineIds.includes(item.id);
                                return (
                                  <label key={item.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-orange-50">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) => {
                                        const next = event.target.checked
                                          ? unique([...selectedCuisineIds, item.id])
                                          : selectedCuisineIds.filter((id) => id !== item.id);
                                        form.setValue("cuisineIds", next, { shouldValidate: true });
                                      }}
                                    />
                                    <span>{item.name}</span>
                                  </label>
                                );
                              })}
                              {!visibleCuisineChoices.length ? <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">No cuisines match this search.</p> : null}
                            </div>
                          </div>
                          <FieldError message={form.formState.errors.cuisineIds?.message} />
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
        <TooltipProvider>
          <section className="space-y-4">
            <div className="sticky top-0 z-20 -mx-1 rounded-lg bg-background/95 px-1 py-2 backdrop-blur">
              <SectionHeader
                title="Menu Management"
                description="Manage menu items, prices, modifiers and visibility."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Tip label="Download the current menu import template">
                      <Button type="button" variant="outline" onClick={downloadExcelTemplate}>
                        <Download className="size-4" />
                        Download Template
                      </Button>
                    </Tip>
                    <Tip label="Import menu items from Excel or CSV">
                      <Button type="button" variant="outline" asChild>
                        <label>
                          <Upload className="size-4" />
                          Import
                          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => void previewImportFile(event.target.files?.[0])} />
                        </label>
                      </Button>
                    </Tip>
                    <Tip label="Create a new menu item">
                      <Button type="button" onClick={beginCreateItem}>
                        <Plus className="size-4" />
                        Create Item
                      </Button>
                    </Tip>
                  </div>
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <CompactMetric label="Total items" value={menuItems.length} icon={FileSpreadsheet} />
              <CompactMetric label="Active items" value={menuItems.filter((item) => !item.soldOut).length} icon={CheckCircle2} />
              <CompactMetric label="Sold out" value={menuItems.filter((item) => item.soldOut).length} icon={AlertTriangle} />
              <CompactMetric label="Categories" value={itemCategoryFilters.length} icon={Boxes} />
              <CompactMetric label="Delivery enabled" value={menuItems.filter((item) => isItemVisible(item, "delivery")).length} icon={PackageCheck} />
              <CompactMetric label="Parcel enabled" value={menuItems.filter((item) => isItemVisible(item, "parcel")).length} icon={PackageCheck} />
            </div>

            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <Tip label="Search by item name, category, tag, cuisine or allergen">
                  <label className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/60" />
                    <Input
                      className="h-11 pl-10 font-semibold text-foreground placeholder:text-foreground/50"
                      placeholder="Search item name, category, tag, cuisine..."
                      value={itemSearch}
                      onChange={(event) => setItemSearch(event.target.value)}
                    />
                  </label>
                </Tip>
                <div className="customer-scroll flex gap-2 overflow-x-auto pb-1 xl:pb-0">
                  {quickFilterOptions.map((option) => (
                    <Tip key={option.value} label={option.help}>
                      <button
                        type="button"
                        className={itemQuickFilter === option.value ? "h-10 shrink-0 rounded-md bg-primary px-3 text-sm font-black text-primary-foreground" : "h-10 shrink-0 rounded-md border bg-background px-3 text-sm font-black text-foreground hover:bg-muted"}
                        onClick={() => setItemQuickFilter(option.value)}
                        aria-pressed={itemQuickFilter === option.value}
                      >
                        {option.label}
                      </button>
                    </Tip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["dine-in", "parcel", "delivery"] as MenuChannel[]).map((channel) => (
                    <Tip key={channel} label={`Audit ${channel} prices and channel value`}>
                      <Button type="button" size="sm" variant={activeChannel === channel ? "default" : "outline"} onClick={() => setActiveChannel(channel)}>
                        {channel}
                      </Button>
                    </Tip>
                  ))}
                  <Tip label="Open advanced filters">
                    <Button type="button" variant={filterActive ? "secondary" : "outline"} onClick={() => setAdvancedFiltersOpen(true)}>
                      <SlidersHorizontal className="size-4" />
                      Filters
                    </Button>
                  </Tip>
                  {filterActive ? (
                    <Tip label="Reset all menu filters">
                      <Button type="button" variant="outline" onClick={resetItemFilters}>
                        <X className="size-4" />
                        Clear
                      </Button>
                    </Tip>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedItems.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 p-3">
                <p className="mr-auto text-sm font-black text-foreground">{selectedItems.length} selected</p>
                <BulkAction label="Mark Active" onClick={() => void applyBulkAction("active")} />
                <BulkAction label="Mark Sold Out" onClick={() => void applyBulkAction("sold-out")} />
                <BulkAction label="Enable Delivery" onClick={() => void applyBulkAction("enable-delivery")} />
                <BulkAction label="Disable Delivery" onClick={() => void applyBulkAction("disable-delivery")} />
                <BulkAction label="Enable Parcel" onClick={() => void applyBulkAction("enable-parcel")} />
                <BulkAction label="Disable Parcel" onClick={() => void applyBulkAction("disable-parcel")} />
                <BulkAction label="Delete" destructive onClick={() => void applyBulkAction("delete")} />
              </div>
            ) : null}

            <AdvancedFilterSheet
              open={advancedFiltersOpen}
              onOpenChange={setAdvancedFiltersOpen}
              categoryValue={itemCategoryFilter}
              categoryOptions={itemCategoryFilters}
              onCategoryChange={setItemCategoryFilter}
              cuisineValue={itemCuisineFilter}
              cuisineOptions={itemCuisineFilters}
              onCuisineChange={setItemCuisineFilter}
              foodValue={itemFoodFilter}
              onFoodChange={setItemFoodFilter}
              channelValue={itemChannelFilter}
              onChannelChange={(value) => setItemChannelFilter(value as ItemFilterChannel)}
              visibilityValue={itemVisibilityFilter}
              onVisibilityChange={setItemVisibilityFilter}
              availabilityValue={itemAvailabilityFilter}
              onAvailabilityChange={setItemAvailabilityFilter}
              modifierValue={itemModifierFilter}
              onModifierChange={setItemModifierFilter}
              allergenValue={itemAllergenFilter}
              allergenOptions={itemAllergenFilters}
              onAllergenChange={setItemAllergenFilter}
              tagValue={itemTagFilter}
              tagOptions={itemTagFilters}
              onTagChange={setItemTagFilter}
              priceValue={itemPriceFilter}
              onPriceChange={setItemPriceFilter}
              imageValue={itemImageFilter}
              onImageChange={setItemImageFilter}
              prepValue={itemPrepFilter}
              onPrepChange={setItemPrepFilter}
              sortValue={itemSort}
              onSortChange={setItemSort}
              onReset={resetItemFilters}
            />

            {filteredMenuItems.length ? (
              <>
                <div className="hidden overflow-hidden rounded-lg border bg-card shadow-sm xl:block">
                  <div className="grid grid-cols-[42px_76px_minmax(220px,1.45fr)_minmax(120px,0.75fr)_92px_92px_92px_76px_96px_minmax(220px,0.9fr)] items-center gap-2 border-b bg-muted/40 px-3 py-3 text-xs font-black uppercase text-muted-foreground">
                    <input type="checkbox" className="size-4" checked={currentPageSelected} onChange={(event) => toggleCurrentPageSelection(event.target.checked)} aria-label="Select all visible menu items" />
                    <span>Image</span>
                    <span>Item</span>
                    <span>Category</span>
                    <Tip label="Price shown for dine-in orders"><span>Dine-In</span></Tip>
                    <Tip label="Price shown for takeaway orders"><span>Parcel</span></Tip>
                    <Tip label="Price shown for delivery orders"><span>Delivery</span></Tip>
                    <span>Prep</span>
                    <Tip label="Current customer visibility state"><span>Status</span></Tip>
                    <span>Actions</span>
                  </div>
                  {paginatedMenuItems.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      variant="table"
                      item={item}
                      selected={selectedItemIds.includes(item.id)}
                      activeChannel={activeChannel}
                      taxRate={taxSettings.defaultGstRate}
                      onSelect={(selected) => toggleItemSelection(item.id, selected)}
                      onPreviewImage={() => setImagePreviewItem(item)}
                      onEdit={() => beginEdit(item)}
                      onCopyLink={() => void copyCustomerItemLink(item, prompt)}
                      onShareWhatsApp={() => void whatsappShare.openShare({ item })}
                      onToggleSoldOut={() => void toggleSoldOut(item.id)}
                      onCloneItem={() => void duplicateMenuItem(item)}
                      onDelete={() => void deleteMenuItem(item.id)}
                    />
                  ))}
                </div>

                <div className="grid gap-3 xl:hidden">
                  {paginatedMenuItems.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      variant="card"
                      item={item}
                      selected={selectedItemIds.includes(item.id)}
                      activeChannel={activeChannel}
                      taxRate={taxSettings.defaultGstRate}
                      onSelect={(selected) => toggleItemSelection(item.id, selected)}
                      onPreviewImage={() => setImagePreviewItem(item)}
                      onEdit={() => beginEdit(item)}
                      onCopyLink={() => void copyCustomerItemLink(item, prompt)}
                      onShareWhatsApp={() => void whatsappShare.openShare({ item })}
                      onToggleSoldOut={() => void toggleSoldOut(item.id)}
                      onCloneItem={() => void duplicateMenuItem(item)}
                      onDelete={() => void deleteMenuItem(item.id)}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Showing {(currentItemPage - 1) * itemListPageSize + 1} to {Math.min(currentItemPage * itemListPageSize, filteredMenuItems.length)} of {filteredMenuItems.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Tip label="Previous page">
                      <Button type="button" variant="outline" size="icon-sm" disabled={currentItemPage <= 1} onClick={() => setItemPage(Math.max(1, currentItemPage - 1))}>
                        <ChevronLeft className="size-4" />
                      </Button>
                    </Tip>
                    <span className="rounded-md bg-primary px-3 py-2 text-sm font-black text-primary-foreground">{currentItemPage}</span>
                    <span className="text-sm font-bold text-muted-foreground">/ {totalItemPages}</span>
                    <Tip label="Next page">
                      <Button type="button" variant="outline" size="icon-sm" disabled={currentItemPage >= totalItemPages} onClick={() => setItemPage(Math.min(totalItemPages, currentItemPage + 1))}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </Tip>
                  </div>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <FileSpreadsheet className="size-12 text-primary/70" />
                  <h3 className="text-lg font-black text-foreground">No menu items found</h3>
                  <p className="max-w-xl text-sm font-semibold text-foreground/70">Clear filters or create the first item for this restaurant.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="outline" onClick={resetItemFilters}>Clear filters</Button>
                    <Button type="button" onClick={beginCreateItem}>Create First Menu Item</Button>
                  </div>
                </CardContent>
              </Card>
            )}
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

          <Dialog open={Boolean(imagePreviewItem)} onOpenChange={(open) => !open && setImagePreviewItem(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{imagePreviewItem?.name ?? "Menu item image"}</DialogTitle>
                <DialogDescription>Image preview</DialogDescription>
              </DialogHeader>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <SafeImage src={imagePreviewItem?.image} alt={imagePreviewItem?.name ?? "Menu item"} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="720px" className="object-cover" />
              </div>
            </DialogContent>
          </Dialog>
        </TooltipProvider>
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

function CompactMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-center gap-3 p-3">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase text-muted-foreground">{label}</p>
          <p className="text-lg font-black">{value}</p>
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

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function BulkAction({ label, destructive = false, onClick }: { label: string; destructive?: boolean; onClick: () => void }) {
  return (
    <Tip label={label}>
      <Button type="button" size="sm" variant={destructive ? "destructive" : "outline"} onClick={onClick}>
        {label}
      </Button>
    </Tip>
  );
}

function AdvancedFilterSheet({
  open,
  onOpenChange,
  categoryValue,
  categoryOptions,
  onCategoryChange,
  cuisineValue,
  cuisineOptions,
  onCuisineChange,
  foodValue,
  onFoodChange,
  channelValue,
  onChannelChange,
  visibilityValue,
  onVisibilityChange,
  availabilityValue,
  onAvailabilityChange,
  modifierValue,
  onModifierChange,
  allergenValue,
  allergenOptions,
  onAllergenChange,
  tagValue,
  tagOptions,
  onTagChange,
  priceValue,
  onPriceChange,
  imageValue,
  onImageChange,
  prepValue,
  onPrepChange,
  sortValue,
  onSortChange,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryValue: string;
  categoryOptions: string[];
  onCategoryChange: (value: string) => void;
  cuisineValue: string;
  cuisineOptions: string[];
  onCuisineChange: (value: string) => void;
  foodValue: string;
  onFoodChange: (value: string) => void;
  channelValue: string;
  onChannelChange: (value: string) => void;
  visibilityValue: string;
  onVisibilityChange: (value: string) => void;
  availabilityValue: string;
  onAvailabilityChange: (value: string) => void;
  modifierValue: string;
  onModifierChange: (value: string) => void;
  allergenValue: string;
  allergenOptions: string[];
  onAllergenChange: (value: string) => void;
  tagValue: string;
  tagOptions: string[];
  onTagChange: (value: string) => void;
  priceValue: string;
  onPriceChange: (value: string) => void;
  imageValue: string;
  onImageChange: (value: string) => void;
  prepValue: string;
  onPrepChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw,560px)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced filters</SheetTitle>
          <SheetDescription>Refine a large menu without taking space on the main page.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <FilterSelect label="Category" value={categoryValue} onChange={onCategoryChange} options={[{ value: "all", label: "All categories" }, ...categoryOptions.map((item) => ({ value: item, label: item }))]} />
          <FilterSelect label="Cuisine" value={cuisineValue} onChange={onCuisineChange} options={[{ value: "all", label: "All cuisines" }, ...cuisineOptions.map((item) => ({ value: item, label: humanizeFilterLabel(item) }))]} />
          <FilterSelect label="Food type" value={foodValue} onChange={onFoodChange} options={[
            { value: "all", label: "All food types" },
            { value: "veg", label: "Veg" },
            { value: "nonveg", label: "Non-veg" },
            { value: "egg", label: "Egg" },
            { value: "vegan", label: "Vegan" },
            { value: "jain", label: "Jain" },
          ]} />
          <FilterSelect label="Channel" value={channelValue} onChange={onChannelChange} options={[
            { value: "all", label: "All channels" },
            { value: "dine-in", label: "Dine-in visible" },
            { value: "parcel", label: "Parcel visible" },
            { value: "delivery", label: "Delivery visible" },
          ]} />
          <FilterSelect label="Availability" value={availabilityValue} onChange={onAvailabilityChange} options={[
            { value: "all", label: "All availability" },
            { value: "available", label: "Available" },
            { value: "sold-out", label: "Sold out" },
          ]} />
          <FilterSelect label="Modifier status" value={modifierValue} onChange={onModifierChange} options={[
            { value: "all", label: "All modifier states" },
            { value: "with-modifiers", label: "Has modifiers" },
            { value: "without-modifiers", label: "No modifiers" },
          ]} />
          <FilterSelect label="Allergen" value={allergenValue} onChange={onAllergenChange} options={[{ value: "all", label: "All allergens" }, ...allergenOptions.map((item) => ({ value: item, label: item }))]} />
          <FilterSelect label="Tags" value={tagValue} onChange={onTagChange} options={[{ value: "all", label: "All tags" }, ...tagOptions.map((item) => ({ value: item, label: item }))]} />
          <FilterSelect label="Price range" value={priceValue} onChange={onPriceChange} options={[
            { value: "all", label: "Any price" },
            { value: "under-150", label: "Under Rs 150" },
            { value: "150-300", label: "Rs 150 - Rs 300" },
            { value: "300-500", label: "Rs 300 - Rs 500" },
            { value: "above-500", label: "Above Rs 500" },
          ]} />
          <FilterSelect label="Prep time" value={prepValue} onChange={onPrepChange} options={[
            { value: "all", label: "Any prep time" },
            { value: "under-10", label: "Under 10 min" },
            { value: "10-20", label: "10 - 20 min" },
            { value: "20-plus", label: "20+ min" },
          ]} />
          <FilterSelect label="Image" value={imageValue} onChange={onImageChange} options={[
            { value: "all", label: "All images" },
            { value: "with-image", label: "Has image" },
            { value: "missing-image", label: "Missing image" },
          ]} />
          <FilterSelect label="Customer visibility" value={visibilityValue} onChange={onVisibilityChange} options={[
            { value: "all", label: "All visibility" },
            { value: "customer-visible", label: "Visible to customer" },
            { value: "customer-hidden", label: "Hidden from customer" },
          ]} />
          <FilterSelect label="Sort by" value={sortValue} onChange={onSortChange} options={[
            { value: "name", label: "Name A-Z" },
            { value: "category", label: "Category" },
            { value: "price-low", label: "Price low-high" },
            { value: "price-high", label: "Price high-low" },
          ]} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onReset}>Reset</Button>
          <Button type="button" onClick={() => onOpenChange(false)}>Apply filters</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionIcon({ label, children }: { label: string; children: React.ReactElement }) {
  return <Tip label={label}>{children}</Tip>;
}

function ChannelPriceCell({ item, channel }: { item: MenuItem; channel: MenuChannel }) {
  const active = isItemVisible(item, channel);
  return (
    <span className={`rounded-md px-2 py-2 text-center text-xs font-black ${active ? "bg-primary/8 text-foreground" : "bg-muted text-muted-foreground"}`}>
      {formatChannelItemPrice(item, channel)}
    </span>
  );
}

function MiniPrice({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-muted px-2 py-2">
      <span className="block font-black text-muted-foreground">{label}</span>
      <span className="mt-1 block truncate font-black text-foreground">{value}</span>
    </span>
  );
}

function MenuItemRow({
  variant,
  item,
  selected,
  activeChannel,
  taxRate,
  onSelect,
  onPreviewImage,
  onEdit,
  onCopyLink,
  onShareWhatsApp,
  onToggleSoldOut,
  onCloneItem,
  onDelete,
}: {
  variant: "table" | "card";
  item: MenuItem;
  selected: boolean;
  activeChannel: MenuChannel;
  taxRate: number;
  onSelect: (selected: boolean) => void;
  onPreviewImage: () => void;
  onEdit: () => void;
  onCopyLink: () => void;
  onShareWhatsApp: () => void;
  onToggleSoldOut: () => void;
  onCloneItem: () => void;
  onDelete: () => void;
}) {
  const customerVisible = isItemVisible(item, "delivery") && !item.soldOut;
  const statusLabel = item.soldOut ? "Sold Out" : customerVisible ? "Active" : "Hidden";
  const statusVariant = item.soldOut ? "destructive" : customerVisible ? "success" : "warning";
  const metadata = [
    formatFoodTypeLabel(item.foodType ?? (item.isVeg ? "veg" : "nonveg")),
    item.prepTime,
    `GST ${item.taxRate ?? taxRate}%`,
    `${activeChannel} ${formatCurrency(getChannelPrice(item, activeChannel))}`,
  ].filter(Boolean).join(" · ");
  const itemUrl = buildCustomerItemPath(item);
  const actions = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ActionIcon label="Open customer view">
        <Button size="icon-sm" variant="outline" asChild>
          <a href={itemUrl} target="_blank" rel="noreferrer" aria-label="Open customer view">
            <Eye className="size-4" />
          </a>
        </Button>
      </ActionIcon>
      <ActionIcon label="Share on WhatsApp">
        <Button size="icon-sm" variant="outline" onClick={onShareWhatsApp} aria-label="Share on WhatsApp">
          <MessageCircle className="size-4" />
        </Button>
      </ActionIcon>
      <ActionIcon label="Edit menu item">
        <Button size="icon-sm" variant="outline" onClick={onEdit} aria-label="Edit menu item">
          <Edit3 className="size-4" />
        </Button>
      </ActionIcon>
      <ActionIcon label="Copy customer item link">
        <Button size="icon-sm" variant="outline" onClick={onCopyLink} aria-label="Copy customer item link">
          <Link2 className="size-4" />
        </Button>
      </ActionIcon>
      <ActionIcon label="Create a copy of this menu item">
        <Button size="icon-sm" variant="outline" onClick={onCloneItem} aria-label="Create a copy of this menu item">
          <Copy className="size-4" />
        </Button>
      </ActionIcon>
      <ActionIcon label="Permanently remove menu item">
        <Button size="icon-sm" variant="outline" onClick={onDelete} aria-label="Permanently remove menu item">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </ActionIcon>
      <ActionIcon label="Hide item from customers temporarily">
        <Button size="icon-sm" variant={item.soldOut ? "secondary" : "outline"} onClick={onToggleSoldOut} aria-label="Toggle sold out state" aria-pressed={Boolean(item.soldOut)}>
          {item.soldOut ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
        </Button>
      </ActionIcon>
    </div>
  );

  if (variant === "table") {
    return (
      <div className="grid grid-cols-[42px_76px_minmax(220px,1.45fr)_minmax(120px,0.75fr)_92px_92px_92px_76px_96px_minmax(220px,0.9fr)] items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0">
        <input type="checkbox" className="size-4" checked={selected} onChange={(event) => onSelect(event.target.checked)} aria-label={`Select ${item.name}`} />
        <Tip label="Click to preview image">
          <button type="button" className="relative size-[60px] overflow-hidden rounded-md bg-muted" onClick={onPreviewImage} aria-label={`Preview ${item.name} image`}>
            <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="60px" className="object-cover" />
          </button>
        </Tip>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-black text-foreground">{item.name}</h2>
            {item.tags?.slice(0, 1).map((tag) => <Badge key={tag} variant="secondary" className="hidden shrink-0 md:inline-flex">{tag}</Badge>)}
          </div>
          <p className="line-clamp-1 text-xs font-semibold text-muted-foreground">{item.description || "No description added."}</p>
          <p className="mt-1 truncate text-xs font-bold text-muted-foreground">{metadata}</p>
        </div>
        <span className="truncate font-semibold text-foreground">{item.category || "Uncategorised"}</span>
        <ChannelPriceCell item={item} channel="dine-in" />
        <ChannelPriceCell item={item} channel="parcel" />
        <ChannelPriceCell item={item} channel="delivery" />
        <span className="text-xs font-black text-foreground">{item.prepTime || "-"}</span>
        <Tip label="Current customer visibility state">
          <span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </span>
        </Tip>
        {actions}
      </div>
    );
  }

  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="grid grid-cols-[auto_72px_minmax(0,1fr)_auto] gap-3">
        <input type="checkbox" className="mt-6 size-4" checked={selected} onChange={(event) => onSelect(event.target.checked)} aria-label={`Select ${item.name}`} />
        <Tip label="Click to preview image">
          <button type="button" className="relative size-[72px] overflow-hidden rounded-md bg-muted" onClick={onPreviewImage} aria-label={`Preview ${item.name} image`}>
            <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="72px" className="object-cover" />
          </button>
        </Tip>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <Badge variant={item.isVeg ? "success" : "warning"}>{formatFoodTypeLabel(item.foodType ?? (item.isVeg ? "veg" : "nonveg"))}</Badge>
          </div>
          <h2 className="mt-1 line-clamp-1 font-black text-foreground">{item.name}</h2>
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted-foreground">{item.category || "Uncategorised"} · {item.prepTime || "Prep pending"}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <MiniPrice label="Dine-In" value={formatChannelItemPrice(item, "dine-in")} />
            <MiniPrice label="Parcel" value={formatChannelItemPrice(item, "parcel")} />
            <MiniPrice label="Delivery" value={formatChannelItemPrice(item, "delivery")} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {actions}
        </div>
      </div>
    </article>
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

async function copyCustomerItemLink(item: MenuItem, promptCopy: AlertApi["prompt"]) {
  const url = buildCustomerItemUrl(item);
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) throw new Error("Clipboard is not available.");
    await navigator.clipboard.writeText(url);
    toast.success("Customer item link copied.");
  } catch {
    await promptCopy("Copy customer item link", url, { title: "Copy item link", inputLabel: "Customer item URL" });
  }
}

function validateMenuDraft(values: MenuFormValues, image: string, menuItems: MenuItem[], editingId?: string): { step: ItemWizardStepId; message: string } | null {
  if (!hasCustomImage(image)) return { step: "basic", message: "Add a real item image by upload or image URL." };
  if (!values.cuisineIds.length) return { step: "basic", message: "Select at least one cuisine." };
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
  if (keys.some((key) => ["name", "category", "categoryId", "cuisineIds", "price", "foodType"].includes(key))) return "basic";
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

function uniqueImageUrls(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(hasCustomImage)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function matchesPriceBand(price: number, band: string) {
  if (band === "under-150") return price < 150;
  if (band === "150-300") return price >= 150 && price <= 300;
  if (band === "300-500") return price > 300 && price <= 500;
  if (band === "above-500") return price > 500;
  return true;
}

function matchesPrepBand(prepTime: string | undefined, band: string) {
  if (band === "all") return true;
  const minutes = Number((prepTime ?? "").match(/\d+/)?.[0] ?? 0);
  if (!minutes) return band === "under-10";
  if (band === "under-10") return minutes < 10;
  if (band === "10-20") return minutes >= 10 && minutes <= 20;
  if (band === "20-plus") return minutes > 20;
  return true;
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function uniqueCloneName(name: string, items: MenuItem[]) {
  const existing = new Set(items.map((item) => item.name.trim().toLowerCase()));
  let nextName = `${name} Copy`;
  let index = 2;
  while (existing.has(nextName.toLowerCase())) {
    nextName = `${name} Copy ${index}`;
    index += 1;
  }
  return nextName;
}

function humanizeFilterLabel(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
