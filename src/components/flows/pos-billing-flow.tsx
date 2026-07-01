"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChefHat, ClipboardList, Download, Grid2X2, Loader2, MapPin, Printer, Search, SlidersHorizontal, UserRound, UsersRound, Utensils, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PosSidebar, type PosPanel } from "@/modules/owner/pos/components/pos-sidebar";
import { CategoryList, type PosCategory } from "@/modules/owner/pos/components/category-list";
import { ProductGrid } from "@/modules/owner/pos/components/product-grid";
import type { PosProduct } from "@/modules/owner/pos/components/product-card";
import { CartPanel, type CompletedPosOrder, type PosProcessingState, type PosWizardStep } from "@/modules/owner/pos/components/cart-panel";
import { CustomerSelector } from "@/modules/owner/pos/components/customer-selector";
import { TableSelector } from "@/modules/owner/pos/components/table-selector";
import { RestaurantBill, KotTicket } from "@/components/printing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicCategories } from "@/hooks/use-public-data";
import { useAppStore } from "@/lib/app-store";
import { buildBillContext, buildKotContext, calculateBillTotals, defaultBillTemplate, defaultKotTemplate } from "@/lib/print-engine";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import type { DemoOrder, InventoryItem, LoyaltyCustomer, MenuCategory, MenuItem, OwnerBusinessProfile, PosBill, PosTable, RestaurantBranch, StaffMember, TableOrder, TaxSettings } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { actualOrderTime, readableOrderId, readableTableOrderId } from "@/lib/order-display";
import { normalizePhone } from "@/services/restaurant-ops-service";

const posTabs = ["menu", "custom", "combos"] as const;
const heldOrdersKey = "sarva-pos-held-orders:v1";

type HeldPosOrder = {
  id: string;
  label: string;
  createdAt: string;
  bill: PosBill;
};

type PosReadModel = {
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  inventoryItems: InventoryItem[];
  orders: DemoOrder[];
  tables: PosTable[];
  loyaltyCustomers: LoyaltyCustomer[];
  tableOrders: TableOrder[];
  staffMembers: StaffMember[];
};

export function PosBillingFlow() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof posTabs)[number]>("menu");
  const [activeCategory, setActiveCategory] = useState("");
  const [panel, setPanel] = useState<PosPanel>("new");
  const [wizardStep, setWizardStep] = useState<PosWizardStep>(1);
  const [processingState, setProcessingState] = useState<PosProcessingState>("idle");
  const [completedOrder, setCompletedOrder] = useState<CompletedPosOrder | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [foodFilter, setFoodFilter] = useState<"all" | "veg" | "nonveg">("all");
  const [sortMode, setSortMode] = useState<"popular" | "name" | "price-low" | "price-high">("popular");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compactGrid, setCompactGrid] = useState(false);
  const [showKot, setShowKot] = useState(false);
  const [ticketCreatedAt, setTicketCreatedAt] = useState<Date | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);
  const [readModel, setReadModel] = useState<PosReadModel>(() => ({
    menuItems: [],
    menuCategories: [],
    inventoryItems: [],
    orders: [],
    tables: [],
    loyaltyCustomers: [],
    tableOrders: [],
    staffMembers: [],
  }));
  const { menuItems, menuCategories, inventoryItems, orders, tables, loyaltyCustomers, tableOrders, staffMembers } = readModel;
  const authUser = useAppStore((state) => state.authUser);
  const ownerBusinessProfile = useAppStore((state) => state.ownerBusinessProfile);
  const configuredBranch = useAppStore((state) => state.branches[0]);
  const taxSettings = useAppStore((state) => state.taxSettings);
  const printerSettings = useAppStore((state) => state.printerSettings);
  const bill = useAppStore((state) => state.posBill);
  const { categories: masterCategories } = usePublicCategories();
  const addPosItem = useAppStore((state) => state.addPosItem);
  const addPosProduct = useAppStore((state) => state.addPosProduct);
  const updatePosQuantity = useAppStore((state) => state.updatePosQuantity);
  const removePosItem = useAppStore((state) => state.removePosItem);
  const setPosBill = useAppStore((state) => state.setPosBill);
  const setPosTable = useAppStore((state) => state.setPosTable);
  const setPosOrderType = useAppStore((state) => state.setPosOrderType);
  const setPosCustomer = useAppStore((state) => state.setPosCustomer);
  const setPosPayment = useAppStore((state) => state.setPosPayment);
  const resetPosBill = useAppStore((state) => state.resetPosBill);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const branch = useMemo(
    () => configuredBranch ?? createFallbackBranch(ownerBusinessProfile, authUser.id, restaurantId),
    [authUser.id, configuredBranch, ownerBusinessProfile, restaurantId],
  );
  const applyGst = bill.applyGst ?? true;
  const waiveParcelCharge = Boolean(bill.waiveParcelCharge);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setHeldOrders(JSON.parse(window.localStorage.getItem(heldOrdersKey) ?? "[]") as HeldPosOrder[]);
      } catch {
        setHeldOrders([]);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    window.localStorage.setItem(heldOrdersKey, JSON.stringify(heldOrders));
  }, [heldOrders]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/owner/pos", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((payload: { data?: { menu?: MenuItem[]; orders?: DemoOrder[]; tables?: PosTable[]; customers?: LoyaltyCustomer[]; kitchen?: TableOrder[]; staff?: StaffMember[] } }) => {
        setReadModel((current) => ({
          ...current,
          menuItems: payload.data?.menu ?? [],
          orders: payload.data?.orders ?? [],
          tables: payload.data?.tables ?? [],
          loyaltyCustomers: payload.data?.customers ?? [],
          tableOrders: payload.data?.kitchen ?? [],
          staffMembers: payload.data?.staff ?? [],
        }));
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") toast.error("POS data could not be loaded.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (panel !== "new" || wizardStep <= 1 || wizardStep >= 4) return;
    window.history.pushState({ sarvaPosWizardStep: wizardStep }, "");
    const onPopState = () => {
      setWizardStep((current) => (current > 1 ? ((current - 1) as PosWizardStep) : current));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [panel, wizardStep]);
  useEffect(() => {
    const openPastOrders = () => setPanel("past");
    const openCustomers = () => setPanel("customers");
    window.addEventListener("sarva-pos-open-past-orders", openPastOrders);
    window.addEventListener("sarva-pos-open-customers", openCustomers);
    return () => {
      window.removeEventListener("sarva-pos-open-past-orders", openPastOrders);
      window.removeEventListener("sarva-pos-open-customers", openCustomers);
    };
  }, []);

  const menu = useMemo(
    () => menuItems.filter((item) => item.restaurantSlug === restaurantId && !item.soldOut),
    [menuItems, restaurantId],
  );
  const products = useMemo(
    () => inventoryItems.filter((item) => item.sellable !== false && item.price !== undefined),
    [inventoryItems],
  );
  const categoryNameById = useMemo(
    () => {
      const entries: Array<[string, string]> = [];
      masterCategories.forEach((item) => {
        entries.push([item.id, item.name], [item.slug, item.name], [item.name, item.name]);
      });
      menuCategories.forEach((item) => {
        entries.push([item.id, item.name], [item.name, item.name]);
      });
      return new Map(entries);
    },
    [masterCategories, menuCategories],
  );
  const resolveCategoryName = useCallback(
    (item: MenuItem) => categoryNameById.get(item.categoryId ?? "") ?? categoryNameById.get(item.category) ?? item.category,
    [categoryNameById],
  );
  const categories = useMemo<PosCategory[]>(() => {
    const counts = new Map<string, number>();
    menu.forEach((item) => {
      const category = resolveCategoryName(item);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    const orderedCategories = [
      ...masterCategories
        .filter((item) => item.active)
        .map((item) => ({ id: item.id, name: item.name, count: counts.get(item.name) ?? 0, sortOrder: item.sortOrder })),
      ...menuCategories
        .filter((item) => item.restaurantSlug === restaurantId && item.enabled)
        .map((item) => ({ id: item.id, name: item.name, count: counts.get(item.name) ?? 0, sortOrder: item.sortOrder + 1000 })),
      ...Array.from(counts.entries())
        .filter(([name]) => !masterCategories.some((item) => item.name === name) && !menuCategories.some((item) => item.name === name))
        .map(([name, count], index) => ({ id: name, name, count, sortOrder: 2000 + index })),
    ];
    return Array.from(new Map(orderedCategories.map((item) => [item.name, item])).values())
      .filter((item) => item.count > 0)
      .sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
  }, [masterCategories, menu, menuCategories, restaurantId, resolveCategoryName]);
  const displayedItems = useMemo(() => {
    const source = activeTab === "menu" ? menu.map((item) => toMenuProduct(item, resolveCategoryName(item))) : activeTab === "custom" ? products.map(toInventoryProduct) : [];
    return source.filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory;
      const search = query.trim().toLowerCase();
      const matchesSearch = !search || item.name.toLowerCase().includes(search) || item.category.toLowerCase().includes(search);
      const matchesFood = foodFilter === "all" || item.source === "product" || (foodFilter === "veg" ? item.isVeg !== false : item.isVeg === false);
      const matchesAvailability = !availableOnly || !item.soldOut;
      return matchesCategory && matchesSearch && matchesFood && matchesAvailability;
    }).sort((first, second) => {
      if (sortMode === "name") return first.name.localeCompare(second.name);
      if (sortMode === "price-low") return first.price - second.price;
      if (sortMode === "price-high") return second.price - first.price;
      return Number(second.isPopular) - Number(first.isPopular) || first.name.localeCompare(second.name);
    });
  }, [activeTab, activeCategory, availableOnly, foodFilter, menu, products, query, sortMode, resolveCategoryName]);
  const quantities = useMemo(
    () => Object.fromEntries(bill.lines.map((line) => [line.itemId, line.quantity])),
    [bill.lines],
  );
  const customerLookupItems = useMemo(
    () => loyaltyCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      subtitle: `${customer.points} pts · ${customer.tier}`,
      meta: `${customer.totalOrders ?? 0} orders`,
    })),
    [loyaltyCustomers],
  );
  const activeWaiters = useMemo(
    () => staffMembers.filter((member) => member.role === "waiter" && member.status === "active"),
    [staffMembers],
  );
  const effectiveTaxSettings = useMemo(
    () => ({
      ...taxSettings,
      gstEnabled: applyGst && taxSettings.gstEnabled,
      cgstRate: applyGst ? taxSettings.cgstRate : 0,
      sgstRate: applyGst ? taxSettings.sgstRate : 0,
      igstRate: applyGst ? taxSettings.igstRate : 0,
      serviceChargeRate: applyGst ? taxSettings.serviceChargeRate : 0,
      defaultPackingCharge: waiveParcelCharge ? 0 : taxSettings.defaultPackingCharge,
    }) satisfies TaxSettings,
    [applyGst, taxSettings, waiveParcelCharge],
  );

  const billContext = buildBillContext({
    bill,
    branch,
    taxSettings: effectiveTaxSettings,
    restaurantName: ownerBusinessProfile?.hotelName,
    createdAt: ticketCreatedAt ?? new Date(),
  });
  const kotContext = buildKotContext(billContext);
  const totals = calculateBillTotals(billContext);
  const activeKitchenOrder = bill.linkedKitchenOrderId ? tableOrders.find((order) => order.id === bill.linkedKitchenOrderId) : undefined;
  const activeKotCount = tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length;
  const activeOrderCount = orders.length;
  const pastOrderCount = orders.filter((order) => ["delivered", "completed", "cancelled", "rejected"].includes(order.status)).length;

  function handleAdd(item: PosProduct) {
    if (item.source === "menu") {
      addPosItem(item.raw as MenuItem);
    } else {
      addPosProduct(item.raw as InventoryItem);
    }
  }

  function handleQuantity(item: PosProduct, quantity: number) {
    if (item.source === "product") {
      const stock = (item.raw as InventoryItem).currentStock;
      updatePosQuantity(item.id, Math.min(quantity, stock));
      return;
    }
    updatePosQuantity(item.id, quantity);
  }

  async function searchCustomerByPhone() {
    const normalized = normalizePhone(bill.customerPhone ?? "");
    if (!normalized) return;
    const localCustomer = loyaltyCustomers.find((customer) => normalizePhone(customer.phone) === normalized);
    if (localCustomer) {
      setPosCustomer({ id: localCustomer.id, name: localCustomer.name, phone: localCustomer.phone });
      toast.success(`${localCustomer.name} selected.`);
      return;
    }
    toast.error("No repository customer found for this phone.");
  }

  async function sendKot() {
    if (!bill.lines.length) {
      toast.error("Add at least one item before sending to kitchen.");
      return undefined;
    }
    if (bill.orderType === "dine-in" && (!bill.table || bill.table === "DIRECT")) {
      toast.error("Select a table before sending this dine-in order to kitchen.");
      return undefined;
    }
    const tableNumber = bill.orderType === "dine-in" ? bill.table : bill.orderType === "delivery" ? "Online" : bill.orderType === "takeaway" ? "Quick Bill" : "Parcel";
    const kitchenSource: TableOrder["source"] = bill.orderType === "delivery" ? "Delivery" : bill.orderType === "parcel" ? "Parcel" : bill.orderType === "takeaway" ? "Takeaway" : "Waiter";
    const kitchenPayload = {
      tableNumber,
      source: kitchenSource,
      orderType: bill.orderType,
      guestName: bill.customerName || undefined,
      customerName: bill.customerName || undefined,
      customerPhone: bill.customerPhone || undefined,
      deliveryAddress: bill.orderType === "delivery" ? [deliveryAddress, landmark].filter(Boolean).join(", ") || undefined : undefined,
      lines: bill.lines,
      priority: "normal" as const,
      waiterName: bill.waiterName || authUser.name,
      branchId: branch.id,
      etaMinutes: bill.orderType === "delivery" ? 30 : 12,
      total: totals.total,
    };
    if (bill.linkedKitchenOrderId) {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...kitchenPayload, id: bill.linkedKitchenOrderId, status: activeKitchenOrder?.status ?? "new" }),
      });
      const result = await response.json() as { data?: TableOrder };
      const next = result.data ?? {
        ...kitchenPayload,
        id: bill.linkedKitchenOrderId,
        status: activeKitchenOrder?.status ?? "new",
        createdAt: activeKitchenOrder?.createdAt ?? new Date().toISOString(),
      } satisfies TableOrder;
      setReadModel((current) => ({ ...current, tableOrders: current.tableOrders.map((order) => order.id === next.id ? next : order) }));
      setShowKot(true);
      toast.success("Kitchen ticket updated with the latest items.");
      return next;
    }
    const response = await fetch("/api/owner/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kitchenPayload),
    });
    const result = await response.json() as { data?: TableOrder };
    const order = result.data ?? { ...kitchenPayload, id: `kot-${Date.now()}`, status: "new", createdAt: new Date().toISOString() } satisfies TableOrder;
    setReadModel((current) => ({ ...current, tableOrders: [order, ...current.tableOrders] }));
    setPosBill({ ...bill, linkedKitchenOrderId: order.id, applyGst, waiveParcelCharge });
    setShowKot(true);
    toast.success(`Kitchen ticket sent for ${order.tableNumber}.`);
    return order;
  }

  async function checkout() {
    if (bill.orderType === "dine-in" && (!bill.table || bill.table === "DIRECT")) {
      toast.error("Select a table before checkout.");
      return false;
    }
    if (!bill.lines.length) {
      toast.error("Add at least one item before checkout.");
      return false;
    }
    const invoiceNumber = bill.invoiceNumber && bill.invoiceNumber !== "INV-POS-DRAFT" ? bill.invoiceNumber : `INV-${Date.now().toString(36).toUpperCase()}`;
    const billLink = `${window.location.origin}/bill/${invoiceNumber}`;
    setPosBill({
      ...bill,
      paid: true,
      tenderedAmount: bill.tenderedAmount && bill.tenderedAmount > 0 ? bill.tenderedAmount : totals.total,
      invoiceNumber,
      billDeliveryLink: billLink,
      billDeliveryQr: billLink,
    });
    if (bill.linkedKitchenOrderId) {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bill.linkedKitchenOrderId, status: "completed" }),
      });
      const result = await response.json() as { data?: TableOrder };
      if (result.data) setReadModel((current) => ({ ...current, tableOrders: current.tableOrders.map((order) => order.id === result.data!.id ? result.data! : order) }));
    }
    toast.success("Payment captured and bill is ready.");
    return true;
  }

  function goToDetails() {
    if (!bill.lines.length) {
      toast.error("Add at least one item before continuing.");
      return;
    }
    setWizardStep(2);
  }

  function goToReview() {
    if (bill.orderType === "dine-in" && (!bill.table || bill.table === "DIRECT")) {
      toast.error("Select a table for this dine-in order.");
      return;
    }
    if (bill.orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Delivery address is required for delivery orders.");
      return;
    }
    setWizardStep(3);
  }

  async function processOrder(capturePayment = false) {
    if (!bill.lines.length) {
      toast.error("Add at least one item before placing the order.");
      setWizardStep(1);
      return;
    }
    if (bill.orderType === "dine-in" && (!bill.table || bill.table === "DIRECT")) {
      toast.error("Select a table before placing this dine-in order.");
      setWizardStep(2);
      return;
    }
    if (bill.orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Delivery address is required before placing this order.");
      setWizardStep(2);
      return;
    }

    setWizardStep(4);
    setProcessingState("saving");
    await wait(420);
    setProcessingState("kitchen");
    const kitchenOrder = await sendKot();
    if (!kitchenOrder) {
      setProcessingState("idle");
      setWizardStep(3);
      return;
    }
    if (capturePayment) {
      const paid = await checkout();
      if (!paid) {
        setProcessingState("idle");
        setWizardStep(3);
        return;
      }
    }
    setProcessingState("syncing");
    await wait(420);
    setProcessingState("done");
    setCompletedOrder({
      orderId: readableTableOrderId(kitchenOrder, tableOrders.length + 1),
      kotId: readableTableOrderId(kitchenOrder, tableOrders.length + 1),
      total: totals.total,
      table: bill.orderType === "dine-in" ? bill.table : undefined,
      customer: bill.customerName,
      payment: bill.payment,
      orderType: bill.orderType,
    });
    await wait(220);
    setWizardStep(5);
    toast.success("Order placed. Kitchen Operations has been updated.");
  }

  function startNewOrder() {
    resetPosBill();
    setDeliveryAddress("");
    setLandmark("");
    setOrderNote("");
    setCompletedOrder(null);
    setProcessingState("idle");
    setWizardStep(1);
    setPanel("new");
  }

  function holdOrder() {
    if (!bill.lines.length) {
      toast.error("Add items before holding an order.");
      return;
    }
    const label = bill.table !== "DIRECT" ? bill.table : bill.customerName || bill.orderType;
    setHeldOrders((current) => [
      { id: `hold-${Date.now()}`, label, createdAt: new Date().toISOString(), bill },
      ...current,
    ]);
    resetPosBill();
    setWizardStep(1);
    setPanel("held");
    toast.success(`Order for ${label} moved to Hold Orders.`);
  }

  function saveOrder() {
    if (!bill.lines.length) {
      toast.error("Add items before saving an order.");
      return;
    }
    const label = bill.table !== "DIRECT" ? bill.table : bill.customerName || bill.orderType;
    setHeldOrders((current) => {
      const existing = current.find((item) => item.bill.invoiceNumber === bill.invoiceNumber);
      if (existing) {
        return current.map((item) => item.id === existing.id ? { ...item, label, createdAt: new Date().toISOString(), bill } : item);
      }
      return [{ id: `saved-${Date.now()}`, label, createdAt: new Date().toISOString(), bill }, ...current];
    });
    toast.success(`Order for ${label} saved.`);
  }

  function resumeHeldOrder(order: HeldPosOrder) {
    setPosBill(order.bill);
    setHeldOrders((current) => current.filter((item) => item.id !== order.id));
    setPanel("new");
    setWizardStep(1);
    toast.success(`Resumed order for ${order.label}.`);
  }

  function printTicket(target: "bill" | "kot") {
    setTicketCreatedAt(new Date());
    setShowKot(target === "kot");
    window.document.body.classList.add("print-ticket-mode");
    window.setTimeout(() => {
      window.print();
      window.document.body.classList.remove("print-ticket-mode");
    }, 80);
  }

  function renderWizardMain() {
    const key = `pos-step-${wizardStep}`;
    return (
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="min-h-0">
          {wizardStep === 1 ? (
            <WizardShell step={wizardStep} onStep={setWizardStep} title="Select items" subtitle="Browse, filter, and add items. Payment and billing stay out of this step.">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
                {posTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setActiveTab(tab); setActiveCategory(""); }}
                    className={cn("h-10 rounded-xl px-5 text-sm font-black capitalize text-slate-600", activeTab === tab && "bg-emerald-50 text-emerald-700")}
                  >
                    {tab === "menu" ? "Menu Items" : tab === "custom" ? "Custom Items" : "Combos"}
                  </button>
                ))}
              </div>
              <div className="grid min-h-0 lg:grid-cols-[auto_1fr]">
                <CategoryList categories={activeTab === "menu" ? categories : productCategories(products)} active={activeCategory} onSelect={setActiveCategory} />
                <div className="min-w-0">
                  <div className="customer-scroll flex items-center gap-3 overflow-x-auto border-b border-slate-100 p-3">
                    <label className="relative min-w-64 shrink-0">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        placeholder="Search menu or SKU"
                        aria-label="Search POS items"
                      />
                    </label>
                    <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" value={foodFilter} onChange={(event) => setFoodFilter(event.target.value as typeof foodFilter)} title="Filter by food type">
                      <option value="all">Veg & Non-Veg</option>
                      <option value="veg">Veg only</option>
                      <option value="nonveg">Non-veg only</option>
                    </select>
                    <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} title="Sort menu items">
                      <option value="popular">Sort: Popular</option>
                      <option value="name">Sort: Name</option>
                      <option value="price-low">Price: Low to high</option>
                      <option value="price-high">Price: High to low</option>
                    </select>
                    <button className={cn("h-10 shrink-0 rounded-xl border px-4 text-sm font-semibold", availableOnly ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600")} onClick={() => setAvailableOnly((value) => !value)} title="Show only available items">
                      Available
                    </button>
                    <Button variant={compactGrid ? "default" : "outline"} size="icon" aria-label="Toggle compact product grid" title="Switch between compact and comfortable grid" onClick={() => setCompactGrid((value) => !value)}>
                      <Grid2X2 className="size-4" />
                    </Button>
                    <Button variant={filtersOpen ? "default" : "outline"} size="icon" aria-label="More filters" title="Open advanced filters" onClick={() => setFiltersOpen((value) => !value)}>
                      <SlidersHorizontal className="size-4" />
                    </Button>
                  </div>
                  {filtersOpen ? (
                    <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-3">
                      <button className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-700" onClick={() => { setFoodFilter("all"); setSortMode("popular"); setAvailableOnly(true); setActiveCategory(""); }}>
                        Reset filters
                      </button>
                      <div className="rounded-xl border bg-white px-4 py-3 font-semibold text-slate-600">{displayedItems.length} items visible</div>
                      <div className="rounded-xl border bg-white px-4 py-3 font-semibold text-slate-600">Inventory products appear in Custom Items</div>
                    </div>
                  ) : null}
                  <ProductGrid items={displayedItems} quantities={quantities} onAdd={handleAdd} onQuantity={handleQuantity} compact={compactGrid} />
                </div>
              </div>
            </WizardShell>
          ) : null}

          {wizardStep === 2 ? (
            <CustomerOrderDetailsStep
              bill={bill}
              tables={tables}
              lookupItems={customerLookupItems}
              activeWaiters={activeWaiters}
              deliveryAddress={deliveryAddress}
              landmark={landmark}
              orderNote={orderNote}
              onOrderType={setPosOrderType}
              onTable={setPosTable}
              onCustomer={setPosCustomer}
              onLookup={() => void searchCustomerByPhone()}
              onWaiter={(waiterName) => setPosBill({ ...bill, waiterName, paid: false })}
              onAddress={setDeliveryAddress}
              onLandmark={setLandmark}
              onNote={setOrderNote}
              onBack={() => setWizardStep(1)}
              onNext={goToReview}
            />
          ) : null}

          {wizardStep === 3 ? (
            <ReviewOrderStep
              bill={bill}
              totals={totals}
              deliveryAddress={deliveryAddress}
              landmark={landmark}
              orderNote={orderNote}
              onQuantity={updatePosQuantity}
              onRemove={removePosItem}
              onBack={() => setWizardStep(2)}
              onProcess={() => void processOrder(false)}
            />
          ) : null}

          {wizardStep === 4 ? <ProcessingOrderStep state={processingState} /> : null}
          {wizardStep === 5 ? <OrderSuccessStep order={completedOrder} onNewOrder={startNewOrder} onViewActive={() => setPanel("active")} onPrint={() => printTicket("bill")} /> : null}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-950">
      <PosSidebar
        activePanel={panel}
        activeOrders={activeOrderCount}
        kotTickets={activeKotCount}
        heldOrders={heldOrders.length}
        pastOrders={pastOrderCount}
        onNewOrder={startNewOrder}
        onActiveOrders={() => setPanel("active")}
        onHeldOrders={() => setPanel("held")}
        onPastOrders={() => setPanel("past")}
        onCustomers={() => setPanel("customers")}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="grid min-h-0 flex-1 gap-4 p-3 md:p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          {panel === "held" ? (
            <HeldOrdersPanel orders={heldOrders} onResume={resumeHeldOrder} onDelete={(id) => setHeldOrders((current) => current.filter((item) => item.id !== id))} />
          ) : panel === "active" ? (
            <ActiveOrdersPanel
              orders={orders}
              onOpenNew={startNewOrder}
            />
          ) : panel === "past" ? (
            <PastOrdersPanel orders={orders} />
          ) : panel === "customers" ? (
            <CustomersPanel customers={loyaltyCustomers} onSelect={(customer) => {
              setPosCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
              setPanel("new");
              setWizardStep(2);
              toast.success(`${customer.name} selected.`);
            }} />
          ) : (
            renderWizardMain()
          )}

          {panel === "new" ? <CartPanel
            step={wizardStep}
            processingState={processingState}
            completedOrder={completedOrder}
            bill={bill}
            totals={totals}
            onStep={setWizardStep}
            onOrderType={(value) => setPosOrderType(value)}
            onQuantity={updatePosQuantity}
            onRemove={removePosItem}
            onNextDetails={goToDetails}
            onNextReview={goToReview}
            onProcessOrder={(capturePayment) => void processOrder(capturePayment)}
            onClear={resetPosBill}
            onHold={holdOrder}
            onSave={saveOrder}
            onNewOrder={startNewOrder}
            onViewActiveOrders={() => setPanel("active")}
            onPrintBill={() => printTicket("bill")}
            onPayment={setPosPayment}
            onDiscount={(amount) => {
              setPosBill({ ...bill, discount: amount, paid: false });
              toast.success(amount > 0 ? `Discount applied: ${formatCurrency(amount)}` : "Discount removed.");
            }}
            applyGst={applyGst}
            onApplyGst={(value) => {
              setPosBill({ ...bill, applyGst: value, paid: false });
              toast.success(value ? "GST enabled for this bill." : "GST removed for this bill.");
            }}
            waiveParcelCharge={waiveParcelCharge}
            onWaiveParcelCharge={(value) => {
              setPosBill({ ...bill, waiveParcelCharge: value, paid: false });
              toast.success(value ? "Parcel charge waived for this bill." : "Parcel charge applied.");
            }}
          /> : null}
        </main>
        <footer className="grid gap-3 border-t border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatusPill icon={Grid2X2} label="Menu Items" value={String(menu.length)} />
            <StatusPill icon={UsersRound} label="Customers" value={String(loyaltyCustomers.length)} />
            <StatusPill icon={ClipboardList} label="Orders" value={String(orders.length)} />
            <StatusPill icon={Utensils} label="Kitchen Operations" value={`${tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length} Active`} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => printTicket("kot")} disabled={!bill.lines.length}>
              <ChefHat className="size-4" />
              View Kitchen Operations
            </Button>
            <Button variant="outline" onClick={() => printTicket("bill")} disabled={!bill.lines.length}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        </footer>
        <div className="hidden print-ticket-active">
          {showKot ? (
            <KotTicket context={kotContext} template={printerSettings.templates?.find((item) => item.type === "kot") ?? defaultKotTemplate} />
          ) : (
            <RestaurantBill context={billContext} template={printerSettings.templates?.find((item) => item.type === "bill") ?? defaultBillTemplate} />
          )}
        </div>
        {activeKitchenOrder ? <span className="sr-only">Active kitchen ticket {activeKitchenOrder.id}</span> : null}
      </div>
    </div>
  );
}

function createFallbackBranch(profile: OwnerBusinessProfile | undefined, managerId: string, restaurantSlug: string): RestaurantBranch {
  return {
    id: DEFAULT_BRANCH_ID,
    tenantId: resolveTenantId(restaurantSlug),
    restaurantSlug,
    name: profile?.hotelName || "Main Branch",
    address: profile?.businessAddress || "Owner operational branch",
    phone: profile?.phoneNumber || "",
    managerId,
  };
}

function toMenuProduct(item: MenuItem, category: string): PosProduct {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    category,
    isVeg: item.isVeg,
    isPopular: item.isPopular,
    soldOut: item.soldOut,
    source: "menu",
    raw: item,
  };
}

function toInventoryProduct(item: InventoryItem): PosProduct {
  return {
    id: item.id,
    name: item.name,
    price: item.price ?? 0,
    category: item.category,
    stockLabel: `${item.currentStock} ${item.unit} left`,
    soldOut: item.currentStock <= 0,
    source: "product",
    raw: item,
  };
}

function productCategories(items: InventoryItem[]): PosCategory[] {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(item.category, (counts.get(item.category) ?? 0) + 1));
  return Array.from(counts.entries()).map(([name, count]) => ({ id: name, name, count }));
}

function WizardShell({
  step,
  title,
  subtitle,
  onStep,
  children,
}: {
  step: PosWizardStep;
  title: string;
  subtitle: string;
  onStep: (step: PosWizardStep) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
          </div>
          <WizardRail step={step} onStep={onStep} />
        </div>
      </div>
      {children}
    </section>
  );
}

function WizardRail({ step, onStep }: { step: PosWizardStep; onStep: (step: PosWizardStep) => void }) {
  const steps = ["Items", "Details", "Review", "Payment", "Done"] as const;
  return (
    <div className="customer-scroll flex max-w-full gap-2 overflow-x-auto pb-1">
      {steps.map((label, index) => {
        const value = (index + 1) as PosWizardStep;
        return (
          <button
            key={label}
            type="button"
            onClick={() => value < 4 && onStep(value)}
            disabled={value >= 4}
            className={cn(
              "flex h-9 min-w-24 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black transition",
              value === step ? "border-emerald-300 bg-emerald-50 text-emerald-800" : value < step ? "border-emerald-100 bg-white text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500",
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-white text-[11px] shadow-sm">{index + 1}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

type CustomerLookupItem = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subtitle?: string;
  meta?: string;
};

function CustomerOrderDetailsStep({
  bill,
  tables,
  lookupItems,
  activeWaiters,
  deliveryAddress,
  landmark,
  orderNote,
  onOrderType,
  onTable,
  onCustomer,
  onLookup,
  onWaiter,
  onAddress,
  onLandmark,
  onNote,
  onBack,
  onNext,
}: {
  bill: PosBill;
  tables: PosTable[];
  lookupItems: CustomerLookupItem[];
  activeWaiters: StaffMember[];
  deliveryAddress: string;
  landmark: string;
  orderNote: string;
  onOrderType: (value: PosBill["orderType"]) => void;
  onTable: (value: string) => void;
  onCustomer: (customer: { id?: string; name?: string; phone?: string }) => void;
  onLookup: () => void;
  onWaiter: (name: string) => void;
  onAddress: (value: string) => void;
  onLandmark: (value: string) => void;
  onNote: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const orderTypes = ["dine-in", "parcel", "delivery", "takeaway"] as const;
  return (
    <WizardShell step={2} onStep={(value) => value <= 2 && (value === 1 ? onBack() : null)} title="Customer & order details" subtitle="Set table, customer, address and waiter. Address is required only for delivery.">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="size-5 text-orange-500" />
              <h3 className="font-black text-slate-950">Order mode</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {orderTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onOrderType(type)}
                  className={cn("rounded-xl border px-3 py-3 text-sm font-black", bill.orderType === type ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600")}
                >
                  {readablePosOrderType(type)}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <UsersRound className="size-5 text-emerald-600" />
              <h3 className="font-black text-slate-950">Customer</h3>
            </div>
            <CustomerSelector customerName={bill.customerName} customerPhone={bill.customerPhone} lookupItems={lookupItems} onCustomer={onCustomer} onLookup={onLookup} />
          </section>

          {bill.orderType === "delivery" ? (
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="size-5 text-blue-600" />
                <h3 className="font-black text-slate-950">Delivery address</h3>
              </div>
              <div className="grid gap-3">
                <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" value={deliveryAddress} onChange={(event) => onAddress(event.target.value)} placeholder="Full address" />
                <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" value={landmark} onChange={(event) => onLandmark(event.target.value)} placeholder="Landmark / delivery instructions" />
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">{bill.orderType === "dine-in" ? "Table selection" : "Location"}</h3>
            <div className="mt-3">
              <TableSelector orderType={bill.orderType} table={bill.table} tables={tables} onTable={onTable} />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{bill.orderType === "dine-in" ? "A table is mandatory before sending KOT." : "No table required for parcel, delivery, or quick bill."}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Waiter assignment</h3>
            <select className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" value={bill.waiterName ?? ""} onChange={(event) => onWaiter(event.target.value)}>
              <option value="">Use signed-in waiter</option>
              {activeWaiters.map((waiter) => <option key={waiter.id} value={waiter.name}>{waiter.name} · active</option>)}
            </select>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Order note</h3>
            <textarea className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500" value={orderNote} onChange={(event) => onNote(event.target.value)} placeholder="Kitchen notes, allergies, parcel instructions..." />
          </section>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={onNext}>Next: Review</Button>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}

function ReviewOrderStep({
  bill,
  totals,
  deliveryAddress,
  landmark,
  orderNote,
  onQuantity,
  onRemove,
  onBack,
  onProcess,
}: {
  bill: PosBill;
  totals: { subtotal: number; discount: number; cgst: number; sgst: number; packingCharge: number; serviceCharge: number; total: number };
  deliveryAddress: string;
  landmark: string;
  orderNote: string;
  onQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onBack: () => void;
  onProcess: () => void;
}) {
  return (
    <WizardShell step={3} onStep={(value) => value === 1 ? onBack() : null} title="Review order" subtitle="Confirm food, quantities, customer, taxes and payment before placing the order.">
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h3 className="font-black text-slate-950">Selected food</h3>
              <p className="text-sm font-semibold text-slate-500">Every active item is editable before billing.</p>
            </div>
            <Button variant="outline" size="sm" onClick={onBack}>Edit items</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {bill.lines.map((line) => (
              <div key={line.itemId} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-black text-slate-950">{line.name}</p>
                  <p className="text-sm font-semibold text-slate-500">{formatCurrency(line.price)} each</p>
                </div>
                <div className="flex h-9 items-center rounded-xl border border-slate-200">
                  <button className="px-3 text-lg font-black" onClick={() => onQuantity(line.itemId, line.quantity - 1)}>-</button>
                  <span className="min-w-8 text-center text-sm font-black">{line.quantity}</span>
                  <button className="px-3 text-lg font-black" onClick={() => onQuantity(line.itemId, line.quantity + 1)}>+</button>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="font-black">{formatCurrency(line.price * line.quantity)}</p>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onRemove(line.itemId)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="font-black text-slate-950">Order summary</h3>
          <SummaryLine label="Type" value={readablePosOrderType(bill.orderType)} />
          <SummaryLine label="Table" value={bill.orderType === "dine-in" ? bill.table : "Not required"} />
          <SummaryLine label="Customer" value={bill.customerName || "Guest customer"} />
          <SummaryLine label="Phone" value={bill.customerPhone || "Not added"} />
          {bill.orderType === "delivery" ? <SummaryLine label="Address" value={[deliveryAddress, landmark].filter(Boolean).join(", ") || "Required"} /> : null}
          {orderNote ? <SummaryLine label="Note" value={orderNote} /> : null}
          <div className="border-t border-slate-100 pt-3">
            <SummaryLine label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <SummaryLine label="Tax" value={formatCurrency(totals.cgst + totals.sgst)} />
            <SummaryLine label="Packing" value={formatCurrency(totals.packingCharge + totals.serviceCharge)} />
            <SummaryLine label="Discount" value={`-${formatCurrency(totals.discount)}`} />
            <div className="mt-3 flex justify-between text-lg font-black">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <Button className="h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onProcess}>
            <ChefHat className="size-4" />
            Continue to payment
          </Button>
        </aside>
      </div>
    </WizardShell>
  );
}

function ProcessingOrderStep({ state }: { state: PosProcessingState }) {
  const label = state === "saving" ? "Saving order" : state === "kitchen" ? "Creating KOT" : state === "syncing" ? "Syncing screens" : "Finalizing";
  return (
    <WizardShell step={4} onStep={() => undefined} title="Processing order" subtitle="Please keep this screen open while POS updates kitchen and live order views.">
      <div className="grid min-h-[520px] place-items-center p-6">
        <div className="max-w-md text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Loader2 className="size-10" />
          </motion.div>
          <h3 className="mt-5 text-2xl font-black text-slate-950">{label}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">Order details, KOT, billing state and sync queue are being updated through the existing POS workflow.</p>
        </div>
      </div>
    </WizardShell>
  );
}

function OrderSuccessStep({ order, onNewOrder, onViewActive, onPrint }: { order: CompletedPosOrder | null; onNewOrder: () => void; onViewActive: () => void; onPrint: () => void }) {
  return (
    <WizardShell step={5} onStep={() => undefined} title="Order confirmed" subtitle="The kitchen has received the order. Print the bill or start the next order.">
      <div className="grid min-h-[520px] place-items-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="mx-auto grid size-24 place-items-center rounded-full bg-emerald-700 text-white">
            <CheckCircle2 className="size-12" />
          </motion.div>
          <h3 className="mt-5 text-2xl font-black text-slate-950">Order placed successfully</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">Estimated preparation time: 12-30 minutes based on order type.</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-sm">
            <SummaryLine label="Order ID" value={order?.orderId ?? "New order"} />
            <SummaryLine label="KOT ID" value={order?.kotId ?? "Kitchen Operations"} />
            <SummaryLine label="Total" value={formatCurrency(order?.total ?? 0)} />
            <SummaryLine label="Payment" value={(order?.payment ?? "cash").toUpperCase()} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onPrint}>
              <Printer className="size-4" />
              Print bill
            </Button>
            <Button variant="outline" onClick={onViewActive}>
              <ChefHat className="size-4" />
              Active orders
            </Button>
          </div>
          <Button className="mt-3 h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onNewOrder}>New order</Button>
        </div>
      </div>
    </WizardShell>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-950">{value}</span>
    </div>
  );
}

function readablePosOrderType(type: PosBill["orderType"]) {
  if (type === "dine-in") return "Dine-in";
  if (type === "takeaway") return "Quick Bill";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function HeldOrdersPanel({
  orders,
  onResume,
  onDelete,
}: {
  orders: HeldPosOrder[];
  onResume: (order: HeldPosOrder) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Hold Orders</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Resume saved bills when the customer is ready.</p>
        </div>
        <Badge variant="muted">{orders.length} held</Badge>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {orders.length ? orders.map((order) => {
          const total = order.bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
          return (
            <article key={order.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">{order.label}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <Badge variant="secondary">{formatCurrency(total)}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm font-semibold text-slate-600">
                {order.bill.lines.slice(0, 3).map((line) => (
                  <p key={line.itemId}>{line.quantity} x {line.name}</p>
                ))}
                {order.bill.lines.length > 3 ? <p>+ {order.bill.lines.length - 3} more items</p> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onResume(order)}>Resume</Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(order.id)}>Remove</Button>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
            No held orders yet. Use Hold from the cart to park an unfinished bill.
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveOrdersPanel({
  orders,
  onOpenNew,
}: {
  orders: DemoOrder[];
  onOpenNew: () => void;
}) {
  const activeCustomerOrders = orders.filter((order) => !["delivered", "completed", "cancelled", "rejected"].includes(order.status));

  return (
    <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Active Orders</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Canonical website, POS, parcel, and delivery orders.</p>
        </div>
        <Button onClick={onOpenNew}>New Order</Button>
      </div>
      <div className="mt-5 grid gap-3">
        {activeCustomerOrders.length ? (
          <>
            {activeCustomerOrders.map((order, index) => (
              <OrderPanelRow
                key={order.id}
                id={readableOrderId({ id: order.id, channel: order.channel, orderType: order.fulfillmentType, createdAt: order.createdAt, sequence: index + 1 })}
                customer={order.customer.name}
                amount={order.totals.total}
                time={actualOrderTime(order.createdAt)}
                status={order.status}
                source={order.channel}
              />
            ))}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">
            No active orders right now.
          </div>
        )}
      </div>
    </section>
  );
}

function PastOrdersPanel({ orders }: { orders: DemoOrder[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [since] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = [
    ...orders
      .filter((order) => Date.parse(order.createdAt) >= since)
      .map((order, index) => ({
        id: readableOrderId({ id: order.id, channel: order.channel, orderType: order.fulfillmentType, createdAt: order.createdAt, sequence: index + 1 }),
        rawId: order.id,
        customer: order.customer.name,
        amount: order.totals.total,
        payment: order.payment.toUpperCase(),
        time: actualOrderTime(order.createdAt),
        waiter: "-",
        source: order.channel,
        gst: order.totals.tax,
        discount: order.totals.discount,
        status: order.status,
      })),
  ];
  const filtered = rows.filter((row) => {
    const value = search.trim().toLowerCase();
    return !value || [row.id, row.rawId, row.customer, row.source, row.status].some((field) => String(field).toLowerCase().includes(value));
  });
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportRows() {
    const csv = [
      "Order ID,Customer,Amount,Payment,Time,Waiter,Source,GST,Discount,Status",
      ...filtered.map((row) => [row.id, row.customer, row.amount, row.payment, row.time, row.waiter, row.source, row.gst, row.discount, row.status].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sarva-pos-past-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Past Orders</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Default view: last 7 days.</p>
        </div>
        <Button variant="outline" onClick={exportRows}>
          <Download className="size-4" />
          Export
        </Button>
      </div>
      <label className="relative mt-4 block max-w-md">
        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
        <input className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by order ID, customer, phone..." />
      </label>
      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Order ID", "Customer", "Amount", "Payment", "Time", "Waiter", "Source", "GST", "Discount", "Status"].map((head) => <th key={head} className="px-3 py-3 font-black">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.rawId} className="border-t border-slate-100">
                <td className="px-3 py-3 font-black">{row.id}</td>
                <td className="px-3 py-3">{row.customer}</td>
                <td className="px-3 py-3 font-black">{formatCurrency(row.amount)}</td>
                <td className="px-3 py-3">{row.payment}</td>
                <td className="px-3 py-3">{row.time}</td>
                <td className="px-3 py-3">{row.waiter}</td>
                <td className="px-3 py-3">{row.source}</td>
                <td className="px-3 py-3">{formatCurrency(row.gst)}</td>
                <td className="px-3 py-3">{formatCurrency(row.discount)}</td>
                <td className="px-3 py-3"><Badge variant="success">{row.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:hidden">
        {visible.map((row) => (
          <article key={row.rawId} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{row.id}</p>
                <p className="text-xs font-semibold text-slate-500">{row.time} • {row.status}</p>
              </div>
              <p className="font-black">{formatCurrency(row.amount)}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">Showing {visible.length} of {filtered.length} orders</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
        </div>
      </div>
    </section>
  );
}

function CustomersPanel({ customers, onSelect }: { customers: LoyaltyCustomer[]; onSelect: (customer: LoyaltyCustomer) => void }) {
  const [search, setSearch] = useState("");
  const normalized = search.replace(/\D/g, "").slice(-10);
  const filtered = customers.filter((customer) => {
    const value = search.trim().toLowerCase();
    if (!value) return true;
    return customer.name.toLowerCase().includes(value) || customer.phone.includes(normalized || value);
  });

  return (
    <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-2xl font-black text-slate-950">Customer Lookup</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Search by phone number to reuse saved customer details for this restaurant.</p>
      </div>
      <label className="relative mt-4 block max-w-md">
        <UserRound className="absolute left-3 top-3 size-4 text-slate-400" />
        <input className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Phone number or customer name" />
      </label>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {filtered.length ? filtered.map((customer) => (
          <article key={customer.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{customer.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{customer.phone}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{customer.totalOrders ?? 0} orders • {formatCurrency(customer.lifetimeValue ?? 0)} lifetime value</p>
                {customer.previousOrderIds?.length ? <p className="mt-1 text-xs font-semibold text-slate-500">Previous: {customer.previousOrderIds.slice(0, 2).join(", ")}</p> : null}
              </div>
              <Button size="sm" onClick={() => onSelect(customer)}>Select</Button>
            </div>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
            No matching customer. Enter the phone in the cart to save a new customer after checkout.
          </div>
        )}
      </div>
    </section>
  );
}

function OrderPanelRow({
  id,
  customer,
  amount,
  time,
  status,
  source,
  actionLabel,
  onAction,
}: {
  id: string;
  customer: string;
  amount: number;
  time: string;
  status: string;
  source: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
      <div>
        <h3 className="font-black text-slate-950">{id}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">{customer} • {source} • {time}</p>
      </div>
      <Badge variant="muted">{status}</Badge>
      <p className="text-lg font-black">{formatCurrency(amount)}</p>
      {onAction ? <Button size="sm" variant="outline" onClick={onAction}>{actionLabel ?? "Open"}</Button> : null}
    </article>
  );
}

function StatusPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="text-sm font-black text-emerald-700">{value}</p>
      </div>
    </div>
  );
}
