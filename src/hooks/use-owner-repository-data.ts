"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AuditLogEntry,
  InventoryItem,
  InventoryMovement,
  MenuItem,
  Offer,
  PurchaseOrder,
  Recipe,
  StaffMember,
  Supplier,
} from "@/lib/types";
import { fetchWithTimeout } from "@/lib/client-fetch";

type LoadState = "idle" | "loading" | "success" | "error" | "refreshing";

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetchWithTimeout(url, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    ...init,
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

export function useOwnerMenu(restaurantId?: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const url = `/api/owner/menu${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ""}`;

  const load = useCallback(async (refreshing = false) => {
    setStatus(refreshing ? "refreshing" : "loading");
    setError("");
    try {
      const payload = await requestJson<{ data?: MenuItem[] }>(url);
      setItems(payload.data ?? []);
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Menu could not be loaded.");
      setStatus("error");
    }
  }, [url]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = useCallback(async (item: MenuItem | Omit<MenuItem, "id">) => {
    const existing = "id" in item ? item.id : "";
    const temporaryId = existing || `menu-pending-${crypto.randomUUID()}`;
    const optimistic = { ...item, id: temporaryId } as MenuItem;
    let previous: MenuItem[] = [];
    setItems((current) => {
      previous = current;
      return current.some((entry) => entry.id === temporaryId)
        ? current.map((entry) => entry.id === temporaryId ? optimistic : entry)
        : [optimistic, ...current];
    });
    try {
      const payload = await requestJson<{ data: MenuItem }>("/api/owner/menu", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({ item, restaurantId }),
      });
      setItems((current) => [payload.data, ...current.filter((entry) => entry.id !== temporaryId && entry.id !== payload.data.id)]);
      return payload.data;
    } catch (cause) {
      setItems(previous);
      throw cause;
    }
  }, [restaurantId]);

  const remove = useCallback(async (id: string) => {
    let previous: MenuItem[] = [];
    setItems((current) => {
      previous = current;
      return current.filter((entry) => entry.id !== id);
    });
    try {
      await requestJson(`/api/owner/menu?id=${encodeURIComponent(id)}${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ""}`, { method: "DELETE" });
    } catch (cause) {
      setItems(previous);
      throw cause;
    }
  }, [restaurantId]);

  const toggleSoldOut = useCallback(async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    await save({ ...item, soldOut: !item.soldOut });
  }, [items, save]);

  return { items, status, error, retry: () => load(true), create: save, update: save, remove, toggleSoldOut };
}

export function useOwnerOffers(restaurantId?: string) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const url = `/api/owner/offers${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ""}`;

  const load = useCallback(async (refreshing = false) => {
    setStatus(refreshing ? "refreshing" : "loading");
    setError("");
    try {
      const payload = await requestJson<{ data?: Offer[] }>(url);
      setOffers(payload.data ?? []);
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Offers could not be loaded.");
      setStatus("error");
    }
  }, [url]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = useCallback(async (offer: Offer) => {
    let previous: Offer[] = [];
    setOffers((current) => {
      previous = current;
      return current.some((entry) => entry.code === offer.code)
        ? current.map((entry) => entry.code === offer.code ? offer : entry)
        : [offer, ...current];
    });
    try {
      const payload = await requestJson<{ data?: Offer }>("/api/owner/offers", {
        method: "POST",
        body: JSON.stringify({ offer, restaurantId }),
      });
      if (payload.data) setOffers((current) => current.map((entry) => entry.code === offer.code ? payload.data as Offer : entry));
      return payload.data ?? offer;
    } catch (cause) {
      setOffers(previous);
      throw cause;
    }
  }, [restaurantId]);

  const remove = useCallback(async (code: string) => {
    let previous: Offer[] = [];
    setOffers((current) => {
      previous = current;
      return current.filter((entry) => entry.code !== code);
    });
    try {
      await requestJson(`/api/owner/offers?code=${encodeURIComponent(code)}${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ""}`, { method: "DELETE" });
    } catch (cause) {
      setOffers(previous);
      throw cause;
    }
  }, [restaurantId]);

  return { offers, status, error, retry: () => load(true), create: save, update: save, remove };
}

type InventoryData = {
  items: InventoryItem[];
  recipes: Recipe[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  movements: InventoryMovement[];
  auditLogs: AuditLogEntry[];
  menuItems: MenuItem[];
  branches: BranchOption[];
};

type BranchOption = { id: string; name: string };

const emptyInventory: InventoryData = { items: [], recipes: [], suppliers: [], purchaseOrders: [], movements: [], auditLogs: [], menuItems: [], branches: [] };

export function useOwnerInventory(restaurantId?: string) {
  const [data, setData] = useState<InventoryData>(emptyInventory);
  const [status, setStatus] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const url = `/api/owner/inventory${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ""}`;

  const load = useCallback(async (refreshing = false) => {
    setStatus(refreshing ? "refreshing" : "loading");
    setError("");
    try {
      const payload = await requestJson<{ data?: Partial<InventoryData> }>(url);
      setData({
        ...emptyInventory,
        ...payload.data,
        items: (payload.data?.items ?? []).map(normalizeInventoryItem),
      });
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inventory could not be loaded.");
      setStatus("error");
    }
  }, [url]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const saveResource = useCallback(async <T extends { id: string }>(resource: "item" | "recipe" | "supplier" | "purchase", key: keyof Pick<InventoryData, "items" | "recipes" | "suppliers" | "purchaseOrders">, value: T) => {
    let previous: InventoryData = emptyInventory;
    setData((current) => {
      previous = current;
      const rows = current[key] as unknown as T[];
      return { ...current, [key]: rows.some((entry) => entry.id === value.id) ? rows.map((entry) => entry.id === value.id ? value : entry) : [value, ...rows] };
    });
    try {
      const payload = await requestJson<{ data: T }>("/api/owner/inventory", { method: "POST", body: JSON.stringify({ resource, data: value, restaurantId }) });
      const normalized = resource === "item" ? normalizeInventoryItem(payload.data as unknown as Record<string, unknown>) as unknown as T : payload.data;
      setData((current) => {
        const rows = current[key] as unknown as T[];
        return { ...current, [key]: rows.map((entry) => entry.id === value.id ? normalized : entry) };
      });
      return normalized;
    } catch (cause) {
      setData(previous);
      throw cause;
    }
  }, [restaurantId]);

  const removeResource = useCallback(async (resource: "item" | "recipe" | "supplier" | "purchase", key: keyof Pick<InventoryData, "items" | "recipes" | "suppliers" | "purchaseOrders">, id: string) => {
    let previous: InventoryData = emptyInventory;
    setData((current) => {
      previous = current;
      const rows = current[key] as unknown as Array<{ id: string }>;
      return { ...current, [key]: rows.filter((entry) => entry.id !== id) };
    });
    try {
      await requestJson(`/api/owner/inventory?resource=${resource}&id=${encodeURIComponent(id)}${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ""}`, { method: "DELETE" });
    } catch (cause) {
      setData(previous);
      throw cause;
    }
  }, [restaurantId]);

  const adjust = useCallback(async (id: string, delta: number, reason: string) => {
    const payload = await requestJson<{ data: Record<string, unknown> }>("/api/owner/inventory", { method: "POST", body: JSON.stringify({ action: "adjust", id, delta, reason, restaurantId }) });
    const next = normalizeInventoryItem(payload.data);
    setData((current) => ({ ...current, items: current.items.map((item) => item.id === id ? next : item) }));
  }, [restaurantId]);

  const receive = useCallback(async (id: string) => {
    await requestJson("/api/owner/inventory", { method: "POST", body: JSON.stringify({ action: "receive", id, restaurantId }) });
    await load(true);
  }, [load, restaurantId]);

  return {
    ...data,
    status,
    error,
    retry: () => load(true),
    saveItem: (item: InventoryItem) => saveResource("item", "items", item),
    deleteItem: (id: string) => removeResource("item", "items", id),
    adjust,
    saveRecipe: (recipe: Recipe) => saveResource("recipe", "recipes", recipe),
    deleteRecipe: (id: string) => removeResource("recipe", "recipes", id),
    saveSupplier: (supplier: Supplier) => saveResource("supplier", "suppliers", supplier),
    savePurchase: (purchase: PurchaseOrder) => saveResource("purchase", "purchaseOrders", purchase),
    receivePurchase: receive,
  };
}

export type AccountingEntry = {
  id: string;
  type: "income" | "expense";
  category: string;
  branchId: string;
  amount: number;
  gst: number;
  paymentMode: "cash" | "upi" | "card" | "bank";
  notes: string;
  attachment: string;
  createdBy: string;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  createdAt: string;
};

export function useOwnerAccounting(restaurantId?: string) {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [status, setStatus] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const url = `/api/owner/accounting${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ""}`;

  const load = useCallback(async (refreshing = false) => {
    setStatus(refreshing ? "refreshing" : "loading");
    setError("");
    try {
      const payload = await requestJson<{ data?: { entries?: AccountingEntry[]; staff?: StaffMember[]; branches?: BranchOption[] } }>(url);
      setEntries(payload.data?.entries ?? []);
      setStaff(payload.data?.staff ?? []);
      setBranches(payload.data?.branches ?? []);
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accounting data could not be loaded.");
      setStatus("error");
    }
  }, [url]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = useCallback(async (entry: AccountingEntry) => {
    let previous: AccountingEntry[] = [];
    setEntries((current) => {
      previous = current;
      return current.some((item) => item.id === entry.id) ? current.map((item) => item.id === entry.id ? entry : item) : [entry, ...current];
    });
    try {
      const payload = await requestJson<{ data: AccountingEntry }>("/api/owner/accounting", { method: "POST", body: JSON.stringify({ entry, restaurantId }) });
      setEntries((current) => current.map((item) => item.id === entry.id ? payload.data : item));
      return payload.data;
    } catch (cause) {
      setEntries(previous);
      throw cause;
    }
  }, [restaurantId]);

  const remove = useCallback(async (id: string) => {
    let previous: AccountingEntry[] = [];
    setEntries((current) => {
      previous = current;
      return current.filter((entry) => entry.id !== id);
    });
    try {
      await requestJson(`/api/owner/accounting?id=${encodeURIComponent(id)}${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ""}`, { method: "DELETE" });
    } catch (cause) {
      setEntries(previous);
      throw cause;
    }
  }, [restaurantId]);

  return { entries, staff, branches, status, error, retry: () => load(true), save, remove };
}

function normalizeInventoryItem(input: Record<string, unknown>) {
  return {
    ...input,
    id: String(input.id),
    name: String(input.name ?? input.itemName ?? "Inventory item"),
    category: String(input.category ?? "General"),
    branchId: String(input.branchId ?? "main"),
    currentStock: Number(input.currentStock ?? input.quantity ?? 0),
    unit: String(input.unit ?? input.stockUnit ?? "piece"),
    reorderLevel: Number(input.reorderLevel ?? input.lowStockAlert ?? 0),
  } as InventoryItem;
}
