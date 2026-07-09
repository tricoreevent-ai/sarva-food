"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRightLeft, BellRing, CheckCircle2, ChefHat, CircleDollarSign, ClipboardList, Clock3, Download, Eye, FileDown, GitMerge, Grid2X2, History, Loader2, MapPin, MessageCircle, MoreHorizontal, PlusCircle, Printer, ReceiptText, Scissors, Search, SlidersHorizontal, UserRound, UsersRound, Utensils, X, XCircle, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/client-toast";
import { PosSidebar, type PosPanel } from "@/modules/owner/pos/components/pos-sidebar";
import { CategoryList, type PosCategory } from "@/modules/owner/pos/components/category-list";
import { ProductGrid } from "@/modules/owner/pos/components/product-grid";
import type { PosProduct } from "@/modules/owner/pos/components/product-card";
import { CartPanel, type CompletedPosOrder, type PosProcessingState, type PosWizardStep } from "@/modules/owner/pos/components/cart-panel";
import { CustomerSelector } from "@/modules/owner/pos/components/customer-selector";
import { TableSelector } from "@/modules/owner/pos/components/table-selector";
import { CompactOrderAccordion } from "@/components/orders/CompactOrderAccordion";
import { RestaurantBill, KotTicket } from "@/components/printing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicCategories } from "@/hooks/use-public-data";
import { useOperationalView } from "@/hooks/use-operational-view";
import { useAppStore } from "@/lib/app-store";
import { buildBillContext, buildKotContext, calculateBillTotals, defaultBillTemplate, defaultKotTemplate, renderReceiptLines, type BillContext } from "@/lib/print-engine";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import type { DemoOrder, InventoryItem, LoyaltyCustomer, MenuCategory, MenuItem, OwnerBusinessProfile, PaperWidth, PosBill, PosTable, PrintLog, PrintTemplate, RestaurantBranch, StaffMember, TableOrder, TaxSettings } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { actualOrderTime, readableOrderId, readableTableOrderId } from "@/lib/order-display";
import { getKitchenDelay } from "@/lib/kitchen-delay";
import { defaultOperationalSettings, normalizeOperationalSettings, type OperationalSettings } from "@/lib/order-delay-settings";
import { normalizePhone } from "@/services/restaurant-ops-service";
import type { OrderAccordionDelay, OrderBadgeTone, OrderDelayLevel } from "@/components/orders/OrderAccordion.types";

const posTabs = ["menu", "custom", "combos"] as const;
const heldOrdersKey = "sarva-pos-held-orders:v1";
const paymentDraftKey = "sarva-pos-payment-draft:v1";

type HeldPosOrder = {
  id: string;
  label: string;
  createdAt: string;
  bill: PosBill;
};

type BillCopy = "Customer Copy" | "Cashier Copy" | "Kitchen Copy" | "Duplicate Copy";
const billCopyOptions: BillCopy[] = ["Customer Copy", "Cashier Copy", "Kitchen Copy", "Duplicate Copy"];
type PaymentMethod = "cash" | "upi" | "card" | "credit";
type SyncStatus = "online" | "offline" | "syncing" | "pending" | "retrying";
type TimelineEntry = Record<string, unknown>;
type SplitBillRecord = {
  id?: string;
  customerName?: string;
  amount?: number;
  method?: PaymentMethod | string;
  basis?: string;
  itemId?: string;
  quantity?: number;
  percent?: number;
  receipt?: boolean;
  note?: string;
  at?: unknown;
};

type BillCorrectionRecord = {
  version?: number;
  label?: string;
  at?: unknown;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  user?: string;
  role?: string;
  terminal?: string;
};

type PaymentLockRecord = {
  locked?: boolean;
  startedAt?: unknown;
  by?: string;
  role?: string;
  method?: PaymentMethod;
  amount?: number;
  reason?: string;
  unlockedAt?: unknown;
};

type OperationalOrder = TableOrder & {
  canonicalOrderId?: string;
  canonicalStatus?: DemoOrder["status"];
  hasKitchenTicket?: boolean;
  paymentTimeline?: TimelineEntry[];
  auditTimeline?: TimelineEntry[];
  statusHistory?: TimelineEntry[];
  splitBills?: SplitBillRecord[];
  corrections?: BillCorrectionRecord[];
  paymentLock?: PaymentLockRecord;
  paidAmount?: number;
  mergedOrderIds?: string[];
  mergedIntoOrderId?: string;
};

type ExtendedDemoOrder = DemoOrder & {
  paymentTimeline?: TimelineEntry[];
  auditTimeline?: TimelineEntry[];
  statusHistory?: TimelineEntry[];
  splitBills?: SplitBillRecord[];
  corrections?: BillCorrectionRecord[];
  paymentLock?: PaymentLockRecord;
  paidAmount?: number;
  mergedOrderIds?: string[];
  mergedIntoOrderId?: string;
  tableNumber?: string;
  waiterName?: string;
};

type SplitBillDraft = {
  key: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  basis: "item" | "quantity" | "percentage" | "custom";
  itemId: string;
  quantity: number;
  percent: number;
  receipt: boolean;
  note: string;
};

type SplitBillPayload = {
  customerName: string;
  amount: number;
  method: PaymentMethod;
  basis: SplitBillDraft["basis"];
  itemId?: string;
  quantity?: number;
  percent?: number;
  receipt: boolean;
  note?: string;
};

type PaymentDraft = {
  order: OperationalOrder;
  amount: number;
  method: PaymentMethod;
  stage: "verify" | "collect";
  unlockReason: string;
};

type BillCorrectionPayload = {
  lines: Array<{ itemId?: string; menuItemId?: string; name: string; price: number; quantity: number; notes?: string }>;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  reason: string;
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

type PosPayload = {
  data?: {
    menu?: MenuItem[];
    orders?: DemoOrder[];
    tables?: PosTable[];
    customers?: LoyaltyCustomer[];
    kitchen?: TableOrder[];
    staff?: StaffMember[];
    draft?: PosBill | null;
  };
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
  const [printCopies, setPrintCopies] = useState<BillCopy[]>(["Customer Copy"]);
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);
  const [previewPaper, setPreviewPaper] = useState<PaperWidth>("80mm");
  const [ticketCreatedAt, setTicketCreatedAt] = useState<Date | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [resumeTarget, setResumeTarget] = useState<HeldPosOrder | null>(null);
  const [heldDeleteTarget, setHeldDeleteTarget] = useState<HeldPosOrder | null>(null);
  const [splitTarget, setSplitTarget] = useState<OperationalOrder | null>(null);
  const [transferTarget, setTransferTarget] = useState<OperationalOrder | null>(null);
  const [mergeTarget, setMergeTarget] = useState<OperationalOrder | null>(null);
  const [timelineTarget, setTimelineTarget] = useState<OperationalOrder | null>(null);
  const [paymentHistoryTarget, setPaymentHistoryTarget] = useState<OperationalOrder | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<OperationalOrder | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<ExtendedDemoOrder | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online"));
  const [pendingChanges, setPendingChanges] = useState(0);
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings>(defaultOperationalSettings);
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

  useEffect(() => {
    let active = true;
    void fetch("/api/owner/operational-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: Partial<OperationalSettings>; error?: string }) => {
        if (!active || payload.error) return;
        setOperationalSettings(normalizeOperationalSettings(payload.data));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const { menuItems, menuCategories, inventoryItems, orders, tables, loyaltyCustomers, tableOrders, staffMembers } = readModel;
  const authUser = useAppStore((state) => state.authUser);
  const ownerBusinessProfile = useAppStore((state) => state.ownerBusinessProfile);
  const configuredBranch = useAppStore((state) => state.branches[0]);
  const taxSettings = useAppStore((state) => state.taxSettings);
  const printerSettings = useAppStore((state) => state.printerSettings);
  const bill = useAppStore((state) => state.posBill);
  const billRef = useRef(bill);
  const draftWrite = useRef(Promise.resolve());
  const { categories: masterCategories } = usePublicCategories();
  const setPosBill = useAppStore((state) => state.setPosBill);
  const resetPosBill = useAppStore((state) => state.resetPosBill);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const operational = useOperationalView(true);
  const waiterView = operational.session?.viewMode === "waiter" || authUser.role === "waiter";
  const currentRole = operational.session?.role ?? authUser.role;
  const canUnlockPayment = ["owner", "admin", "super_admin"].includes(currentRole);
  const canCorrectBills = ["owner", "manager", "admin", "super_admin"].includes(currentRole);
  const branch = useMemo(
    () => configuredBranch ?? createFallbackBranch(ownerBusinessProfile, authUser.id, restaurantId),
    [authUser.id, configuredBranch, ownerBusinessProfile, restaurantId],
  );
  const applyGst = bill.applyGst ?? true;
  const waiveParcelCharge = Boolean(bill.waiveParcelCharge);

  useEffect(() => {
    billRef.current = bill;
  }, [bill]);

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

  const refreshPosReadModel = useCallback(async (options: { signal?: AbortSignal; applyDraft?: boolean } = {}) => {
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "syncing");
    try {
      const response = await fetch("/api/owner/pos", { cache: "no-store", signal: options.signal });
      const payload = await readPosPayload<PosPayload>(response, "POS data could not be loaded.");
      setReadModel((current) => ({
        ...current,
        menuItems: payload.data?.menu ?? [],
        orders: payload.data?.orders ?? [],
        tables: payload.data?.tables ?? [],
        loyaltyCustomers: payload.data?.customers ?? [],
        tableOrders: payload.data?.kitchen ?? [],
        staffMembers: payload.data?.staff ?? [],
      }));
      setPendingChanges(0);
      setSyncStatus("online");
      if (options.applyDraft === false) return;
      if (payload.data?.draft?.lines?.length) setPosBill(payload.data.draft);
      else resetPosBill();
    } catch (error) {
      if ((error as Error).name !== "AbortError") setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "retrying");
      throw error;
    }
  }, [resetPosBill, setPosBill]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refreshPosReadModel({ signal: controller.signal })
        .catch((error) => {
          if ((error as Error).name !== "AbortError") {
            console.error("[pos] bootstrap failed", { reason: error instanceof Error ? error.name : typeof error });
            toast.error("POS data could not be loaded.");
          }
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshPosReadModel]);
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

  useEffect(() => {
    const onOnline = () => {
      setSyncStatus("syncing");
      toast.success("Back online. Synchronizing POS.");
      void refreshPosReadModel({ applyDraft: false }).catch(() => {
        setSyncStatus("retrying");
        toast.error("Sync failed. Retry from Active Orders.");
      });
    };
    const onOffline = () => {
      setSyncStatus("offline");
      toast.error("Offline. Changes pending until reconnect.");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshPosReadModel]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(paymentDraftKey);
        if (saved) setPaymentDraft(JSON.parse(saved) as PaymentDraft);
      } catch {
        window.sessionStorage.removeItem(paymentDraftKey);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!paymentDraft) {
      window.sessionStorage.removeItem(paymentDraftKey);
      return;
    }
    window.sessionStorage.setItem(paymentDraftKey, JSON.stringify(paymentDraft));
  }, [paymentDraft]);

  const menu = useMemo(
    () => menuItems.filter((item) => item.restaurantSlug === restaurantId && !item.soldOut),
    [menuItems, restaurantId],
  );
  const products = useMemo(
    () => inventoryItems.filter((item) => item.sellable !== false && item.price !== undefined),
    [inventoryItems],
  );
  const debouncedQuery = useDebouncedValue(query, 120);
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
  const menuProducts = useMemo(
    () => menu.map((item) => toMenuProduct(item, resolveCategoryName(item))),
    [menu, resolveCategoryName],
  );
  const customProducts = useMemo(
    () => products.map(toInventoryProduct),
    [products],
  );
  const displayedItems = useMemo(() => {
    const source = activeTab === "menu" ? menuProducts : activeTab === "custom" ? customProducts : [];
    const search = debouncedQuery.trim().toLowerCase();
    return source.filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory;
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
  }, [activeTab, activeCategory, availableOnly, customProducts, debouncedQuery, foodFilter, menuProducts, sortMode]);
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

  const billContext = useMemo(() => buildBillContext({
    bill,
    branch,
    taxSettings: effectiveTaxSettings,
    restaurantName: ownerBusinessProfile?.hotelName,
    createdAt: ticketCreatedAt ?? new Date(),
  }), [bill, branch, effectiveTaxSettings, ownerBusinessProfile?.hotelName, ticketCreatedAt]);
  const kotContext = useMemo(() => buildKotContext(billContext), [billContext]);
  const billTemplate = useMemo(() => printerSettings.templates?.find((item) => item.type === "bill") ?? defaultBillTemplate, [printerSettings.templates]);
  const kotTemplate = useMemo(() => printerSettings.templates?.find((item) => item.type === "kot") ?? defaultKotTemplate, [printerSettings.templates]);
  const selectedBillTemplate = useMemo(() => ({ ...billTemplate, paperWidth: previewPaper }), [billTemplate, previewPaper]);
  const billingPrinter = useMemo(() => printerSettings.profiles?.find((profile) => profile.type === "billing") ?? printerSettings.profiles?.[0], [printerSettings.profiles]);
  const totals = useMemo(() => calculateBillTotals(billContext), [billContext]);
  const activeKitchenOrder = bill.linkedKitchenOrderId ? tableOrders.find((order) => order.id === bill.linkedKitchenOrderId) : undefined;
  const operationalOrders = useMemo(() => buildOperationalOrders(orders, tableOrders), [orders, tableOrders]);
  const activeOperationalOrders = useMemo(() => operationalOrders.filter((order) => !["completed", "cancelled", "billed"].includes(order.status)), [operationalOrders]);
  const occupiedTableNames = useMemo(() => new Set(activeOperationalOrders
    .filter((order) => order.id !== bill.linkedKitchenOrderId && order.tableNumber)
    .map((order) => normalizeTableName(order.tableNumber))), [activeOperationalOrders, bill.linkedKitchenOrderId]);
  const activeKotCount = useMemo(
    () => activeOperationalOrders.filter((order) => order.hasKitchenTicket !== false && ["new", "accepted", "preparing", "ready"].includes(order.status)).length,
    [activeOperationalOrders],
  );
  const activeOrderCount = activeOperationalOrders.length;
  const lastInvalidTableWarning = useRef("");

  const persistDraft = useCallback(async (nextBill: PosBill, extra: Partial<{ deliveryAddress: string; landmark: string; orderNote: string }> = {}) => {
    const body = {
      bill: nextBill,
      deliveryAddress: extra.deliveryAddress ?? deliveryAddress,
      landmark: extra.landmark ?? landmark,
      orderNote: extra.orderNote ?? orderNote,
    };
    const write = draftWrite.current.then(async () => {
      const response = nextBill.lines.length
        ? await fetch("/api/owner/pos", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/owner/pos", { method: "DELETE" });
      await readPosPayload(response, "POS draft could not be saved.");
    });
    draftWrite.current = write.catch(() => undefined);
    await write;
    setPosBill(nextBill);
  }, [deliveryAddress, landmark, orderNote, setPosBill]);

  const commitDraft = useCallback(async (nextBill: PosBill, extra?: Partial<{ deliveryAddress: string; landmark: string; orderNote: string }>) => {
    try {
      await persistDraft(nextBill, extra);
    } catch (error) {
      console.error("[pos] draft save failed", { reason: error instanceof Error ? error.name : typeof error });
      setPendingChanges((count) => count + 1);
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "pending");
      toast.error("POS draft could not be saved.");
    }
  }, [persistDraft]);
  const commitDraftRef = useRef(commitDraft);

  useEffect(() => {
    commitDraftRef.current = commitDraft;
  }, [commitDraft]);

  useEffect(() => {
    if (panel !== "new" || bill.orderType !== "dine-in" || !tables.length) return;
    const selectedTable = findTableByName(tables, bill.table);
    if (selectedTable && isTableSelectable(selectedTable, occupiedTableNames)) return;
    if (bill.table && bill.table !== "DIRECT" && selectedTable && !isTableSelectable(selectedTable, occupiedTableNames)) {
      const warningKey = `${bill.table}:${tableAvailability(selectedTable, occupiedTableNames).label}`;
      if (lastInvalidTableWarning.current !== warningKey) {
        lastInvalidTableWarning.current = warningKey;
        toast.error(tableUnavailableMessage(bill.table, tableAvailability(selectedTable, occupiedTableNames).label));
      }
      return;
    }
    const firstAvailable = tables.find((table) => isTableSelectable(table, occupiedTableNames));
    if (firstAvailable && bill.table !== firstAvailable.table) {
      lastInvalidTableWarning.current = "";
      void persistDraft({ ...bill, table: firstAvailable.table, paid: false });
    }
  }, [bill, occupiedTableNames, panel, persistDraft, tables]);

  const handleAdd = useCallback((item: PosProduct) => {
    void commitDraftRef.current(addItemToBill(billRef.current, item));
  }, []);

  const handleQuantity = useCallback((item: PosProduct, quantity: number) => {
    const nextQuantity = item.source === "product" ? Math.min(quantity, (item.raw as InventoryItem).currentStock) : quantity;
    void commitDraftRef.current(updateBillQuantity(billRef.current, item.id, nextQuantity));
  }, []);

  function handleBillQuantity(itemId: string, quantity: number) {
    void commitDraft(updateBillQuantity(bill, itemId, quantity));
  }

  function handleRemoveItem(itemId: string) {
    void commitDraft(updateBillQuantity(bill, itemId, 0));
  }

  function handleOrderType(value: PosBill["orderType"]) {
    const selectedTable = value === "dine-in"
      ? preferredDineInTable(bill.table, tables, occupiedTableNames)
      : "DIRECT";
    void commitDraft({ ...bill, orderType: value, table: selectedTable, paid: false });
  }

  function handleTable(value: string) {
    const selectedTable = findTableByName(tables, value);
    if (selectedTable && !isTableSelectable(selectedTable, occupiedTableNames)) {
      toast.error(tableUnavailableMessage(value, tableAvailability(selectedTable, occupiedTableNames).label));
      return;
    }
    void commitDraft({ ...bill, table: value, paid: false });
  }

  function handleCustomer(customer: { id?: string; name?: string; phone?: string }) {
    void commitDraft({ ...bill, customerId: customer.id ?? bill.customerId, customerName: customer.name ?? "", customerPhone: customer.phone ?? "", paid: false });
  }

  function handlePayment(value: PosBill["payment"]) {
    void commitDraft({ ...bill, payment: value, paid: false });
  }

  async function searchCustomerByPhone() {
    const normalized = normalizePhone(bill.customerPhone ?? "");
    if (!normalized) return;
    const localCustomer = loyaltyCustomers.find((customer) => normalizePhone(customer.phone) === normalized);
    if (localCustomer) {
      handleCustomer({ id: localCustomer.id, name: localCustomer.name, phone: localCustomer.phone });
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
      status: bill.orderType === "parcel" ? "preparing" as const : "new" as const,
      foodStatus: bill.orderType === "parcel" ? "preparing" as const : "new" as const,
      priority: "normal" as const,
      waiterName: bill.waiterName || authUser.name,
      branchId: branch.id,
      etaMinutes: bill.orderType === "delivery" ? 30 : 12,
      total: totals.total,
    };
    if (bill.linkedKitchenOrderId) {
      const lines = incrementalLines(bill.lines, activeKitchenOrder?.lines ?? []);
      if (!lines.length) {
        toast.success("Kitchen already has the latest items.");
        return activeKitchenOrder;
      }
      const operationKey = clientOperationKey(["incremental-kot", bill.linkedKitchenOrderId, lines.map((line) => [line.itemId ?? line.name, line.quantity])]);
      const response = await fetch("/api/owner/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...kitchenPayload, id: `inc-${operationKey}`, operationKey, lines, parentKitchenOrderId: bill.linkedKitchenOrderId, status: "new", priority: "rush" }),
      });
      const result = await readPosPayload<{ data?: TableOrder }>(response, "Incremental KOT could not be created.");
      if (!result.data) throw new Error("Incremental KOT could not be created.");
      const next = result.data;
      setReadModel((current) => ({ ...current, tableOrders: [next, ...current.tableOrders] }));
      setShowKot(true);
      toast.success("Incremental KOT sent with only the new items.");
      return next;
    }
    const response = await fetch("/api/owner/kitchen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kitchenPayload, operationKey: clientOperationKey(["kot", bill.invoiceNumber, tableNumber, bill.lines.map((line) => [line.itemId, line.quantity]), totals.total]) }),
    });
    const result = await readPosPayload<{ data?: TableOrder }>(response, "Kitchen ticket could not be created.");
    if (!result.data) throw new Error("Kitchen ticket could not be created.");
    const order = result.data;
    setReadModel((current) => ({ ...current, tableOrders: [order, ...current.tableOrders] }));
    setPosBill({ ...bill, linkedKitchenOrderId: order.id, applyGst, waiveParcelCharge });
    setShowKot(true);
    toast.success(`Kitchen ticket sent for ${order.tableNumber}.`);
    return order;
  }

  async function checkout(kitchenOrderId?: string, orderId?: string) {
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
      linkedKitchenOrderId: kitchenOrderId ?? bill.linkedKitchenOrderId,
      paid: true,
      tenderedAmount: bill.tenderedAmount && bill.tenderedAmount > 0 ? bill.tenderedAmount : totals.total,
      invoiceNumber,
      billDeliveryLink: billLink,
      billDeliveryQr: billLink,
    });
    const linkedKitchenOrderId = kitchenOrderId ?? bill.linkedKitchenOrderId;
    if (orderId) {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment", operationKey: clientOperationKey(["checkout-payment", orderId, linkedKitchenOrderId, totals.total, bill.payment]), orderId, kitchenOrderId: linkedKitchenOrderId, amount: totals.total, method: bill.payment === "cod" ? "credit" : bill.payment }),
      });
      await readPosPayload(response, "Payment could not be recorded.");
    } else if (linkedKitchenOrderId) {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkedKitchenOrderId, operationKey: clientOperationKey(["kitchen-payment", linkedKitchenOrderId, "paid"]), paymentStatus: "paid" }),
      });
      const result = await readPosPayload<{ data?: TableOrder }>(response, "Kitchen payment status could not be updated.");
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
    if (processingState !== "idle") return;
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

    try {
      setWizardStep(4);
      setProcessingState("saving");
      await wait(420);
      await persistDraft(bill, { deliveryAddress, landmark, orderNote });
      setProcessingState("kitchen");
      const kitchenOrder = await sendKot();
      if (!kitchenOrder) {
        setProcessingState("idle");
        setWizardStep(3);
        return;
      }
      const orderResponse = await fetch("/api/owner/pos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kitchenOrderId: kitchenOrder.id }),
      });
      const placed = await readPosPayload<{ data?: DemoOrder; raw?: { id?: string; invoiceNumber?: string } }>(orderResponse, "POS order could not be finalized.");
      if (placed.data) setReadModel((current) => ({ ...current, orders: [placed.data!, ...current.orders] }));
      const placedOrderId = placed.raw?.id ?? placed.data?.id;
      if (placedOrderId) setPosBill({ ...bill, invoiceNumber: placed.raw?.invoiceNumber ?? placedOrderId, linkedKitchenOrderId: kitchenOrder.id });
      if (capturePayment) {
        const paid = await checkout(kitchenOrder.id, placedOrderId);
        if (!paid) {
          setProcessingState("idle");
          setWizardStep(3);
          return;
        }
      }
      await fetch("/api/owner/pos", { method: "DELETE" }).catch(() => undefined);
      setProcessingState("syncing");
      await wait(420);
      setProcessingState("done");
      setCompletedOrder({
        orderId: placed.data ? readableOrderId({ id: placed.data.id, invoiceNumber: placed.raw?.invoiceNumber ?? placed.data.invoiceNumber, orderNumber: placed.data.orderNumber, displayOrderNumber: placed.data.displayOrderNumber, billNumber: placed.data.billNumber, channel: placed.data.channel, orderType: placed.data.fulfillmentType, createdAt: placed.data.createdAt, sequence: orders.length + 1 }) : readableTableOrderId(kitchenOrder, tableOrders.length + 1),
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order could not be completed. Please retry.";
      console.error("[pos] order processing failed", { message, reason: error instanceof Error ? error.name : typeof error });
      toast.error(message);
      setProcessingState("idle");
      setWizardStep(3);
    }
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

  function requestNewOrder() {
    if (bill.lines.length && wizardStep !== 5) {
      setClearConfirmOpen(true);
      return;
    }
    startNewOrder();
  }

  async function clearCurrentOrder() {
    await fetch("/api/owner/pos", { method: "DELETE" }).catch(() => undefined);
    startNewOrder();
    setClearConfirmOpen(false);
    toast.success("Current POS order cleared.");
  }

  async function holdOrder() {
    if (!bill.lines.length) {
      toast.error("Add items before holding an order.");
      return;
    }
    const label = bill.table !== "DIRECT" ? bill.table : bill.customerName || bill.orderType;
    setHeldOrders((current) => [
      { id: `hold-${Date.now()}`, label, createdAt: new Date().toISOString(), bill },
      ...current,
    ]);
    await fetch("/api/owner/pos", { method: "DELETE" }).catch(() => undefined);
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
    if (bill.lines.length) {
      setResumeTarget(order);
      return;
    }
    void restoreHeldOrder(order);
  }

  async function restoreHeldOrder(order: HeldPosOrder) {
    await persistDraft(order.bill);
    setPosBill(order.bill);
    setHeldOrders((current) => current.filter((item) => item.id !== order.id));
    setResumeTarget(null);
    setPanel("new");
    setWizardStep(1);
    toast.success(`Resumed order for ${order.label}.`);
  }

  function removeHeldOrder(order: HeldPosOrder) {
    setHeldOrders((current) => current.filter((item) => item.id !== order.id));
    setHeldDeleteTarget(null);
    toast.success(`Removed held order for ${order.label}.`);
  }

  async function logPrint(target: "bill" | "kot", duplicate = false) {
    const referenceId = target === "bill" ? bill.invoiceNumber || billContext.invoiceNumber : bill.linkedKitchenOrderId || kotContext.kotNumber;
    const status: PrintLog["status"] = duplicate ? "retry" : billingPrinter?.status === "offline" ? "queued" : "success";
    await fetch("/api/owner/printers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ log: { type: target, status, user: authUser.name, branchId: branch.id, printerProfileId: billingPrinter?.id ?? "browser-billing", referenceId } }),
    }).catch((error) => console.error("[pos] print log failed", { target, referenceId, reason: error instanceof Error ? error.name : typeof error }));
  }

  function printTicket(target: "bill" | "kot", copies: BillCopy[] = target === "bill" ? ["Customer Copy"] : ["Kitchen Copy"], duplicate = false) {
    if (!bill.lines.length) {
      toast.error("Add at least one item before printing.");
      return;
    }
    setTicketCreatedAt(new Date());
    setShowKot(target === "kot");
    setPrintCopies(copies);
    void logPrint(target, duplicate);
    window.document.body.classList.add("print-ticket-mode");
    window.setTimeout(() => {
      window.print();
      window.document.body.classList.remove("print-ticket-mode");
    }, 80);
  }

  function downloadBillDocument(copies: BillCopy[]) {
    if (!bill.lines.length) return toast.error("Add at least one item before downloading the bill.");
    const content = copies.map((copy) => renderReceiptLines(withBillCopy(billContext, copy), selectedBillTemplate).join("\n")).join("\n\n\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${billContext.invoiceNumber}</title><style>body{font-family:monospace;white-space:pre;padding:24px;color:#111}@media print{@page{margin:4mm}body{padding:0}}</style></head><body>${escapeHtml(content)}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${billContext.invoiceNumber}-bill.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    toast.success("PDF-ready bill downloaded. Open it and print as PDF when needed.");
  }

  function shareBillWhatsApp() {
    const phone = normalizePhone(bill.customerPhone ?? "");
    if (!phone) return toast.error("Add a customer mobile number before sending the bill.");
    const text = [
      `Bill ${billContext.invoiceNumber}`,
      `${billContext.restaurantName}`,
      `Total: ${formatCurrency(totals.total)}`,
      bill.billDeliveryLink ? `Link: ${bill.billDeliveryLink}` : "",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp bill message opened.");
  }

  function openKitchenOrder(order: TableOrder) {
    if ((order as OperationalOrder).paymentLock?.locked) {
      toast.error("Payment started. Unlock with reason before editing this bill.");
      return;
    }
    setPosBill(tableOrderToBill(order, bill));
    setPanel("new");
    setWizardStep(3);
  }

  function canonicalForKitchenOrder(order: OperationalOrder | TableOrder) {
    const operational = order as OperationalOrder;
    return operational.canonicalOrderId
      ? orders.find((item) => item.id === operational.canonicalOrderId)
      : orders.find((item) => item.kitchenOrderId === order.id);
  }

  async function collectActivePayment(order: TableOrder) {
    const active = order as OperationalOrder;
    const canonical = canonicalForKitchenOrder(order) as ExtendedDemoOrder | undefined;
    if (!canonical) {
      toast.error("Open and save this order before collecting payment.");
      return;
    }
    if (!["ready", "served"].includes(order.status)) {
      toast.error("Kitchen still preparing.");
      return;
    }
    const amount = orderBalanceDue(canonical, active) || Number(order.total ?? canonical.totals.total ?? 0);
    setPaymentDraft({ order: active, amount: moneyRound(amount), method: "cash", stage: "verify", unlockReason: "" });
  }

  async function startPaymentCollection(draft: PaymentDraft) {
    const canonical = canonicalForKitchenOrder(draft.order);
    if (!canonical) return toast.error("Open and save this order before collecting payment.");
    const kitchenOrderId = draft.order.hasKitchenTicket === false ? undefined : draft.order.id;
    setActiveAction(`payment-lock:${draft.order.id}`);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "payment_started", operationKey: clientOperationKey(["payment-start", canonical.id, draft.order.id, draft.amount, draft.method]), orderId: canonical.id, kitchenOrderId, amount: draft.amount, method: draft.method }),
      });
      await readPosPayload(response, "Payment verification could not be saved.");
      setPaymentDraft({ ...draft, stage: "collect" });
      await refreshPosReadModel({ applyDraft: false });
      toast.success("Payment verified. Collect amount now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment verification could not be saved.");
    } finally {
      setActiveAction(null);
    }
  }

  async function unlockPaymentDraft(draft: PaymentDraft) {
    const canonical = canonicalForKitchenOrder(draft.order);
    const reason = draft.unlockReason.trim();
    if (!canonical) return toast.error("Open and save this order before unlocking payment.");
    if (!reason) return toast.error("Unlock reason is required.");
    const kitchenOrderId = draft.order.hasKitchenTicket === false ? undefined : draft.order.id;
    setActiveAction(`payment-unlock:${draft.order.id}`);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "payment_unlock", operationKey: clientOperationKey(["payment-unlock", canonical.id, reason]), orderId: canonical.id, kitchenOrderId, reason }),
      });
      await readPosPayload(response, "Payment lock could not be released.");
      setPaymentDraft({ ...draft, unlockReason: "" });
      await refreshPosReadModel({ applyDraft: false });
      toast.success("Payment lock released with audit reason.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment lock could not be released.");
    } finally {
      setActiveAction(null);
    }
  }

  async function recordPaymentDraft(draft: PaymentDraft) {
    const canonical = canonicalForKitchenOrder(draft.order);
    if (!canonical) {
      toast.error("Open and save this order before collecting payment.");
      return;
    }
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    const kitchenOrderId = draft.order.hasKitchenTicket === false ? undefined : draft.order.id;
    setActiveAction(`payment:${draft.order.id}`);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "payment", operationKey: clientOperationKey(["payment", canonical.id, draft.order.id, amount, draft.method]), orderId: canonical.id, kitchenOrderId, amount, method: draft.method }),
      });
      const result = await readPosPayload<{ data?: { paymentStatus?: "pending" | "partial" | "paid" }; paymentStatus?: "pending" | "partial" | "paid" }>(response, "Payment could not be recorded.");
      const paymentStatus = result.data?.paymentStatus ?? result.paymentStatus ?? (amount + 0.01 < Number(draft.order.total ?? 0) ? "partial" : "paid");
      await refreshPosReadModel({ applyDraft: false });
      setReadModel((current) => ({
        ...current,
        tableOrders: current.tableOrders.map((item) => item.id === draft.order.id ? { ...item, paymentStatus } : item),
        orders: current.orders.map((item) => item.id === canonical.id ? { ...item, splitPayment: paymentStatus === "partial" || item.splitPayment } : item),
      }));
      setPaymentDraft(null);
      toast.success(paymentStatus === "partial" ? "Partial payment recorded." : "Payment recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be recorded.");
    } finally {
      setActiveAction(null);
    }
  }

  async function submitBillCorrection(order: ExtendedDemoOrder, payload: BillCorrectionPayload) {
    if (!payload.reason.trim()) return toast.error("Correction reason is required.");
    setActiveAction(`correction:${order.id}`);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "bill_correction",
          operationKey: clientOperationKey(["bill-correction", order.id, payload.reason, payload.total, payload.lines.map((line) => [line.menuItemId ?? line.itemId ?? line.name, line.price, line.quantity])]),
          orderId: order.id,
          reason: payload.reason,
          correction: {
            lines: payload.lines,
            discount: payload.discount,
            tax: payload.tax,
            deliveryFee: payload.deliveryFee,
            total: payload.total,
          },
        }),
      });
      await readPosPayload(response, "Bill correction could not be saved.");
      await refreshPosReadModel({ applyDraft: false });
      setCorrectionTarget(null);
      toast.success("Bill correction saved with audit history.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bill correction could not be saved.");
    } finally {
      setActiveAction(null);
    }
  }

  async function recordActivePrint(order: TableOrder, type: "bill" | "kot" | "receipt") {
    const canonical = canonicalForKitchenOrder(order);
    if (canonical) {
      await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "print", operationKey: clientOperationKey(["print", canonical.id, type, order.printedCount ?? 0]), orderId: canonical.id, type, note: order.printedCount ? `${type} reprint` : `${type} print` }),
      }).catch(() => undefined);
    }
    openKitchenOrder(order);
    if (type === "bill" || type === "receipt") setBillPreviewOpen(true);
    else window.setTimeout(() => printTicket("kot", ["Kitchen Copy"], Boolean(order.printedCount)), 0);
  }

  async function remindKitchen(order: TableOrder) {
    const canonical = canonicalForKitchenOrder(order);
    let updatedKitchen: TableOrder | undefined;
    if ((order as OperationalOrder).hasKitchenTicket !== false) {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.id, operationKey: clientOperationKey(["kitchen-reminder", order.id]), priority: "rush", reminderAt: new Date().toISOString(), reminderBy: authUser.name || authUser.id }),
      });
      const result = await readPosPayload<{ data?: TableOrder }>(response, "Kitchen reminder could not be sent.");
      updatedKitchen = result.data;
    }
    if (canonical) {
      const kitchenOrderId = (order as OperationalOrder).hasKitchenTicket === false ? undefined : order.id;
      await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "event", operationKey: clientOperationKey(["order-event", canonical.id, "reminder", kitchenOrderId]), event: "reminder", orderId: canonical.id, kitchenOrderId, note: "Kitchen reminder sent" }),
      }).catch(() => undefined);
    }
    setReadModel((current) => ({ ...current, tableOrders: current.tableOrders.map((item) => item.id === order.id ? { ...item, ...(updatedKitchen ?? {}), priority: "rush" } : item) }));
    toast.success("Kitchen reminder sent.");
  }

  async function updateActiveOrderStatus(order: TableOrder, status: TableOrder["status"]) {
    const canonical = canonicalForKitchenOrder(order);
    let updatedKitchen: TableOrder | undefined;
    if ((order as OperationalOrder).hasKitchenTicket !== false) {
      const response = await fetch("/api/owner/kitchen", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.id, operationKey: clientOperationKey(["kitchen-status", order.id, status]), status }),
      });
      const result = await readPosPayload<{ data?: TableOrder }>(response, "Order status could not be updated.");
      updatedKitchen = result.data;
    }
    if (canonical && ((order as OperationalOrder).hasKitchenTicket === false ? isOrderBackedTableStatus(status) : status === "completed" || status === "cancelled")) {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operationKey: clientOperationKey(["order-status", canonical.id, status]), orderId: canonical.id, kitchenOrderId: (order as OperationalOrder).hasKitchenTicket === false ? undefined : order.id, status }),
      });
      await readPosPayload(response, "Order status could not be updated.");
    }
    const event = status === "ready" ? "kitchen_ready" : status === "accepted" ? "kitchen_accepted" : status === "completed" ? "completion" : null;
    if (canonical && event) {
      const kitchenOrderId = (order as OperationalOrder).hasKitchenTicket === false ? undefined : order.id;
      await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "event", operationKey: clientOperationKey(["order-event", canonical.id, event, kitchenOrderId]), event, orderId: canonical.id, kitchenOrderId }),
      }).catch(() => undefined);
    }
    setReadModel((current) => ({
      ...current,
      tableOrders: current.tableOrders.map((item) => item.id === order.id ? updatedKitchen ?? { ...item, status } : item),
      orders: canonical ? current.orders.map((item) => item.id === canonical.id ? { ...item, status: demoStatusForTableStatus(status) } : item) : current.orders,
    }));
    toast.success(activeStatusToast(status));
  }

  async function splitActiveBill(order: OperationalOrder, splits: SplitBillPayload[]) {
    const canonical = canonicalForKitchenOrder(order);
    if (!canonical) {
      toast.error("Open and save this order before splitting the bill.");
      return;
    }
    const actionId = `split:${order.id}`;
    setActiveAction(actionId);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "split_bill",
          operationKey: clientOperationKey(["split-bill", canonical.id, splits.map((split) => [split.amount, split.method, split.customerName])]),
          orderId: canonical.id,
          kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id,
          splits,
        }),
      });
      await readPosPayload(response, "Split bill could not be recorded.");
      await refreshPosReadModel({ applyDraft: false });
      setSplitTarget(null);
      toast.success("Split bill recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Split bill could not be recorded.");
    } finally {
      setActiveAction(null);
    }
  }

  async function transferActiveTable(order: OperationalOrder, tableNumber: string, waiterName?: string) {
    const canonical = canonicalForKitchenOrder(order);
    if (!canonical) {
      toast.error("Open and save this order before transferring the table.");
      return;
    }
    const actionId = `transfer:${order.id}`;
    setActiveAction(actionId);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "transfer_table",
          operationKey: clientOperationKey(["transfer-table", canonical.id, tableNumber, waiterName]),
          orderId: canonical.id,
          kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id,
          tableNumber,
          waiterName,
        }),
      });
      await readPosPayload(response, "Table transfer could not be saved.");
      await refreshPosReadModel({ applyDraft: false });
      setTransferTarget(null);
      toast.success(`Moved to ${tableNumber}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Table transfer could not be saved.");
    } finally {
      setActiveAction(null);
    }
  }

  async function mergeActiveTables(order: OperationalOrder, sourceOrders: OperationalOrder[], tableNumber?: string) {
    const canonical = canonicalForKitchenOrder(order);
    if (!canonical) {
      toast.error("Open and save this order before merging tables.");
      return;
    }
    const sourceOrderIds = sourceOrders
      .map((item) => canonicalForKitchenOrder(item)?.id)
      .filter((id): id is string => Boolean(id && id !== canonical.id));
    if (!sourceOrderIds.length) {
      toast.error("Choose at least one order to merge.");
      return;
    }
    const actionId = `merge:${order.id}`;
    setActiveAction(actionId);
    try {
      const response = await fetch("/api/owner/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "merge_tables",
          operationKey: clientOperationKey(["merge-tables", canonical.id, sourceOrderIds, tableNumber]),
          orderId: canonical.id,
          kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id,
          sourceOrderIds,
          sourceKitchenOrderIds: sourceOrders.filter((item) => item.hasKitchenTicket !== false).map((item) => item.id),
          tableNumber,
        }),
      });
      await readPosPayload(response, "Tables could not be merged.");
      await refreshPosReadModel({ applyDraft: false });
      setMergeTarget(null);
      toast.success("Tables merged.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tables could not be merged.");
    } finally {
      setActiveAction(null);
    }
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
              occupiedTables={occupiedTableNames}
              lookupItems={customerLookupItems}
              activeWaiters={activeWaiters}
              deliveryAddress={deliveryAddress}
              landmark={landmark}
              orderNote={orderNote}
              onOrderType={handleOrderType}
              onTable={handleTable}
              onCustomer={handleCustomer}
              onLookup={() => void searchCustomerByPhone()}
              onWaiter={(waiterName) => void commitDraft({ ...bill, waiterName, paid: false })}
              onAddress={(value) => { setDeliveryAddress(value); void commitDraft(bill, { deliveryAddress: value }); }}
              onLandmark={(value) => { setLandmark(value); void commitDraft(bill, { landmark: value }); }}
              onNote={(value) => { setOrderNote(value); void commitDraft(bill, { orderNote: value }); }}
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
              onQuantity={handleBillQuantity}
              onRemove={handleRemoveItem}
              onBack={() => setWizardStep(2)}
              onProcess={() => void processOrder(false)}
            />
          ) : null}

          {wizardStep === 4 ? <ProcessingOrderStep state={processingState} /> : null}
          {wizardStep === 5 ? <OrderSuccessStep order={completedOrder} onNewOrder={startNewOrder} onViewActive={() => setPanel("active")} onPrint={() => setBillPreviewOpen(true)} /> : null}
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
        showKitchenQueue={!waiterView}
        onNewOrder={requestNewOrder}
        onActiveOrders={() => setPanel("active")}
        onHeldOrders={() => setPanel("held")}
        onPastOrders={() => setPanel("past")}
        onCustomers={() => setPanel("customers")}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <PosSyncBanner
          status={syncStatus}
          pendingChanges={pendingChanges}
          onRetry={() => void refreshPosReadModel({ applyDraft: false }).catch(() => setSyncStatus("retrying"))}
        />
        <main className="grid min-h-0 flex-1 gap-4 p-3 md:p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          {panel === "held" ? (
            <HeldOrdersPanel orders={heldOrders} onResume={resumeHeldOrder} onDelete={setHeldDeleteTarget} />
          ) : panel === "active" ? (
            <ActiveOrdersPanel
              orders={orders}
              kitchenOrders={operationalOrders}
              tables={tables}
              staff={staffMembers}
              orderDelayThresholdMinutes={operationalSettings.orderDelayThresholdMinutes}
              onOpenNew={requestNewOrder}
              onOpen={(order) => setDetailsTarget(order as OperationalOrder)}
              onAddItems={openKitchenOrder}
              onPrintBill={(order) => void recordActivePrint(order, "bill")}
              onPrintReceipt={(order) => void recordActivePrint(order, "receipt")}
              onPrintKot={(order) => void recordActivePrint(order, "kot")}
              onCollectPayment={(order) => void collectActivePayment(order)}
              onSplit={(order) => setSplitTarget(order)}
              onTransfer={(order) => setTransferTarget(order)}
              onMerge={(order) => setMergeTarget(order)}
              onTimeline={(order) => setTimelineTarget(order)}
              onPaymentHistory={(order) => setPaymentHistoryTarget(order)}
              onReminder={(order) => void remindKitchen(order)}
              onServe={(order) => void updateActiveOrderStatus(order, "served")}
              onComplete={(order) => void updateActiveOrderStatus(order, "completed")}
              onCancel={(order) => void updateActiveOrderStatus(order, "cancelled")}
              activeAction={activeAction}
              waiterView={waiterView}
            />
          ) : panel === "past" ? (
            <PastOrdersPanel orders={orders} canCorrect={canCorrectBills} onOpen={(order) => setDetailsTarget(orderToOperationalOrder(order))} onCorrect={(order) => setCorrectionTarget(order as ExtendedDemoOrder)} />
          ) : panel === "customers" ? (
            <CustomersPanel customers={loyaltyCustomers} onSelect={(customer) => {
              handleCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
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
            onOrderType={handleOrderType}
            onQuantity={handleBillQuantity}
            onRemove={handleRemoveItem}
            onNextDetails={goToDetails}
            onNextReview={goToReview}
            onProcessOrder={(capturePayment) => void processOrder(capturePayment)}
            onClear={() => setClearConfirmOpen(true)}
            onHold={holdOrder}
            onSave={saveOrder}
            onNewOrder={requestNewOrder}
            onViewActiveOrders={() => setPanel("active")}
            onPrintBill={() => setBillPreviewOpen(true)}
            onPayment={handlePayment}
            onDiscount={(amount) => {
              void commitDraft({ ...bill, discount: amount, paid: false });
              toast.success(amount > 0 ? `Discount applied: ${formatCurrency(amount)}` : "Discount removed.");
            }}
            applyGst={applyGst}
            onApplyGst={(value) => {
              void commitDraft({ ...bill, applyGst: value, paid: false });
              toast.success(value ? "GST enabled for this bill." : "GST removed for this bill.");
            }}
            waiveParcelCharge={waiveParcelCharge}
            onWaiveParcelCharge={(value) => {
              void commitDraft({ ...bill, waiveParcelCharge: value, paid: false });
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
            <Button variant="outline" onClick={() => setBillPreviewOpen(true)} disabled={!bill.lines.length}>
              <Eye className="size-4" />
              Preview Bill
            </Button>
          </div>
        </footer>
        <div className="hidden print-ticket-active">
          {showKot ? (
            <KotTicket context={kotContext} template={kotTemplate} />
          ) : (
            <div className="space-y-6">
              {printCopies.map((copy) => <RestaurantBill key={copy} context={withBillCopy(billContext, copy)} template={selectedBillTemplate} />)}
            </div>
          )}
        </div>
        {billPreviewOpen ? (
          <BillPreviewDialog
            context={billContext}
            template={billTemplate}
            paper={previewPaper}
            onPaper={setPreviewPaper}
            onClose={() => setBillPreviewOpen(false)}
            onPrint={(copies, duplicate) => printTicket("bill", copies, duplicate)}
            onDownload={downloadBillDocument}
            onWhatsApp={shareBillWhatsApp}
          />
        ) : null}
        {clearConfirmOpen ? (
          <PosConfirmDialog
            title="Clear current POS order?"
            description="This removes the current cart, customer details, discounts, and billing draft."
            confirmLabel="Clear order"
            onCancel={() => setClearConfirmOpen(false)}
            onConfirm={clearCurrentOrder}
          />
        ) : null}
        {resumeTarget ? (
          <PosConfirmDialog
            title="Replace current order?"
            description={`Resuming ${resumeTarget.label} will replace the items currently in the POS cart.`}
            confirmLabel="Resume held order"
            onCancel={() => setResumeTarget(null)}
            onConfirm={() => void restoreHeldOrder(resumeTarget)}
          />
        ) : null}
        {heldDeleteTarget ? (
          <PosConfirmDialog
            title="Remove held order?"
            description={`This removes the held order for ${heldDeleteTarget.label}.`}
            confirmLabel="Remove"
            onCancel={() => setHeldDeleteTarget(null)}
            onConfirm={() => removeHeldOrder(heldDeleteTarget)}
          />
        ) : null}
        {splitTarget ? (
          <SplitBillDialog
            order={splitTarget}
            canonical={canonicalForKitchenOrder(splitTarget) as ExtendedDemoOrder | undefined}
            busy={activeAction === `split:${splitTarget.id}`}
            onClose={() => setSplitTarget(null)}
            onSubmit={(splits) => void splitActiveBill(splitTarget, splits)}
          />
        ) : null}
        {transferTarget ? (
          <TransferTableDialog
            order={transferTarget}
            tables={tables}
            staff={activeWaiters}
            busy={activeAction === `transfer:${transferTarget.id}`}
            onClose={() => setTransferTarget(null)}
            onSubmit={(tableNumber, waiterName) => void transferActiveTable(transferTarget, tableNumber, waiterName)}
          />
        ) : null}
        {mergeTarget ? (
          <MergeTablesDialog
            target={mergeTarget}
            orders={activeOperationalOrders.filter((order) => order.id !== mergeTarget.id)}
            busy={activeAction === `merge:${mergeTarget.id}`}
            onClose={() => setMergeTarget(null)}
            onSubmit={(sourceOrders, tableNumber) => void mergeActiveTables(mergeTarget, sourceOrders, tableNumber)}
          />
        ) : null}
        {timelineTarget ? (
          <OrderTimelineDialog
            order={timelineTarget}
            canonical={canonicalForKitchenOrder(timelineTarget) as ExtendedDemoOrder | undefined}
            onClose={() => setTimelineTarget(null)}
          />
        ) : null}
        {paymentHistoryTarget ? (
          <PaymentHistoryDialog
            order={paymentHistoryTarget}
            canonical={canonicalForKitchenOrder(paymentHistoryTarget) as ExtendedDemoOrder | undefined}
            printLogs={printerSettings.printLogs ?? []}
            onClose={() => setPaymentHistoryTarget(null)}
          />
        ) : null}
        {detailsTarget ? (
          <OrderDetailsDrawer
            order={detailsTarget}
            canonical={canonicalForKitchenOrder(detailsTarget) as ExtendedDemoOrder | undefined}
            printLogs={printerSettings.printLogs ?? []}
            onClose={() => setDetailsTarget(null)}
            onAddItems={() => openKitchenOrder(detailsTarget)}
            onCollectPayment={() => void collectActivePayment(detailsTarget)}
            onPrintBill={() => void recordActivePrint(detailsTarget, "bill")}
            onTimeline={() => setTimelineTarget(detailsTarget)}
            onPaymentHistory={() => setPaymentHistoryTarget(detailsTarget)}
          />
        ) : null}
        {correctionTarget ? (
          <BillCorrectionDrawer
            order={correctionTarget}
            busy={activeAction === `correction:${correctionTarget.id}`}
            onClose={() => setCorrectionTarget(null)}
            onSubmit={(payload) => void submitBillCorrection(correctionTarget, payload)}
          />
        ) : null}
        {paymentDraft ? (
          <PaymentSafetyDialog
            draft={paymentDraft}
            busy={Boolean(activeAction?.startsWith("payment"))}
            canUnlock={canUnlockPayment}
            onChange={setPaymentDraft}
            onClose={() => setPaymentDraft(null)}
            onContinue={() => void startPaymentCollection(paymentDraft)}
            onUnlock={() => void unlockPaymentDraft(paymentDraft)}
            onRecord={() => void recordPaymentDraft(paymentDraft)}
          />
        ) : null}
        {activeKitchenOrder ? <span className="sr-only">Active kitchen ticket {activeKitchenOrder.id}</span> : null}
      </div>
    </div>
  );
}

function PosSyncBanner({ status, pendingChanges, onRetry }: { status: SyncStatus; pendingChanges: number; onRetry: () => void }) {
  if (status === "online" && pendingChanges <= 0) return null;
  const tone = status === "offline" ? "border-amber-200 bg-amber-50 text-amber-900" : status === "retrying" || status === "pending" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const label = status === "offline" ? "Offline" : status === "retrying" ? "Retrying" : status === "pending" ? "Changes Pending" : "Synchronizing";
  const detail = pendingChanges > 0 ? `${pendingChanges} pending change${pendingChanges === 1 ? "" : "s"}` : "Refreshing live order state";
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3 border-b px-3 text-sm font-bold", tone)}>
      <span>{label} · {detail}</span>
      {status === "retrying" || status === "pending" ? (
        <Button size="sm" variant="outline" className="h-8 bg-white/80" onClick={onRetry}>
          <Loader2 className={cn("size-4", status === "retrying" && "animate-spin")} />
          Retry
        </Button>
      ) : null}
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
  occupiedTables,
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
  occupiedTables: Set<string>;
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
              <TableSelector orderType={bill.orderType} table={bill.table} tables={tables} occupiedTables={occupiedTables} onTable={onTable} />
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
    <WizardShell step={3} onStep={(value) => value === 1 ? onBack() : null} title="Review order" subtitle="Confirm items, taxes and payment.">
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <div>
              <h3 className="font-black text-slate-950">Selected food</h3>
              <p className="text-xs font-semibold text-slate-500">{bill.lines.length} line items</p>
            </div>
            <Button variant="outline" size="sm" onClick={onBack}>Edit items</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {bill.lines.map((line) => (
              <div key={line.itemId} className="grid gap-2 p-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-black text-slate-950">{line.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{formatCurrency(line.price)} each</p>
                </div>
                <div className="flex h-10 items-center rounded-xl border border-slate-200">
                  <button className="min-h-10 px-3 text-lg font-black" onClick={() => onQuantity(line.itemId, line.quantity - 1)}>-</button>
                  <span className="min-w-8 text-center text-sm font-black">{line.quantity}</span>
                  <button className="min-h-10 px-3 text-lg font-black" onClick={() => onQuantity(line.itemId, line.quantity + 1)}>+</button>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="font-black">{formatCurrency(line.price * line.quantity)}</p>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onRemove(line.itemId)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="sticky top-3 self-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="font-black text-slate-950">Order summary</h3>
          <div className="mt-2 space-y-1 text-sm">
            <SummaryLine label="Type" value={readablePosOrderType(bill.orderType)} />
            <SummaryLine label="Table" value={bill.orderType === "dine-in" ? bill.table : "Not required"} />
            <SummaryLine label="Customer" value={bill.customerName || "Guest customer"} />
            <SummaryLine label="Phone" value={bill.customerPhone || "Not added"} />
            {bill.orderType === "delivery" ? <SummaryLine label="Address" value={[deliveryAddress, landmark].filter(Boolean).join(", ") || "Required"} /> : null}
            {orderNote ? <SummaryLine label="Note" value={orderNote} /> : null}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
            <SummaryLine label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <SummaryLine label="Tax" value={formatCurrency(totals.cgst + totals.sgst)} />
            <SummaryLine label="Packing" value={formatCurrency(totals.packingCharge + totals.serviceCharge)} />
            <SummaryLine label="Discount" value={`-${formatCurrency(totals.discount)}`} />
            <div className="mt-3 flex justify-between text-lg font-black">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <Button className="mt-3 h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onProcess}>
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
    <WizardShell step={5} onStep={() => undefined} title="Order confirmed" subtitle="Kitchen, billing, and active orders are synced.">
      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <motion.span initial={{ scale: 0.82 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 16 }} className="grid size-12 place-items-center rounded-xl bg-emerald-700 text-white">
              <CheckCircle2 className="size-7" />
            </motion.span>
            <div>
              <p className="text-sm font-black uppercase text-emerald-700">Order placed</p>
              <h3 className="text-3xl font-black text-slate-950">{order?.orderId ?? "New order"}</h3>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <SuccessTile label="Payment" value={(order?.payment ?? "cash").toUpperCase()} />
            <SuccessTile label="KOT" value={order?.kotId ?? "Kitchen"} />
            <SuccessTile label="Total" value={formatCurrency(order?.total ?? 0)} />
          </div>
        </section>
        <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="font-black text-slate-950">Quick actions</h3>
          <div className="mt-3 grid gap-2">
            <Button className="h-11 justify-start" variant="outline" onClick={onPrint}>
              <Printer className="size-4" />
              Print bill
            </Button>
            <Button className="h-11 justify-start" variant="outline" onClick={onViewActive}>
              <ChefHat className="size-4" />
              Active orders
            </Button>
            <Button className="h-12 justify-start bg-emerald-700 text-white hover:bg-emerald-800" onClick={onNewOrder}>
              <ReceiptText className="size-4" />
              New order
            </Button>
          </div>
        </aside>
      </div>
    </WizardShell>
  );
}

function SuccessTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
      <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
      <p className="truncate text-base font-black text-slate-950">{value}</p>
    </div>
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

function BillPreviewDialog({
  context,
  template,
  paper,
  onPaper,
  onClose,
  onPrint,
  onDownload,
  onWhatsApp,
}: {
  context: BillContext;
  template: PrintTemplate;
  paper: PaperWidth;
  onPaper: (paper: PaperWidth) => void;
  onClose: () => void;
  onPrint: (copies: BillCopy[], duplicate: boolean) => void;
  onDownload: (copies: BillCopy[]) => void;
  onWhatsApp: () => void;
}) {
  const [copies, setCopies] = useState<BillCopy[]>(["Customer Copy"]);
  const previewTemplate = { ...template, paperWidth: paper };
  const selectedCopies = copies.length ? copies : (["Customer Copy"] as BillCopy[]);
  const duplicate = selectedCopies.includes("Duplicate Copy");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(copy: BillCopy) {
    setCopies((current) => current.includes(copy) ? current.filter((item) => item !== copy) : [...current, copy]);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="pos-bill-preview-title" className="grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="pos-bill-preview-title" className="text-xl font-black text-slate-950">Bill preview</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Choose copies, paper size, then print or download.</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close bill preview" onClick={onClose}><X className="size-4" /></Button>
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-black uppercase text-slate-500">Paper</p>
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={paper} onChange={(event) => onPaper(event.target.value as PaperWidth)}>
              {(["58mm", "80mm", "100mm", "A4"] as PaperWidth[]).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-black uppercase text-slate-500">Copies</p>
            {billCopyOptions.map((copy) => (
              <label key={copy} className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold">
                <input type="checkbox" checked={copies.includes(copy)} onChange={() => toggle(copy)} />
                {copy}
              </label>
            ))}
          </div>
          <div className="grid gap-2">
            <Button className="h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => onPrint(selectedCopies, duplicate)}>
              <Printer className="size-4" />
              {duplicate ? "Reprint Bill" : "Print Bill"}
            </Button>
            <Button variant="outline" className="h-11" onClick={() => onDownload(selectedCopies)}>
              <FileDown className="size-4" />
              Download PDF-ready Bill
            </Button>
            <Button variant="outline" className="h-11" onClick={onWhatsApp}>
              <MessageCircle className="size-4" />
              WhatsApp Bill
            </Button>
          </div>
        </aside>
        <div className="max-h-[92vh] overflow-auto bg-slate-100 p-5">
          <div className="space-y-5">
            {selectedCopies.map((copy) => (
              <div key={copy}>
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700"><ReceiptText className="size-4" />{copy}</div>
                <RestaurantBill context={withBillCopy(context, copy)} template={previewTemplate} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PosConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="pos-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="pos-confirm-title" className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">{description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

function PosDialogFrame({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [])
        .filter((item) => !item.hasAttribute("disabled") && item.tabIndex !== -1);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-3">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pos-dialog-title" className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="pos-dialog-title" className="text-lg font-black text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X className="size-4" /></Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function SplitBillDialog({ order, canonical, busy, onClose, onSubmit }: { order: OperationalOrder; canonical?: ExtendedDemoOrder; busy?: boolean; onClose: () => void; onSubmit: (splits: SplitBillPayload[]) => void }) {
  const balance = orderBalanceDue(canonical, order);
  const [rows, setRows] = useState<SplitBillDraft[]>(() => {
    const first = moneyRound(balance / 2);
    return [
      createSplitDraft("Guest 1", first || balance),
      createSplitDraft("Guest 2", moneyRound(balance - first)),
    ].filter((row) => row.amount > 0);
  });
  const splitTotal = moneyRound(rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
  const invalid = !rows.length || splitTotal <= 0 || splitTotal > balance + 0.01;

  function updateRow(key: string, patch: Partial<SplitBillDraft>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function submit() {
    if (invalid) return toast.error(splitTotal > balance ? "Split amount exceeds the balance due." : "Add at least one valid split row.");
    onSubmit(rows.filter((row) => row.amount > 0).map((row) => ({
      customerName: row.customerName,
      amount: row.amount,
      method: row.method,
      basis: row.basis,
      itemId: row.itemId || undefined,
      quantity: row.quantity || undefined,
      percent: row.percent || undefined,
      receipt: row.receipt,
      note: row.note || undefined,
    })));
  }

  return (
    <PosDialogFrame title="Split Bill" subtitle={`${order.tableNumber} · Balance ${formatCurrency(balance)}`} onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div key={row.key} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_130px_130px_130px_auto]">
              <input className="h-10 rounded-lg border px-3 text-sm font-semibold" value={row.customerName} onChange={(event) => updateRow(row.key, { customerName: event.target.value })} aria-label={`Split customer ${index + 1}`} />
              <input className="h-10 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" step="1" value={row.amount} onChange={(event) => updateRow(row.key, { amount: Number(event.target.value) })} aria-label={`Split amount ${index + 1}`} />
              <select className="h-10 rounded-lg border px-3 text-sm font-semibold" value={row.method} onChange={(event) => updateRow(row.key, { method: event.target.value as PaymentMethod })} aria-label={`Payment method ${index + 1}`}>
                {(["cash", "upi", "card", "credit"] as PaymentMethod[]).map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}
              </select>
              <select className="h-10 rounded-lg border px-3 text-sm font-semibold" value={row.basis} onChange={(event) => updateRow(row.key, { basis: event.target.value as SplitBillDraft["basis"] })} aria-label={`Split basis ${index + 1}`}>
                <option value="custom">Custom</option>
                <option value="item">Item</option>
                <option value="quantity">Quantity</option>
                <option value="percentage">Percentage</option>
              </select>
              <Button variant="outline" size="sm" className="h-10" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>Remove</Button>
              <select className="h-10 rounded-lg border px-3 text-sm font-semibold md:col-span-2" value={row.itemId} onChange={(event) => updateRow(row.key, { itemId: event.target.value })} aria-label={`Split item ${index + 1}`}>
                <option value="">No item binding</option>
                {order.lines.map((line) => <option key={line.itemId} value={line.itemId}>{line.name}</option>)}
              </select>
              <input className="h-10 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" value={row.quantity} onChange={(event) => updateRow(row.key, { quantity: Number(event.target.value) })} aria-label={`Split quantity ${index + 1}`} />
              <input className="h-10 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" max="100" value={row.percent} onChange={(event) => updateRow(row.key, { percent: Number(event.target.value) })} aria-label={`Split percent ${index + 1}`} />
              <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold"><input type="checkbox" checked={row.receipt} onChange={(event) => updateRow(row.key, { receipt: event.target.checked })} />Receipt</label>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setRows((current) => [...current, createSplitDraft(`Guest ${current.length + 1}`, 0)])}><Scissors className="size-4" />Add Split</Button>
          <div className="text-sm font-black text-slate-700">Split total {formatCurrency(splitTotal)} / {formatCurrency(balance)}</div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || invalid} onClick={submit}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}Record Split Bill</Button>
      </div>
    </PosDialogFrame>
  );
}

function TransferTableDialog({ order, tables, staff, busy, onClose, onSubmit }: { order: OperationalOrder; tables: PosTable[]; staff: StaffMember[]; busy?: boolean; onClose: () => void; onSubmit: (tableNumber: string, waiterName?: string) => void }) {
  const [tableNumber, setTableNumber] = useState(order.tableNumber || "");
  const [waiterName, setWaiterName] = useState(order.waiterName || "");
  const tableOptions = tables.map((table) => table.table).filter(Boolean);
  return (
    <PosDialogFrame title="Transfer Table" subtitle={`${order.tableNumber || "Current order"} · ${formatCurrency(order.total ?? 0)}`} onClose={onClose}>
      <div className="grid gap-4 p-4">
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Target table
          <input list="pos-transfer-tables" className="h-11 rounded-xl border px-3 text-sm font-semibold" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} />
          <datalist id="pos-transfer-tables">{tableOptions.map((table) => <option key={table} value={table} />)}</datalist>
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Waiter
          <select className="h-11 rounded-xl border px-3 text-sm font-semibold" value={waiterName} onChange={(event) => setWaiterName(event.target.value)}>
            <option value="">Keep current waiter</option>
            {staff.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || !tableNumber.trim()} onClick={() => onSubmit(tableNumber.trim(), waiterName || undefined)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}Transfer</Button>
      </div>
    </PosDialogFrame>
  );
}

function MergeTablesDialog({ target, orders, busy, onClose, onSubmit }: { target: OperationalOrder; orders: OperationalOrder[]; busy?: boolean; onClose: () => void; onSubmit: (orders: OperationalOrder[], tableNumber?: string) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tableNumber, setTableNumber] = useState(target.tableNumber || "");
  const selected = orders.filter((order) => selectedIds.includes(order.id));
  const total = moneyRound([target, ...selected].reduce((sum, order) => sum + Number(order.total ?? 0), 0));
  return (
    <PosDialogFrame title="Merge Tables" subtitle={`Target ${readableTableOrderId(target)} · ${formatCurrency(target.total ?? 0)}`} onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        <label className="mb-3 grid gap-2 text-sm font-black text-slate-700">
          Final table label
          <input className="h-11 rounded-xl border px-3 text-sm font-semibold" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} />
        </label>
        <div className="grid gap-2">
          {orders.length ? orders.map((order) => (
            <label key={order.id} className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} />
              <span className="min-w-0">
                <span className="block font-black text-slate-950">{readableTableOrderId(order)}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{order.customerName || order.guestName || "Walk-in"} · {order.lines.length} items · {order.status}</span>
              </span>
              <span className="font-black text-slate-800">{formatCurrency(order.total ?? 0)}</span>
            </label>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">No other active orders can be merged.</div>
          )}
        </div>
      </div>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="text-sm font-black text-slate-700">Merged total {formatCurrency(total)}</div>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || !selected.length} onClick={() => onSubmit(selected, tableNumber || undefined)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <GitMerge className="size-4" />}Merge</Button>
      </div>
    </PosDialogFrame>
  );
}

function OrderTimelineDialog({ order, canonical, onClose }: { order: OperationalOrder; canonical?: ExtendedDemoOrder; onClose: () => void }) {
  const entries = timelineEntries(canonical, order);
  return (
    <PosDialogFrame title="Order Timeline" subtitle={`${readableTableOrderId(order)} · ${order.status}`} onClose={onClose}>
      <TimelineList entries={entries} empty="No timeline events recorded yet." />
    </PosDialogFrame>
  );
}

function PaymentHistoryDialog({ order, canonical, printLogs, onClose }: { order: OperationalOrder; canonical?: ExtendedDemoOrder; printLogs: PrintLog[]; onClose: () => void }) {
  const payments = paymentEntries(canonical, order);
  const splits = canonical?.splitBills ?? order.splitBills ?? [];
  const prints = printHistoryEntries(canonical, order, printLogs);
  const rows = paymentHistoryRows(order, canonical, payments, splits);
  return (
    <PosDialogFrame title="Payment History" subtitle={`${paymentLabel(order.paymentStatus)} · Paid ${formatCurrency(orderPaidAmount(canonical, order))} / ${formatCurrency(order.total ?? canonical?.totals.total ?? 0)}`} onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => exportPaymentHistory(rows, "csv")}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => exportPaymentHistory(rows, "excel")}>
            <Download className="size-4" />
            Excel
          </Button>
        </div>
        <h3 className="mb-2 text-sm font-black uppercase text-slate-400">Payments</h3>
        <TimelineList entries={payments} empty="No payment events recorded." compact />
        <h3 className="mb-2 mt-5 text-sm font-black uppercase text-slate-400">Split Bills</h3>
        {splits.length ? (
          <div className="grid gap-2">
            {splits.map((split, index) => (
              <div key={`${split.id ?? index}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-black text-slate-950">{split.customerName || `Split ${index + 1}`}</p>
                  <p className="text-xs font-semibold text-slate-500">{split.basis || "custom"} · {formatTimelineTime(split.at)}</p>
                </div>
                <p className="font-black text-slate-800">{String(split.method ?? "").toUpperCase()}</p>
                <p className="font-black text-emerald-700">{formatCurrency(Number(split.amount ?? 0))}</p>
              </div>
            ))}
          </div>
        ) : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">No split bills recorded.</p>}
        <h3 className="mb-2 mt-5 text-sm font-black uppercase text-slate-400">Print History</h3>
        <TimelineList entries={prints} empty="No print history recorded." compact />
      </div>
    </PosDialogFrame>
  );
}

function OrderDetailsDrawer({
  order,
  canonical,
  printLogs,
  onClose,
  onAddItems,
  onCollectPayment,
  onPrintBill,
  onTimeline,
  onPaymentHistory,
}: {
  order: OperationalOrder;
  canonical?: ExtendedDemoOrder;
  printLogs: PrintLog[];
  onClose: () => void;
  onAddItems: () => void;
  onCollectPayment: () => void;
  onPrintBill: () => void;
  onTimeline: () => void;
  onPaymentHistory: () => void;
}) {
  const entries = timelineEntries(canonical, order);
  const corrections = canonical?.corrections ?? order.corrections ?? [];
  const prints = printHistoryEntries(canonical, order, printLogs);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/35">
      <aside role="dialog" aria-modal="true" aria-labelledby="order-details-title" className="ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="order-details-title" className="text-xl font-black text-slate-950">{readableTableOrderId(order)}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{order.tableNumber || readablePosOrderType(order.orderType ?? "dine-in")} · {paymentLabel(order.paymentStatus)} · {formatCurrency(Number(order.total ?? canonical?.totals.total ?? 0))}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DrawerBlock title="Customer" rows={[order.customerName || order.guestName || canonical?.customer.name || "Walk-in", order.customerPhone || canonical?.customer.phone || "No phone"]} />
            <DrawerBlock title="Kitchen" rows={[`Status: ${order.status}`, `ETA: ${order.etaMinutes ?? 12} min`, `Priority: ${order.priority ?? "normal"}`]} />
            <DrawerBlock title="Payment" rows={[`Status: ${paymentLabel(order.paymentStatus)}`, `Paid: ${formatCurrency(orderPaidAmount(canonical, order))}`, `Balance: ${formatCurrency(orderBalanceDue(canonical, order))}`]} />
            <DrawerBlock title="Notes" rows={[canonical?.statusNote || (order as OperationalOrder & { notes?: string }).notes || "No notes recorded"]} />
          </div>
          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-black uppercase text-slate-400">Items</h3>
            <div className="grid gap-2">
              {order.lines.map((line, index) => (
                <div key={`${line.itemId}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold">
                  <span className="truncate">{line.name}</span>
                  <span>{line.quantity}x</span>
                  <span>{formatCurrency(line.price * line.quantity)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-black uppercase text-slate-400">Timeline</h3>
            <TimelineList entries={entries.slice(-12)} empty="No timeline events recorded." compact />
          </section>
          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-black uppercase text-slate-400">Corrections</h3>
            {corrections.length ? corrections.map((item, index) => (
              <div key={`${item.version ?? index}`} className="mb-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-900">
                Correction #{item.version ?? index + 1} · {item.reason || "No reason"} · {formatTimelineTime(item.at)}
              </div>
            )) : <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500">Original bill only. No corrections.</p>}
          </section>
          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-black uppercase text-slate-400">Print History</h3>
            <TimelineList entries={prints} empty="No print history recorded." compact />
          </section>
        </div>
        <div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-5">
          <Button variant="outline" onClick={onAddItems}><PlusCircle className="size-4" />Add</Button>
          <Button variant="outline" onClick={onPrintBill}><ReceiptText className="size-4" />Bill</Button>
          <Button onClick={onCollectPayment}><CircleDollarSign className="size-4" />Collect</Button>
          <Button variant="outline" onClick={onTimeline}><Clock3 className="size-4" />Timeline</Button>
          <Button variant="outline" onClick={onPaymentHistory}><History className="size-4" />History</Button>
        </div>
      </aside>
    </div>
  );
}

function DrawerBlock({ title, rows }: { title: string; rows: Array<string | number | undefined> }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-xs font-black uppercase text-slate-400">{title}</h3>
      <div className="mt-2 grid gap-1 text-sm font-semibold text-slate-700">
        {rows.filter(Boolean).map((row, index) => <p key={`${title}-${index}`} className="truncate">{row}</p>)}
      </div>
    </section>
  );
}

function PaymentSafetyDialog({
  draft,
  busy,
  canUnlock,
  onChange,
  onClose,
  onContinue,
  onUnlock,
  onRecord,
}: {
  draft: PaymentDraft;
  busy: boolean;
  canUnlock: boolean;
  onChange: (draft: PaymentDraft) => void;
  onClose: () => void;
  onContinue: () => void;
  onUnlock: () => void;
  onRecord: () => void;
}) {
  const itemCount = draft.order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <PosDialogFrame title={draft.stage === "verify" ? "Verify Before Collecting Payment" : "Collect Payment"} subtitle={`${readableTableOrderId(draft.order)} · ${draft.order.tableNumber || readablePosOrderType(draft.order.orderType ?? "dine-in")}`} onClose={onClose}>
      <div className="grid gap-4 p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <div className="grid gap-2 sm:grid-cols-2">
            <span>Customer: {draft.order.customerName || draft.order.guestName || "Walk-in"}</span>
            <span>Items: {itemCount}</span>
            <span>Grand total: {formatCurrency(Number(draft.order.total ?? 0))}</span>
            <span>Kitchen: {draft.order.status}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase text-slate-400">
            Amount
            <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-900" type="number" min="1" step="1" value={draft.amount} disabled={draft.stage === "verify"} onChange={(event) => onChange({ ...draft, amount: Number(event.target.value) })} />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase text-slate-400">
            Payment Method
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900" value={draft.method} disabled={draft.stage === "collect"} onChange={(event) => onChange({ ...draft, method: event.target.value as PaymentMethod })}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
            </select>
          </label>
        </div>
        {draft.stage === "collect" && canUnlock ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <label className="grid gap-1 text-xs font-black uppercase text-amber-700">
              Unlock reason
              <input className="h-10 rounded-lg border border-amber-200 px-3 text-sm font-semibold text-slate-900" value={draft.unlockReason} onChange={(event) => onChange({ ...draft, unlockReason: event.target.value })} placeholder="Required before editing locked bill" />
            </label>
            <Button className="mt-2" variant="outline" disabled={busy || !draft.unlockReason.trim()} onClick={onUnlock}>Unlock with audit</Button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-[1fr_auto_auto]">
        <p className="text-xs font-semibold text-slate-500">{draft.stage === "verify" ? "Confirm order, table, items, total, and method before opening payment." : "Payment lock is active. Kitchen will not reopen."}</p>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={busy} onClick={draft.stage === "verify" ? onContinue : onRecord}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CircleDollarSign className="size-4" />}{draft.stage === "verify" ? "Continue" : "Record Payment"}</Button>
      </div>
    </PosDialogFrame>
  );
}

function BillCorrectionDrawer({ order, busy, onClose, onSubmit }: { order: ExtendedDemoOrder; busy?: boolean; onClose: () => void; onSubmit: (payload: BillCorrectionPayload) => void }) {
  const [lines, setLines] = useState(() => order.lines.map((line) => ({ ...line })));
  const [discount, setDiscount] = useState(order.totals.discount);
  const [tax, setTax] = useState(order.totals.tax);
  const [deliveryFee, setDeliveryFee] = useState(order.totals.deliveryFee);
  const [reason, setReason] = useState("");
  const subtotal = moneyRound(lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0));
  const total = moneyRound(subtotal - Number(discount ?? 0) + Number(tax ?? 0) + Number(deliveryFee ?? 0));
  const diff = moneyRound(total - order.totals.total);
  const disabled = busy || !reason.trim() || !lines.length;
  function updateLine(index: number, patch: Partial<(typeof lines)[number]>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }
  return (
    <div className="fixed inset-0 z-[76] bg-slate-950/35">
      <aside role="dialog" aria-modal="true" aria-labelledby="bill-correction-title" className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="bill-correction-title" className="text-xl font-black text-slate-950">Correct Bill</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{readableOrderId(order)} · original {formatCurrency(order.totals.total)} · new {formatCurrency(total)}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close correction" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-2">
            {lines.map((line, index) => (
              <div key={`${line.itemId}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_100px_100px]">
                <input className="h-10 rounded-lg border px-3 text-sm font-semibold" value={line.name} onChange={(event) => updateLine(index, { name: event.target.value })} aria-label={`Item ${index + 1}`} />
                <input className="h-10 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} aria-label={`Quantity ${index + 1}`} />
                <input className="h-10 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" value={line.price} onChange={(event) => updateLine(index, { price: Number(event.target.value) })} aria-label={`Price ${index + 1}`} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <NumberField label="Discount" value={discount} onChange={setDiscount} />
            <NumberField label="Tax" value={tax} onChange={setTax} />
            <NumberField label="Packing" value={deliveryFee} onChange={setDeliveryFee} />
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Grand Total Diff</p>
              <p className={cn("mt-1 text-lg font-black", diff >= 0 ? "text-emerald-700" : "text-red-700")}>{diff >= 0 ? "+" : ""}{formatCurrency(diff)}</p>
            </div>
          </div>
          <label className="mt-4 grid gap-1 text-xs font-black uppercase text-slate-400">
            Mandatory correction reason
            <textarea className="min-h-24 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Manager-approved reason for immutable bill correction" />
          </label>
          <section className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <h3 className="text-sm font-black uppercase text-purple-700">Preview Difference</h3>
            <p className="mt-2 text-sm font-semibold text-purple-900">Original {formatCurrency(order.totals.total)} → New {formatCurrency(total)} · Correction #{(order.corrections?.length ?? 0) + 1}</p>
          </section>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-[1fr_auto_auto]">
          <p className="text-xs font-semibold text-slate-500">History is never overwritten. This creates a new immutable correction version.</p>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={disabled} onClick={() => onSubmit({ lines, discount, tax, deliveryFee, total, reason })}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Confirm Correction</Button>
        </div>
      </aside>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-slate-400">
      {label}
      <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900" type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TimelineList({ entries, empty, compact = false }: { entries: TimelineEntry[]; empty: string; compact?: boolean }) {
  return entries.length ? (
    <div className="grid gap-2">
      {entries.map((entry, index) => (
        <div key={`${timelineLabel(entry)}-${index}`} className={cn("rounded-xl border border-slate-200", compact ? "p-3" : "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className={cn("mt-1 size-3 rounded-full", orderStatusTone(timelineStatusKey(entry), String(entry.paymentStatus ?? "")).dot)} />
              <div className="min-w-0">
              <p className="font-black text-slate-950">{timelineLabel(entry)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{formatTimelineTime(entryTimeValue(entry))}</p>
              {index > 0 ? <p className="mt-1 text-[11px] font-bold text-slate-400">+{timelineDuration(entries[index - 1], entry)}</p> : null}
              </div>
            </div>
            {Number.isFinite(Number(entry.amount)) ? <Badge variant="secondary">{formatCurrency(Number(entry.amount))}</Badge> : null}
          </div>
          {entry.method || entry.role || entry.user || entry.device || entry.reason || entry.printNumber ? <p className="mt-2 text-xs font-semibold text-slate-500">{[entry.method ? String(entry.method).toUpperCase() : "", entry.role, entry.user, entry.device, entry.printNumber ? `Print #${entry.printNumber}` : "", entry.reason].filter(Boolean).join(" · ")}</p> : null}
        </div>
      ))}
    </div>
  ) : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">{empty}</p>;
}

function createSplitDraft(customerName: string, amount: number): SplitBillDraft {
  return {
    key: Math.random().toString(36).slice(2),
    customerName,
    amount: moneyRound(amount),
    method: "cash",
    basis: "custom",
    itemId: "",
    quantity: 0,
    percent: 0,
    receipt: true,
    note: "",
  };
}

function orderPaidAmount(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  const paid = canonical?.paidAmount ?? order.paidAmount;
  if (Number.isFinite(paid)) return Number(paid);
  return order.paymentStatus === "paid" ? Number(order.total ?? canonical?.totals.total ?? 0) : 0;
}

function orderBalanceDue(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  return Math.max(0, moneyRound(Number(order.total ?? canonical?.totals.total ?? 0) - orderPaidAmount(canonical, order)));
}

function timelineEntries(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  return dedupeTimeline([
    ...safeTimeline(canonical?.auditTimeline),
    ...safeTimeline(canonical?.statusHistory),
    ...safeTimeline(canonical?.paymentTimeline),
    ...safeTimeline(order.auditTimeline),
    ...safeTimeline(order.statusHistory),
    ...safeTimeline(order.paymentTimeline),
  ]).sort((first, second) => timelineMillis(first) - timelineMillis(second));
}

function paymentEntries(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  return dedupeTimeline([
    ...safeTimeline(canonical?.paymentTimeline),
    ...safeTimeline(order.paymentTimeline),
  ]).sort((first, second) => timelineMillis(first) - timelineMillis(second));
}

function printHistoryEntries(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder, logs: PrintLog[]) {
  const canonicalId = canonical?.id ?? order.canonicalOrderId ?? order.id;
  const printEvents = timelineEntries(canonical, order).filter((entry) => /print/i.test(String(entry.type ?? entry.event ?? "")));
  const logEvents = logs
    .filter((log) => {
      const entry = log as PrintLog & { orderId?: string; referenceId?: string };
      return entry.orderId === canonicalId || entry.referenceId === canonicalId || entry.referenceId === order.id;
    })
    .map((log) => {
      const entry = log as PrintLog & { printerProfileId?: string; printer?: string; printNumber?: number; reason?: string; createdAt?: unknown; printedBy?: string };
      return { type: `${entry.type || "print"}_${entry.status || "logged"}`, timestamp: entry.timestamp ?? entry.createdAt, user: entry.user ?? entry.printedBy, device: entry.printer ?? entry.printerProfileId, printNumber: entry.printNumber, reason: entry.reason };
    });
  return dedupeTimeline([...printEvents, ...logEvents]).sort((first, second) => timelineMillis(first) - timelineMillis(second));
}

function paymentHistoryRows(order: OperationalOrder, canonical: ExtendedDemoOrder | undefined, payments: TimelineEntry[], splits: TimelineEntry[]) {
  const orderNo = canonical
    ? readableOrderId({ id: canonical.id, invoiceNumber: canonical.invoiceNumber, orderNumber: canonical.orderNumber, displayOrderNumber: canonical.displayOrderNumber, billNumber: canonical.billNumber, channel: canonical.channel, orderType: canonical.fulfillmentType, createdAt: canonical.createdAt })
    : readableTableOrderId(order);
  return [
    ...payments.map((entry) => ({
      transactionId: String(entry.id ?? entry.reference ?? entry.providerPaymentId ?? ""),
      razorpayPaymentId: String(entry.providerPaymentId ?? ""),
      orderNo,
      gateway: String(entry.provider ?? (entry.providerPaymentId ? "razorpay" : "manual")),
      status: timelineLabel(entry),
      method: String(entry.method ?? ""),
      amount: Number(entry.amount ?? 0),
      refund: /refund/i.test(timelineLabel(entry)) ? Number(entry.amount ?? 0) : "",
      failureReason: String(entry.failureReason ?? ""),
      capturedAt: formatTimelineTime(entry.capturedAt),
      createdAt: formatTimelineTime(entryTimeValue(entry)),
    })),
    ...splits.map((split, index) => ({
      transactionId: String(split.id ?? `split-${index + 1}`),
      razorpayPaymentId: String(split.providerPaymentId ?? ""),
      orderNo,
      gateway: String(split.provider ?? "manual"),
      status: "Split Bill",
      method: String(split.method ?? ""),
      amount: Number(split.amount ?? 0),
      refund: "",
      failureReason: "",
      capturedAt: "",
      createdAt: formatTimelineTime(split.at ?? split.createdAt),
    })),
  ];
}

function exportPaymentHistory(rows: ReturnType<typeof paymentHistoryRows>, format: "csv" | "excel") {
  const headers = ["Transaction ID", "Razorpay Payment ID", "Order No", "Gateway", "Status", "Method", "Amount", "Refund", "Failure Reason", "Captured At", "Created At"];
  const values = rows.map((row) => [row.transactionId, row.razorpayPaymentId, row.orderNo, row.gateway, row.status, row.method, row.amount, row.refund, row.failureReason, row.capturedAt, row.createdAt]);
  if (format === "csv") {
    downloadPaymentFile("payment-history.csv", [headers, ...values].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
    return;
  }
  const table = `<table><thead><tr>${headers.map((header) => `<th>${htmlCell(header)}</th>`).join("")}</tr></thead><tbody>${values.map((row) => `<tr>${row.map((value) => `<td>${htmlCell(String(value ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  downloadPaymentFile("payment-history.xls", table, "application/vnd.ms-excel;charset=utf-8");
}

function downloadPaymentFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function htmlCell(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function safeTimeline(value?: TimelineEntry[]) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

function dedupeTimeline(entries: TimelineEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = [timelineLabel(entry), timelineMillis(entry), entry.amount ?? "", entry.method ?? "", entry.user ?? "", entry.device ?? ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function timelineLabel(entry: TimelineEntry) {
  const raw = String(entry.type ?? entry.event ?? entry.status ?? "event");
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function timelineStatusKey(entry: TimelineEntry) {
  const raw = String(entry.status ?? entry.foodStatus ?? entry.type ?? entry.event ?? "").toLowerCase();
  if (raw.includes("paid") || raw.includes("payment_completed")) return "paid";
  if (raw.includes("bill") || raw.includes("payment_started")) return "billing";
  if (raw.includes("accepted")) return "accepted";
  if (raw.includes("preparing")) return "preparing";
  if (raw.includes("ready")) return "ready";
  if (raw.includes("served")) return "served";
  if (raw.includes("cancel") || raw.includes("reject")) return "cancelled";
  return raw || "new";
}

function timelineDuration(previous: TimelineEntry, current: TimelineEntry) {
  const diff = timelineMillis(current) - timelineMillis(previous);
  if (!Number.isFinite(diff) || diff <= 0) return "0m";
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function entryTimeValue(entry: TimelineEntry) {
  return entry.timestamp ?? entry.at ?? entry.createdAt ?? entry.time;
}

function formatTimelineTime(value: unknown) {
  const millis = valueMillis(value);
  return millis ? new Date(millis).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time not recorded";
}

function timelineMillis(entry: TimelineEntry) {
  return valueMillis(entryTimeValue(entry)) || 0;
}

function valueMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date.getTime();
  }
  if (typeof value === "object" && "seconds" in value) {
    return Number((value as { seconds?: number }).seconds ?? 0) * 1000;
  }
  return 0;
}

function moneyRound(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;
}

function normalizeTableName(value?: string) {
  return String(value ?? "").trim().toUpperCase();
}

function findTableByName(tables: PosTable[], value?: string) {
  const normalized = normalizeTableName(value);
  return tables.find((table) => normalizeTableName(table.table) === normalized);
}

function tableAvailability(table: PosTable, occupiedTables: Set<string>) {
  const status = String(table.status ?? "").toLowerCase();
  if (table.active === false || table.dineInEnabled === false || status === "inactive") return { label: "Disabled", selectable: false, tone: "slate" as const };
  if (occupiedTables.has(normalizeTableName(table.table)) || status === "occupied" || status === "dining" || status === "bill requested") return { label: "Occupied", selectable: false, tone: "red" as const };
  if (status === "reserved") return { label: "Reserved", selectable: false, tone: "orange" as const };
  if (status === "cleaning") return { label: "Cleaning", selectable: false, tone: "amber" as const };
  return { label: "Available", selectable: true, tone: "green" as const };
}

function tableUnavailableMessage(table: string, label: string) {
  if (label === "Occupied") return `Table ${table} was assigned to another order. Please choose another table.`;
  return `${table} is ${label.toLowerCase()}. Choose an available table.`;
}

function isTableSelectable(table: PosTable, occupiedTables: Set<string>) {
  return tableAvailability(table, occupiedTables).selectable;
}

function preferredDineInTable(currentTable: string, tables: PosTable[], occupiedTables: Set<string>) {
  const selected = findTableByName(tables, currentTable);
  if (selected && isTableSelectable(selected, occupiedTables)) return selected.table;
  return tables.find((table) => isTableSelectable(table, occupiedTables))?.table ?? "DIRECT";
}

function buildOperationalOrders(orders: DemoOrder[], kitchenOrders: TableOrder[]): OperationalOrder[] {
  const ordersByKitchen = new Map(orders.filter((order) => order.kitchenOrderId).map((order) => [order.kitchenOrderId, order]));
  const linkedKitchenIds = new Set(kitchenOrders.map((order) => order.id));
  const merged = kitchenOrders.map((order) => {
    const canonical = ordersByKitchen.get(order.id);
    return {
      ...order,
      orderNumber: canonical?.orderNumber ?? order.orderNumber,
      displayOrderNumber: canonical?.displayOrderNumber ?? order.displayOrderNumber,
      invoiceNumber: canonical?.invoiceNumber ?? order.invoiceNumber,
      billNumber: canonical?.billNumber ?? order.billNumber,
      canonicalOrderId: canonical?.id,
      canonicalStatus: canonical?.status,
      hasKitchenTicket: true,
      paymentStatus: paymentStateForOrder(canonical) ?? order.paymentStatus,
      total: canonical?.totals.total ?? order.total,
      customerName: canonical?.customer.name || order.customerName,
      customerPhone: canonical?.customer.phone || order.customerPhone,
      paymentTimeline: (canonical as ExtendedDemoOrder | undefined)?.paymentTimeline,
      auditTimeline: (canonical as ExtendedDemoOrder | undefined)?.auditTimeline,
      statusHistory: (canonical as ExtendedDemoOrder | undefined)?.statusHistory,
      splitBills: (canonical as ExtendedDemoOrder | undefined)?.splitBills,
      corrections: (canonical as ExtendedDemoOrder | undefined)?.corrections,
      paymentLock: (canonical as ExtendedDemoOrder | undefined)?.paymentLock,
      paidAmount: (canonical as ExtendedDemoOrder | undefined)?.paidAmount,
      mergedOrderIds: (canonical as ExtendedDemoOrder | undefined)?.mergedOrderIds,
    } satisfies OperationalOrder;
  });
  const orderOnly = orders
    .filter((order) => isActiveDemoOrder(order))
    .filter((order) => !order.kitchenOrderId || !linkedKitchenIds.has(order.kitchenOrderId))
    .map(orderToOperationalOrder);
  return [...merged, ...orderOnly].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

function orderToOperationalOrder(order: DemoOrder): OperationalOrder {
  const orderType = order.fulfillmentType === "delivery" ? "delivery" : order.fulfillmentType === "dine-in" ? "dine-in" : "parcel";
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    displayOrderNumber: order.displayOrderNumber,
    invoiceNumber: order.invoiceNumber,
    billNumber: order.billNumber,
    canonicalOrderId: order.id,
    canonicalStatus: order.status,
    hasKitchenTicket: false,
    tableNumber: order.fulfillmentType === "dine-in" ? "Dine-in" : order.fulfillmentType === "delivery" ? "Online" : "Parcel",
    source: order.channel === "QR" ? "QR" : order.fulfillmentType === "delivery" ? "Delivery" : order.fulfillmentType === "parcel" ? "Parcel" : "POS",
    orderType,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    deliveryAddress: order.customer.address,
    scheduledFor: order.scheduledFor,
    lines: order.lines,
    status: tableStatusForOrder(order.status),
    priority: "normal",
    paymentStatus: paymentStateForOrder(order),
    createdAt: order.createdAt,
    etaMinutes: order.prepEstimateMinutes ?? 12,
    total: order.totals.total,
    paymentTimeline: (order as ExtendedDemoOrder).paymentTimeline,
    auditTimeline: (order as ExtendedDemoOrder).auditTimeline,
    statusHistory: (order as ExtendedDemoOrder).statusHistory,
    splitBills: (order as ExtendedDemoOrder).splitBills,
    corrections: (order as ExtendedDemoOrder).corrections,
    paymentLock: (order as ExtendedDemoOrder).paymentLock,
    paidAmount: (order as ExtendedDemoOrder).paidAmount,
    mergedOrderIds: (order as ExtendedDemoOrder).mergedOrderIds,
    mergedIntoOrderId: (order as ExtendedDemoOrder).mergedIntoOrderId,
  };
}

function isActiveDemoOrder(order: DemoOrder) {
  return !["delivered", "completed", "cancelled", "rejected"].includes(order.status);
}

function tableStatusForOrder(status: DemoOrder["status"]): TableOrder["status"] {
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  if (status === "served") return "served";
  if (status === "completed" || status === "delivered") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "new";
}

function demoStatusForTableStatus(status: TableOrder["status"]): DemoOrder["status"] {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  if (status === "served") return "served";
  return "new";
}

function isOrderBackedTableStatus(status: TableOrder["status"]) {
  return ["accepted", "preparing", "ready", "served", "completed", "cancelled"].includes(status);
}

function activeStatusToast(status: TableOrder["status"]) {
  if (status === "cancelled") return "Order cancelled.";
  if (status === "served") return "Order served.";
  if (status === "ready") return "Order ready.";
  if (status === "preparing") return "Cooking started.";
  if (status === "accepted") return "Order accepted.";
  return "Order completed.";
}

function paymentStateForOrder(order?: DemoOrder): TableOrder["paymentStatus"] | undefined {
  if (!order?.paymentStatus) return undefined;
  if (order.paymentStatus === "paid" || order.paymentStatus === "partial" || order.paymentStatus === "refunded") return order.paymentStatus;
  return "unpaid";
}

function readablePosOrderType(type: PosBill["orderType"]) {
  if (type === "dine-in") return "Dine-in";
  if (type === "takeaway") return "Quick Bill";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function paymentLabel(value?: TableOrder["paymentStatus"]) {
  if (value === "paid") return "Paid";
  if (value === "partial") return "Partially paid";
  if (value === "refunded") return "Refunded";
  return "Unpaid";
}

function isDelayedTableOrder(order: TableOrder, orderDelayThresholdMinutes: number = defaultOperationalSettings.orderDelayThresholdMinutes) {
  return getKitchenDelay(order, Date.now(), { orderDelayThresholdMinutes }).delayed;
}

function readySinceMillis(order: OperationalOrder) {
  const entries = [...safeTimeline(order.statusHistory), ...safeTimeline(order.auditTimeline)];
  const ready = entries
    .filter((entry) => String(entry.status ?? entry.foodStatus ?? entry.event ?? entry.type ?? "").toLowerCase().includes("ready"))
    .map(timelineMillis)
    .filter(Boolean)
    .sort((first, second) => first - second)[0];
  return ready || Date.parse(order.createdAt) || 0;
}

function serveSlaLabel(minutes: number) {
  if (minutes < 5) return "On time";
  if (minutes < 10) return "Watch";
  return "Late";
}

function withBillCopy(context: BillContext, copy: BillCopy): BillContext {
  return { ...context, copyLabel: copy, duplicate: copy === "Duplicate Copy" };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clientOperationKey(parts: unknown[]) {
  const text = JSON.stringify(parts);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pos-${(hash >>> 0).toString(36)}`;
}

async function readPosPayload<T>(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(toSafePosError(payload.error, fallback));
  return payload;
}

function toSafePosError(reason: string | undefined, fallback: string) {
  if (!reason) return fallback;
  const text = reason.toLowerCase();
  if (/(firebase|firestore|repository|stack|admin|permission-denied|internal)/.test(text)) return fallback;
  if (text.includes("no longer active") || text.includes("pos draft not found")) return "This order is no longer active. Please refresh.";
  if (text.includes("kitchen ticket not found")) return "Kitchen ticket not found.";
  if (text.includes("kitchen still preparing")) return "Kitchen still preparing.";
  if (text.includes("currently being modified")) return "Order currently being modified. Refresh and retry.";
  if (text.includes("state change") || text.includes("transition")) return "That order state changed on another device. Refresh and retry.";
  if (text.includes("already been collected")) return "Payment has already been collected.";
  if (text.includes("completed bills")) return "Only completed bills can be corrected.";
  if (text.includes("correction reason")) return "Correction reason is required.";
  if (text.includes("unlock reason")) return "Unlock reason is required.";
  if (text.includes("only owner")) return "Only owner can unlock payment changes.";
  if (text.includes("split bill")) return "Split bill could not be recorded. Check the split amounts and retry.";
  if (text.includes("balance due")) return "Split amount exceeds the balance due.";
  if (text.includes("target table")) return "Choose a target table before transferring.";
  if (text.includes("source order")) return "Choose at least one active order to merge.";
  if (text.includes("kitchen")) return "Kitchen ticket could not be updated. Check Kitchen Operations and retry.";
  if (text.includes("payment")) return "Payment could not be recorded. Keep the bill open and retry.";
  if (text.includes("network") || text.includes("fetch")) return "Network connection was interrupted. Check internet and retry.";
  if (text.includes("unauthorized") || text.includes("forbidden")) return "Your session cannot complete this action. Sign in again or ask the owner.";
  if (text.includes("closed")) return "Restaurant is closed for ordering. Update hours or retry when open.";
  if (text.includes("unavailable") || text.includes("sold out")) return "One or more items are unavailable. Review the cart and retry.";
  return reason.length <= 120 ? reason : fallback;
}

function addItemToBill(bill: PosBill, item: PosProduct): PosBill {
  const existing = bill.lines.find((line) => line.itemId === item.id);
  const quantity = existing ? existing.quantity + 1 : 1;
  const nextLine = item.source === "menu"
    ? { itemId: item.id, name: item.name, price: item.price, quantity }
    : {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: Math.min(quantity, (item.raw as InventoryItem).currentStock),
        lineType: "inventory" as const,
        gstRate: (item.raw as InventoryItem).gstApplicable ? (item.raw as InventoryItem).gstRate : undefined,
        hsnCode: (item.raw as InventoryItem).gstApplicable ? (item.raw as InventoryItem).hsnCode : undefined,
      };
  const lines = existing ? bill.lines.map((line) => line.itemId === item.id ? { ...line, ...nextLine } : line) : [...bill.lines, nextLine];
  return { ...bill, lines, paid: false };
}

function updateBillQuantity(bill: PosBill, itemId: string, quantity: number): PosBill {
  const lines = quantity <= 0
    ? bill.lines.filter((line) => line.itemId !== itemId)
    : bill.lines.map((line) => line.itemId === itemId ? { ...line, quantity } : line);
  return { ...bill, lines, paid: false };
}

function tableOrderToBill(order: TableOrder, current: PosBill): PosBill {
  const operational = order as OperationalOrder;
  return {
    ...current,
    table: order.tableNumber || "DIRECT",
    orderType: order.orderType ?? "dine-in",
    lines: order.lines,
    paid: order.paymentStatus === "paid",
    customerName: order.customerName || order.guestName,
    customerPhone: order.customerPhone,
    linkedKitchenOrderId: operational.hasKitchenTicket === false ? undefined : order.id,
    waiterName: order.waiterName,
  };
}

function incrementalLines(next: PosBill["lines"], current: TableOrder["lines"]) {
  const currentQuantities = new Map(current.map((line) => [line.itemId, line.quantity]));
  return next
    .map((line) => ({ ...line, quantity: line.quantity - (currentQuantities.get(line.itemId) ?? 0) }))
    .filter((line) => line.quantity > 0);
}

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function matchesPosHistoryRange(value: string | undefined, range: "today" | "yesterday" | "week" | "month" | "custom", customFrom: string, customTo: string) {
  if (!value) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (range === "today") return date >= start;
  if (range === "yesterday") {
    const from = new Date(start);
    from.setDate(from.getDate() - 1);
    return date >= from && date < start;
  }
  if (range === "week") {
    const from = new Date(start);
    from.setDate(from.getDate() - 6);
    return date >= from;
  }
  if (range === "month") return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
  const to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
  return (!from || date >= from) && (!to || date <= to);
}

function HeldOrdersPanel({
  orders,
  onResume,
  onDelete,
}: {
  orders: HeldPosOrder[];
  onResume: (order: HeldPosOrder) => void;
  onDelete: (order: HeldPosOrder) => void;
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
                <Button size="sm" variant="outline" onClick={() => onDelete(order)}>Remove</Button>
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
  kitchenOrders,
  tables,
  staff,
  orderDelayThresholdMinutes,
  onOpenNew,
  onOpen,
  onAddItems,
  onPrintBill,
  onPrintReceipt,
  onPrintKot,
  onCollectPayment,
  onSplit,
  onTransfer,
  onMerge,
  onTimeline,
  onPaymentHistory,
  onReminder,
  onServe,
  onComplete,
  onCancel,
  activeAction,
  waiterView = false,
}: {
  orders: DemoOrder[];
  kitchenOrders: OperationalOrder[];
  tables: PosTable[];
  staff: StaffMember[];
  orderDelayThresholdMinutes: number;
  onOpenNew: () => void;
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onPrintReceipt: (order: TableOrder) => void;
  onPrintKot: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onSplit: (order: OperationalOrder) => void;
  onTransfer: (order: OperationalOrder) => void;
  onMerge: (order: OperationalOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
  onReminder: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onComplete: (order: TableOrder) => void;
  onCancel: (order: TableOrder) => void;
  activeAction?: string | null;
  waiterView?: boolean;
}) {
  const [view, setView] = useState<"operations" | "waiter" | "cashier" | "manager">(() => waiterView ? "waiter" : "operations");
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const activeKitchenOrders = useMemo(
    () => {
      const value = search.trim().toLowerCase();
      return kitchenOrders
      .filter((order) => !["completed", "cancelled", "billed"].includes(order.status))
      .filter((order) => !value || activeOrderSearchText(order).includes(value))
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .slice(0, 30);
    },
    [kitchenOrders, search],
  );
  const readyOrders = activeKitchenOrders
    .filter((order) => order.status === "ready")
    .sort((first, second) => readySinceMillis(first) - readySinceMillis(second));
  const displayedOrders = view === "waiter" ? readyOrders : activeKitchenOrders;
  const pendingPayments = activeKitchenOrders.filter((order) => order.paymentStatus !== "paid");
  const pendingBills = activeKitchenOrders.filter((order) => ["ready", "served"].includes(order.status) && order.paymentStatus !== "paid");
  const completedToday = orders.filter((order) => ["delivered", "completed"].includes(order.status) && isToday(order.createdAt)).length;
  const delayedOrders = activeKitchenOrders.filter((order) => isDelayedTableOrder(order, orderDelayThresholdMinutes));
  const occupiedTables = tables.filter((table) => ["occupied", "reserved"].includes(String(table.status)));
  const activeStaff = staff.filter((member) => member.status === "active");
  const revenue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.totals.total ?? 0), 0);
  const kitchenLoad = activeKitchenOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const views = [
    ["operations", "Operations", Grid2X2],
    ["waiter", "Waiter", Utensils],
    ["cashier", "Cashier", ReceiptText],
    ["manager", "Manager", UsersRound],
  ] as const;

  useEffect(() => {
    if (!waiterView) return;
    const id = window.setTimeout(() => setView("waiter"), 0);
    return () => window.clearTimeout(id);
  }, [waiterView]);

  return (
    <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black text-slate-950">Active Orders</h2>
          <div className="flex rounded-xl border border-slate-200 bg-white/85 p-1 shadow-sm">
            {views.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn("flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-black transition", view === key ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50")}
                aria-label={label}
                title={label}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <Button onClick={onOpenNew}>New Order</Button>
      </div>
      <label className="relative mt-3 block max-w-xl">
        <Search className="absolute left-3 top-3 size-4 text-slate-400" />
        <input
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order, table, customer, phone, item, waiter, vehicle..."
          aria-label="Search active orders"
        />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        {view === "operations" ? (
          <>
            <OperationalMetric label="Active orders" value={String(activeKitchenOrders.length)} />
            <OperationalMetric label="Kitchen queue" value={String(activeKitchenOrders.filter((order) => ["new", "accepted", "preparing", "ready"].includes(order.status)).length)} />
            <OperationalMetric label="Pending bills" value={String(pendingBills.length)} />
            <OperationalMetric label="Completed" value={String(completedToday)} />
          </>
        ) : null}
        {view === "waiter" ? (
          <>
            <OperationalMetric label="Assigned tables" value={String(occupiedTables.length)} />
            <OperationalMetric label="Ready orders" value={String(readyOrders.length)} />
            <OperationalMetric label="Pending bills" value={String(pendingBills.length)} />
            <OperationalMetric label="Requests" value={String(activeKitchenOrders.filter((order) => order.priority === "rush").length)} />
          </>
        ) : null}
        {view === "cashier" ? (
          <>
            <OperationalMetric label="Pending bills" value={String(pendingBills.length)} />
            <OperationalMetric label="Pending payments" value={String(pendingPayments.length)} />
            <OperationalMetric label="Today's collection" value={formatCurrency(revenue)} />
            <OperationalMetric label="Receipt queue" value={String(activeKitchenOrders.filter((order) => order.paymentStatus === "paid").length)} />
          </>
        ) : null}
        {view === "manager" ? (
          <>
            <OperationalMetric label="Kitchen load" value={String(activeKitchenOrders.length)} />
            <OperationalMetric label="Delayed orders" value={String(delayedOrders.length)} />
            <OperationalMetric label="Revenue" value={formatCurrency(revenue)} />
            <OperationalMetric label="Staff active" value={String(activeStaff.length)} />
          </>
        ) : null}
      </div>
      {view === "manager" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {Object.entries(kitchenLoad).map(([status, count]) => <OperationalMetric key={status} label={status} value={String(count)} />)}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3">
        {displayedOrders.length ? displayedOrders.map((order, index) => (
          <PosOrderAccordion
            key={order.id}
            index={index}
            order={order}
            view={view}
            orderDelayThresholdMinutes={orderDelayThresholdMinutes}
            canMerge={activeKitchenOrders.length >= 2}
            busy={activeAction ?? ""}
            expanded={expandedOrderId === order.id}
            onExpandedChange={(open) => setExpandedOrderId(open ? order.id : null)}
            onOpen={onOpen}
            onAddItems={onAddItems}
            onPrintBill={onPrintBill}
            onPrintReceipt={onPrintReceipt}
            onPrintKot={onPrintKot}
            onCollectPayment={onCollectPayment}
            onSplit={onSplit}
            onTransfer={onTransfer}
            onMerge={onMerge}
            onTimeline={onTimeline}
            onPaymentHistory={onPaymentHistory}
            onReminder={onReminder}
            onServe={onServe}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        )) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            {view === "waiter" ? "No ready orders for waiter service." : "No active orders right now."}
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveOrderRow({
  order,
  orderDelayThresholdMinutes,
  index,
  canMerge,
  busy,
  onOpen,
  onAddItems,
  onPrintBill,
  onPrintReceipt,
  onPrintKot,
  onCollectPayment,
  onSplit,
  onTransfer,
  onMerge,
  onTimeline,
  onPaymentHistory,
  onReminder,
  onServe,
  onComplete,
  onCancel,
}: {
  order: OperationalOrder;
  orderDelayThresholdMinutes: number;
  index: number;
  canMerge: boolean;
  busy: string;
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onPrintReceipt: (order: TableOrder) => void;
  onPrintKot: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onSplit: (order: OperationalOrder) => void;
  onTransfer: (order: OperationalOrder) => void;
  onMerge: (order: OperationalOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
  onReminder: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onComplete: (order: TableOrder) => void;
  onCancel: (order: TableOrder) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const delayed = isDelayedTableOrder(order, orderDelayThresholdMinutes);
  const table = order.tableNumber || readablePosOrderType(order.orderType ?? "dine-in");
  const waiter = order.waiterName || order.assignedStaffName || "Unassigned";
  return (
    <article className={cn("grid gap-2 px-3 py-2 transition xl:grid-cols-[minmax(104px,3fr)_minmax(148px,5fr)_minmax(72px,2fr)_minmax(96px,3fr)_minmax(96px,3fr)_minmax(120px,4fr)_180px] xl:items-center", delayed && "bg-red-50/70 kitchen-delay-pulse", order.status === "ready" && "bg-emerald-50/70 kitchen-ready-pulse")}>
      <button type="button" className="min-w-0 text-left" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen}>
        <h3 className="truncate text-base font-black text-slate-950">{readableTableOrderId(order, index + 1)}</h3>
        <p className="truncate text-xs font-semibold text-slate-500">{order.customerName || order.guestName || "Walk-in"} · {actualOrderTime(order.createdAt)}</p>
      </button>
      <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-1.5 xl:bg-transparent xl:px-0 xl:py-0">
        <p className="text-[10px] font-black uppercase text-slate-400 xl:hidden">Status</p>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate rounded-full px-2 py-1 text-xs font-black capitalize", orderStatusTone(order.status, order.paymentStatus).chip)}>{order.status}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
            <span className={cn("block h-full rounded-full", orderStatusTone(order.status, order.paymentStatus).bar)} style={{ width: `${statusStepPercent(order.status)}%` }} />
          </span>
        </div>
      </div>
      <ActiveInfoRow label="ETA" value={`${order.etaMinutes ?? 12} min`} />
      <ActiveInfoRow label="Items" value={`${itemCount} item${itemCount === 1 ? "" : "s"}`} subvalue={posCompactItems(order.lines)} />
      <ActiveInfoRow label="Payment" value={paymentLabel(order.paymentStatus)} tone={paymentInfoTone(order.paymentStatus)} />
      <ActiveInfoRow label="Table / Waiter" value={table} subvalue={waiter} />
      <div className="flex min-w-0 items-center gap-2 xl:justify-end">
        <Button size="sm" variant="outline" className="min-h-9 shrink-0 whitespace-nowrap" onClick={() => onOpen(order)}>
          <Eye className="size-4" />
          Open
        </Button>
        <PosActiveOrderMenu
          canMerge={canMerge}
          busy={busy}
          order={order}
          onOpen={onOpen}
          onAddItems={onAddItems}
          onPrintBill={onPrintBill}
          onPrintReceipt={onPrintReceipt}
          onPrintKot={onPrintKot}
          onCollectPayment={onCollectPayment}
          onSplit={onSplit}
          onTransfer={onTransfer}
          onMerge={onMerge}
          onTimeline={onTimeline}
          onPaymentHistory={onPaymentHistory}
          onReminder={onReminder}
          onServe={onServe}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      </div>
      {detailsOpen ? (
        <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-xs font-semibold text-slate-600 xl:col-span-7">
          <div className="grid gap-2 sm:grid-cols-4">
            <span><strong className="text-slate-950">Type:</strong> {readablePosOrderType(order.orderType ?? "dine-in")}</span>
            <span><strong className="text-slate-950">Waiter:</strong> {waiter}</span>
            <span><strong className="text-slate-950">Payment:</strong> {paymentLabel(order.paymentStatus)}</span>
            <span><strong className="text-slate-950">Created:</strong> {actualOrderTime(order.createdAt)}</span>
          </div>
          <p className="mt-2 truncate"><strong className="text-slate-950">Items:</strong> {order.lines.map((line) => `${line.quantity}x ${line.name}`).join(", ")}</p>
        </div>
      ) : null}
    </article>
  );
}

function ReadyToServePanel({
  orders,
  onOpen,
  onAddItems,
  onPrintBill,
  onCollectPayment,
  onServe,
  onTimeline,
  onPaymentHistory,
}: {
  orders: OperationalOrder[];
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-emerald-900">Ready To Serve</h3>
          <p className="text-xs font-bold text-emerald-700">Kitchen-ready orders for waiter action.</p>
        </div>
        <Badge variant="success">{orders.length} ready</Badge>
      </div>
      <div className="grid gap-2">
        {orders.map((order, index) => (
          <ReadyOrderAccordion
            key={order.id}
            index={index}
            now={now}
            order={order}
            onOpen={onOpen}
            onAddItems={onAddItems}
            onPrintBill={onPrintBill}
            onCollectPayment={onCollectPayment}
            onServe={onServe}
            onTimeline={onTimeline}
            onPaymentHistory={onPaymentHistory}
          />
        ))}
        {!orders.length ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-white/75 p-8 text-center text-sm font-bold text-slate-500">
            No ready orders for waiter service.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReadyOrderAccordion({
  order,
  index,
  now,
  onOpen,
  onAddItems,
  onPrintBill,
  onCollectPayment,
  onServe,
  onTimeline,
  onPaymentHistory,
}: {
  order: OperationalOrder;
  index: number;
  now: number;
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const readyAt = readySinceMillis(order) || Date.parse(order.createdAt);
  const elapsed = Number.isFinite(readyAt) ? Math.max(0, Math.round((now - readyAt) / 60000)) : 0;
  const readySeconds = Number.isFinite(readyAt) ? Math.max(0, Math.round((now - readyAt) / 1000)) : 0;
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <article className={cn("overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm", readySeconds < 60 ? "animate-pulse ring-2 ring-emerald-300" : "kitchen-ready-pulse")}>
      <button type="button" className="grid w-full gap-2 p-3 text-left sm:grid-cols-[120px_minmax(0,1fr)_100px_120px] sm:items-center" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="text-lg font-black text-slate-950">{readableTableOrderId(order, index + 1)}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-emerald-700">{order.tableNumber || readablePosOrderType(order.orderType ?? "dine-in")}</span>
          <span className="block truncate text-xs font-semibold text-slate-500">{itemCount} item{itemCount === 1 ? "" : "s"} · Ready since {elapsed}m · SLA {serveSlaLabel(elapsed)}</span>
        </span>
        <Badge variant={order.priority === "rush" ? "destructive" : "success"}>{order.priority === "rush" ? "Priority" : "Ready"}</Badge>
        <span className="flex items-center justify-between gap-2 text-xs font-black text-slate-500">
          {order.paymentStatus === "paid" ? "Paid" : "Payment pending"}
          <Clock3 className={cn("size-4 transition", open && "rotate-180")} />
        </span>
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-emerald-100 bg-emerald-50/40 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {order.lines.map((line, lineIndex) => (
                <p key={`${line.itemId}-${lineIndex}`} className="truncate rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-800">{line.quantity}x {line.name}</p>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Button size="sm" onClick={() => onServe(order)}><Utensils className="size-4" />Serve</Button>
              <Button size="sm" variant="outline" onClick={() => onOpen(order)}><Eye className="size-4" />Open</Button>
              <Button size="sm" variant="outline" onClick={() => onCollectPayment(order)}><CircleDollarSign className="size-4" />Collect</Button>
              <Button size="sm" variant="outline" onClick={() => onAddItems(order)}><PlusCircle className="size-4" />Add</Button>
              <Button size="sm" variant="outline" onClick={() => onPrintBill(order)}><ReceiptText className="size-4" />Bill</Button>
              <Button size="sm" variant="outline" onClick={() => onTimeline(order)}><Clock3 className="size-4" />Timeline</Button>
              <Button size="sm" variant="outline" className="sm:col-span-3 lg:col-span-6" onClick={() => onPaymentHistory(order)}><History className="size-4" />History</Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ActiveInfoRow({ label, value, subvalue, tone }: { label: string; value: string; subvalue?: string; tone?: string }) {
  return (
    <div className="min-w-0 xl:bg-transparent xl:px-0 xl:py-0 rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase text-slate-400 xl:hidden">{label}</p>
      <p className={cn("truncate text-sm font-black text-slate-800", tone)}>{value}</p>
      {subvalue ? <p className="truncate text-xs font-semibold text-slate-500">{subvalue}</p> : null}
    </div>
  );
}

function PosActiveOrderMenu({
  order,
  canMerge,
  busy,
  onOpen,
  onAddItems,
  onPrintBill,
  onPrintReceipt,
  onPrintKot,
  onCollectPayment,
  onSplit,
  onTransfer,
  onMerge,
  onTimeline,
  onPaymentHistory,
  onReminder,
  onServe,
  onComplete,
  onCancel,
}: {
  order: OperationalOrder;
  canMerge: boolean;
  busy: string;
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onPrintReceipt: (order: TableOrder) => void;
  onPrintKot: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onSplit: (order: OperationalOrder) => void;
  onTransfer: (order: OperationalOrder) => void;
  onMerge: (order: OperationalOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
  onReminder: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onComplete: (order: TableOrder) => void;
  onCancel: (order: TableOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; mobile: boolean }>({ top: 0, left: 0, width: 248, mobile: false });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  const act = (fn: () => void) => () => {
    close();
    fn();
  };
  const actions = [
    { label: "Open", icon: Eye, onClick: () => onOpen(order) },
    { label: "Kitchen", icon: ChefHat, onClick: () => onOpen(order) },
    { label: "Print Bill", icon: ReceiptText, onClick: () => onPrintBill(order) },
    { label: "Print Receipt", icon: Printer, onClick: () => onPrintReceipt(order) },
    { label: "Print KOT", icon: ClipboardList, onClick: () => onPrintKot(order) },
    { label: "Add Items", icon: PlusCircle, onClick: () => onAddItems(order) },
    { label: "Collect Payment", icon: CircleDollarSign, onClick: () => onCollectPayment(order), disabled: busy === `payment:${order.id}` },
    { label: "Serve", icon: Utensils, onClick: () => onServe(order), disabled: order.status !== "ready" },
    { label: "Split Bill", icon: Scissors, onClick: () => onSplit(order), disabled: busy === `split:${order.id}` },
    { label: "Merge Table", icon: GitMerge, onClick: () => onMerge(order), disabled: !canMerge || busy === `merge:${order.id}` },
    { label: "Transfer Table", icon: ArrowRightLeft, onClick: () => onTransfer(order), disabled: busy === `transfer:${order.id}` },
    { label: "Timeline", icon: Clock3, onClick: () => onTimeline(order) },
    { label: "History", icon: History, onClick: () => onPaymentHistory(order) },
    { label: "Reminder", icon: BellRing, onClick: () => onReminder(order) },
    { label: "Complete", icon: CheckCircle2, onClick: () => onComplete(order) },
    { label: "Cancel", icon: XCircle, onClick: () => onCancel(order), danger: true },
  ] satisfies Array<{ label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; danger?: boolean }>;

  const updatePosition = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const mobile = window.innerWidth < 640;
    const width = Math.min(248, window.innerWidth - 24);
    const height = Math.min(420, window.innerHeight - 32);
    const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const top = below + height > window.innerHeight ? Math.max(12, rect.top - height - 8) : below;
    setPosition({ top, left, width, mobile });
  }, []);

  const toggle = () => {
    updatePosition();
    setOpen((value) => !value);
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="outline" className="min-h-9 shrink-0 whitespace-nowrap" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
        <MoreHorizontal className="size-4" />
        More
      </Button>
      {open ? createPortal(
        position.mobile ? (
          <div className="fixed inset-0 z-[90] bg-slate-950/35 sm:hidden" role="presentation" onClick={close}>
            <div ref={menuRef} role="menu" className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-2 h-1.5 w-12 rounded-full bg-slate-200 mx-auto" />
              <p className="px-2 pb-2 text-sm font-black text-slate-900">{readableTableOrderId(order)}</p>
              <ActionMenuButtons actions={actions} act={act} />
            </div>
          </div>
        ) : (
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[90] max-h-[min(420px,calc(100vh-2rem))] overflow-y-auto rounded-xl border bg-white p-1.5 shadow-2xl"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <ActionMenuButtons actions={actions} act={act} />
          </div>
        ),
        document.body,
      ) : null}
    </div>
  );
}

function ActionMenuButtons({
  actions,
  act,
}: {
  actions: Array<{ label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; danger?: boolean }>;
  act: (fn: () => void) => () => void;
}) {
  return (
    <div className="grid gap-1">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            className={cn("flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-black hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45", action.danger ? "text-red-600" : "text-slate-700")}
            onClick={act(action.onClick)}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function posCompactItems(lines: TableOrder["lines"]) {
  const summary = lines.slice(0, 2).map((line) => `${line.quantity}x ${line.name}`).join(", ");
  return `${summary}${lines.length > 2 ? ` +${lines.length - 2}` : ""}`;
}

function statusStepPercent(status: TableOrder["status"]) {
  if (status === "ready" || status === "served") return 82;
  if (status === "preparing") return 58;
  if (status === "accepted") return 34;
  if (status === "completed" || status === "billed") return 100;
  return 18;
}

function paymentInfoTone(status?: TableOrder["paymentStatus"]) {
  if (status === "paid") return "text-emerald-700";
  if (status === "partial" || status === "authorized") return "text-amber-700";
  if (status === "refunded") return "text-blue-700";
  return "text-slate-900";
}

function orderStatusTone(status?: string, payment?: string) {
  if (payment === "paid") return { chip: "bg-emerald-900 text-white", bar: "bg-emerald-900", dot: "bg-emerald-900" };
  if (status === "new") return { chip: "bg-blue-50 text-blue-700", bar: "bg-blue-500", dot: "bg-blue-500" };
  if (status === "accepted") return { chip: "bg-orange-50 text-orange-700", bar: "bg-orange-500", dot: "bg-orange-500" };
  if (status === "preparing") return { chip: "bg-yellow-50 text-yellow-800", bar: "bg-yellow-500", dot: "bg-yellow-500" };
  if (status === "ready") return { chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500" };
  if (status === "served") return { chip: "bg-teal-50 text-teal-700", bar: "bg-teal-500", dot: "bg-teal-500" };
  if (status === "billing" || status === "billed") return { chip: "bg-purple-50 text-purple-700", bar: "bg-purple-500", dot: "bg-purple-500" };
  if (status === "cancelled" || status === "rejected") return { chip: "bg-red-50 text-red-700", bar: "bg-red-500", dot: "bg-red-500" };
  return { chip: "bg-slate-100 text-slate-700", bar: "bg-slate-400", dot: "bg-slate-400" };
}

function activeOrderSearchText(order: OperationalOrder) {
  const raw = order as OperationalOrder & {
    deliveryPartnerName?: string;
    vehicleNumber?: string;
    qrTableCode?: string;
  };
  return [
    readableTableOrderId(order),
    order.orderNumber,
    order.displayOrderNumber,
    order.invoiceNumber,
    order.billNumber,
    order.tableNumber,
    order.customerName,
    order.guestName,
    order.customerPhone,
    order.waiterName,
    order.assignedStaffName,
    raw.deliveryPartnerName,
    raw.vehicleNumber,
    raw.qrTableCode,
    order.source,
    order.orderType,
    ...order.lines.map((line) => `${line.name} ${line.itemId}`),
  ].filter(Boolean).join(" ").toLowerCase();
}

function OperationalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/75 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function PastOrdersPanel({ orders, canCorrect, onOpen, onCorrect }: { orders: DemoOrder[]; canCorrect: boolean; onOpen: (order: DemoOrder) => void; onCorrect: (order: DemoOrder) => void }) {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<"today" | "yesterday" | "week" | "month" | "custom">("week");
  const [status, setStatus] = useState<"all" | DemoOrder["status"]>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const historyStatuses = new Set<DemoOrder["status"]>(["completed", "delivered", "cancelled", "rejected"]);
  const rows = [
    ...orders
      .filter((order) => historyStatuses.has(order.status))
      .filter((order) => matchesPosHistoryRange(order.createdAt, range, customFrom, customTo))
      .filter((order) => status === "all" || order.status === status)
      .map((order, index) => ({
        id: readableOrderId({ id: order.id, invoiceNumber: order.invoiceNumber, orderNumber: order.orderNumber, displayOrderNumber: order.displayOrderNumber, billNumber: order.billNumber, channel: order.channel, orderType: order.fulfillmentType, createdAt: order.createdAt, sequence: index + 1 }),
        customer: order.customer.name,
        amount: order.totals.total,
        payment: order.payment.toUpperCase(),
        time: actualOrderTime(order.createdAt),
        waiter: "-",
        source: order.channel,
        gst: order.totals.tax,
        discount: order.totals.discount,
        status: order.status,
        order,
      })),
  ];
  const filtered = rows.filter((row) => {
    const value = search.trim().toLowerCase();
    return !value || [row.id, row.customer, row.source, row.status].some((field) => String(field).toLowerCase().includes(value));
  });
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportRows() {
    const csv = [
      "Order No,Customer,Amount,Payment,Time,Waiter,Source,GST,Discount,Status",
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
          <h2 className="text-2xl font-black text-slate-950">Order History</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Completed, cancelled, and billed orders in one history view.</p>
        </div>
        <Button variant="outline" onClick={exportRows}>
          <Download className="size-4" />
          Export
        </Button>
      </div>
      <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px]">
        <label className="relative">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <input className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search order, customer, source..." />
        </label>
        <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" value={range} onChange={(event) => { setRange(event.target.value as typeof range); setPage(1); }} aria-label="Date range">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="custom">Custom</option>
        </select>
        <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} aria-label="Order status">
          <option value="all">All status</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
        <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:bg-slate-50" type="date" value={customFrom} onChange={(event) => { setCustomFrom(event.target.value); setPage(1); }} disabled={range !== "custom"} aria-label="Custom from date" />
        <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:bg-slate-50" type="date" value={customTo} onChange={(event) => { setCustomTo(event.target.value); setPage(1); }} disabled={range !== "custom"} aria-label="Custom to date" />
      </div>
      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Order No", "Customer", "Amount", "Payment", "Time", "Waiter", "Source", "GST", "Discount", "Status", "Actions"].map((head) => <th key={head} className="px-3 py-3 font-black">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
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
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(row.order)}><Eye className="size-4" />Open</Button>
                    <Button size="sm" variant="outline" disabled={!canCorrect} onClick={() => onCorrect(row.order)}><ReceiptText className="size-4" />Correct</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:hidden">
        {visible.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{row.id}</p>
                <p className="text-xs font-semibold text-slate-500">{row.time} • {row.status}</p>
              </div>
              <p className="font-black">{formatCurrency(row.amount)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpen(row.order)}><Eye className="size-4" />Open</Button>
              <Button size="sm" variant="outline" disabled={!canCorrect} onClick={() => onCorrect(row.order)}><ReceiptText className="size-4" />Correct</Button>
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, value]);

  return debounced;
}
