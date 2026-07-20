"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import { ArrowLeft, ArrowRightLeft, BellRing, CheckCircle2, ChefHat, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Download, Eye, FileDown, GitMerge, Grid2X2, History, Loader2, MapPin, MessageCircle, MoreHorizontal, PlusCircle, Printer, ReceiptText, Scissors, Search, SlidersHorizontal, UserRound, UsersRound, Utensils, X, XCircle, type LucideIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from "react";
import { showLazySarvaNotification, toast } from "@/lib/client-toast";
import { PosSidebar, type PosPanel } from "@/modules/owner/pos/components/pos-sidebar";
import { CategoryList, type PosCategory } from "@/modules/owner/pos/components/category-list";
import { ProductGrid } from "@/modules/owner/pos/components/product-grid";
import type { PosProduct } from "@/modules/owner/pos/components/product-card";
import { CartPanel, type CompletedPosOrder, type PosProcessingState, type PosWizardStep } from "@/modules/owner/pos/components/cart-panel";
import { CustomerSelector } from "@/modules/owner/pos/components/customer-selector";
import { TableSelector } from "@/modules/owner/pos/components/table-selector";
import { CompactOrderAccordion } from "@/components/orders/CompactOrderAccordion";
import { OperationalOrderStatusBadge } from "@/components/orders/OperationalOrderStatusBadge";
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
import { formatDelayTime, formatOperationalDuration, getKitchenDelay } from "@/lib/kitchen-delay";
import { defaultOperationalSettings, normalizeOperationalSettings, type OperationalSettings } from "@/lib/order-delay-settings";
import { normalizePhone } from "@/lib/phone";
import { getRetryDelayMs } from "@/lib/offline/retry-manager";
import {
  clearPosDraftRecovery,
  loadPosDraftRecovery,
  normalizePosDraftError,
  posDraftFailureMessage,
  savePosDraftRecovery,
  sendPosDraft,
  type PosDraftFailureKind,
  type PosDraftPayload,
  type PosDraftRecoveryRecord,
  type PosDraftScope,
} from "@/lib/pos-draft-recovery";
import type { OrderAccordionDelay, OrderBadgeTone, OrderDelayLevel } from "@/components/orders/OrderAccordion.types";

const posTabs = ["menu", "custom", "combos"] as const;
const heldOrdersKey = "sarva-pos-held-orders:v1";
const paymentDraftKey = "sarva-pos-payment-draft:v1";
const posPanels = new Set<PosPanel>(["new", "active", "held", "past", "customers"]);

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
type PendingPosDraft = {
  revision: number;
  scope: PosDraftScope;
  payload: PosDraftPayload;
  retryCount: number;
};
type PosDraftDiagnosticsState = {
  status: "idle" | "local" | "saving" | "saved" | "retrying" | "failed";
  local: string;
  indexedDb: string;
  session: string;
  offlineQueue: string;
  lastSave?: string;
  durationMs?: number;
  failureReason?: string;
  retryCount: number;
};
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
  attemptId: string;
};

type TransferTarget = {
  order: OperationalOrder;
  mode: "table" | "waiter";
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
  const [panel, setPanel] = useState<PosPanel>(() => initialPosPanel());
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
  const [kotPrintLines, setKotPrintLines] = useState<PosBill["lines"] | null>(null);
  const [printCopies, setPrintCopies] = useState<BillCopy[]>(["Customer Copy"]);
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);
  const [previewPaper, setPreviewPaper] = useState<PaperWidth>("80mm");
  const [ticketCreatedAt, setTicketCreatedAt] = useState<Date | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [resumeTarget, setResumeTarget] = useState<HeldPosOrder | null>(null);
  const [heldDeleteTarget, setHeldDeleteTarget] = useState<HeldPosOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OperationalOrder | null>(null);
  const [splitTarget, setSplitTarget] = useState<OperationalOrder | null>(null);
  const [transferTarget, setTransferTarget] = useState<TransferTarget | null>(null);
  const [mergeTarget, setMergeTarget] = useState<OperationalOrder | null>(null);
  const [timelineTarget, setTimelineTarget] = useState<OperationalOrder | null>(null);
  const [paymentHistoryTarget, setPaymentHistoryTarget] = useState<OperationalOrder | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<OperationalOrder | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<ExtendedDemoOrder | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [readModelLoading, setReadModelLoading] = useState(true);
  const [readModelError, setReadModelError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online"));
  const [pendingChanges, setPendingChanges] = useState(0);
  const [recoveredDraft, setRecoveredDraft] = useState<PosDraftRecoveryRecord | null>(null);
  const [draftDiagnostics, setDraftDiagnostics] = useState<PosDraftDiagnosticsState>({
    status: "idle",
    local: "No recovery draft",
    indexedDb: "No recovery draft",
    session: "Payment draft only",
    offlineQueue: "Latest draft retry coordinator",
    retryCount: 0,
  });
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
  const draftTimerRef = useRef<number | null>(null);
  const draftRetryTimerRef = useRef<number | null>(null);
  const draftRevisionRef = useRef(0);
  const pendingDraftRef = useRef<PendingPosDraft | null>(null);
  const draftSaveInFlightRef = useRef<Promise<unknown> | null>(null);
  const draftAbortRef = useRef<AbortController | null>(null);
  const draftNoticeKindRef = useRef<PosDraftFailureKind | null>(null);
  const activeDraftScopeKeyRef = useRef("");
  const flushDraftRef = useRef<(force?: boolean) => Promise<void>>(async () => undefined);
  const retryDraftRef = useRef<() => Promise<void>>(async () => undefined);
  const scheduleDraftSaveRef = useRef<(delayMs?: number) => void>(() => undefined);
  const { categories: masterCategories } = usePublicCategories();
  const setPosBill = useAppStore((state) => state.setPosBill);
  const resetPosBill = useAppStore((state) => state.resetPosBill);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const draftScope = useMemo(() => ({ restaurantId, userId: authUser.id }), [authUser.id, restaurantId]);
  const draftScopeKey = `${draftScope.restaurantId}:${draftScope.userId}`;
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
    if (!activeDraftScopeKeyRef.current) {
      activeDraftScopeKeyRef.current = draftScopeKey;
      return;
    }
    if (activeDraftScopeKeyRef.current === draftScopeKey) return;
    activeDraftScopeKeyRef.current = draftScopeKey;
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    if (draftRetryTimerRef.current !== null) window.clearTimeout(draftRetryTimerRef.current);
    pendingDraftRef.current = null;
    draftRevisionRef.current += 1;
    draftAbortRef.current?.abort();
  }, [draftScopeKey]);

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
    setReadModelError("");
    const recovery = options.applyDraft === false
      ? null
      : await loadPosDraftRecovery(draftScope).catch(() => null);
    if (recovery) {
      billRef.current = recovery.payload.bill;
      setPosBill(recovery.payload.bill);
      setDeliveryAddress(recovery.payload.deliveryAddress);
      setLandmark(recovery.payload.landmark);
      setOrderNote(recovery.payload.orderNote);
      setPanel("new");
      setWizardStep(1);
      setRecoveredDraft(recovery);
      setPendingChanges(1);
      setDraftDiagnostics((current) => ({
        ...current,
        status: "local",
        local: "Recovered",
        indexedDb: "Recovered",
        lastSave: recovery.savedAt,
        failureReason: recovery.lastError,
        retryCount: recovery.retryCount,
      }));
    }
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
      if (options.applyDraft === false) {
        if (!pendingDraftRef.current) setSyncStatus("online");
        return;
      }
      if (recovery) {
        setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "pending");
        return;
      }
      setPendingChanges(0);
      setSyncStatus("online");
      if (payload.data?.draft?.lines?.length) {
        billRef.current = payload.data.draft;
        setPosBill(payload.data.draft);
      } else {
        resetPosBill();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "retrying");
        setReadModelError(error instanceof Error ? error.message : "POS data could not be loaded.");
      }
      throw error;
    } finally {
      if (!options.signal?.aborted) setReadModelLoading(false);
    }
  }, [draftScope, resetPosBill, setPosBill]);

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
      void Promise.allSettled([
        refreshPosReadModel({ applyDraft: false }),
        retryDraftRef.current(),
      ]).then((results) => {
        if (results.every((result) => result.status === "fulfilled")) {
          if (!pendingDraftRef.current) setSyncStatus("online");
          return;
        }
        setSyncStatus("retrying");
      });
    };
    const onOffline = () => {
      setSyncStatus("offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshPosReadModel]);

  useEffect(() => {
    const retryVisibleDraft = () => {
      if (document.visibilityState === "visible" && pendingDraftRef.current) {
        void retryDraftRef.current();
      }
    };
    document.addEventListener("visibilitychange", retryVisibleDraft);
    window.addEventListener("focus", retryVisibleDraft);
    return () => {
      document.removeEventListener("visibilitychange", retryVisibleDraft);
      window.removeEventListener("focus", retryVisibleDraft);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(paymentDraftKey);
        if (saved) {
          const draft = JSON.parse(saved) as Partial<PaymentDraft>;
          if (draft.order && draft.stage && Number.isFinite(draft.amount)) setPaymentDraft({ ...draft, attemptId: draft.attemptId || newPaymentAttemptId(), method: draft.method ?? "cash", unlockReason: draft.unlockReason ?? "" } as PaymentDraft);
        }
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
  const kotBillContext = useMemo(() => buildBillContext({
    bill: kotPrintLines ? { ...bill, lines: kotPrintLines } : bill,
    branch,
    taxSettings: effectiveTaxSettings,
    restaurantName: ownerBusinessProfile?.hotelName,
    createdAt: ticketCreatedAt ?? new Date(),
  }), [bill, branch, effectiveTaxSettings, kotPrintLines, ownerBusinessProfile?.hotelName, ticketCreatedAt]);
  const kotContext = useMemo(() => buildKotContext(kotBillContext), [kotBillContext]);
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

  const notifyDraftFailure = useCallback((error: unknown) => {
    const failure = normalizePosDraftError(error);
    if (draftNoticeKindRef.current === failure.kind) return;
    draftNoticeKindRef.current = failure.kind;
    const copy = posDraftFailureMessage(failure);
    showLazySarvaNotification({
      id: "pos-draft-save-failure",
      tone: failure.kind === "storage" || failure.kind === "permission" ? "error" : "warning",
      title: copy.title,
      message: copy.message,
      duration: 12_000,
      actions: [
        {
          label: "Retry",
          variant: "primary",
          onClick: () => void retryDraftRef.current(),
        },
        {
          label: "Dismiss",
          onClick: () => toast.dismiss("pos-draft-save-failure"),
        },
      ],
    });
  }, []);

  const scheduleDraftSave = useCallback((delayMs = 300) => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => {
      draftTimerRef.current = null;
      void flushDraftRef.current();
    }, delayMs);
  }, []);
  scheduleDraftSaveRef.current = scheduleDraftSave;

  const stageDraft = useCallback(async (
    nextBill: PosBill,
    extra: Partial<Pick<PosDraftPayload, "deliveryAddress" | "landmark" | "orderNote">> = {},
    options: { retryCount?: number; delayMs?: number } = {},
  ) => {
    const payload: PosDraftPayload = {
      bill: nextBill,
      restaurantId: draftScope.restaurantId,
      deliveryAddress: extra.deliveryAddress ?? deliveryAddress,
      landmark: extra.landmark ?? landmark,
      orderNote: extra.orderNote ?? orderNote,
    };
    const revision = ++draftRevisionRef.current;
    const retryCount = options.retryCount ?? 0;
    pendingDraftRef.current = { revision, scope: draftScope, payload, retryCount };
    billRef.current = nextBill;
    setPosBill(nextBill);
    setPendingChanges(1);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "pending");
    try {
      const result = await savePosDraftRecovery(draftScope, payload, { retryCount });
      setDraftDiagnostics((current) => ({
        ...current,
        status: "local",
        local: result.localSaved ? "Saved" : "Unavailable",
        indexedDb: result.indexedDbSaved ? "Saved" : "Fallback only",
        lastSave: result.record.savedAt,
        failureReason: undefined,
        retryCount,
      }));
    } catch (error) {
      const failure = normalizePosDraftError(error);
      setDraftDiagnostics((current) => ({
        ...current,
        status: "failed",
        local: "Failed",
        indexedDb: "Failed",
        failureReason: failure.message,
        retryCount,
      }));
      notifyDraftFailure(failure);
    }
    scheduleDraftSave(options.delayMs);
    return revision;
  }, [deliveryAddress, draftScope, landmark, notifyDraftFailure, orderNote, scheduleDraftSave, setPosBill]);

  const flushDraft = useCallback(async (force = false) => {
    while (true) {
      if (draftSaveInFlightRef.current) {
        await draftSaveInFlightRef.current.catch(() => undefined);
        if (force) continue;
        return;
      }
      const pending = pendingDraftRef.current;
      if (!pending) return;
      if (draftTimerRef.current !== null) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
      if (draftRetryTimerRef.current !== null) {
        window.clearTimeout(draftRetryTimerRef.current);
        draftRetryTimerRef.current = null;
      }

      const controller = new AbortController();
      const startedAt = performance.now();
      draftAbortRef.current = controller;
      setSyncStatus(pending.retryCount ? "retrying" : "syncing");
      setDraftDiagnostics((current) => ({
        ...current,
        status: pending.retryCount ? "retrying" : "saving",
        retryCount: pending.retryCount,
      }));
      const request = sendPosDraft(pending.payload, controller.signal);
      draftSaveInFlightRef.current = request;
      let failure: ReturnType<typeof normalizePosDraftError> | null = null;

      try {
        await request;
        if (pendingDraftRef.current?.revision === pending.revision) {
          pendingDraftRef.current = null;
          await clearPosDraftRecovery(pending.scope);
          setPendingChanges(0);
          setSyncStatus("online");
          setDraftDiagnostics((current) => ({
            ...current,
            status: "saved",
            local: "Cleared after remote save",
            indexedDb: "Cleared after remote save",
            lastSave: new Date().toISOString(),
            durationMs: Math.round(performance.now() - startedAt),
            failureReason: undefined,
            retryCount: pending.retryCount,
          }));
          draftNoticeKindRef.current = null;
          toast.dismiss("pos-draft-save-failure");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError" && pendingDraftRef.current?.revision !== pending.revision) {
          if (force) continue;
          return;
        }
        failure = normalizePosDraftError(error);
        if (pendingDraftRef.current?.revision === pending.revision) {
          const retryCount = pending.retryCount + 1;
          pendingDraftRef.current = { ...pending, retryCount };
          setPendingChanges(1);
          setSyncStatus(failure.kind === "offline" ? "offline" : failure.retryable ? "retrying" : "pending");
          setDraftDiagnostics((current) => ({
            ...current,
            status: failure!.retryable ? "retrying" : "failed",
            durationMs: Math.round(performance.now() - startedAt),
            failureReason: `${failure!.kind}: ${failure!.message}`,
            retryCount,
          }));
          await savePosDraftRecovery(pending.scope, pending.payload, {
            retryCount,
            lastAttemptAt: new Date().toISOString(),
            lastError: `${failure.kind}: ${failure.message}`,
          }).catch(() => undefined);
          notifyDraftFailure(failure);
          if (failure.retryable) {
            draftRetryTimerRef.current = window.setTimeout(() => {
              draftRetryTimerRef.current = null;
              void flushDraftRef.current();
            }, getRetryDelayMs(retryCount));
          }
        }
      } finally {
        if (draftSaveInFlightRef.current === request) draftSaveInFlightRef.current = null;
        if (draftAbortRef.current === controller) draftAbortRef.current = null;
      }

      if (failure && force) throw failure;
      if (pendingDraftRef.current && pendingDraftRef.current.revision !== pending.revision) {
        if (force) continue;
        scheduleDraftSaveRef.current(0);
      }
      return;
    }
  }, [notifyDraftFailure]);
  flushDraftRef.current = flushDraft;

  const persistDraft = useCallback(async (
    nextBill: PosBill,
    extra: Partial<Pick<PosDraftPayload, "deliveryAddress" | "landmark" | "orderNote">> = {},
  ) => {
    await stageDraft(nextBill, extra, { delayMs: 0 });
    await flushDraftRef.current(true);
  }, [stageDraft]);

  const commitDraft = useCallback(async (
    nextBill: PosBill,
    extra?: Partial<Pick<PosDraftPayload, "deliveryAddress" | "landmark" | "orderNote">>,
  ) => {
    await stageDraft(nextBill, extra);
  }, [stageDraft]);
  const commitDraftRef = useRef(commitDraft);

  useEffect(() => {
    commitDraftRef.current = commitDraft;
  }, [commitDraft]);

  const retryDraft = useCallback(async () => {
    if (!pendingDraftRef.current) {
      await refreshPosReadModel({ applyDraft: false });
      return;
    }
    if (draftRetryTimerRef.current !== null) {
      window.clearTimeout(draftRetryTimerRef.current);
      draftRetryTimerRef.current = null;
    }
    setSyncStatus("retrying");
    await flushDraftRef.current(true).catch(() => undefined);
  }, [refreshPosReadModel]);
  retryDraftRef.current = retryDraft;

  const discardDraftAutosave = useCallback(async () => {
    if (draftTimerRef.current !== null) {
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    if (draftRetryTimerRef.current !== null) {
      window.clearTimeout(draftRetryTimerRef.current);
      draftRetryTimerRef.current = null;
    }
    const pendingScope = pendingDraftRef.current?.scope;
    pendingDraftRef.current = null;
    draftRevisionRef.current += 1;
    draftAbortRef.current?.abort();
    await draftSaveInFlightRef.current?.catch(() => undefined);
    await Promise.all([
      clearPosDraftRecovery(draftScope),
      pendingScope && (
        pendingScope.restaurantId !== draftScope.restaurantId ||
        pendingScope.userId !== draftScope.userId
      )
        ? clearPosDraftRecovery(pendingScope)
        : Promise.resolve(),
    ]);
    setPendingChanges(0);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
    draftNoticeKindRef.current = null;
    toast.dismiss("pos-draft-save-failure");
  }, [draftScope]);

  useEffect(() => {
    if (!recoveredDraft) return;
    const timer = window.setTimeout(() => {
      void stageDraft(recoveredDraft.payload.bill, recoveredDraft.payload, {
        retryCount: recoveredDraft.retryCount,
        delayMs: 0,
      }).finally(() => setRecoveredDraft(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recoveredDraft, stageDraft]);

  useEffect(() => () => {
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    if (draftRetryTimerRef.current !== null) window.clearTimeout(draftRetryTimerRef.current);
    draftAbortRef.current?.abort();
  }, []);

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
      const timer = window.setTimeout(() => {
        void commitDraft({ ...bill, table: firstAvailable.table, paid: false });
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [bill, commitDraft, occupiedTableNames, panel, tables]);

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
      setKotPrintLines(lines);
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
    setKotPrintLines(null);
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
    if (bill.linkedKitchenOrderId) {
      await processExistingOrderUpdate(capturePayment);
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

  async function processExistingOrderUpdate(capturePayment = false) {
    const parent = activeKitchenOrder;
    if (!parent) {
      toast.error("Kitchen ticket not found. Refresh Active Orders and retry.");
      return;
    }
    const canonical = canonicalForKitchenOrder(parent as OperationalOrder);
    const addedLines = incrementalLines(bill.lines, parent.lines ?? []);
    if (!addedLines.length) {
      await fetch("/api/owner/pos", { method: "DELETE" }).catch(() => undefined);
      if (capturePayment) {
        setPanel("active");
        await collectActivePayment(parent);
        return;
      }
      toast.success("No new kitchen items to send.");
      setPanel("active");
      setWizardStep(3);
      return;
    }
    try {
      setWizardStep(4);
      setProcessingState("kitchen");
      const incrementalKot = await sendKot();
      if (!incrementalKot || incrementalKot.id === parent.id) {
        setProcessingState("idle");
        setWizardStep(3);
        return;
      }
      if (canonical) {
        await fetch("/api/owner/orders", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "event",
            operationKey: clientOperationKey(["order-event", canonical.id, "incremental-kot", incrementalKot.id]),
            event: "kitchen_sent",
            orderId: canonical.id,
            kitchenOrderId: incrementalKot.id,
            note: `Incremental KOT created for ${addedLines.reduce((sum, line) => sum + line.quantity, 0)} new item${addedLines.length === 1 ? "" : "s"}.`,
          }),
        }).catch(() => undefined);
      }
      await fetch("/api/owner/pos", { method: "DELETE" }).catch(() => undefined);
      await refreshPosReadModel({ applyDraft: false });
      setProcessingState("done");
      setCompletedOrder({
        orderId: canonical ? readableOrderId(canonical) : readableTableOrderId(parent),
        kotId: readableTableOrderId(incrementalKot, tableOrders.length + 1),
        total: totals.total,
        table: bill.orderType === "dine-in" ? bill.table : undefined,
        customer: bill.customerName,
        payment: bill.payment,
        orderType: bill.orderType,
      });
      await wait(180);
      setWizardStep(5);
      toast.success("Incremental KOT sent with only the new items.");
      if (capturePayment) toast("Collect payment after the new items are prepared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Incremental KOT could not be created.");
      setProcessingState("idle");
      setWizardStep(3);
    }
  }

  function resetNewOrderState(nextPanel: PosPanel = "new") {
    resetPosBill();
    billRef.current = useAppStore.getState().posBill;
    setKotPrintLines(null);
    setDeliveryAddress("");
    setLandmark("");
    setOrderNote("");
    setCompletedOrder(null);
    setProcessingState("idle");
    setWizardStep(1);
    setPanel(nextPanel);
  }

  function startNewOrder() {
    void discardDraftAutosave();
    resetNewOrderState();
  }

  function requestNewOrder() {
    if (bill.lines.length && wizardStep !== 5) {
      setClearConfirmOpen(true);
      return;
    }
    startNewOrder();
  }

  function resumeCurrentDraft() {
    setClearConfirmOpen(false);
    setPanel("new");
    setWizardStep((current) => current >= 1 && current <= 4 ? current : billRef.current.lines.length ? 3 : 1);
  }

  async function clearCurrentOrder() {
    await discardDraftAutosave();
    resetNewOrderState();
    await stageDraft(useAppStore.getState().posBill, {
      deliveryAddress: "",
      landmark: "",
      orderNote: "",
    }, { delayMs: 0 });
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
    await discardDraftAutosave();
    resetNewOrderState("held");
    await stageDraft(useAppStore.getState().posBill, {
      deliveryAddress: "",
      landmark: "",
      orderNote: "",
    }, { delayMs: 0 });
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

  async function logPrint(target: "bill" | "kot", duplicate = false, sourceBill: PosBill = bill, sourceBillContext: BillContext = billContext, sourceKotContext: ReturnType<typeof buildKotContext> = kotContext) {
    const referenceId = target === "bill" ? sourceBill.invoiceNumber || sourceBillContext.invoiceNumber : sourceBill.linkedKitchenOrderId || sourceKotContext.kotNumber;
    const status: PrintLog["status"] = duplicate ? "retry" : billingPrinter?.status === "offline" ? "queued" : "success";
    await fetch("/api/owner/printers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ log: { type: target, status, user: authUser.name, branchId: branch.id, printerProfileId: billingPrinter?.id ?? "browser-billing", referenceId } }),
    }).catch((error) => console.error("[pos] print log failed", { target, referenceId, reason: error instanceof Error ? error.name : typeof error }));
  }

  function printTicket(target: "bill" | "kot", copies: BillCopy[] = target === "bill" ? ["Customer Copy"] : ["Kitchen Copy"], duplicate = false, sourceBill: PosBill = bill) {
    if (!sourceBill.lines.length) {
      toast.error("Add at least one item before printing.");
      return;
    }
    const createdAt = new Date();
    const sourceBillContext = buildBillContext({ bill: sourceBill, branch, taxSettings: effectiveTaxSettings, restaurantName: ownerBusinessProfile?.hotelName, createdAt });
    const sourceKotContext = buildKotContext(sourceBillContext);
    setTicketCreatedAt(createdAt);
    setShowKot(target === "kot");
    setKotPrintLines(target === "kot" ? sourceBill.lines : null);
    setPrintCopies(copies);
    void logPrint(target, duplicate, sourceBill, sourceBillContext, sourceKotContext);
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

  function acknowledgeKitchenReady(order: TableOrder) {
    if (order.status !== "ready") return;
    void fetch("/api/owner/kitchen/notify-waiter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "acknowledge", kitchenOrderId: order.id }),
      keepalive: true,
    }).catch(() => undefined);
  }

  async function notifyActiveOrderWaiter(order: TableOrder) {
    if (order.status !== "ready" || (order as OperationalOrder).hasKitchenTicket === false) {
      toast.error("Only a ready kitchen order can notify the waiter.");
      return;
    }
    setActiveAction(`notify:${order.id}`);
    try {
      const response = await fetch("/api/owner/kitchen/notify-waiter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kitchenOrderId: order.id,
          orderId: canonicalForKitchenOrder(order)?.id,
          orderNumber: readableTableOrderId(order),
          tableNumber: order.tableNumber,
          waiterName: order.waiterName || order.assignedStaffName,
          branchId: order.branchId,
          notificationMethod: "both",
        }),
      });
      await readPosPayload(response, "Waiter notification could not be sent.");
      toast.success("Waiter notified. Order remains Ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Waiter notification could not be sent.");
    } finally {
      setActiveAction(null);
    }
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
    if (!canCollectOrderPayment(active)) {
      toast.error(paymentUnavailableReason(active));
      return;
    }
    const amount = orderBalanceDue(canonical, active) || Number(order.total ?? canonical.totals.total ?? 0);
    setPaymentDraft({ order: active, amount: moneyRound(amount), method: "cash", stage: "verify", unlockReason: "", attemptId: newPaymentAttemptId() });
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
        body: JSON.stringify({ action: "payment_started", operationKey: clientOperationKey(["payment-start", draft.attemptId, canonical.id, draft.order.id, draft.amount, draft.method]), orderId: canonical.id, kitchenOrderId, amount: draft.amount, method: draft.method }),
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
        body: JSON.stringify({ action: "payment_unlock", operationKey: clientOperationKey(["payment-unlock", draft.attemptId, canonical.id, reason]), orderId: canonical.id, kitchenOrderId, reason }),
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
        body: JSON.stringify({ action: "payment", operationKey: clientOperationKey(["payment", draft.attemptId, canonical.id, draft.order.id, amount, draft.method]), orderId: canonical.id, kitchenOrderId, amount, method: draft.method }),
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
    const actionId = `print:${order.id}`;
    setActiveAction(actionId);
    try {
      const canonical = canonicalForKitchenOrder(order);
      if (canonical) {
        const requestedAt = new Date().toISOString();
        const response = await fetch("/api/owner/orders", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "print", operationKey: clientOperationKey(["print", canonical.id, type, requestedAt]), orderId: canonical.id, type, note: order.printedCount ? `${type} reprint` : `${type} print` }),
        });
        await readPosPayload(response, "Print history could not be saved.");
      }
      const nextBill = tableOrderToBill(order, billRef.current);
      billRef.current = nextBill;
      setPosBill(nextBill);
      if (type === "bill" || type === "receipt") setBillPreviewOpen(true);
      else window.setTimeout(() => printTicket("kot", ["Kitchen Copy"], Boolean(order.printedCount), nextBill), 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Print could not be started.");
    } finally {
      setActiveAction(null);
    }
  }

  async function remindKitchen(order: TableOrder, kind: "reminder" | "recall") {
    const label = kind === "recall" ? "Kitchen recall" : "Kitchen reminder";
    if ((order as OperationalOrder).hasKitchenTicket === false) {
      toast.error(`${label} cannot be sent because the kitchen ticket is unavailable.`);
      return;
    }
    setActiveAction(`${kind}:${order.id}`);
    try {
      const requestedAt = new Date().toISOString();
      const canonical = canonicalForKitchenOrder(order);
      let updatedKitchen: TableOrder | undefined;
      if ((order as OperationalOrder).hasKitchenTicket !== false) {
        const response = await fetch("/api/owner/kitchen", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: order.id, operationKey: clientOperationKey([`kitchen-${kind}`, order.id, requestedAt]), priority: "rush", reminderAt: requestedAt, reminderBy: authUser.name || authUser.id }),
        });
        const result = await readPosPayload<{ data?: TableOrder }>(response, `${label} could not be sent.`);
        updatedKitchen = result.data;
      }
      if (canonical) {
        const kitchenOrderId = (order as OperationalOrder).hasKitchenTicket === false ? undefined : order.id;
        const event = kind === "recall" ? "kitchen_recall" : "reminder";
        const response = await fetch("/api/owner/orders", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "event", operationKey: clientOperationKey(["order-event", canonical.id, event, kitchenOrderId, requestedAt]), event, orderId: canonical.id, kitchenOrderId, note: `${label} sent` }),
        });
        await readPosPayload(response, `${label} history could not be saved.`);
      }
      setReadModel((current) => ({ ...current, tableOrders: current.tableOrders.map((item) => item.id === order.id ? { ...item, ...(updatedKitchen ?? {}), priority: "rush" } : item) }));
      toast.success(`${label} sent.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} could not be sent.`);
    } finally {
      setActiveAction(null);
    }
  }

  async function updateActiveOrderStatus(order: TableOrder, status: TableOrder["status"]) {
    if (status === "served" && order.status !== "ready") {
      toast.error("Only a ready order can be marked served.");
      return;
    }
    if (status === "completed" && (order.status !== "served" || order.paymentStatus !== "paid")) {
      toast.error("Serve the order and collect full payment before completion.");
      return;
    }
    const canonical = canonicalForKitchenOrder(order);
    setActiveAction(`${status}:${order.id}`);
    try {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Order could not be marked ${status}.`);
    } finally {
      setActiveAction(null);
    }
  }

  async function splitActiveBill(order: OperationalOrder, splits: SplitBillPayload[]) {
    if (order.status !== "served") {
      toast.error("Cannot split payment. Serve the order first.");
      return;
    }
    if (order.paymentLock?.locked) {
      toast.error("Cannot split payment. Another operator is modifying this bill.");
      return;
    }
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
          operationKey: clientOperationKey(["split-bill", canonical.id, orderPaidAmount(canonical as ExtendedDemoOrder, order), splits.map((split) => [split.amount, split.method, split.customerName])]),
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

  async function transferActiveTable(order: OperationalOrder, tableNumber: string, waiterName?: string, mode: TransferTarget["mode"] = "table") {
    if (order.paymentLock?.locked || ["authorized", "partial", "paid", "refunded"].includes(String(order.paymentStatus ?? "pending"))) {
      toast.error(mode === "waiter" ? "Cannot assign waiter after payment has started." : "Cannot transfer table after payment has started.");
      return;
    }
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
          action: mode === "waiter" ? "assign_waiter" : "transfer_table",
          operationKey: clientOperationKey([mode === "waiter" ? "assign-waiter" : "transfer-table", canonical.id, tableNumber, waiterName]),
          orderId: canonical.id,
          kitchenOrderId: order.hasKitchenTicket === false ? undefined : order.id,
          tableNumber,
          waiterName,
        }),
      });
      await readPosPayload(response, "Table transfer could not be saved.");
      await refreshPosReadModel({ applyDraft: false });
      setTransferTarget(null);
      toast.success(mode === "waiter" ? `${waiterName} assigned.` : `Moved to ${tableNumber}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : mode === "waiter" ? "Waiter assignment could not be saved." : "Table transfer could not be saved.");
    } finally {
      setActiveAction(null);
    }
  }

  async function mergeActiveTables(order: OperationalOrder, sourceOrders: OperationalOrder[], tableNumber?: string) {
    if ([order, ...sourceOrders].some((item) => item.paymentLock?.locked || ["authorized", "partial", "paid", "refunded"].includes(String(item.paymentStatus ?? "pending")))) {
      toast.error("Cannot merge tables after payment has started on any selected order.");
      return;
    }
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
                    className={cn("h-11 rounded-xl px-5 text-sm font-black capitalize text-slate-600", activeTab === tab && "bg-emerald-50 text-emerald-700")}
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
                    <button className={cn("h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold", availableOnly ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600")} onClick={() => setAvailableOnly((value) => !value)} title="Show only available items">
                      Available
                    </button>
                    <Button variant={compactGrid ? "default" : "outline"} size="icon" className="size-11" aria-label="Toggle compact product grid" title="Switch between compact and comfortable grid" onClick={() => setCompactGrid((value) => !value)}>
                      <Grid2X2 className="size-4" />
                    </Button>
                    <Button variant={filtersOpen ? "default" : "outline"} size="icon" className="size-11" aria-label="More filters" title="Open advanced filters" onClick={() => setFiltersOpen((value) => !value)}>
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
          onRetry={() => void retryDraft()}
        />
        {process.env.NODE_ENV !== "production" && panel === "new" ? (
          <PosDraftDiagnostics diagnostics={draftDiagnostics} />
        ) : null}
        <main className="grid min-h-0 flex-1 gap-4 p-3 md:p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          {panel === "held" ? (
            <HeldOrdersPanel orders={heldOrders} onResume={resumeHeldOrder} onDelete={setHeldDeleteTarget} />
          ) : panel === "active" ? (
            <ActiveOrdersPanel
              orders={orders}
              kitchenOrders={operationalOrders}
              tables={tables}
              staff={staffMembers}
              loading={readModelLoading}
              error={readModelError}
              orderDelayThresholdMinutes={operationalSettings.orderDelayThresholdMinutes}
              onRetry={() => void refreshPosReadModel({ applyDraft: false })}
              onOpenNew={requestNewOrder}
              onOpen={(order) => { acknowledgeKitchenReady(order); setDetailsTarget(order as OperationalOrder); }}
              onAddItems={openKitchenOrder}
              onPrintBill={(order) => void recordActivePrint(order, "bill")}
              onPrintReceipt={(order) => void recordActivePrint(order, "receipt")}
              onPrintKot={(order) => void recordActivePrint(order, "kot")}
              onCollectPayment={(order) => void collectActivePayment(order)}
              onNotifyWaiter={(order) => void notifyActiveOrderWaiter(order)}
              onSplit={(order) => setSplitTarget(order)}
              onTransfer={(order) => setTransferTarget({ order, mode: "table" })}
              onAssignWaiter={(order) => setTransferTarget({ order, mode: "waiter" })}
              onMerge={(order) => setMergeTarget(order)}
              onTimeline={(order) => setTimelineTarget(order)}
              onPaymentHistory={(order) => setPaymentHistoryTarget(order)}
              onReminder={(order) => void remindKitchen(order, "reminder")}
              onRecall={(order) => void remindKitchen(order, "recall")}
              onServe={(order) => {
                acknowledgeKitchenReady(order);
                void updateActiveOrderStatus(order, "served");
              }}
              onComplete={(order) => void updateActiveOrderStatus(order, "completed")}
              onCancel={(order) => setCancelTarget(order as OperationalOrder)}
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
        <footer className={cn("sticky bottom-0 z-20 grid gap-2 border-t border-slate-200 bg-white/95 backdrop-blur", panel === "active" ? "p-2" : "p-4 md:grid-cols-[1fr_auto]")}>
          <div className="grid grid-cols-4 gap-2">
            <StatusPill icon={panel === "active" ? ClipboardList : Grid2X2} label={panel === "active" ? "Orders" : "Menu Items"} value={String(panel === "active" ? activeOrderCount : menu.length)} />
            <StatusPill icon={UsersRound} label="Customers" value={String(loyaltyCustomers.length)} />
            <StatusPill icon={Utensils} label="Kitchen" value={`${tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length} Active`} />
            <StatusPill icon={CircleDollarSign} label={panel === "active" ? "Revenue" : "Orders"} value={panel === "active" ? formatCurrency(orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totals.total, 0)) : String(orders.length)} />
          </div>
          {panel !== "active" ? <div className="flex gap-2">
            <Button variant="outline" onClick={() => printTicket("kot")} disabled={!bill.lines.length}>
              <ChefHat className="size-4" />
              View Kitchen Operations
            </Button>
            <Button variant="outline" onClick={() => setBillPreviewOpen(true)} disabled={!bill.lines.length}>
              <Eye className="size-4" />
              Preview Bill
            </Button>
          </div> : null}
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
            description="Clear Order removes the draft. Cancel keeps the cart, customer details, discounts, and payment draft open for editing."
            confirmLabel="Clear order"
            onCancel={resumeCurrentDraft}
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
        {cancelTarget ? (
          <PosConfirmDialog
            title="Cancel active order?"
            description={`${readableTableOrderId(cancelTarget)} will be removed from active service. Paid or payment-started orders must use the refund workflow.`}
            confirmLabel="Cancel order"
            onCancel={() => setCancelTarget(null)}
            onConfirm={() => {
              const order = cancelTarget;
              setCancelTarget(null);
              void updateActiveOrderStatus(order, "cancelled");
            }}
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
            order={transferTarget.order}
            mode={transferTarget.mode}
            tables={tables}
            staff={activeWaiters}
            busy={activeAction === `transfer:${transferTarget.order.id}`}
            onClose={() => setTransferTarget(null)}
            onSubmit={(tableNumber, waiterName) => void transferActiveTable(transferTarget.order, tableNumber, waiterName, transferTarget.mode)}
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
            onClose={() => {
              if (paymentDraft.stage === "collect") {
                toast.error(canUnlockPayment ? "Payment is locked. Record payment or unlock with an audit reason." : "Payment is locked. Record payment or ask the owner to unlock it.");
                return;
              }
              setPaymentDraft(null);
            }}
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
        <Button size="sm" variant="outline" className="min-h-11 bg-white/80" onClick={onRetry}>
          <Loader2 className={cn("size-4", status === "retrying" && "animate-spin")} />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function PosDraftDiagnostics({ diagnostics }: { diagnostics: PosDraftDiagnosticsState }) {
  const values = [
    ["Draft save target", "Firestore via /api/owner/pos"],
    ["Firestore", diagnostics.status],
    ["Local", diagnostics.local],
    ["Session", diagnostics.session],
    ["IndexedDB", diagnostics.indexedDb],
    ["Offline Queue", diagnostics.offlineQueue],
    ["Last save", diagnostics.lastSave ? new Date(diagnostics.lastSave).toLocaleTimeString() : "Not saved"],
    ["Duration", diagnostics.durationMs === undefined ? "Not measured" : `${diagnostics.durationMs} ms`],
    ["Failure reason", diagnostics.failureReason || "None"],
    ["Retry count", String(diagnostics.retryCount)],
  ];
  return (
    <aside className="border-b border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950" aria-label="POS draft development diagnostics">
      <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2 xl:grid-cols-5">
        {values.map(([label, value]) => (
          <p key={label} className="min-w-0">
            <span className="font-black">{label}:</span>{" "}
            <span className="break-words font-semibold">{value}</span>
          </p>
        ))}
      </div>
    </aside>
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
              "flex min-h-11 min-w-24 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black transition",
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
                <div className="flex h-11 items-center rounded-xl border border-slate-200">
                  <button className="min-h-11 px-3 text-lg font-black" onClick={() => onQuantity(line.itemId, line.quantity - 1)}>-</button>
                  <span className="min-w-8 text-center text-sm font-black">{line.quantity}</span>
                  <button className="min-h-11 px-3 text-lg font-black" onClick={() => onQuantity(line.itemId, line.quantity + 1)}>+</button>
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
  const dialogRef = useRef<HTMLElement>(null);
  usePosDrawerFocus(dialogRef, onCancel);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pos-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
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
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={onClose}><X className="size-4" /></Button>
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
              <input className="h-11 rounded-lg border px-3 text-sm font-semibold" value={row.customerName} onChange={(event) => updateRow(row.key, { customerName: event.target.value })} aria-label={`Split customer ${index + 1}`} />
              <input className="h-11 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" step="1" value={row.amount} onChange={(event) => updateRow(row.key, { amount: Number(event.target.value) })} aria-label={`Split amount ${index + 1}`} />
              <select className="h-11 rounded-lg border px-3 text-sm font-semibold" value={row.method} onChange={(event) => updateRow(row.key, { method: event.target.value as PaymentMethod })} aria-label={`Payment method ${index + 1}`}>
                {(["cash", "upi", "card", "credit"] as PaymentMethod[]).map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}
              </select>
              <select className="h-11 rounded-lg border px-3 text-sm font-semibold" value={row.basis} onChange={(event) => updateRow(row.key, { basis: event.target.value as SplitBillDraft["basis"] })} aria-label={`Split basis ${index + 1}`}>
                <option value="custom">Custom</option>
                <option value="item">Item</option>
                <option value="quantity">Quantity</option>
                <option value="percentage">Percentage</option>
              </select>
              <Button variant="outline" size="sm" className="h-11" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>Remove</Button>
              <select className="h-11 rounded-lg border px-3 text-sm font-semibold md:col-span-2" value={row.itemId} onChange={(event) => updateRow(row.key, { itemId: event.target.value })} aria-label={`Split item ${index + 1}`}>
                <option value="">No item binding</option>
                {order.lines.map((line) => <option key={line.itemId} value={line.itemId}>{line.name}</option>)}
              </select>
              <input className="h-11 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" value={row.quantity} onChange={(event) => updateRow(row.key, { quantity: Number(event.target.value) })} aria-label={`Split quantity ${index + 1}`} />
              <input className="h-11 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" max="100" value={row.percent} onChange={(event) => updateRow(row.key, { percent: Number(event.target.value) })} aria-label={`Split percent ${index + 1}`} />
              <label className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold"><input type="checkbox" checked={row.receipt} onChange={(event) => updateRow(row.key, { receipt: event.target.checked })} />Receipt</label>
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

function TransferTableDialog({ order, mode, tables, staff, busy, onClose, onSubmit }: { order: OperationalOrder; mode: TransferTarget["mode"]; tables: PosTable[]; staff: StaffMember[]; busy?: boolean; onClose: () => void; onSubmit: (tableNumber: string, waiterName?: string) => void }) {
  const [tableNumber, setTableNumber] = useState(order.tableNumber || "");
  const [waiterName, setWaiterName] = useState(order.waiterName || "");
  const tableOptions = tables.map((table) => table.table).filter(Boolean);
  const assigningWaiter = mode === "waiter";
  const invalid = assigningWaiter ? !waiterName.trim() : !tableNumber.trim();
  return (
    <PosDialogFrame title={assigningWaiter ? "Assign Waiter" : "Transfer Table"} subtitle={`${order.tableNumber || "Current order"} · ${formatCurrency(order.total ?? 0)}`} onClose={onClose}>
      <div className="grid gap-4 p-4">
        {assigningWaiter ? null : (
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Target table
            <input list="pos-transfer-tables" className="h-11 rounded-xl border px-3 text-sm font-semibold" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} />
            <datalist id="pos-transfer-tables">{tableOptions.map((table) => <option key={table} value={table} />)}</datalist>
          </label>
        )}
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Waiter
          <select className="h-11 rounded-xl border px-3 text-sm font-semibold" value={waiterName} onChange={(event) => setWaiterName(event.target.value)}>
            <option value="">{assigningWaiter ? "Select an active waiter" : "Keep current waiter"}</option>
            {staff.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
          </select>
        </label>
        {assigningWaiter && !staff.length ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Cannot assign waiter. No active waiter is available.</p> : null}
      </div>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || invalid || (assigningWaiter && !staff.length)} onClick={() => onSubmit(tableNumber.trim(), waiterName || undefined)}>{busy ? <Loader2 className="size-4 animate-spin" /> : assigningWaiter ? <UserRound className="size-4" /> : <ArrowRightLeft className="size-4" />}{assigningWaiter ? "Assign Waiter" : "Transfer"}</Button>
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
  const splits = [...(canonical?.splitBills ?? order.splitBills ?? [])].sort((first, second) => valueMillis(second.at) - valueMillis(first.at));
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

function usePosDrawerFocus(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [])
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
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.setTimeout(() => ref.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, ref]);
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
  const [open, setOpen] = useState(true);
  const delay = getKitchenDelay(order);
  const total = Number(order.total ?? canonical?.totals.total ?? 0);
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const drawerRef = useRef<HTMLElement>(null);
  const canCollect = canCollectOrderPayment(order);
  const canModify = !order.paymentLock?.locked && !["authorized", "partial", "paid", "refunded"].includes(String(order.paymentStatus ?? "pending"));
  usePosDrawerFocus(drawerRef, onClose);
  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/35">
      <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="order-details-title" className="ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="order-details-title" className="text-xl font-black text-slate-950">{readableTableOrderId(order)}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{order.tableNumber || readablePosOrderType(order.orderType ?? "dine-in")} · {paymentLabel(order.paymentStatus)} · {formatCurrency(Number(order.total ?? canonical?.totals.total ?? 0))}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close details" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CompactOrderAccordion
            id={`pos-details-${order.id}`}
            orderNumber={readableTableOrderId(order)}
            etaLabel={delay.delayed ? `${formatDelayTime(delay.lateMinutes).label} late` : `ETA ${order.etaMinutes ?? 12}m`}
            orderTypeLabel={readablePosOrderType(order.orderType ?? "dine-in")}
            tableLabel={order.tableNumber || canonical?.customer.name}
            itemCountLabel={`${itemCount} item${itemCount === 1 ? "" : "s"}`}
            status={{ label: posOrderStatusLabel(order.status, order.paymentStatus), tone: posStatusTone(order.status, order.paymentStatus) }}
            priority={{ label: posPriorityLabel(order, delay), tone: posPriorityTone(order, delay), icon: delay.delayed ? <BellRing className="size-3.5" /> : <Clock3 className="size-3.5" /> }}
            badges={[{ label: paymentLabel(order.paymentStatus), tone: order.paymentStatus === "paid" ? "success" : "default" }]}
            delay={posAccordionDelay(delay)}
            items={order.lines.map((line, index) => ({
              id: `${line.itemId ?? order.id}-${index}`,
              name: line.name,
              quantity: line.quantity,
              note: line.notes,
              meta: formatCurrency(line.price * line.quantity),
            }))}
            facts={[
              { label: "Customer", value: order.customerName || order.guestName || canonical?.customer.name || "Walk-in" },
              { label: "Phone", value: order.customerPhone || canonical?.customer.phone || "No phone" },
              { label: "Payment", value: `${paymentLabel(order.paymentStatus)} · ${formatCurrency(orderBalanceDue(canonical, order))} due`, tone: order.paymentStatus === "paid" ? "success" : "default" },
              { label: "Paid", value: formatCurrency(orderPaidAmount(canonical, order)), tone: order.paymentStatus === "paid" ? "success" : "default" },
              { label: "Waiting", value: delay.elapsedLabel, tone: delay.delayed ? "danger" : "default" },
              { label: "Total", value: formatCurrency(total) },
            ]}
            notes={[canonical?.statusNote, (order as OperationalOrder & { notes?: string }).notes].filter((item): item is string => Boolean(item))}
            timeline={entries.length ? entries.slice(0, 12).map((entry) => ({ label: timelineLabel(entry), time: formatTimelineTime(entryTimeValue(entry)) })) : [{ label: "Created", time: actualOrderTime(order.createdAt) }]}
            primaryAction={{ id: "collect", label: "Collect", icon: <CircleDollarSign className="size-4" />, variant: "primary", disabled: !canCollect, title: canCollect ? "Collect Payment" : paymentUnavailableReason(order), onClick: onCollectPayment }}
            secondaryActions={[
              { id: "add", label: "Add", icon: <PlusCircle className="size-4" />, disabled: !canModify, title: canModify ? "Add Items" : "Cannot add items after payment has started.", onClick: onAddItems },
              { id: "bill", label: "Bill", icon: <ReceiptText className="size-4" />, onClick: onPrintBill },
              { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" />, onClick: onTimeline },
              { id: "history", label: "History", icon: <History className="size-4" />, onClick: onPaymentHistory },
            ]}
            isOpen={open}
            onOpenChange={setOpen}
          />
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
      </aside>
    </div>
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
  const completesPayment = Number(draft.amount) + Number(draft.order.paidAmount ?? 0) + 0.01 >= Number(draft.order.total ?? 0);
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
              <input className="h-11 rounded-lg border border-amber-200 px-3 text-sm font-semibold text-slate-900" value={draft.unlockReason} onChange={(event) => onChange({ ...draft, unlockReason: event.target.value })} placeholder="Required before editing locked bill" />
            </label>
            <Button className="mt-2" variant="outline" disabled={busy || !draft.unlockReason.trim()} onClick={onUnlock}>Unlock with audit</Button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-[1fr_auto_auto]">
        <p className="text-xs font-semibold text-slate-500">{draft.stage === "verify" ? "Confirm order, table, items, total, and method before opening payment." : "Payment lock is active. Kitchen will not reopen."}</p>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={busy} onClick={draft.stage === "verify" ? onContinue : onRecord}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CircleDollarSign className="size-4" />}{draft.stage === "verify" ? "Continue" : completesPayment ? "Mark Paid" : "Record Partial Payment"}</Button>
      </div>
    </PosDialogFrame>
  );
}

function BillCorrectionDrawer({ order, busy, onClose, onSubmit }: { order: ExtendedDemoOrder; busy?: boolean; onClose: () => void; onSubmit: (payload: BillCorrectionPayload) => void }) {
  const drawerRef = useRef<HTMLElement>(null);
  const [lines, setLines] = useState(() => order.lines.map((line) => ({ ...line })));
  const [discount, setDiscount] = useState(order.totals.discount);
  const [tax, setTax] = useState(order.totals.tax);
  const [deliveryFee, setDeliveryFee] = useState(order.totals.deliveryFee);
  const [reason, setReason] = useState("");
  const subtotal = moneyRound(lines.reduce((sum, line) => sum + Number(line.price ?? 0) * Number(line.quantity ?? 0), 0));
  const total = moneyRound(subtotal - Number(discount ?? 0) + Number(tax ?? 0) + Number(deliveryFee ?? 0));
  const diff = moneyRound(total - order.totals.total);
  const disabled = busy || !reason.trim() || !lines.length;
  usePosDrawerFocus(drawerRef, onClose);
  function updateLine(index: number, patch: Partial<(typeof lines)[number]>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }
  return (
    <div className="fixed inset-0 z-[76] bg-slate-950/35">
      <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="bill-correction-title" className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="bill-correction-title" className="text-xl font-black text-slate-950">Correct Bill</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{readableOrderId(order)} · original {formatCurrency(order.totals.total)} · new {formatCurrency(total)}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close correction" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-2">
            {lines.map((line, index) => (
              <div key={`${line.itemId}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_100px_100px]">
                <input className="h-11 rounded-lg border px-3 text-sm font-semibold" value={line.name} onChange={(event) => updateLine(index, { name: event.target.value })} aria-label={`Item ${index + 1}`} />
                <input className="h-11 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} aria-label={`Quantity ${index + 1}`} />
                <input className="h-11 rounded-lg border px-3 text-sm font-semibold" type="number" min="0" value={line.price} onChange={(event) => updateLine(index, { price: Number(event.target.value) })} aria-label={`Price ${index + 1}`} />
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
      <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900" type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
  ].sort((first, second) => timelineMillis(second) - timelineMillis(first)));
}

function paymentEntries(canonical: ExtendedDemoOrder | undefined, order: OperationalOrder) {
  return dedupeTimeline([
    ...safeTimeline(canonical?.paymentTimeline),
    ...safeTimeline(order.paymentTimeline),
  ].sort((first, second) => timelineMillis(second) - timelineMillis(first)));
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
  return dedupeTimeline([...printEvents, ...logEvents].sort((first, second) => timelineMillis(second) - timelineMillis(first)));
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
    const semantic = String(entry.status ?? entry.foodStatus ?? entry.type ?? entry.event ?? "event").toLowerCase();
    const key = `${semantic}|${timelineMillis(entry)}`;
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
  const diff = Math.abs(timelineMillis(current) - timelineMillis(previous));
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
      statusHistory: (canonical as ExtendedDemoOrder | undefined)?.statusHistory ?? order.statusHistory,
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

function newPaymentAttemptId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function canCollectOrderPayment(order: Pick<OperationalOrder, "status" | "paymentStatus" | "paymentLock">) {
  const status = String(order.status);
  const paymentStatus = String(order.paymentStatus ?? "pending");
  return !["completed", "cancelled", "rejected", "billed"].includes(status) && !["paid", "refunded"].includes(paymentStatus) && !order.paymentLock?.locked;
}

function paymentUnavailableReason(order: Pick<OperationalOrder, "status" | "paymentStatus" | "paymentLock">) {
  if (order.paymentLock?.locked) return "Order currently being modified. Refresh and retry.";
  if (order.paymentStatus === "paid") return "Payment has already been collected.";
  if (order.paymentStatus === "refunded") return "Refunded orders cannot be paid again.";
  if (["completed", "cancelled", "rejected", "billed"].includes(String(order.status))) return "Cannot collect payment for this order state.";
  return "Payment could not be recorded. Keep the bill open and retry.";
}

function initialPosPanel(): PosPanel {
  if (typeof window === "undefined") return "new";
  const panel = new URLSearchParams(window.location.search).get("panel") as PosPanel | null;
  return panel && posPanels.has(panel) ? panel : "new";
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
  if (text.includes("payment is pending")) return "Cannot complete order. Full payment is still pending.";
  if (text.includes("currently being modified")) return "Order currently being modified. Refresh and retry.";
  if (text.includes("cannot modify this order after payment has started")) return "Cannot modify this order after payment has started.";
  if (text.includes("state change") || text.includes("transition")) return "That order state changed on another device. Refresh and retry.";
  if (text.includes("already been collected")) return "Payment has already been collected.";
  if (text.includes("completed bills")) return "Only completed bills can be corrected.";
  if (text.includes("correction reason")) return "Correction reason is required.";
  if (text.includes("unlock reason")) return "Unlock reason is required.";
  if (text.includes("only owner")) return "Only owner can unlock payment changes.";
  if (text.includes("split bill")) return "Split bill could not be recorded. Check the split amounts and retry.";
  if (text.includes("balance due")) return "Split amount exceeds the balance due.";
  if (text.includes("target table")) return "Choose a target table before transferring.";
  if (text.includes("active waiter")) return "Choose an active waiter before assigning.";
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

type ActiveOrderView = "all" | "operations" | "waiter" | "cashier" | "manager";
type PosActiveActionId = "serve" | "notify" | "payment" | "print" | "preview" | "receipt" | "kot" | "add" | "split" | "transfer" | "reassign" | "merge" | "reminder" | "recall" | "complete" | "cancel" | "timeline" | "history";
type PosActiveMenuAction = { id: PosActiveActionId; label: string; icon: ReactNode; disabled?: boolean; danger?: boolean; reason?: string };

function ActiveOrdersPanel({
  orders,
  kitchenOrders,
  tables,
  staff,
  loading,
  error,
  orderDelayThresholdMinutes,
  onRetry,
  onOpenNew,
  onOpen,
  onAddItems,
  onPrintBill,
  onPrintReceipt,
  onPrintKot,
  onCollectPayment,
  onNotifyWaiter,
  onSplit,
  onTransfer,
  onAssignWaiter,
  onMerge,
  onTimeline,
  onPaymentHistory,
  onReminder,
  onRecall,
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
  loading: boolean;
  error: string;
  orderDelayThresholdMinutes: number;
  onRetry: () => void;
  onOpenNew: () => void;
  onOpen: (order: TableOrder) => void;
  onAddItems: (order: TableOrder) => void;
  onPrintBill: (order: TableOrder) => void;
  onPrintReceipt: (order: TableOrder) => void;
  onPrintKot: (order: TableOrder) => void;
  onCollectPayment: (order: TableOrder) => void;
  onNotifyWaiter: (order: TableOrder) => void;
  onSplit: (order: OperationalOrder) => void;
  onTransfer: (order: OperationalOrder) => void;
  onAssignWaiter: (order: OperationalOrder) => void;
  onMerge: (order: OperationalOrder) => void;
  onTimeline: (order: OperationalOrder) => void;
  onPaymentHistory: (order: OperationalOrder) => void;
  onReminder: (order: TableOrder) => void;
  onRecall: (order: TableOrder) => void;
  onServe: (order: TableOrder) => void;
  onComplete: (order: TableOrder) => void;
  onCancel: (order: TableOrder) => void;
  activeAction?: string | null;
  waiterView?: boolean;
}) {
  const [view, setView] = useState<ActiveOrderView>(() => waiterView ? "waiter" : "all");
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(() => new Set());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const debouncedSearch = useDebouncedValue(search, 120);
  const handlersRef = useRef({
    onOpen,
    onAddItems,
    onPrintBill,
    onPrintReceipt,
    onPrintKot,
    onCollectPayment,
    onNotifyWaiter,
    onSplit,
    onTransfer,
    onAssignWaiter,
    onMerge,
    onTimeline,
    onPaymentHistory,
    onReminder,
    onRecall,
    onServe,
    onComplete,
    onCancel,
  });
  useEffect(() => {
    handlersRef.current = {
      onOpen,
      onAddItems,
      onPrintBill,
      onPrintReceipt,
      onPrintKot,
      onCollectPayment,
      onNotifyWaiter,
      onSplit,
      onTransfer,
      onAssignWaiter,
      onMerge,
      onTimeline,
      onPaymentHistory,
      onReminder,
      onRecall,
      onServe,
      onComplete,
      onCancel,
    };
  }, [onAddItems, onAssignWaiter, onCancel, onCollectPayment, onComplete, onMerge, onNotifyWaiter, onOpen, onPaymentHistory, onPrintBill, onPrintKot, onPrintReceipt, onRecall, onReminder, onServe, onSplit, onTimeline, onTransfer]);

  const allActiveKitchenOrders = useMemo(() => {
    return kitchenOrders
      .filter((order) => !["completed", "cancelled", "billed"].includes(order.status))
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .slice(0, 30);
  }, [kitchenOrders]);
  const activeKitchenOrders = useMemo(() => {
    const value = debouncedSearch.trim().toLowerCase();
    return value ? allActiveKitchenOrders.filter((order) => activeOrderSearchText(order).includes(value)) : allActiveKitchenOrders;
  }, [allActiveKitchenOrders, debouncedSearch]);
  const delaysById = useMemo(
    () => new Map(allActiveKitchenOrders.map((order) => [order.id, getKitchenDelay(order, now, { orderDelayThresholdMinutes })])),
    [allActiveKitchenOrders, now, orderDelayThresholdMinutes],
  );
  const groups = useMemo(() => {
    const operationsOrders: OperationalOrder[] = [];
    const waiterOrders: OperationalOrder[] = [];
    const cashierOrders: OperationalOrder[] = [];
    const managerOrders: OperationalOrder[] = [];
    let inKitchen = 0;
    let ready = 0;
    let served = 0;
    let pendingBills = 0;
    let critical = 0;
    let requests = 0;
    for (const order of activeKitchenOrders) {
      const delay = delaysById.get(order.id);
      const operations = ["new", "occupied", "accepted", "preparing"].includes(order.status);
      const waiter = Boolean(order.waiterId || order.waiterName || order.source === "Waiter");
      const paymentOpen = canCollectOrderPayment(order);
      const cashier = paymentOpen || order.paymentStatus === "paid";
      const delayed = Boolean(delay && delay.lateMinutes > 2);
      if (operations) operationsOrders.push(order);
      if (waiter) waiterOrders.push(order);
      if (cashier) cashierOrders.push(order);
      if (delayed) managerOrders.push(order);
      if (["accepted", "preparing"].includes(order.status)) inKitchen += 1;
      if (order.status === "ready") ready += 1;
      if (order.status === "served") served += 1;
      if (paymentOpen) pendingBills += 1;
      if (delay && (posDelayLevel(delay) === "critical" || delay.lateMinutes >= 10)) critical += 1;
      if (order.priority === "rush") requests += 1;
    }
    return { operationsOrders, waiterOrders, cashierOrders, managerOrders, inKitchen, ready, served, pendingBills, critical, requests };
  }, [activeKitchenOrders, delaysById]);
  const displayedOrders = view === "operations"
    ? groups.operationsOrders
    : view === "waiter"
      ? groups.waiterOrders
      : view === "cashier"
        ? groups.cashierOrders
        : view === "manager"
          ? groups.managerOrders
          : activeKitchenOrders;
  const completedToday = useMemo(() => orders.filter((order) => ["delivered", "completed"].includes(order.status) && isToday(order.createdAt)).length, [orders]);
  const occupiedTableCount = useMemo(() => tables.filter((table) => ["occupied", "reserved"].includes(String(table.status))).length, [tables]);
  const activeStaffCount = useMemo(() => staff.filter((member) => member.status === "active").length, [staff]);
  const views = [
    ["all", "All", ClipboardList],
    ["operations", "Operations", Grid2X2],
    ["waiter", "Waiter", Utensils],
    ["cashier", "Cashier", ReceiptText],
    ["manager", "Manager", UsersRound],
  ] as const;
  const viewCounts = {
    all: activeKitchenOrders.length,
    operations: groups.operationsOrders.length,
    waiter: groups.waiterOrders.length,
    cashier: groups.cashierOrders.length,
    manager: groups.managerOrders.length,
  };

  const markSeen = useCallback((orderId: string) => {
    setSeenOrderIds((current) => {
      if (current.has(orderId)) return current;
      const next = new Set(current);
      next.add(orderId);
      return next;
    });
  }, []);

  const toggleOrder = useCallback((orderId: string) => {
    markSeen(orderId);
    setExpandedOrderId((current) => current === orderId ? null : orderId);
  }, [markSeen]);

  const runOrderAction = useCallback((action: PosActiveActionId, order: OperationalOrder) => {
    const handlers = handlersRef.current;
    if (action === "serve") {
      markSeen(order.id);
      handlers.onServe(order);
    } else if (action === "notify") {
      markSeen(order.id);
      handlers.onNotifyWaiter(order);
    } else if (action === "payment") handlers.onCollectPayment(order);
    else if (action === "print") {
      if (["ready", "served"].includes(order.status) || order.paymentStatus === "paid") handlers.onPrintBill(order);
      else handlers.onPrintKot(order);
    } else if (action === "preview") {
      markSeen(order.id);
      handlers.onOpen(order);
    } else if (action === "receipt") handlers.onPrintReceipt(order);
    else if (action === "kot") handlers.onPrintKot(order);
    else if (action === "add") handlers.onAddItems(order);
    else if (action === "split") handlers.onSplit(order);
    else if (action === "transfer") handlers.onTransfer(order);
    else if (action === "reassign") handlers.onAssignWaiter(order);
    else if (action === "merge") handlers.onMerge(order);
    else if (action === "reminder") handlers.onReminder(order);
    else if (action === "recall") handlers.onRecall(order);
    else if (action === "complete") handlers.onComplete(order);
    else if (action === "cancel") handlers.onCancel(order);
    else if (action === "timeline") handlers.onTimeline(order);
    else handlers.onPaymentHistory(order);
  }, [markSeen]);

  useEffect(() => {
    if (!waiterView) return;
    const id = window.setTimeout(() => setView("waiter"), 0);
    return () => window.clearTimeout(id);
  }, [waiterView]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="flex h-[calc(100dvh-6rem)] min-h-[32rem] min-w-0 flex-col gap-1 overflow-hidden xl:col-span-2" aria-label="Active Orders operational workspace">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-slate-950">Active Orders</h1>
        </div>
        <Button className="h-11 shrink-0 bg-orange-600 text-white hover:bg-orange-700" onClick={onOpenNew}><PlusCircle className="size-4" />New Order</Button>
      </div>

      <div className="grid shrink-0 gap-2 lg:grid-cols-[auto_minmax(18rem,1fr)]">
        <div className="customer-scroll flex h-11 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {views.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn("flex min-h-11 shrink-0 items-center gap-2 border-r border-slate-100 px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 last:border-r-0 motion-reduce:transition-none", view === key ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}
              aria-label={`${label} ${viewCounts[key]} orders`}
              aria-pressed={view === key}
            >
              <Icon className="size-4" />
              <span>{label}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", view === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{viewCounts[key]}</span>
            </button>
          ))}
        </div>
        <label className="relative block h-11">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-20 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order, table, customer, item, waiter..."
            aria-label="Search active orders"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">{displayedOrders.length}/{activeKitchenOrders.length}</span>
        </label>
      </div>

      <ActiveOrderSummaryBoard
        withWaiter={groups.waiterOrders.length}
        inKitchen={groups.inKitchen}
        ready={groups.ready}
        served={groups.served}
        pendingBills={groups.pendingBills}
        critical={groups.critical}
        requests={groups.requests}
        tableTrend={`${occupiedTableCount} tables`}
        servedTrend={`${completedToday} done`}
        requestTrend={`${activeStaffCount} staff`}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label="Scrollable active order cards">
        {error ? (
          <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800" role="alert">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" className="min-h-11 border-red-300 bg-white text-red-700" onClick={onRetry}>Retry</Button>
          </div>
        ) : null}
        <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6">
          {loading && !displayedOrders.length ? (
            <ActiveOrdersSkeleton />
          ) : displayedOrders.length ? displayedOrders.map((order) => (
            <MemoPosActiveOrderCard
              key={order.id}
              order={order}
              delay={delaysById.get(order.id) ?? getKitchenDelay(order, now, { orderDelayThresholdMinutes })}
              view={view}
              canMerge={allActiveKitchenOrders.length >= 2}
              busy={Boolean(activeAction?.endsWith(`:${order.id}`))}
              expanded={expandedOrderId === order.id}
              unread={!seenOrderIds.has(order.id) && (order.status === "ready" || order.priority === "rush")}
              onToggle={toggleOrder}
              onAction={runOrderAction}
            />
          )) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 lg:col-span-4 2xl:col-span-5 min-[1920px]:col-span-6">
              {view === "waiter" ? "No orders assigned for waiter service." : view === "manager" ? "No delayed orders need manager attention." : "No active orders right now."}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-xs font-black text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600" onClick={() => setSummaryOpen((current) => !current)} aria-expanded={summaryOpen}>
          <span>Status ribbon</span>
          <span className="flex min-w-0 items-center gap-3 overflow-hidden text-[10px] text-slate-500">
            <span className="truncate">Kitchen {groups.inKitchen}</span>
            <span className="truncate">Ready {groups.ready}</span>
            <span className="truncate">Bills {groups.pendingBills}</span>
            <span className="truncate text-red-600">Critical {groups.critical}</span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", summaryOpen && "rotate-180")} />
          </span>
        </button>
        {summaryOpen ? (
          <div className="customer-scroll flex gap-4 overflow-x-auto border-t border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600">
            {activeOrderLegendItems.map(([label, color]) => <span key={label} className="flex shrink-0 items-center gap-2"><span className={cn("size-2 rounded-full", color)} />{label}</span>)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PosActiveOrderCard({
  order,
  delay,
  view,
  canMerge,
  busy,
  expanded,
  unread,
  onToggle,
  onAction,
}: {
  order: OperationalOrder;
  delay: ReturnType<typeof getKitchenDelay>;
  view: ActiveOrderView;
  canMerge: boolean;
  busy: boolean;
  expanded: boolean;
  unread: boolean;
  onToggle: (orderId: string) => void;
  onAction: (action: PosActiveActionId, order: OperationalOrder) => void;
}) {
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const table = order.tableNumber || readablePosOrderType(order.orderType ?? "dine-in");
  const customer = order.customerName || order.guestName || "Walk-in";
  const waiter = order.waiterName || order.assignedStaffName || "Unassigned";
  const total = Number(order.total ?? order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
  const paid = order.paymentStatus === "paid";
  const ready = order.status === "ready";
  const served = order.status === "served";
  const paymentLocked = Boolean(order.paymentLock?.locked);
  const paymentRestricted = paymentLocked || ["authorized", "partial", "paid", "refunded"].includes(String(order.paymentStatus ?? "pending"));
  const active = !["completed", "cancelled", "billed"].includes(order.status);
  const canModify = active && !paymentRestricted;
  const canCollect = canCollectOrderPayment(order);
  const canSplit = active && !paid && order.paymentStatus !== "refunded" && !paymentLocked;
  const canComplete = served && paid;
  const canCancel = active && !paymentRestricted;
  const canContactKitchen = active && !served && order.hasKitchenTicket !== false;
  const canNotify = ready && order.hasKitchenTicket !== false;
  const orderNumber = readableTableOrderId(order);
  const status = posActiveStatusLabel(order);
  const stage = posOrderStatusLabel(order.status, order.paymentStatus);
  const eta = delay.lateMinutes > 2 ? `+${formatDelayTime(delay.lateMinutes).label}` : `${order.etaMinutes ?? 12}m`;
  const waiting = formatOperationalDuration(delay.elapsedMinutes);
  const priority = posPriorityLabel(order, delay);
  const expandedId = `pos-active-${order.id}-details`;
  const timeline = expanded ? timelineEntries(undefined, order).slice(0, 6) : [];
  const history = expanded ? dedupeTimeline([...safeTimeline(order.auditTimeline), ...safeTimeline(order.paymentTimeline)].sort((first, second) => timelineMillis(second) - timelineMillis(first))).slice(0, 6) : [];
  const kitchenNotes = expanded
    ? order.lines.flatMap((line) => [line.notes, line.allergyNote ? `Allergy: ${line.allergyNote}` : undefined]).filter((note): note is string => Boolean(note))
    : [];
  const facts = expanded ? [
    ["Customer", customer],
    ["Phone", order.customerPhone || "Not provided"],
    ["Table", table],
    ["Waiter", waiter],
    ["Items", `${itemCount}`],
    ["Payment", `${paymentLabel(order.paymentStatus)} · ${formatCurrency(total)}`],
  ] : [];
  const menuActions: PosActiveMenuAction[] = view === "waiter"
    ? [
        { id: "kot", label: "Print KOT", icon: <ClipboardList className="size-4" /> },
        { id: "add", label: "Add Items", icon: <PlusCircle className="size-4" />, disabled: !canModify, reason: paymentRestricted ? "Cannot add items after payment has started." : undefined },
        { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" /> },
        { id: "history", label: "History", icon: <History className="size-4" /> },
      ]
    : view === "cashier"
      ? [
          { id: "receipt", label: "Print Receipt", icon: <Printer className="size-4" />, disabled: !paid },
          { id: "history", label: "Payment History", icon: <History className="size-4" /> },
        ]
      : view === "manager"
        ? [
            { id: "add", label: "Add Items", icon: <PlusCircle className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot add items after payment has started." : undefined },
            { id: "transfer", label: "Transfer Table", icon: <ArrowRightLeft className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot transfer after payment has started." : undefined },
            { id: "reassign", label: "Assign Waiter", icon: <UserRound className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot assign waiter after payment has started." : undefined },
            { id: "merge", label: "Merge Tables", icon: <GitMerge className="size-4" />, disabled: !canMerge || !canModify || busy, reason: !canMerge ? "No other active order is available to merge." : paymentRestricted ? "Cannot merge after payment has started." : undefined },
            { id: "split", label: "Split Bill", icon: <Scissors className="size-4" />, disabled: !canSplit || busy, reason: paid ? "Payment has already been collected." : order.paymentStatus === "refunded" ? "Refunded orders cannot be paid again." : undefined },
            { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" /> },
            { id: "history", label: "History", icon: <History className="size-4" /> },
            { id: "cancel", label: "Cancel Order", icon: <XCircle className="size-4" />, disabled: !canCancel || busy, reason: paymentRestricted ? "Paid or payment-started orders require a refund workflow." : undefined, danger: true },
          ]
        : [
            { id: "receipt", label: "Print Receipt", icon: <Printer className="size-4" />, disabled: !paid },
            { id: "kot", label: "Print KOT", icon: <ClipboardList className="size-4" /> },
            { id: "add", label: "Add Items", icon: <PlusCircle className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot add items after payment has started." : undefined },
            { id: "split", label: "Split Bill", icon: <Scissors className="size-4" />, disabled: !canSplit || busy, reason: paid ? "Payment has already been collected." : order.paymentStatus === "refunded" ? "Refunded orders cannot be paid again." : undefined },
            { id: "transfer", label: "Transfer Table", icon: <ArrowRightLeft className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot transfer after payment has started." : undefined },
            { id: "reassign", label: "Assign Waiter", icon: <UserRound className="size-4" />, disabled: !canModify || busy, reason: paymentRestricted ? "Cannot assign waiter after payment has started." : undefined },
            { id: "merge", label: "Merge Tables", icon: <GitMerge className="size-4" />, disabled: !canMerge || !canModify || busy, reason: !canMerge ? "No other active order is available to merge." : paymentRestricted ? "Cannot merge after payment has started." : undefined },
            { id: "reminder", label: "Reminder", icon: <BellRing className="size-4" />, disabled: !canContactKitchen || busy, reason: served ? "Order has already been served." : order.hasKitchenTicket === false ? "Kitchen ticket is unavailable." : undefined },
            { id: "recall", label: "Kitchen Recall", icon: <BellRing className="size-4" />, disabled: !canContactKitchen || busy, reason: served ? "Order has already been served." : order.hasKitchenTicket === false ? "Kitchen ticket is unavailable." : undefined },
            { id: "complete", label: "Complete Order", icon: <CheckCircle2 className="size-4" />, disabled: !served || !paid || busy, reason: !served ? "Cannot complete before service." : !paid ? "Cannot complete while payment is pending." : undefined },
            { id: "timeline", label: "Timeline", icon: <Clock3 className="size-4" /> },
            { id: "history", label: "History", icon: <History className="size-4" /> },
            { id: "cancel", label: "Cancel Order", icon: <XCircle className="size-4" />, disabled: !canCancel || busy, reason: paymentRestricted ? "Paid or payment-started orders require a refund workflow." : undefined, danger: true },
          ];

  const handleToggle = useCallback(() => onToggle(order.id), [onToggle, order.id]);
  const handleAction = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    onAction(event.currentTarget.dataset.action as PosActiveActionId, order);
  }, [onAction, order]);

  return (
    <article
      className={cn(
        "relative min-w-0 rounded-lg border bg-white shadow-sm",
        posActiveAccentBorder(order),
        delay.lateMinutes > 2 && "border-amber-300",
        ready && "border-emerald-300 bg-emerald-50/35",
        expanded && "md:col-span-2",
      )}
      aria-labelledby={`pos-active-${order.id}-title`}
    >
      <div className="relative grid h-11 content-center gap-0.5 px-2 pr-12">
        <div className="flex min-w-0 items-center gap-1.5">
          {unread ? <span className="size-2 shrink-0 rounded-full bg-red-500" title="Unread operational notification"><span className="sr-only">Unread operational notification</span></span> : null}
          <h2 id={`pos-active-${order.id}-title`} className="shrink-0 truncate text-[11px] font-black text-slate-950">{orderNumber}</h2>
          <OperationalOrderStatusBadge status={order.status} label={status} compact className="max-w-24 truncate" />
          <span className="min-w-0 flex-1 truncate text-[9px] font-black text-slate-600" title={`${table} · ${customer}`}>{table} · {customer}</span>
        </div>
        <div className="grid grid-cols-6 gap-1 text-[8px] font-black text-slate-500">
          <span className="truncate" title={`${itemCount} items`}>{itemCount}i</span>
          <span className="truncate" title={`Current stage: ${stage}`}>{stage}</span>
          <span className={cn("truncate", delay.lateMinutes > 2 && "text-red-700")} title={`ETA ${eta}`}>{eta}</span>
          <span className="truncate" title={`Waiting ${waiting}`}>{waiting}</span>
          <span className="truncate text-slate-800" title={`Amount ${formatCurrency(total)}`}>{formatCurrency(total)}</span>
          <span className={cn("truncate", priority === "Critical" || priority === "High" ? "text-red-700" : "text-slate-500")} title={`Priority ${priority}`}>{priority}</span>
        </div>
        <button
          type="button"
          className="absolute right-0 top-0 grid size-11 place-items-center rounded-tr-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={expandedId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${orderNumber}`}
        >
          <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
        </button>
      </div>

      <div className="grid h-11 grid-cols-6 border-t border-slate-100" aria-label={`${orderNumber} actions`}>
        {canComplete ? (
          <button type="button" data-action="complete" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "success")} aria-label="Complete Order" title="Complete Order"><CheckCircle2 className="size-4" /><span className="sr-only">Complete</span></button>
        ) : (
          <button type="button" data-action="serve" disabled={!ready || busy} onClick={handleAction} className={activeOrderActionClass(ready, "success")} aria-label="Serve Order" title={ready ? "Serve Order" : "Cannot Serve: kitchen has not marked Ready."}><Utensils className="size-4" /><span className="sr-only">Serve</span></button>
        )}
        <button type="button" data-action="notify" disabled={!canNotify || busy} onClick={handleAction} className={activeOrderActionClass(canNotify, "default")} aria-label="Notify Waiter" title={canNotify ? "Notify Waiter" : "Cannot Notify: order is not Ready or has no kitchen ticket."}><BellRing className="size-4" /><span className="sr-only">Notify</span></button>
        <button type="button" data-action="payment" disabled={!canCollect || busy} onClick={handleAction} className={activeOrderActionClass(canCollect, "payment")} aria-label="Collect Payment" title={canCollect ? "Collect Payment" : paymentUnavailableReason(order)}><CircleDollarSign className="size-4" /><span className="sr-only">Payment</span></button>
        <button type="button" data-action="print" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "default")} aria-label="Print" title={["ready", "served"].includes(order.status) || paid ? "Print Bill" : "Print KOT"}><Printer className="size-4" /><span className="sr-only">Print</span></button>
        <button type="button" data-action="preview" disabled={busy} onClick={handleAction} className={activeOrderActionClass(true, "default")} aria-label="View / Preview" title="View / Preview"><Eye className="size-4" /><span className="sr-only">Preview</span></button>
        <PosActiveActionMenu order={order} actions={menuActions} disabled={busy} onAction={onAction} />
      </div>

      {expanded ? (
        <div id={expandedId} className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-3 text-xs lg:grid-cols-2">
          <dl className="grid content-start gap-1.5">
            {facts.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2">
                <dt className="font-bold text-slate-500">{label}</dt>
                <dd className="min-w-0 break-words font-black text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <section>
            <h3 className="font-black uppercase text-slate-500">Items</h3>
            <div className="mt-1.5 grid gap-1">
              {order.lines.map((line, lineIndex) => (
                <div key={`${line.itemId ?? line.name}-${lineIndex}`} className="flex items-start justify-between gap-2 rounded-md bg-white px-2 py-1.5">
                  <span className="min-w-0 font-black text-slate-800">{line.quantity}× {line.name}</span>
                  <span className="shrink-0 font-bold text-slate-600">{formatCurrency(line.price * line.quantity)}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-black uppercase text-slate-500">Kitchen Notes</h3>
            <div className="mt-1.5 rounded-md bg-white p-2 font-semibold text-slate-700">
              {kitchenNotes.length ? kitchenNotes.map((note) => <p key={note}>{note}</p>) : "No kitchen notes"}
            </div>
          </section>
          <section>
            <h3 className="font-black uppercase text-slate-500">Timeline</h3>
            <div className="mt-1.5 grid gap-1">
              {timeline.length ? timeline.map((entry, timelineIndex) => (
                <p key={`${timelineLabel(entry)}-${timelineIndex}`} className="flex justify-between gap-2 rounded-md bg-white px-2 py-1.5 font-semibold text-slate-700">
                  <span>{timelineLabel(entry)}</span>
                  <span className="shrink-0 text-slate-500">{formatTimelineTime(entryTimeValue(entry))}</span>
                </p>
              )) : <p className="rounded-md bg-white p-2 font-semibold text-slate-500">Created {actualOrderTime(order.createdAt)}</p>}
            </div>
          </section>
          <section className="lg:col-span-2">
            <h3 className="font-black uppercase text-slate-500">History</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {history.length ? history.map((entry, historyIndex) => (
                <span key={`${timelineLabel(entry)}-${historyIndex}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600">{timelineLabel(entry)} · {formatTimelineTime(entryTimeValue(entry))}</span>
              )) : <span className="font-semibold text-slate-500">No additional history</span>}
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

const MemoPosActiveOrderCard = memo(PosActiveOrderCard);

function ActiveOrdersSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <div key={index} className="h-[5.5rem] animate-pulse rounded-lg border border-slate-200 bg-white p-2" aria-hidden="true">
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
      <div className="mt-3 grid grid-cols-6 gap-1">
        {Array.from({ length: 6 }, (__, actionIndex) => <span key={actionIndex} className="h-8 rounded bg-slate-100" />)}
      </div>
    </div>
  ));
}

function PosActiveActionMenu({
  order,
  actions,
  disabled,
  onAction,
}: {
  order: OperationalOrder;
  actions: PosActiveMenuAction[];
  disabled: boolean;
  onAction: (action: PosActiveActionId, order: OperationalOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const runAction = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    setOpen(false);
    onAction(event.currentTarget.dataset.action as PosActiveActionId, order);
  }, [onAction, order]);
  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ?? []);
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const index = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (current + 1 + items.length) % items.length
          : (current - 1 + items.length) % items.length;
    items[index]?.focus();
  }, []);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" disabled={disabled} className={activeOrderActionClass(true, "default")} aria-label="More Actions" title="More Actions">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">More</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content ref={menuRef} align="end" sideOffset={6} collisionPadding={10} className="z-[80] max-h-[min(70vh,28rem)] w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl" role="menu" aria-label="More order actions" onKeyDown={handleMenuKeyDown}>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              data-action={action.id}
              disabled={action.disabled}
              title={action.disabled ? action.reason ?? `${action.label} is unavailable for the current order state.` : action.label}
              aria-label={action.disabled && action.reason ? `${action.label}. ${action.reason}` : action.label}
              onClick={runAction}
              className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-black focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40", action.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50")}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function activeOrderActionClass(enabled: boolean, tone: "default" | "success" | "payment") {
  return cn(
    "grid min-h-11 place-items-center border-r border-slate-100 text-slate-600 transition-colors last:border-r-0 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 motion-reduce:transition-none",
    enabled && tone === "success" && "text-emerald-700 hover:bg-emerald-50",
    enabled && tone === "payment" && "text-violet-700 hover:bg-violet-50",
  );
}

function posActiveAccentBorder(order: TableOrder) {
  if (order.paymentStatus === "paid") return "border-l-4 border-l-emerald-500";
  if (order.status === "new" || order.status === "occupied") return "border-l-4 border-l-blue-500";
  if (order.status === "accepted") return "border-l-4 border-l-blue-500";
  if (order.status === "preparing") return "border-l-4 border-l-orange-500";
  if (order.status === "ready") return "border-l-4 border-l-emerald-500";
  if (order.status === "served") return "border-l-4 border-l-violet-500";
  return "border-l-4 border-l-slate-300";
}

function orderStatusTone(status?: string, payment?: string) {
  if (payment === "paid") return { chip: "bg-emerald-900 text-white", bar: "bg-emerald-900", dot: "bg-emerald-900" };
  if (status === "new") return { chip: "bg-blue-50 text-blue-700", bar: "bg-blue-500", dot: "bg-blue-500" };
  if (status === "accepted") return { chip: "bg-blue-50 text-blue-700", bar: "bg-blue-500", dot: "bg-blue-500" };
  if (status === "preparing") return { chip: "bg-orange-50 text-orange-700", bar: "bg-orange-500", dot: "bg-orange-500" };
  if (status === "ready") return { chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500" };
  if (status === "served") return { chip: "bg-violet-50 text-violet-700", bar: "bg-violet-500", dot: "bg-violet-500" };
  if (status === "billing" || status === "billed") return { chip: "bg-purple-50 text-purple-700", bar: "bg-purple-500", dot: "bg-purple-500" };
  if (status === "cancelled" || status === "rejected") return { chip: "bg-red-50 text-red-700", bar: "bg-red-500", dot: "bg-red-500" };
  return { chip: "bg-slate-100 text-slate-700", bar: "bg-slate-400", dot: "bg-slate-400" };
}

function posOrderStatusLabel(status: TableOrder["status"], payment?: TableOrder["paymentStatus"]) {
  if (payment === "paid" && !["cancelled", "completed", "billed"].includes(status)) return "Paid";
  return status.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function posActiveStatusLabel(order: TableOrder) {
  if (order.paymentStatus === "paid") return "Paid";
  if (order.status === "new" || order.status === "occupied") return order.waiterId || order.waiterName || order.source === "Waiter" ? "With Waiter" : "Order Taken";
  if (order.status === "accepted") return "Accepted";
  if (order.status === "preparing") return "Preparing";
  if (order.status === "ready") return "Ready To Serve";
  if (order.status === "served") return "Served";
  return posOrderStatusLabel(order.status, order.paymentStatus);
}

function posStatusTone(status: TableOrder["status"], payment?: TableOrder["paymentStatus"]): OrderBadgeTone {
  if (payment === "paid") return "success";
  if (status === "ready") return "success";
  if (status === "served") return "violet";
  if (status === "new" || status === "occupied") return "warning";
  if (status === "cancelled") return "danger";
  if (status === "completed" || status === "billed") return "muted";
  if (status === "preparing") return "warning";
  return "info";
}

function posPriorityLabel(order: TableOrder, delay: ReturnType<typeof getKitchenDelay>) {
  if (delay.priority === "critical") return "Critical";
  if (delay.priority === "high" || order.priority === "rush") return "High";
  if (delay.priority === "medium") return "Delayed";
  return "Normal";
}

function posPriorityTone(order: TableOrder, delay: ReturnType<typeof getKitchenDelay>): OrderBadgeTone {
  if (delay.priority === "critical" || delay.priority === "high" || order.priority === "rush") return "danger";
  if (delay.delayed) return "warning";
  return "muted";
}

function posAccordionDelay(delay: ReturnType<typeof getKitchenDelay>): OrderAccordionDelay {
  return {
    delayed: delay.lateMinutes > 2,
    level: posDelayLevel(delay),
    label: delay.priority === "critical" ? "Critical delay" : "Delayed",
    lateMinutes: delay.lateMinutes,
    waitingLabel: delay.elapsedLabel,
  };
}

function posDelayLevel(delay: ReturnType<typeof getKitchenDelay>): OrderDelayLevel {
  if (delay.lateMinutes <= 2) return "none";
  if (delay.priority === "critical" && delay.lateMinutes >= 10) return "critical";
  if (delay.lateMinutes >= 10) return "red";
  if (delay.lateMinutes >= 5) return "orange";
  return "yellow";
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

const activeOrderLegendItems = [
  ["With Waiter", "bg-blue-500"],
  ["In Kitchen", "bg-orange-500"],
  ["Ready", "bg-emerald-500"],
  ["Served", "bg-violet-500"],
  ["Pending", "bg-amber-500"],
  ["Delayed", "bg-red-500"],
] as const;

function ActiveOrderSummaryBoard({
  withWaiter,
  inKitchen,
  ready,
  served,
  pendingBills,
  critical,
  requests,
  tableTrend,
  servedTrend,
  requestTrend,
}: {
  withWaiter: number;
  inKitchen: number;
  ready: number;
  served: number;
  pendingBills: number;
  critical: number;
  requests: number;
  tableTrend: string;
  servedTrend: string;
  requestTrend: string;
}) {
  const cards: Array<{ label: string; value: number; trend: string; icon: LucideIcon; tone: "blue" | "orange" | "green" | "violet" | "amber" | "red" | "slate" }> = [
    { label: "With Waiter", value: withWaiter, trend: tableTrend, icon: UserRound, tone: "blue" },
    { label: "In Kitchen", value: inKitchen, trend: "Live queue", icon: ChefHat, tone: "orange" },
    { label: "Ready To Serve", value: ready, trend: "Serve next", icon: Utensils, tone: "green" },
    { label: "Served", value: served, trend: servedTrend, icon: CheckCircle2, tone: "violet" },
    { label: "Pending Bills", value: pendingBills, trend: "Cashier action", icon: ReceiptText, tone: "amber" },
    { label: "Critical Delay", value: critical, trend: critical ? "Act now" : "On target", icon: BellRing, tone: "red" },
    { label: "Requests", value: requests, trend: requestTrend, icon: MessageCircle, tone: "slate" },
  ];
  return (
    <section className="customer-scroll grid h-14 shrink-0 grid-flow-col auto-cols-[minmax(8rem,1fr)] gap-1 overflow-x-auto" aria-label="Active order summary">
      {cards.map((card) => {
        const tone = activeOrderSummaryTone(card.tone);
        const Icon = card.icon;
        return (
          <article key={card.label} className={cn("grid h-14 min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-1.5 rounded-lg border bg-white px-2 shadow-sm", tone.border)}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", tone.bg, tone.text)}><Icon className="size-3.5" /></span>
            <div className="min-w-0">
              <p className="text-lg font-black leading-none text-slate-950">{card.value}</p>
              <p className="mt-0.5 truncate text-[9px] font-black uppercase text-slate-500">{card.label}</p>
              <p className={cn("truncate text-[8px] font-black", tone.text)}>{card.trend}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function activeOrderSummaryTone(tone: "blue" | "orange" | "green" | "violet" | "amber" | "red" | "slate") {
  if (tone === "blue") return { border: "border-blue-100", bg: "bg-blue-50", text: "text-blue-700" };
  if (tone === "orange") return { border: "border-orange-100", bg: "bg-orange-50", text: "text-orange-700" };
  if (tone === "green") return { border: "border-emerald-100", bg: "bg-emerald-50", text: "text-emerald-700" };
  if (tone === "violet") return { border: "border-violet-100", bg: "bg-violet-50", text: "text-violet-700" };
  if (tone === "amber") return { border: "border-amber-100", bg: "bg-amber-50", text: "text-amber-700" };
  if (tone === "red") return { border: "border-red-100", bg: "bg-red-50", text: "text-red-700" };
  return { border: "border-slate-200", bg: "bg-slate-100", text: "text-slate-700" };
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
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" value={range} onChange={(event) => { setRange(event.target.value as typeof range); setPage(1); }} aria-label="Date range">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="custom">Custom</option>
        </select>
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} aria-label="Order status">
          <option value="all">All status</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
        <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:bg-slate-50" type="date" value={customFrom} onChange={(event) => { setCustomFrom(event.target.value); setPage(1); }} disabled={range !== "custom"} aria-label="Custom from date" />
        <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:bg-slate-50" type="date" value={customTo} onChange={(event) => { setCustomTo(event.target.value); setPage(1); }} disabled={range !== "custom"} aria-label="Custom to date" />
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
