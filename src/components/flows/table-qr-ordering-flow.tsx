"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { Bell, CheckCircle2, Loader2, Minus, Plus, ReceiptText, Search, ShoppingBag, Star, UserRound } from "lucide-react";
import { OtpDialog, VerificationBadge } from "@/components/auth/otp-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeIndiaPhone } from "@/lib/phone-verification";
import type { MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { menuDocToUi } from "@/services/public-data-service";
import type { MenuDoc } from "@/types/firebase";

type SessionData = {
  restaurant: { id: string; name: string; logo?: string; latitude?: number; longitude?: number; active: boolean };
  table: { tableNumber: string; name: string; seats: number; sessionStatus: string; sessionExpiresAt?: string };
  settings: { otpRequired: boolean; allowParcel: boolean; allowDineIn: boolean; idleTimeoutMinutes?: number; sessionTimeoutMinutes?: number };
};

type CartLine = MenuItem & { quantity: number };

const serviceActions = [
  { type: "call-waiter", label: "Call waiter" },
  { type: "water", label: "Water" },
  { type: "tissue", label: "Tissue" },
  { type: "bill", label: "Request bill" },
  { type: "assistance", label: "Assistance" },
  { type: "extra-plate", label: "Extra plate" },
  { type: "cancel-request", label: "Cancel request" },
];

export function TableQrOrderingFlow({ token }: { token: string }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const storageKey = `nammude-qr-cart:${token.slice(0, 24)}`;
  const [cart, setCart] = useState<CartLine[]>(() => readSavedCart(storageKey));
  const [sessionId, setSessionId] = useState("");
  const [sessionExpiresAt, setSessionExpiresAt] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", guestCount: "1" });
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [mode, setMode] = useState<"dine-in" | "parcel">("dine-in");
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");
  const [billRequested, setBillRequested] = useState(false);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [qrDeviceId] = useState(() => typeof window === "undefined" ? "" : deviceId());
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const visibleMenu = useMemo(() => menu.filter((item) => (
    (!query || item.name.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase())) &&
    (!vegOnly || item.isVeg !== false) &&
    !item.soldOut &&
    isQrItemVisible(item, mode)
  )), [menu, mode, query, vegOnly]);

  const expireSession = useCallback(() => {
    setSessionId("");
    setSessionExpiresAt("");
    setIdleWarning(false);
    toast.error("Table session expired. Please scan or continue from the QR welcome screen.");
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`/api/public/table-order/session?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then(async (payload: { data?: SessionData; error?: string }) => {
        if (!active) return;
        if (!payload.data) throw new Error(payload.error || "QR ordering is not available.");
        setData(payload.data);
        if (!payload.data.settings.allowDineIn && payload.data.settings.allowParcel) setMode("parcel");
        const menuResponse = await fetch(`/api/public/menu?restaurantId=${encodeURIComponent(payload.data.restaurant.id)}`, { cache: "no-store" });
        const menuPayload = await menuResponse.json().catch(() => ({})) as { data?: MenuDoc[] };
        if (active) setMenu((menuPayload.data ?? []).map((item) => menuDocToUi(item.id, item)));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "QR ordering is not available."))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  useEffect(() => {
    if (!sessionId || !data) return undefined;
    let timer = 0;
    const reset = () => {
      window.clearTimeout(timer);
      setIdleWarning(false);
      timer = window.setTimeout(() => setIdleWarning(true), Math.max(1, data.settings.idleTimeoutMinutes ?? 10) * 60_000);
    };
    reset();
    window.addEventListener("click", reset);
    window.addEventListener("input", reset);
    window.addEventListener("touchstart", reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", reset);
      window.removeEventListener("input", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [data, sessionId]);

  useEffect(() => {
    if (!sessionId || !sessionExpiresAt) return undefined;
    const delay = Date.parse(sessionExpiresAt) - Date.now();
    const timer = window.setTimeout(expireSession, Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [expireSession, sessionExpiresAt, sessionId]);

  async function startSession() {
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error("Name and mobile number are required.");
      return;
    }
    if (data?.settings.otpRequired && !phoneVerificationToken) {
      setOtpOpen(true);
      return;
    }
    const geo = await currentLocation().catch(() => null);
    const id = qrDeviceId || deviceId();
    const response = await fetch("/api/public/table-order/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        phoneVerificationToken,
        guestCount: Number(customer.guestCount || 1),
        deviceId: id,
        lat: geo?.lat,
        lng: geo?.lng,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: { sessionId: string; expiresAt?: string }; error?: string; step?: string };
    if (!response.ok) {
      toast.error(payload.error || "Session could not be started.");
      return;
    }
    setSessionId(payload.data?.sessionId ?? "");
    setSessionExpiresAt(payload.data?.expiresAt ?? "");
    toast.success("Table session started.");
  }

  function updatePhone(phone: string) {
    if (normalizeIndiaPhone(phone) !== normalizeIndiaPhone(customer.phone)) setPhoneVerificationToken("");
    setCustomer({ ...customer, phone });
  }

  function add(item: MenuItem) {
    const priced = { ...item, price: menuPrice(item, mode) };
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      return existing ? current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { ...priced, quantity: 1 }];
    });
  }

  function qty(id: string, delta: number) {
    setCart((current) => current.flatMap((line) => line.id === id ? (line.quantity + delta > 0 ? [{ ...line, quantity: line.quantity + delta }] : []) : [line]));
  }

  async function placeOrder() {
    if (!sessionId || !data || !cart.length) return;
    setPlacing(true);
    try {
      const response = await fetch("/api/public/table-order/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          sessionId,
          deviceId: qrDeviceId || deviceId(),
          customerName: customer.name,
          customerPhone: customer.phone,
          fulfillmentType: mode,
          lines: cart.map((line) => ({ menuItemId: line.id, name: line.name, price: line.price, quantity: line.quantity })),
          idempotencyKey: `${sessionId}:${Date.now()}`,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { orderId?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Order could not be placed.");
      setCart([]);
      setLastOrderId(payload.orderId ?? "");
      window.localStorage.removeItem(storageKey);
      toast.success("Order sent to kitchen.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order could not be placed.";
      if (message.toLowerCase().includes("session")) expireSession();
      else toast.error(message);
    } finally {
      setPlacing(false);
    }
  }

  async function request(type: string) {
    if (!sessionId) return toast.error("Start the table session first.");
    const response = await fetch("/api/public/table-order/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, sessionId, deviceId: qrDeviceId || deviceId(), type, message: type.replace("-", " ") }),
    });
    if (response.ok) {
      if (type === "bill") setBillRequested(true);
      toast.success(type === "bill" ? "Bill requested." : "Request sent.");
    }
    else {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if ((payload.error ?? "").toLowerCase().includes("session")) expireSession();
      else toast.error(payload.error || "Request could not be sent.");
    }
  }

  if (loading) return <QrShell><div className="grid min-h-[70vh] place-items-center"><Loader2 className="size-8 animate-spin text-orange-600" /></div></QrShell>;
  if (!data) return <QrShell><Empty title="QR ordering unavailable" text="Ask the restaurant team for a fresh table QR." /></QrShell>;

  return (
    <QrShell>
      <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-orange-600">{data.table.name}</p>
            <h1 className="text-xl font-black text-slate-950">{data.restaurant.name}</h1>
          </div>
          <Badge>{data.table.tableNumber}</Badge>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 pb-32">
        {idleWarning ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Session idle. Add an item or send a request to keep table ordering active.</div> : null}
        <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-orange-600">Welcome to {data.restaurant.name}</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{data.table.name}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Browse the menu, place orders to the kitchen, call the waiter, or request your bill from this phone.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{data.table.tableNumber}</Badge>
            <Badge variant="muted">{data.table.seats} seats</Badge>
            <Badge variant={sessionId ? "success" : "warning"}>{sessionId ? "Session active" : "Start to order"}</Badge>
          </div>
        </section>
        {lastOrderId ? (
          <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950">
            <p>Order {lastOrderId} reached the kitchen. <a className="underline" href={`/order/${lastOrderId}`}>Track status</a></p>
            <div className="flex items-center gap-2">
              <span>Feedback</span>
              {[1, 2, 3, 4, 5].map((item) => (
                <button key={item} type="button" className={item <= rating ? "text-orange-500" : "text-slate-300"} onClick={() => setRating(item)}><Star className="size-5 fill-current" /></button>
              ))}
            </div>
          </section>
        ) : null}
        {billRequested ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950"><ReceiptText className="mr-2 inline size-5" />Bill requested. A waiter will review the table bill shortly.</section> : null}
        {!sessionId ? (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black"><UserRound className="size-5" />Start table session</h2>
            <div className="mt-3 grid gap-3">
              <input className="h-12 rounded-xl border px-3 font-semibold" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Customer name" />
              <input className="h-12 rounded-xl border px-3 font-semibold" value={customer.phone} onChange={(event) => updatePhone(event.target.value)} placeholder="Mobile number" />
              <input className="h-12 rounded-xl border px-3 font-semibold" type="number" min="1" max="20" value={customer.guestCount} onChange={(event) => setCustomer({ ...customer, guestCount: event.target.value })} placeholder="Guests" />
              <input className="h-12 rounded-xl border px-3 font-semibold" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} placeholder="Email optional" />
              {data.settings.otpRequired ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
                  <VerificationBadge verified={Boolean(phoneVerificationToken)} />
                  <Button type="button" variant="outline" onClick={() => setOtpOpen(true)}>{phoneVerificationToken ? "Verify again" : "Verify mobile"}</Button>
                </div>
              ) : null}
              <Button className="h-12 bg-orange-600 hover:bg-orange-700" onClick={() => void startSession()}>Continue</Button>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            <Button type="button" className="h-12 flex-1" variant={mode === "dine-in" ? "default" : "outline"} disabled={!data.settings.allowDineIn} onClick={() => setMode("dine-in")}>Dine In</Button>
            <Button type="button" className="h-12 flex-1" variant={mode === "parcel" ? "default" : "outline"} disabled={!data.settings.allowParcel} onClick={() => setMode("parcel")}>Parcel</Button>
          </div>
          <label className="relative mt-3 block">
            <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
            <input className="h-12 w-full rounded-xl border pl-10 pr-3 font-semibold" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={vegOnly} onChange={(event) => setVegOnly(event.target.checked)} />
            Veg only
          </label>
        </section>

        <section className="grid gap-3">
          {visibleMenu.map((item) => (
            <article key={item.id} className="flex gap-3 rounded-2xl border bg-white p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-orange-600">{item.category}</p>
                <h3 className="mt-1 font-black text-slate-950">{item.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{item.description}</p>
                <p className="mt-2 font-black">{formatCurrency(menuPrice(item, mode))}</p>
              </div>
              <Button type="button" className="h-12 min-w-20" onClick={() => add(item)}><Plus className="size-4" />Add</Button>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-2">
          {serviceActions.map((item) => (
            <Button key={item.type} type="button" className="h-14 justify-start text-left capitalize" variant="outline" onClick={() => void request(item.type)}><Bell className="size-4" />{item.label}</Button>
          ))}
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-2xl">
        <div className="mx-auto max-w-md">
          <div className="mb-2 max-h-28 overflow-auto">
            {cart.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-2 py-1 text-sm font-bold">
                <span className="min-w-0 truncate">{line.name}</span>
                <span className="flex items-center gap-2"><button onClick={() => qty(line.id, -1)}><Minus className="size-4" /></button>{line.quantity}<button onClick={() => qty(line.id, 1)}><Plus className="size-4" /></button></span>
              </div>
            ))}
          </div>
          <Button className="h-12 w-full bg-emerald-700 hover:bg-emerald-800" disabled={!sessionId || !cart.length || placing} onClick={() => void placeOrder()}>
            <ShoppingBag className="size-4" />
            {placing ? "Sending..." : `Place order · ${formatCurrency(subtotal)}`}
          </Button>
        </div>
      </footer>
      <OtpDialog
        open={otpOpen}
        phone={customer.phone}
        context="qr-ordering"
        deviceId={qrDeviceId}
        onOpenChange={setOtpOpen}
        onVerified={setPhoneVerificationToken}
      />
    </QrShell>
  );
}

function QrShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-950">{children}</div>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="grid min-h-[70vh] place-items-center p-5 text-center"><div><CheckCircle2 className="mx-auto size-10 text-orange-600" /><h1 className="mt-3 text-2xl font-black">{title}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{text}</p></div></div>;
}

function currentLocation() {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS unavailable"));
    navigator.geolocation.getCurrentPosition((position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }), reject, { enableHighAccuracy: true, timeout: 5000 });
  });
}

function deviceId() {
  const key = "nammude-qr-device-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

function readSavedCart(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as CartLine[] : [];
  } catch {
    return [];
  }
}

function isQrItemVisible(item: MenuItem, mode: "dine-in" | "parcel") {
  if (item.menuVisibility?.[mode] === false) return false;
  return menuPrice(item, mode) > 0;
}

function menuPrice(item: MenuItem, mode: "dine-in" | "parcel") {
  return mode === "dine-in" ? item.dineInPrice || item.price : item.parcelPrice || item.price;
}
