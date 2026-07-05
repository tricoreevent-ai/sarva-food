import type { OrderChannel, PosOrderType, TableOrder } from "@/lib/types";

type ReadableOrderInput = {
  id?: string;
  source?: string;
  channel?: OrderChannel | string;
  orderType?: PosOrderType | string;
  tableNumber?: string;
  createdAt?: string;
  sequence?: number;
};

const readablePattern = /^(DIN|PAR|WEB|SWG|ZMT|POS)-/i;

export function readableOrderId(input: ReadableOrderInput) {
  if (input.id && readablePattern.test(input.id)) return input.id.toUpperCase();

  const date = compactOrderDate(input.createdAt);
  const sequence = String(input.sequence ?? stableSequence(input.id ?? `${input.source ?? ""}-${input.tableNumber ?? ""}-${date}`)).padStart(3, "0");
  const prefix = orderPrefix(input);

  if (prefix === "DIN") {
    return `DIN-${normalizeTableNumber(input.tableNumber)}-${date}-${sequence}`;
  }

  return `${prefix}-${date}-${sequence}`;
}

export function readableTableOrderId(order: TableOrder, sequence?: number) {
  return readableOrderId({
    id: order.id,
    source: order.source,
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    createdAt: order.createdAt,
    sequence,
  });
}

export function actualOrderTime(value?: string) {
  const date = safeDate(value);
  if (!date) return "Time pending";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function relativeOrderTime(value?: string, now = Date.now()) {
  const date = safeDate(value);
  if (!date) return "now";
  const diff = now - date.getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function normalizeTableNumber(value?: string) {
  const raw = (value ?? "").trim();
  const digits = raw.match(/\d+/)?.[0];
  if (!digits) return raw && raw !== "DIRECT" ? raw.toUpperCase() : "T00";
  return `T${digits.padStart(2, "0").slice(-2)}`;
}

function orderPrefix(input: ReadableOrderInput) {
  const text = `${input.source ?? ""} ${input.channel ?? ""} ${input.orderType ?? ""}`.toLowerCase();
  if (text.includes("dine-in") || text.includes("waiter") || /^t\d+/i.test(input.tableNumber ?? "")) return "DIN";
  if (text.includes("zomato")) return "ZMT";
  if (text.includes("swiggy")) return "SWG";
  if (text.includes("website") || text.includes("web") || text.includes("online") || text.includes("delivery")) return "WEB";
  if (text.includes("parcel")) return "PAR";
  return "POS";
}

function compactOrderDate(value?: string) {
  const date = safeDate(value) ?? new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${yy}${month}${day}`;
}

function safeDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function stableSequence(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 999;
  }
  return Math.max(1, hash + 1);
}
