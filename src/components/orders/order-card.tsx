import { CalendarClock, Check, Eye, Mail, MapPin, MessageCircle, Phone, Star, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/owner/status-badge";
import { formatCurrency } from "@/lib/utils";

type CommunicationEvent = {
  id: string;
  channel: "call" | "whatsapp" | "sms" | "smtp" | "maps" | "system";
  action: "contact" | "not-reachable" | "test";
  message: string;
  createdAt: string;
};

export type OpsOrder = {
  id: string;
  displayId?: string;
  age: string;
  actualTime?: string;
  source: string;
  customer: string;
  phone: string;
  email?: string;
  address?: string;
  previousOrderCount?: number;
  customerRating?: number;
  type: string;
  tableNumber?: string;
  status: string;
  itemCount: number;
  total: number;
  payment: string;
  instructions?: string;
  scheduledLabel?: string;
  prepSuggestion?: string;
};

export function OrderCard({
  order,
  onAccept,
  onReject,
  onReady,
  onComplete,
}: {
  order: OpsOrder;
  onAccept: () => void;
  onReject: () => void;
  onReady: () => void;
  onComplete: () => void;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const [timeline, setTimeline] = useState<CommunicationEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const isNew = order.status === "new";
  const isPreparing = order.status === "accepted" || order.status === "preparing";
  const isReady = order.status === "ready";
  const isDone = ["delivered", "completed", "cancelled", "rejected"].includes(order.status);

  useEffect(() => {
    if (!contactOpen) return;
    let active = true;
    void fetch(`/api/owner/communication?orderId=${encodeURIComponent(order.id)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { history?: CommunicationEvent[] }) => {
        if (active) setTimeline(payload.history ?? []);
      })
      .catch(() => {
        if (active) setTimeline([]);
      })
      .finally(() => {
        if (active) setTimelineLoading(false);
      });
    return () => {
      active = false;
    };
  }, [contactOpen, order.id]);

  async function logContact(channel: CommunicationEvent["channel"], action: CommunicationEvent["action"] = "contact") {
    const target = channel === "smtp" ? order.email : channel === "maps" ? order.address : order.phone;
    const response = await fetch("/api/owner/communication", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        channel,
        orderId: order.id,
        target,
        customerName: order.customer,
        customerPhone: order.phone,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: CommunicationEvent };
    if (payload.data) setTimeline((current) => [payload.data as CommunicationEvent, ...current.filter((item) => item.id !== payload.data?.id)]);
  }

  return (
    <article className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_220px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-neutral-950">{order.displayId ?? order.id}</h3>
          <StatusBadge status={order.status} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{order.type}</span>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
          <span className="font-black text-slate-800">{order.age}</span>
          {order.actualTime ? <span>{order.actualTime}</span> : null}
          <span>•</span>
          <span>{order.source}</span>
          {order.tableNumber ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">{order.tableNumber}</span> : null}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-black text-neutral-950">{order.customer}</span>
          {(order.previousOrderCount ?? 0) >= 5 ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700">VIP</span> : null}
          {order.previousOrderCount ? <span className="text-xs font-bold text-slate-500">{order.previousOrderCount} previous orders</span> : null}
          {order.customerRating ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Star className="size-3 fill-current" />{order.customerRating}</span> : null}
          {order.phone ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Phone className="size-3.5" />
              {order.phone}
            </span>
          ) : null}
        </div>
        {order.address ? <p className="mt-2 text-xs font-semibold text-slate-500">{order.address}</p> : null}
        {order.scheduledLabel ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
            <CalendarClock className="size-3.5" />
            Scheduled order: {order.scheduledLabel}
          </p>
        ) : null}
        {order.prepSuggestion ? <p className="mt-1 text-xs font-semibold text-slate-500">{order.prepSuggestion}</p> : null}
        {order.instructions ? <p className="mt-2 text-sm text-slate-600">{order.instructions}</p> : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-500">{order.itemCount} items</p>
        <p className="mt-1 text-2xl font-black text-neutral-950">{formatCurrency(order.total)}</p>
        <p className="text-sm text-slate-500">Payment: {order.payment}</p>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {isNew ? (
          <>
            <Button size="sm" className="border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50" variant="outline" onClick={onAccept}>
              <Check className="size-4" />
              Accept
            </Button>
            <Button size="sm" className="border-red-400 bg-white text-red-600 hover:bg-red-50" variant="outline" onClick={onReject}>
              <X className="size-4" />
              Reject
            </Button>
          </>
        ) : null}
        {isPreparing ? (
          <Button size="sm" className="border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50" variant="outline" onClick={onReady}>
            <Check className="size-4" />
            Ready
          </Button>
        ) : null}
        {isReady ? (
          <Button size="sm" className="border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50" variant="outline" onClick={onComplete}>
            <Check className="size-4" />
            Mark Completed
          </Button>
        ) : null}
        <Button size="sm" variant="outline">
          <Eye className="size-4" />
          View
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          setTimelineLoading(true);
          setContactOpen(true);
        }}>
          <Phone className="size-4" />
          Contact
        </Button>
        {!isDone && order.source.toLowerCase().includes("delivery") ? (
          <Button size="sm" variant="outline">
            Track
          </Button>
        ) : null}
      </div>
      {contactOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-neutral-950">Contact {order.customer}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{order.displayId ?? order.id}</p>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setContactOpen(false)}><X className="size-4" /></Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <ContactButton href={`tel:${order.phone}`} icon={Phone} label="Call" disabled={!order.phone} onOpen={() => void logContact("call")} />
              <ContactButton href={`https://wa.me/${order.phone.replace(/\D/g, "")}`} icon={MessageCircle} label="WhatsApp" disabled={!order.phone} onOpen={() => void logContact("whatsapp")} />
              <ContactButton href={`sms:${order.phone}`} icon={MessageCircle} label="SMS" disabled={!order.phone} onOpen={() => void logContact("sms")} />
              <ContactButton href={`mailto:${order.email ?? ""}?subject=Order ${encodeURIComponent(order.displayId ?? order.id)}`} icon={Mail} label="Email" disabled={!order.email} onOpen={() => void logContact("smtp")} />
              <ContactButton href={order.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}` : ""} icon={MapPin} label="Maps" disabled={!order.address} onOpen={() => void logContact("maps")} />
              <Button type="button" variant="outline" className="justify-start" onClick={() => void logContact("system", "not-reachable")}>
                <X className="size-4" />
                Not reachable
              </Button>
            </div>
            <div className="mt-4 rounded-lg border p-3">
              <p className="text-sm font-black">Communication timeline</p>
              <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600">
                {timelineLoading ? <p>Loading contact attempts...</p> : timeline.length ? timeline.map((item) => <p key={item.id}>{formatEventTime(item.createdAt)} {item.message}</p>) : <p>No contact attempts recorded for this order.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ContactButton({ href, icon: Icon, label, disabled, onOpen }: { href: string; icon: LucideIcon; label: string; disabled?: boolean; onOpen?: () => void }) {
  return (
    <Button asChild={!disabled} type="button" variant="outline" className="justify-start" disabled={disabled}>
      {disabled ? <span><Icon className="size-4" />{label}</span> : <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} onClick={onOpen}><Icon className="size-4" />{label}</a>}
    </Button>
  );
}

function formatEventTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : value;
}
