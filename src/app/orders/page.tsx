"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowRight, CircleHelp, FileText, History, LogIn, PackageOpen, RefreshCw, RotateCcw, Star } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { APP_NAME } from "@/lib/constants";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { InlineLoading, RetryState } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import { usePublicRestaurants } from "@/hooks/use-public-data";
import { useCartStore, type CartLine } from "@/lib/cart-store";
import { parseFirestoreDate } from "@/lib/firestore-date";
import type { MenuItem, Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import type { CustomerOrderDoc, FirestoreDate } from "@/types/firebase";

export default function OrdersPage() {
  const { user, loading, profileState, profile } = useAuthUser();
  const customer = useCustomerData(user?.uid);
  const { restaurants } = usePublicRestaurants();
  const restaurantBySlug = useMemo(() => new Map(restaurants.map((item) => [item.slug, item])), [restaurants]);
  const blockedByRole = Boolean(user && profileState === "success" && profile?.role !== "customer");

  return (
    <CustomerShell>
      <main className="container-page space-y-5 py-5 sm:py-8">
        <section className="customer-surface food-gradient overflow-hidden rounded-lg p-5 text-white sm:p-7">
          <Badge className="bg-white text-primary">
            <History className="mr-1 size-3" />
            Order history
          </Badge>
          <h1 className="mt-4 text-4xl font-black leading-none sm:text-5xl">Your recent orders.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/84">
            Track, reorder, review, and get help from one compact order timeline.
          </p>
        </section>

        {loading || blockedByRole || (user && profileState === "loading") ? (
          <InlineLoading label="Checking customer account" />
        ) : !user ? (
          <Card className="customer-surface">
            <CardContent className="grid min-h-72 place-items-center p-6 text-center">
              <div className="max-w-md">
                <LogIn className="mx-auto size-10 text-primary" />
                <h2 className="mt-4 text-2xl font-black">Sign in to view orders</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Customer orders are tied to your {APP_NAME} account.</p>
                <Button asChild size="lg" className="mt-5">
                  <Link href="/login?next=/orders">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : customer.status === "loading" ? (
          <InlineLoading label="Loading order history" />
        ) : customer.status === "error" ? (
          <RetryState title="Could not load orders" description="Order history could not be loaded." onRetry={customer.retry} />
        ) : customer.orders.length ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {customer.error ? (
              <div className="flex items-start gap-3 rounded-md border border-warning/35 bg-warning/10 p-3 text-sm font-semibold text-warning xl:col-span-2">
                <RefreshCw className="mt-0.5 size-4 shrink-0" />
                <p>{customer.error}</p>
                <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={customer.retry}>Retry</Button>
              </div>
            ) : null}
            {customer.orders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} restaurant={restaurantBySlug.get(order.restaurantId)} />
            ))}
          </section>
        ) : (
          <EmptyStateCard icon={PackageOpen} title="No orders yet" description="Place an order and it will appear here with live status." actionLabel="Browse restaurants" actionHref="/restaurants" />
        )}
      </main>
    </CustomerShell>
  );
}

function OrderHistoryCard({ order, restaurant }: { order: CustomerOrderDoc; restaurant?: Restaurant }) {
  const replaceCart = useCartStore((state) => state.replaceCart);
  const currentCart = useCartStore((state) => state.items);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const completed = ["completed", "delivered"].includes(order.status);
  const active = !["completed", "delivered", "cancelled", "rejected"].includes(order.status);
  const image = restaurant?.primaryThumbnail || restaurant?.image || IMAGE_FALLBACKS.restaurant;
  const itemText = order.lines.map((line) => `${line.name} x${line.quantity}`).join(", ");

  async function reorder(mode: "merge" | "replace") {
    const menu = await fetchCurrentMenu(order.restaurantId);
    if (!menu.loaded) {
      toast.error("Current menu could not be checked. Try again.");
      return;
    }
    const { lines, unavailableCount, priceChangedCount } = buildReorderLines(order, menu.items);
    if (!lines.length) {
      toast.error("None of the previous items are available right now.");
      return;
    }
    const existingOtherRestaurant = currentCart.length && currentCart.some((item) => item.restaurantSlug !== order.restaurantId);
    if (existingOtherRestaurant && mode === "merge") {
      setReorderOpen(true);
      return;
    }
    replaceCart(mode === "merge" ? mergeLines(currentCart, lines) : lines);
    if (unavailableCount) toast.error(`${unavailableCount} previous ${unavailableCount === 1 ? "item is" : "items are"} unavailable right now.`);
    if (priceChangedCount) toast(`${priceChangedCount} ${priceChangedCount === 1 ? "price was" : "prices were"} refreshed from the current menu.`);
    toast.success(lines.length === order.lines.length ? "Order added to cart." : "Available items added to cart.");
    setReorderOpen(false);
  }

  return (
    <Card className="customer-surface overflow-hidden">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[112px_1fr] sm:p-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-orange-50 sm:aspect-square">
          <SafeImage src={image} alt="" fill fallbackSrc={IMAGE_FALLBACKS.restaurant} cloudinaryPreset="cart" sizes="144px" className="object-cover" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-primary">Order {order.id.slice(0, 8)}</p>
              <h2 className="mt-1 truncate text-xl font-black">{restaurant?.displayName || restaurant?.name || order.restaurantId}</h2>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-muted-foreground">{itemText}</p>
            </div>
            <Badge variant={completed ? "success" : active ? "warning" : "muted"}>{humanize(order.status)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Info label="Amount" value={formatCurrency(order.total)} />
            <Info label="Payment" value={humanize(order.paymentStatus)} />
            <Info label="Type" value={humanize(order.fulfillmentType || order.orderType || "delivery")} />
            <Info label="Time" value={formatShortDate(order.createdAt)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/order/${order.id}`}>Track<ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/order/${order.id}?invoice=1`}><FileText className="size-4" />Invoice</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => currentCart.length ? setReorderOpen(true) : void reorder("replace")}>
              <RotateCcw className="size-4" />Reorder
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!completed} onClick={() => setReviewOpen(true)}>
              <Star className="size-4" />Review
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/help?orderId=${order.id}`}><CircleHelp className="size-4" />Help</Link>
            </Button>
          </div>
        </div>
      </CardContent>
      {reviewOpen ? <ReviewDialog order={order} restaurant={restaurant} onClose={() => setReviewOpen(false)} /> : null}
      {reorderOpen ? <ReorderDialog onClose={() => setReorderOpen(false)} onMerge={() => void reorder("merge")} onReplace={() => void reorder("replace")} /> : null}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="text-[11px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-black">{value}</p>
    </div>
  );
}

function ReviewDialog({ order, restaurant, onClose }: { order: CustomerOrderDoc; restaurant?: Restaurant; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const chips = ["Fresh food", "Fast delivery", "Great packing", "Good value", "Will reorder"];

  useEscapeClose(onClose);

  async function submit() {
    setSaving(true);
    try {
      const response = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ restaurantId: order.restaurantId, orderId: order.id, rating, comment, imageUrls: images, anonymous }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Review could not be saved.");
      toast.success("Review saved.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="customer-review-title">
        <h3 id="customer-review-title" className="text-xl font-black">Review {restaurant?.displayName || restaurant?.name || "restaurant"}</h3>
        <div className="mt-4 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" className={value <= rating ? "text-amber-500" : "text-slate-300"} onClick={() => setRating(value)} aria-label={`${value} stars`}>
              <Star className="size-7 fill-current" />
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip} type="button" className="rounded-full border px-3 py-1 text-xs font-black" onClick={() => setComment((value) => value.includes(chip) ? value : `${value}${value ? " " : ""}${chip}.`)}>
              {chip}
            </button>
          ))}
        </div>
        <textarea className="mt-3 min-h-28 w-full rounded-lg border p-3 text-sm font-semibold" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write your review" aria-label="Review comment" autoFocus />
        <input className="mt-3 h-11 w-full rounded-lg border px-3 text-sm" value={images.join(", ")} onChange={(event) => setImages(event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 5))} placeholder="Image URLs, up to 5" aria-label="Review image URLs" />
        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
          Post anonymously
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={saving || comment.trim().length < 3} onClick={() => void submit()}>{saving ? "Saving" : "Submit review"}</Button>
        </div>
      </div>
    </div>
  );
}

function ReorderDialog({ onClose, onMerge, onReplace }: { onClose: () => void; onMerge: () => void; onReplace: () => void }) {
  useEscapeClose(onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="customer-reorder-title">
        <h3 id="customer-reorder-title" className="text-xl font-black">Reorder items</h3>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">Your cart already has items. Merge available items or replace the cart.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" onClick={onMerge}>Merge cart</Button>
          <Button type="button" onClick={onReplace}>Replace cart</Button>
        </div>
      </div>
    </div>
  );
}

function useEscapeClose(onClose: () => void) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
}

async function fetchCurrentMenu(restaurantId: string) {
  try {
    const response = await fetch(`/api/public/menu?restaurantId=${encodeURIComponent(restaurantId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { data?: MenuItem[] };
    return { loaded: response.ok, items: response.ok ? payload.data ?? [] : [] };
  } catch {
    return { loaded: false, items: [] };
  }
}

function buildReorderLines(order: CustomerOrderDoc, menu: MenuItem[]) {
  const menuById = new Map(menu.map((item) => [item.id, item]));
  let unavailableCount = 0;
  let priceChangedCount = 0;
  const lines = order.lines.flatMap((line) => {
    const current = menuById.get(line.menuItemId);
    if (!current || current.soldOut) {
      unavailableCount += 1;
      return [];
    }
    if (current.price !== line.price) priceChangedCount += 1;
    return [{ ...current, price: current.price, quantity: line.quantity }];
  });
  return { lines, unavailableCount, priceChangedCount };
}

function mergeLines(current: CartLine[], incoming: CartLine[]) {
  const next = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const existing = next.get(item.id);
    next.set(item.id, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
  }
  return Array.from(next.values());
}

function formatShortDate(value?: FirestoreDate) {
  if (!value) return "Date pending";
  const date = parseFirestoreDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date pending";
}

function humanize(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
