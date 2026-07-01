import { calculateRestaurantTax } from "@/lib/menu-engine";
import { DEFAULT_BRANCH_ID } from "@/lib/tenant";
import type { OrderLine, PaymentBreakdown, PaymentOption, PosBill, PrintTemplate, PrinterProfile, RestaurantBranch, TaxSettings } from "@/lib/types";

export type BillContext = {
  restaurantName: string;
  branch: RestaurantBranch;
  gstin?: string;
  invoiceNumber: string;
  orderNumber: string;
  cashierName: string;
  waiterName?: string;
  tableNumber?: string;
  guestCount?: number;
  orderType: "Dine-in" | "Takeaway" | "Parcel" | "Delivery" | "POS";
  payment: PaymentOption;
  payments: PaymentBreakdown[];
  lines: OrderLine[];
  discount: number;
  tenderedAmount: number;
  taxSettings: TaxSettings;
  createdAt: Date;
  copyLabel?: "Customer Copy" | "Cashier Copy" | "Kitchen Copy" | "Duplicate Copy";
  duplicate?: boolean;
};

export type KotContext = {
  kotNumber: string;
  orderNumber: string;
  orderType: "Dine-in" | "Takeaway" | "Parcel" | "Delivery" | "POS";
  tableNumber?: string;
  waiterName?: string;
  priority: "normal" | "rush";
  lines: OrderLine[];
  createdAt: Date;
};

export const defaultBillTemplate: PrintTemplate = {
  id: "tpl-bill-80",
  name: "Premium GST bill",
  branchId: DEFAULT_BRANCH_ID,
  type: "bill",
  paperWidth: "80mm",
  mode: "premium",
  showLogo: true,
  showGstBreakup: true,
  showQrCode: true,
  showFooter: true,
  showWaiterName: true,
  showItemNotes: true,
  showBranch: true,
  footerNote: "Thank you. Visit again.",
  refundPolicy: "No refund after food is prepared.",
  language: "en",
};

export const defaultKotTemplate: PrintTemplate = {
  ...defaultBillTemplate,
  id: "tpl-kot-80",
  name: "Kitchen Ticket",
  type: "kot",
  showGstBreakup: false,
  showQrCode: false,
};

export function buildBillContext(input: {
  bill: PosBill;
  branch: RestaurantBranch;
  taxSettings: TaxSettings;
  restaurantName?: string;
  createdAt?: Date;
}): BillContext {
  const subtotal = input.bill.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const invoiceNumber = input.bill.invoiceNumber ?? `INV-POS-${input.bill.table.replace(/[^A-Z0-9]/gi, "")}`;
  const splitTotal = input.bill.splitPayments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const tenderedAmount = splitTotal > 0 ? splitTotal : input.bill.tenderedAmount && input.bill.tenderedAmount > 0 ? input.bill.tenderedAmount : subtotal;
  return {
    restaurantName: input.restaurantName ?? input.branch.name,
    branch: input.branch,
    gstin: input.taxSettings.gstin,
    invoiceNumber,
    orderNumber: `POS-${invoiceNumber.slice(-5)}`,
    cashierName: input.bill.cashierName ?? "Cashier",
    waiterName: input.bill.waiterName ?? "Waiter",
    tableNumber: input.bill.table,
    guestCount: input.bill.guestCount ?? 1,
    orderType: toPrintOrderType(input.bill.orderType),
    payment: input.bill.payment,
    payments: input.bill.splitPayments?.length
      ? input.bill.splitPayments
      : [{ method: input.bill.payment === "cod" ? "cash" : input.bill.payment, amount: tenderedAmount }],
    lines: input.bill.lines,
    discount: input.bill.discount ?? 0,
    tenderedAmount,
    taxSettings: input.taxSettings,
    createdAt: input.createdAt ?? new Date(0),
    copyLabel: input.bill.duplicatePrint ? "Duplicate Copy" : undefined,
    duplicate: input.bill.duplicatePrint,
  };
}

export function calculateBillTotals(context: BillContext) {
  const subtotal = context.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const afterDiscount = Math.max(0, subtotal - context.discount);
  const tax = calculateRestaurantTax({
    amount: afterDiscount,
    settings: context.taxSettings,
    packingCharge: context.orderType === "Dine-in" ? 0 : context.taxSettings.defaultPackingCharge,
  });
  const balance = Math.max(0, context.tenderedAmount - tax.total);
  return { subtotal, discount: context.discount, ...tax, tenderedAmount: context.tenderedAmount, balance };
}

export function getPaperLineWidth(template: Pick<PrintTemplate, "paperWidth" | "mode">) {
  if (template.paperWidth === "58mm") return template.mode === "compact" ? 32 : 34;
  if (template.paperWidth === "80mm") return template.mode === "premium" || template.mode === "branded" ? 48 : 42;
  if (template.paperWidth === "100mm") return template.mode === "compact" ? 56 : 64;
  if (template.paperWidth === "label") return 32;
  return 72;
}

export function renderReceiptLines(context: BillContext, template: PrintTemplate) {
  const width = getPaperLineWidth(template);
  const totals = calculateBillTotals(context);
  const [date, time] = formatDateTime(context.createdAt);
  const lines: string[] = [];

  if (template.showLogo) lines.push(center(template.logoUrl ? "[ LOGO CONFIGURED ]" : "[ LOGO ]", width));
  lines.push(center((template.brandName ?? context.restaurantName).toUpperCase(), width));
  if (template.showBranch) lines.push(center(`${context.branch.name} BRANCH`, width));
  lines.push(...wrapText(context.branch.address, width).map((line) => center(line, width)));
  lines.push(center(`PHONE: ${context.branch.phone}`, width));
  if (context.gstin) lines.push(center(`GSTIN: ${context.gstin}`, width));
  lines.push(center(`SAC: ${context.taxSettings.sac}`, width));
  lines.push(separator(width, "="));
  lines.push(center(template.mode === "compact" ? "CASH RECEIPT" : "RETAIL INVOICE", width));
  lines.push(separator(width, "-"));
  if (context.copyLabel) lines.push(center(context.copyLabel.toUpperCase(), width));
  if (context.duplicate) lines.push(center("DUPLICATE BILL", width));
  lines.push(pair("Bill No", context.invoiceNumber, width));
  lines.push(pair("Order No", context.orderNumber, width));
  lines.push(pair("Date", date, width));
  lines.push(pair("Time", time, width));
  lines.push(pair("Cashier", context.cashierName, width));
  if (template.showWaiterName) lines.push(pair("Waiter", context.waiterName ?? "-", width));
  lines.push(pair("Table", context.tableNumber ?? "-", width));
  lines.push(pair("Guests", String(context.guestCount ?? "-"), width));
  lines.push(pair("Type", context.orderType, width));
  lines.push(separator(width, "="));
  lines.push(itemHeader(width));
  lines.push(separator(width, "-"));
  context.lines.forEach((line) => {
    lines.push(...itemRows(line, width));
    if (line.gstRate) lines.push(indent(`GST ${line.gstRate}%${line.hsnCode ? ` HSN ${line.hsnCode}` : ""}`, width));
    line.modifiers?.forEach((modifier) => lines.push(indent(`+ ${modifier}`, width)));
    if (template.showItemNotes && line.notes) lines.push(indent(`Note: ${line.notes}`, width));
  });
  lines.push(separator(width, "-"));
  lines.push(amountLine("Sub Total", totals.subtotal, width));
  lines.push(amountLine("Discount", -totals.discount, width));
  lines.push(amountLine("Net Amount", Math.max(0, totals.subtotal - totals.discount), width));
  lines.push(amountLine("Service Chg", totals.serviceCharge, width));
  lines.push(amountLine("Packing Chg", totals.packingCharge, width));
  if (template.showGstBreakup) {
    lines.push(amountLine("CGST", totals.cgst, width));
    lines.push(amountLine("SGST", totals.sgst, width));
    lines.push(amountLine("IGST", totals.igst, width));
  }
  lines.push(separator(width, "="));
  lines.push(amountLine("GRAND TOTAL", totals.total, width, true));
  lines.push(separator(width, "-"));
  context.payments.forEach((payment) => lines.push(amountLine(payment.method.toUpperCase(), payment.amount, width)));
  lines.push(amountLine("Tendered", totals.tenderedAmount, width));
  lines.push(amountLine("Balance", totals.balance, width));
  lines.push(separator(width, "="));
  if (template.showQrCode) lines.push(center("[ QR PAYMENT / DIGITAL BILL ]", width));
  if (template.showFooter) {
    if (template.footerImageUrl) lines.push(center("[ FOOTER IMAGE CONFIGURED ]", width));
    lines.push(center(template.footerNote ?? "THANK YOU", width));
    lines.push(...wrapText(template.refundPolicy ?? "Goods once sold cannot be returned.", width).map((line) => center(line, width)));
    lines.push(center("@sarva.food", width));
  }

  return lines;
}

export function renderKotLines(context: KotContext, template: PrintTemplate) {
  const width = getPaperLineWidth(template);
  const [, time] = formatDateTime(context.createdAt);
  const lines: string[] = [];
  lines.push(center("KITCHEN ORDER TICKET", width));
  lines.push(separator(width, "="));
  lines.push(pair("Ticket No", context.kotNumber, width));
  lines.push(pair("Order No", context.orderNumber, width));
  lines.push(pair("Time", time, width));
  lines.push(pair("Type", context.orderType.toUpperCase(), width));
  lines.push(pair("Table", context.tableNumber ?? "-", width));
  if (template.showWaiterName) lines.push(pair("Waiter", context.waiterName ?? "-", width));
  lines.push(pair("Priority", context.priority.toUpperCase(), width));
  lines.push(separator(width, "-"));
  context.lines.forEach((line) => {
    lines.push(...wrapText(`${line.quantity} x ${line.name}`, width).map((row, index) => index === 0 ? row : indent(row, width)));
    line.modifiers?.forEach((modifier) => lines.push(indent(`+ ${modifier}`, width)));
    if (template.showItemNotes && line.notes) lines.push(indent(`Note: ${line.notes}`, width));
    if (line.allergyNote) lines.push(indent(`ALLERGY: ${line.allergyNote}`, width));
    lines.push("");
  });
  lines.push(separator(width, "-"));
  lines.push("[ ] PREPARING   [ ] READY   [ ] SERVED".slice(0, width));
  lines.push(separator(width, "="));
  return lines;
}

export function buildKotContext(context: BillContext): KotContext {
  return {
    kotNumber: `KIT-${context.orderNumber.slice(-5)}`,
    orderNumber: context.orderNumber,
    orderType: context.orderType,
    tableNumber: context.tableNumber,
    waiterName: context.waiterName,
    priority: "normal",
    lines: context.lines,
    createdAt: context.createdAt,
  };
}

function formatDateTime(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return [`${day}/${month}/${year}`, `${hours}:${minutes}`];
}

function separator(width: number, char: "-" | "=") {
  return char.repeat(width);
}

function center(value: string, width: number) {
  const text = truncate(value, width);
  const left = Math.max(0, Math.floor((width - text.length) / 2));
  return `${" ".repeat(left)}${text}`;
}

function pair(label: string, value: string, width: number) {
  return `${label}: ${value}`.slice(0, width);
}

function amountLine(label: string, amount: number, width: number, strong = false) {
  const value = `${amount < 0 ? "-" : ""}Rs ${Math.abs(amount).toFixed(2)}`;
  const text = `${strong ? label.toUpperCase() : label}:`;
  const amountWidth = Math.min(value.length, Math.max(10, Math.floor(width * 0.42)));
  const labelWidth = Math.max(1, width - amountWidth);
  const safeValue = value.length > amountWidth ? value.slice(value.length - amountWidth) : value;
  return `${truncate(text, labelWidth).padEnd(labelWidth)}${safeValue.padStart(amountWidth)}`.slice(0, width);
}

function itemHeader(width: number) {
  if (width <= 34) return `${"ITEM".padEnd(width - 18)}${"QTY".padStart(4)}${"RATE".padStart(7)}${"AMT".padStart(7)}`;
  return `${"ITEM".padEnd(width - 24)}${"QTY".padStart(4)}${"PRICE".padStart(9)}${"AMOUNT".padStart(11)}`;
}

function itemRows(line: OrderLine, width: number) {
  const qtyWidth = 4;
  const rateWidth = width <= 34 ? 7 : 9;
  const amountWidth = width <= 34 ? 7 : 11;
  const nameWidth = width - qtyWidth - rateWidth - amountWidth;
  const wrapped = wrapText(line.name, nameWidth);
  const amount = line.price * line.quantity;
  return wrapped.map((name, index) => {
    if (index > 0) return name.padEnd(width);
    return `${name.padEnd(nameWidth)}${String(line.quantity).padStart(qtyWidth)}${line.price.toFixed(2).padStart(rateWidth)}${amount.toFixed(2).padStart(amountWidth)}`;
  });
}

function indent(value: string, width: number) {
  return wrapText(value, width - 2).map((line) => `  ${line}`)[0] ?? "";
}

function wrapText(value: string, width: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (!current) {
      current = truncate(word, width);
      return;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = truncate(word, width);
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function truncate(value: string, width: number) {
  return value.length <= width ? value : value.slice(0, Math.max(0, width - 1));
}

function toPrintOrderType(orderType: PosBill["orderType"]): BillContext["orderType"] {
  if (orderType === "takeaway") return "Takeaway";
  if (orderType === "parcel") return "Parcel";
  if (orderType === "delivery") return "Delivery";
  return "Dine-in";
}

export function buildEscPosPlan(kind: "bill" | "kot", profile: PrinterProfile) {
  return [
    "init",
    "align:center",
    "bold:on",
    kind === "bill" ? "text:RESTAURANT BILL" : "text:KITCHEN ORDER TICKET",
    "bold:off",
    `paper:${profile.paperWidth}`,
    `encoding:${profile.encoding ?? "utf-8"}`,
    "qr:payment-or-order-link",
    profile.autoCut ? "cut:partial" : "cut:none",
    "drawer:pulse-placeholder",
  ];
}
