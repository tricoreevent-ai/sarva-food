import type { OrderChannel, PosOrderType, TableOrder } from "@/lib/types";

type ReadableOrderInput = {
  id?: string;
  orderNumber?: string | number;
  displayOrderNumber?: string | number;
  invoiceNumber?: string | number;
  billNumber?: string | number;
  source?: string;
  channel?: OrderChannel | string;
  orderType?: PosOrderType | string;
  tableNumber?: string;
  createdAt?: string;
  sequence?: number;
};

const readablePattern = /^(DIN|PAR|WEB|SWG|ZMT|POS)-/i;

export function readableOrderId(input: ReadableOrderInput) {
  return displayOrderNumber(input);
}

export function displayOrderNumber(input: ReadableOrderInput) {
  const explicit = input.orderNumber ?? input.displayOrderNumber ?? input.invoiceNumber ?? input.billNumber;
  const explicitNumber = orderNumberFromValue(explicit);
  if (explicitNumber) return explicitNumber;

  const legacyNumber = input.id && readablePattern.test(input.id) ? orderNumberFromValue(input.id.match(/(\d+)$/)?.[1]) : "";
  if (legacyNumber) return legacyNumber;

  const seed = input.id || `${input.source ?? ""}-${input.channel ?? ""}-${input.orderType ?? ""}-${input.tableNumber ?? ""}-${compactOrderDate(input.createdAt)}`;
  const sequence = input.sequence ?? stableSequence(seed);
  return `#${String(sequence).padStart(4, "0").slice(-4)}`;
}

export function readableTableOrderId(order: TableOrder, sequence?: number) {
  const extended = order as TableOrder & Pick<ReadableOrderInput, "orderNumber" | "displayOrderNumber" | "invoiceNumber" | "billNumber">;
  return readableOrderId({
    id: order.id,
    orderNumber: extended.orderNumber,
    displayOrderNumber: extended.displayOrderNumber,
    invoiceNumber: extended.invoiceNumber,
    billNumber: extended.billNumber,
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

function orderNumberFromValue(value?: string | number) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^#\d{1,6}$/.test(text)) return `#${text.slice(1).padStart(4, "0")}`;
  const trailing = text.match(/(?:^|[-_#/])0*(\d{1,6})$/)?.[1];
  return trailing ? `#${trailing.padStart(4, "0")}` : "";
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
