"use client";

import { ChefHat, Download, Grid2X2, PackageCheck, Printer, ReceiptText, Search, SlidersHorizontal, UserRound, Utensils, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { PosSidebar, type PosPanel } from "@/components/pos/pos-sidebar";
import { PosHeader } from "@/components/pos/pos-header";
import { CategoryList, type PosCategory } from "@/components/pos/category-list";
import { ProductGrid } from "@/components/pos/product-grid";
import type { PosProduct } from "@/components/pos/product-card";
import { CartPanel } from "@/components/pos/cart-panel";
import { RestaurantBill, KotTicket } from "@/components/printing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { subscribeOfflineQueue, type OfflineQueueEntry } from "@/lib/offline";
import { buildBillContext, buildKotContext, calculateBillTotals, defaultBillTemplate, defaultKotTemplate } from "@/lib/print-engine";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import type { DemoOrder, InventoryItem, LoyaltyCustomer, MenuItem, PosBill, TableOrder, TaxSettings } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { actualOrderTime, readableOrderId, readableTableOrderId } from "@/lib/order-display";
import { normalizePhone, safeFindCustomerByPhone } from "@/services/restaurant-ops-service";

const posTabs = ["menu", "custom", "combos"] as const;
const heldOrdersKey = "sarva-pos-held-orders:v1";

type HeldPosOrder = {
  id: string;
  label: string;
  createdAt: string;
  bill: PosBill;
};

export function PosBillingFlow() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof posTabs)[number]>("menu");
  const [activeCategory, setActiveCategory] = useState("");
  const [panel, setPanel] = useState<PosPanel>("new");
  const [foodFilter, setFoodFilter] = useState<"all" | "veg" | "nonveg">("all");
  const [sortMode, setSortMode] = useState<"popular" | "name" | "price-low" | "price-high">("popular");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compactGrid, setCompactGrid] = useState(false);
  const [showKot, setShowKot] = useState(false);
  const [ticketCreatedAt, setTicketCreatedAt] = useState<Date | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEntry[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);
  const menuItems = useAppStore((state) => state.menuItems);
  const menuCategories = useAppStore((state) => state.menuCategories);
  const inventoryItems = useAppStore((state) => state.inventoryItems);
  const orders = useAppStore((state) => state.orders);
  const authUser = useAppStore((state) => state.authUser);
  const branch = useAppStore((state) => state.branches[0]);
  const taxSettings = useAppStore((state) => state.taxSettings);
  const printerSettings = useAppStore((state) => state.printerSettings);
  const tables = useAppStore((state) => state.posTables);
  const bill = useAppStore((state) => state.posBill);
  const loyaltyCustomers = useAppStore((state) => state.loyaltyCustomers);
  const tableOrders = useAppStore((state) => state.tableOrders);
  const addPosItem = useAppStore((state) => state.addPosItem);
  const addPosProduct = useAppStore((state) => state.addPosProduct);
  const updatePosQuantity = useAppStore((state) => state.updatePosQuantity);
  const removePosItem = useAppStore((state) => state.removePosItem);
  const setPosBill = useAppStore((state) => state.setPosBill);
  const setPosTable = useAppStore((state) => state.setPosTable);
  const setPosOrderType = useAppStore((state) => state.setPosOrderType);
  const setPosCustomer = useAppStore((state) => state.setPosCustomer);
  const setPosPayment = useAppStore((state) => state.setPosPayment);
  const createTableOrder = useAppStore((state) => state.createTableOrder);
  const updateTableOrder = useAppStore((state) => state.updateTableOrder);
  const linkPosKitchenOrder = useAppStore((state) => state.linkPosKitchenOrder);
  const payPosBill = useAppStore((state) => state.payPosBill);
  const resetPosBill = useAppStore((state) => state.resetPosBill);
  const restaurantId = authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const applyGst = bill.applyGst ?? true;
  const waiveParcelCharge = Boolean(bill.waiveParcelCharge);

  useEffect(() => subscribeOfflineQueue(setOfflineQueue), []);
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
    () => new Map(menuCategories.map((item) => [item.id, item.name] as const)),
    [menuCategories],
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
    return [
      ...menuCategories
        .filter((item) => item.restaurantSlug === restaurantId && item.enabled)
        .map((item) => ({ id: item.id, name: item.name, count: counts.get(item.name) ?? 0 })),
      ...Array.from(counts.entries())
        .filter(([name]) => !menuCategories.some((item) => item.name === name))
        .map(([name, count]) => ({ id: name, name, count })),
    ].filter((item) => item.count > 0);
  }, [menu, menuCategories, restaurantId, resolveCategoryName]);
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

  if (!branch) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="No branch configured"
          description="POS, kitchen tickets, billing, receipt, and inventory deductions are branch-scoped."
          actionLabel="Open profile setup"
          actionHref="/owner/profile?tab=onboarding"
        />
      </div>
    );
  }

  const billContext = buildBillContext({
    bill,
    branch,
    taxSettings: effectiveTaxSettings,
    createdAt: ticketCreatedAt ?? new Date(),
  });
  const kotContext = buildKotContext(billContext);
  const totals = calculateBillTotals(billContext);
  const activeKitchenOrder = bill.linkedKitchenOrderId ? tableOrders.find((order) => order.id === bill.linkedKitchenOrderId) : undefined;
  const pendingSync = offlineQueue.filter((item) => item.status !== "synced").length;
  const activeKotCount = tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length;
  const activeOrderCount = orders.filter((order) => !["delivered", "completed", "cancelled", "rejected"].includes(order.status)).length + activeKotCount;
  const pastOrderCount = orders.filter((order) => ["delivered", "completed", "cancelled", "rejected"].includes(order.status)).length + tableOrders.filter((order) => ["completed", "billed"].includes(order.status)).length;

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
    const remoteCustomer = await safeFindCustomerByPhone(normalized).catch(() => null);
    if (remoteCustomer) {
      setPosCustomer({ id: remoteCustomer.id, name: remoteCustomer.name, phone: remoteCustomer.phone });
      toast.success(`${remoteCustomer.name} selected.`);
    }
  }

  async function sendKot() {
    if (!bill.lines.length) {
      toast.error("Add at least one item before sending to kitchen.");
      return;
    }
    if (bill.orderType === "dine-in" && (!bill.table || bill.table === "DIRECT")) {
      toast.error("Select a table before sending this dine-in order to kitchen.");
      return;
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
      lines: bill.lines,
      priority: "normal" as const,
      waiterName: authUser.name,
      branchId: branch.id,
      etaMinutes: bill.orderType === "delivery" ? 30 : 12,
      total: totals.total,
    };
    if (bill.linkedKitchenOrderId) {
      await updateTableOrder(bill.linkedKitchenOrderId, kitchenPayload);
      setShowKot(true);
      toast.success("Kitchen ticket updated with the latest items.");
      return;
    }
    const order = await createTableOrder({
      ...kitchenPayload,
    });
    linkPosKitchenOrder(order.id);
    setPosBill({ ...bill, linkedKitchenOrderId: order.id, applyGst, waiveParcelCharge });
    setShowKot(true);
    toast.success(`Kitchen ticket sent for ${order.tableNumber}.`);
  }

  async function checkout() {
    if (bill.orderType === "dine-in" && (!bill.table || bill.table === "DIRECT")) {
      toast.error("Select a table before checkout.");
      return;
    }
    if (!bill.lines.length) {
      toast.error("Add at least one item before checkout.");
      return;
    }
    await payPosBill();
    toast.success("Payment captured and bill is ready.");
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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-950">
      <PosSidebar
        activePanel={panel}
        activeOrders={activeOrderCount}
        kotTickets={activeKotCount}
        heldOrders={heldOrders.length}
        pastOrders={pastOrderCount}
        onNewOrder={() => setPanel("new")}
        onActiveOrders={() => setPanel("active")}
        onHeldOrders={() => setPanel("held")}
        onPastOrders={() => setPanel("past")}
        onCustomers={() => setPanel("customers")}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <PosHeader query={query} onQuery={setQuery} pendingSync={pendingSync} notificationCount={activeOrderCount} profileName={authUser.name || "Test Owner"} />
        <main className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          {panel === "held" ? (
            <HeldOrdersPanel orders={heldOrders} onResume={resumeHeldOrder} onDelete={(id) => setHeldOrders((current) => current.filter((item) => item.id !== id))} />
          ) : panel === "active" ? (
            <ActiveOrdersPanel
              orders={orders}
              tableOrders={tableOrders}
              onOpenNew={() => setPanel("new")}
              onEditKitchenOrder={(order) => {
                setPosBill({
                  ...bill,
                  table: order.orderType === "dine-in" ? order.tableNumber : "DIRECT",
                  orderType: order.orderType ?? "dine-in",
                  lines: order.lines,
                  payment: bill.payment ?? "cash",
                  paid: false,
                  customerName: order.customerName ?? order.guestName ?? "",
                  customerPhone: order.customerPhone ?? "",
                  linkedKitchenOrderId: order.id,
                  waiterName: order.waiterName ?? authUser.name,
                  applyGst,
                  waiveParcelCharge,
                });
                setPanel("new");
                toast.success("Active order loaded. You can edit items before billing.");
              }}
            />
          ) : panel === "past" ? (
            <PastOrdersPanel orders={orders} tableOrders={tableOrders} />
          ) : panel === "customers" ? (
            <CustomersPanel customers={loyaltyCustomers} onSelect={(customer) => {
              setPosCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
              setPanel("new");
              toast.success(`${customer.name} selected.`);
            }} />
          ) : (
          <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
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
                <div className="customer-scroll flex items-center gap-3 overflow-x-auto border-b border-slate-100 p-4">
                  <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" value={foodFilter} onChange={(event) => setFoodFilter(event.target.value as typeof foodFilter)}>
                    <option value="all">Veg & Non-Veg</option>
                    <option value="veg">Veg only</option>
                    <option value="nonveg">Non-veg only</option>
                  </select>
                  <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
                    <option value="popular">Sort: Popular</option>
                    <option value="name">Sort: Name</option>
                    <option value="price-low">Price: Low to high</option>
                    <option value="price-high">Price: High to low</option>
                  </select>
                  <button className={cn("h-10 shrink-0 rounded-xl border px-4 text-sm font-semibold", availableOnly ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600")} onClick={() => setAvailableOnly((value) => !value)}>
                    Available
                  </button>
                  <Button variant={compactGrid ? "default" : "outline"} size="icon" aria-label="Toggle compact product grid" onClick={() => setCompactGrid((value) => !value)}>
                    <Grid2X2 className="size-4" />
                  </Button>
                  <Button variant={filtersOpen ? "default" : "outline"} size="icon" aria-label="More filters" onClick={() => setFiltersOpen((value) => !value)}>
                    <SlidersHorizontal className="size-4" />
                  </Button>
                </div>
                {filtersOpen ? (
                  <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-3">
                    <button className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-700" onClick={() => { setFoodFilter("all"); setSortMode("popular"); setAvailableOnly(true); setActiveCategory(""); }}>
                      Reset filters
                    </button>
                    <div className="rounded-xl border bg-white px-4 py-3 font-semibold text-slate-600">{displayedItems.length} items visible</div>
                    <div className="rounded-xl border bg-white px-4 py-3 font-semibold text-slate-600">Stock items appear in Custom Items</div>
                  </div>
                ) : null}
                <ProductGrid items={displayedItems} quantities={quantities} onAdd={handleAdd} onQuantity={handleQuantity} compact={compactGrid} />
              </div>
            </div>
          </section>
          )}

          {panel === "new" ? <CartPanel
            bill={bill}
            totals={totals}
            tables={tables}
            lookupItems={customerLookupItems}
            onOrderType={(value) => setPosOrderType(value)}
            onTable={setPosTable}
            onCustomer={setPosCustomer}
            onLookup={() => void searchCustomerByPhone()}
            onQuantity={updatePosQuantity}
            onRemove={removePosItem}
            onSendKot={() => void sendKot()}
            onCheckout={() => void checkout()}
            onClear={resetPosBill}
            onHold={holdOrder}
            onSave={saveOrder}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusPill icon={Utensils} label="Kitchen Queue" value={`${tableOrders.filter((order) => !["completed", "billed"].includes(order.status)).length} Active`} />
            <StatusPill icon={PackageCheck} label="Held Orders" value={String(heldOrders.length)} />
            <StatusPill icon={ReceiptText} label="Last Sync" value={pendingSync ? `${pendingSync} pending` : "2 min ago"} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => printTicket("kot")} disabled={!bill.lines.length}>
              <ChefHat className="size-4" />
              View Kitchen Queue
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
  tableOrders,
  onOpenNew,
  onEditKitchenOrder,
}: {
  orders: DemoOrder[];
  tableOrders: TableOrder[];
  onOpenNew: () => void;
  onEditKitchenOrder: (order: TableOrder) => void;
}) {
  const activeCustomerOrders = orders.filter((order) => !["delivered", "completed", "cancelled", "rejected"].includes(order.status));
  const activeKitchenOrders = tableOrders.filter((order) => !["completed", "billed"].includes(order.status));

  return (
    <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Active Orders</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Live website, POS, parcel, delivery, and kitchen tickets.</p>
        </div>
        <Button onClick={onOpenNew}>New Order</Button>
      </div>
      <div className="mt-5 grid gap-3">
        {[...activeKitchenOrders, ...activeCustomerOrders].length ? (
          <>
            {activeKitchenOrders.map((order, index) => (
              <OrderPanelRow
                key={order.id}
                id={readableTableOrderId(order, index + 1)}
                customer={order.customerName ?? order.guestName ?? order.tableNumber}
                amount={order.total ?? order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)}
                time={actualOrderTime(order.createdAt)}
                status={order.status}
                source={order.source}
                actionLabel="Edit bill"
                onAction={() => onEditKitchenOrder(order)}
              />
            ))}
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

function PastOrdersPanel({ orders, tableOrders }: { orders: DemoOrder[]; tableOrders: TableOrder[] }) {
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
    ...tableOrders
      .filter((order) => ["completed", "billed"].includes(order.status) && Date.parse(order.createdAt) >= since)
      .map((order, index) => ({
        id: readableTableOrderId(order, index + 1),
        rawId: order.id,
        customer: order.customerName ?? order.guestName ?? order.tableNumber,
        amount: order.total ?? order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
        payment: "POS",
        time: actualOrderTime(order.createdAt),
        waiter: order.waiterName ?? "-",
        source: order.source,
        gst: 0,
        discount: 0,
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
