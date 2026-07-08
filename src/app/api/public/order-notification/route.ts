import nodemailer, { type TransportOptions } from "nodemailer";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/firebase/admin";
import { productionLogger } from "@/lib/server/production-logger";
import { createTraceContext, publicTraceMeta, traceLogFields } from "@/lib/server/request-trace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderNotificationPayload = {
  orderId?: string;
  restaurantId?: string;
  restaurantName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  fulfillmentType?: string;
  scheduleMode?: string;
  scheduledFor?: string;
  scheduledLabel?: string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };
  lines?: Array<{
    name?: string;
    quantity?: number;
    price?: number;
  }>;
  offerCode?: string;
  totals?: {
    subtotal?: number;
    discount?: number;
    packingCharge?: number;
    deliveryFee?: number;
    tax?: number;
    total?: number;
  };
};

export async function POST(request: NextRequest) {
  const trace = createTraceContext(request);
  const payload = (await request.json().catch(() => null)) as OrderNotificationPayload | null;
  if (!payload?.orderId || !payload.restaurantName || !payload.customer?.phone || !payload.lines?.length) {
    return NextResponse.json({ error: "Order notification details are incomplete.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 400 });
  }

  const smtp = getSmtpConfig();
  if (!smtp) {
    productionLogger.warn("order-notification.smtp_not_configured", { ...traceLogFields(trace), orderId: payload.orderId, restaurantId: payload.restaurantId });
    return NextResponse.json({ ok: true, emailSent: false, reason: "smtp-not-configured" });
  }

  const ownerEmail = sanitizeEmail(payload.ownerEmail) || await loadOwnerEmail(payload.restaurantId);
  if (!ownerEmail) {
    productionLogger.warn("order-notification.owner_email_missing", {
      ...traceLogFields(trace),
      orderId: payload.orderId,
      restaurantId: payload.restaurantId,
    });
    return NextResponse.json({ ok: true, emailSent: false, reason: "owner-email-missing" });
  }

  try {
    const transporter = nodemailer.createTransport(smtp);
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: ownerEmail,
      subject: `New Nammude order ${safeText(payload.orderId)} - ${safeText(payload.restaurantName)}`,
      text: buildTextEmail(payload),
      html: buildHtmlEmail(payload),
    });
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (error) {
    productionLogger.warn("order-notification.email_failed", { ...traceLogFields(trace), orderId: payload.orderId, restaurantId: payload.restaurantId, reason: safeReason(error) });
    return NextResponse.json({ ok: true, emailSent: false, reason: "email-send-failed" });
  }
}

async function loadOwnerEmail(restaurantId?: string) {
  const id = restaurantId?.trim();
  if (!id) return "";
  try {
    const snapshot = await adminDb().collection("restaurants").doc(id).get();
    const data = snapshot.exists ? snapshot.data() as {
      contact?: { supportEmail?: string };
      ownerProfile?: { businessEmail?: string };
    } : null;
    return sanitizeEmail(data?.ownerProfile?.businessEmail) || sanitizeEmail(data?.contact?.supportEmail);
  } catch (error) {
    productionLogger.warn("order-notification.owner_email_load_failed", { restaurantId: id, reason: safeReason(error) });
    return "";
  }
}

function buildTextEmail(payload: OrderNotificationPayload) {
  const lines = payload.lines?.map((line) =>
    `${line.quantity || 1} x ${safeText(line.name)} - ${formatCurrency(line.price || 0)}`,
  ) ?? [];
  return [
    `New order for ${safeText(payload.restaurantName)}`,
    "",
    `Order: ${safeText(payload.orderId)}`,
    `Type: ${safeText(payload.fulfillmentType || "delivery")}`,
    payload.scheduleMode === "scheduled" ? `Scheduled: ${safeText(payload.scheduledLabel || payload.scheduledFor || "")}` : "Schedule: Order right now",
    "",
    "Customer",
    `Name: ${safeText(payload.customer?.name || "Customer")}`,
    `Phone: ${safeText(payload.customer?.phone || "")}`,
    payload.customer?.address ? `Address: ${safeText(payload.customer.address)}` : "",
    payload.customer?.notes ? `Notes: ${safeText(payload.customer.notes)}` : "",
    "",
    "Items",
    ...lines,
    "",
    payload.offerCode ? `Offer: ${safeText(payload.offerCode)}` : "",
    `Subtotal: ${formatCurrency(payload.totals?.subtotal || 0)}`,
    `Discount: ${formatCurrency(payload.totals?.discount || 0)}`,
    `Packing: ${formatCurrency(payload.totals?.packingCharge || 0)}`,
    `Delivery: ${formatCurrency(payload.totals?.deliveryFee || 0)}`,
    `Tax: ${formatCurrency(payload.totals?.tax || 0)}`,
    `Total: ${formatCurrency(payload.totals?.total || 0)}`,
  ].filter(Boolean).join("\n");
}

function buildHtmlEmail(payload: OrderNotificationPayload) {
  const rows = payload.lines?.map((line) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(line.name || "Item")}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${line.quantity || 1}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(line.price || 0)}</td>
    </tr>
  `).join("") ?? "";
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <h2 style="margin:0 0 8px">New order for ${escapeHtml(payload.restaurantName || "Restaurant")}</h2>
      <p><strong>Order:</strong> ${escapeHtml(payload.orderId || "")}</p>
      <p><strong>Type:</strong> ${escapeHtml(payload.fulfillmentType || "delivery")}</p>
      <p><strong>Schedule:</strong> ${escapeHtml(payload.scheduleMode === "scheduled" ? payload.scheduledLabel || payload.scheduledFor || "" : "Order right now")}</p>
      <h3>Customer</h3>
      <p>${escapeHtml(payload.customer?.name || "Customer")}<br />${escapeHtml(payload.customer?.phone || "")}<br />${escapeHtml(payload.customer?.address || "")}</p>
      ${payload.customer?.notes ? `<p><strong>Notes:</strong> ${escapeHtml(payload.customer.notes)}</p>` : ""}
      <h3>Items</h3>
      <table style="border-collapse:collapse;width:100%;max-width:620px">
        <thead><tr><th align="left">Item</th><th>Qty</th><th align="right">Price</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h3>Total: ${formatCurrency(payload.totals?.total || 0)}</h3>
      <p>Subtotal ${formatCurrency(payload.totals?.subtotal || 0)} · Discount ${formatCurrency(payload.totals?.discount || 0)} · Packing ${formatCurrency(payload.totals?.packingCharge || 0)} · Delivery ${formatCurrency(payload.totals?.deliveryFee || 0)} · Tax ${formatCurrency(payload.totals?.tax || 0)}</p>
    </div>
  `;
}

function getSmtpConfig(): TransportOptions | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS;
  const pass = host?.includes("gmail.com") ? rawPass?.replace(/\s+/g, "") : rawPass?.trim();
  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass) return null;
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };
}

function sanitizeEmail(value?: string) {
  const email = value?.trim() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeText(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function escapeHtml(value: string) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(value: number) {
  return `Rs ${Math.round(Number.isFinite(value) ? value : 0)}`;
}

function safeReason(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}
