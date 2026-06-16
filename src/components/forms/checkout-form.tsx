"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import Link from "next/link";
import { Bike, CalendarClock, CreditCard, Home, Loader2, LogIn, PackageCheck, Smartphone, Users, Zap } from "lucide-react";
import { WhatsAppOrderFlow } from "@/components/flows/whatsapp-order-flow";
import { ScheduleOrderDialog } from "@/components/schedule/schedule-order-dialog";
import { InlineLoading } from "@/components/state/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCartTotals, useCartStore } from "@/lib/cart-store";
import { useAppStore } from "@/lib/app-store";
import { isOnline } from "@/lib/offline";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/schemas/checkout";
import { formatScheduleDate, formatScheduleSlot, SCHEDULE_STORAGE_KEY, type ScheduledOrderSelection } from "@/lib/schedule-slots";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import type { CommerceLocation } from "@/hooks/use-location-commerce";
import { usePublicMenu, usePublicRestaurant } from "@/hooks/use-public-data";
import { captureException, trackAnalyticsEvent } from "@/services/analytics-service";
import type { CreateOrderInput } from "@/services/order-service";

export function CheckoutForm({
  fastMode = false,
  initialOfferCode,
}: {
  fastMode?: boolean;
  initialOfferCode?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const { user, loading } = useAuthUser();
  const customerData = useCustomerData(user?.uid);
  const items = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const applyOffer = useCartStore((state) => state.applyOffer);
  const clearCart = useCartStore((state) => state.clearCart);
  const createOrder = useAppStore((state) => state.createOrder);
  const cmsVersion = useAppStore((state) => state.cmsSettings.cmsVersion);
  const cartRestaurantSlug = items[0]?.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
  const { offers } = usePublicMenu(cartRestaurantSlug);
  const { restaurant } = usePublicRestaurant(cartRestaurantSlug);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema) as Resolver<CheckoutFormValues>,
    defaultValues: {
      fulfillmentType: "delivery",
      scheduleMode: "now",
      guestCount: 2,
      payment: "upi",
      acceptedTerms: false,
    },
  });
  const fulfillmentType = useWatch({ control, name: "fulfillmentType" });
  const scheduleMode = useWatch({ control, name: "scheduleMode" });
  const scheduledFor = useWatch({ control, name: "scheduledFor" });
  const scheduledOrderValue = scheduledFor ? scheduledOrderFromIso(cartRestaurantSlug, scheduledFor) : null;

  useEffect(() => {
    if (initialOfferCode) {
      applyOffer(initialOfferCode);
    }
  }, [applyOffer, initialOfferCode]);

  useEffect(() => {
    const profile = customerData.profile as { displayName?: string; phone?: string } | null;
    if (profile?.displayName) setValue("name", profile.displayName, { shouldValidate: true });
    if (profile?.phone) setValue("phone", profile.phone, { shouldValidate: true });
    const savedAddress = customerData.addresses.find((address) => address.isDefault) ?? customerData.addresses[0];
    const location = readSavedDeliveryLocation();
    if (location?.address) {
      setValue("address", location.address, { shouldValidate: true });
    } else if (savedAddress?.fullAddress || savedAddress?.address) {
      setValue("address", savedAddress.fullAddress || savedAddress.address, { shouldValidate: true });
    }
  }, [customerData.addresses, customerData.profile, setValue]);

  useEffect(() => {
    const saved = readScheduledOrderDraft();
    if (!saved || saved.restaurantId !== cartRestaurantSlug) return;
    setValue("scheduleMode", "scheduled", { shouldValidate: true });
    setValue("scheduledFor", saved.scheduledFor, { shouldValidate: true });
  }, [cartRestaurantSlug, setValue]);

  if (loading) {
    return <InlineLoading label="Checking account" />;
  }

  if (!user) {
    return <GuestCheckoutAuthGate />;
  }

  return (
    <>
    <ScheduleOrderDialog
      open={scheduleDialogOpen}
      onOpenChange={setScheduleDialogOpen}
      restaurant={restaurant}
      value={scheduledOrderValue}
      onConfirm={(value) => {
        setValue("scheduleMode", "scheduled", { shouldValidate: true });
        setValue("scheduledFor", value.scheduledFor, { shouldValidate: true });
        saveScheduledOrderDraft(value);
      }}
    />
    <Card className="customer-surface">
      <CardHeader>
        <CardTitle>Order details</CardTitle>
      </CardHeader>
      <CardContent>
        {fastMode ? (
          <div className="mb-4 flex items-start gap-3 rounded-md border bg-secondary/20 p-3 text-sm font-semibold">
            <Zap className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              Fast checkout is enabled from the food link. Review the cart, choose payment,
              and place the order in one step.
            </p>
          </div>
        ) : null}
        <form
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            if (!items.length) return;
            setSubmitting(true);
            setSubmitError("");
            const totals = getCartTotals(items, offerCode, offers);
            const restaurantSlug = items[0]?.restaurantSlug ?? DEFAULT_RESTAURANT_ID;
            const appliedOfferCode = totals.appliedOffer?.code;
            const scheduledFor = values.scheduleMode === "scheduled" ? values.scheduledFor : undefined;

            try {
              await trackAnalyticsEvent("checkout_started", {
                restaurantSlug,
                offerCode: appliedOfferCode,
                source: "web",
              });

              if (!user) {
                const query = new URLSearchParams({ next: "/checkout" });
                if (appliedOfferCode) query.set("offer", appliedOfferCode);
                router.push(`/login?${query.toString()}`);
                return;
              }

              const firebaseOrderInput = {
                restaurantId: restaurantSlug,
                customerId: user.uid,
                customerName: values.name,
                customerPhone: values.phone,
                deliveryAddress: values.fulfillmentType === "delivery" ? values.address : undefined,
                ...(values.fulfillmentType === "delivery" ? deliveryLocationPayload(values.address ?? "") : {}),
                channel: "web" as const,
                fulfillmentType: values.fulfillmentType,
                scheduleMode: values.scheduleMode,
                scheduledFor,
                scheduledDateLabel: scheduledFor ? new Date(scheduledFor).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined,
                prepEstimateMinutes: estimatePrepMinutes(items.length),
                cutoffAt: scheduledFor ? new Date(new Date(scheduledFor).getTime() - 45 * 60_000) : undefined,
                guestCount: values.fulfillmentType === "dine-in" ? values.guestCount : undefined,
                lines: items.map((item) => ({
                  menuItemId: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                })),
                offerCode: appliedOfferCode,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                deliveryFee: totals.deliveryFee,
                total: totals.total,
                acceptedTermsVersion: cmsVersion ?? "default",
                acceptedTermsAt: new Date().toISOString(),
              };

              if (isOnline()) {
                try {
                  const order = await createOrderThroughServer(firebaseOrderInput);
                  clearScheduledOrderDraft();
                  clearCart();
                  await trackAnalyticsEvent("order_created", {
                    restaurantSlug,
                    orderId: order.orderId,
                    offerCode: appliedOfferCode,
                  });
                  router.push(`/order-success?orderId=${order.orderId}`);
                  return;
                } catch (error) {
                  const safeMessage = error instanceof Error ? error.message : "Unable to create order right now.";
                  setSubmitError(safeMessage);
                  await captureException(error, { surface: "checkout-server-order" });
                  setSubmitting(false);
                  return;
                }
              }

              const order = await createOrder({
                restaurantSlug,
                customer: {
                  name: values.name,
                  phone: values.phone,
                  address: values.fulfillmentType === "delivery" ? values.address ?? "" : "",
                },
                lines: items.map((item) => ({
                  itemId: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                })),
                totals,
                offerCode: appliedOfferCode,
                payment: values.payment,
                channel: "Web",
                fulfillmentType: values.fulfillmentType,
                scheduleMode: values.scheduleMode,
                scheduledFor,
                scheduledStatus: values.scheduleMode === "scheduled" ? "requested" : undefined,
                prepEstimateMinutes: estimatePrepMinutes(items.length),
                cutoffAt: scheduledFor ? new Date(new Date(scheduledFor).getTime() - 45 * 60_000).toISOString() : undefined,
                guestCount: values.fulfillmentType === "dine-in" ? values.guestCount : undefined,
                acceptedTermsVersion: cmsVersion ?? "default",
                acceptedTermsAt: new Date().toISOString(),
              });
              clearScheduledOrderDraft();
              clearCart();
              await trackAnalyticsEvent("order_created", {
                restaurantSlug,
                orderId: order.id,
                source: "pwa",
                offerCode: appliedOfferCode,
              });
              router.push(`/order-success?orderId=${order.id}`);
            } catch (error) {
              await trackAnalyticsEvent("order_failed", {
                restaurantSlug,
                error: error instanceof Error ? error.message : "unknown",
              });
              await captureException(error, { surface: "checkout" });
              setSubmitError("Unable to create order right now. Please try again.");
              setSubmitting(false);
            }
          })}
        >
          {/* Submit writes Firestore orders when Firebase/auth are enabled and keeps a local fallback for offline development. */}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" autoComplete="tel" inputMode="tel" {...register("phone")} />
            {errors.phone ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Fulfillment</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { value: "delivery", label: "Delivery", icon: Bike },
                { value: "parcel", label: "Parcel", icon: PackageCheck },
                { value: "dine-in", label: "Dine-in", icon: Users },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <label key={option.value} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-md border bg-card p-3 text-sm font-bold shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                    <input type="radio" value={option.value} className="sr-only" {...register("fulfillmentType")} />
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {fulfillmentType === "delivery" ? (
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" autoComplete="street-address" {...register("address")} />
              {errors.address ? (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              ) : null}
            </div>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Order timing</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: "now", label: "Order now", icon: Zap },
                { value: "scheduled", label: "Schedule", icon: CalendarClock },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border bg-card p-3 text-sm font-bold shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                    onClick={() => {
                      if (option.value === "scheduled") {
                        setScheduleDialogOpen(true);
                        return;
                      }
                      setValue("scheduledFor", "", { shouldValidate: true });
                      clearScheduledOrderDraft();
                    }}
                  >
                    <input type="radio" value={option.value} className="sr-only" {...register("scheduleMode")} />
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {scheduleMode === "scheduled" ? (
              <div className="grid gap-3 rounded-md border bg-orange-50/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <input type="hidden" {...register("scheduledFor")} />
                <div>
                  <p className="text-sm font-black">Selected slot</p>
                  <p className="mt-1 text-sm font-bold text-orange-700">
                    {scheduledOrderValue ? `${formatScheduleDate(scheduledOrderValue.scheduledDate)}, ${formatScheduleSlot(scheduledOrderValue.slotStart, scheduledOrderValue.slotEnd)}` : "Select date and time"}
                  </p>
                  {errors.scheduledFor ? <p className="mt-1 text-xs text-destructive">{errors.scheduledFor.message}</p> : null}
                </div>
                <Button type="button" variant="outline" className="h-12 bg-card font-black" onClick={() => setScheduleDialogOpen(true)}>
                  <CalendarClock className="size-4 text-primary" />
                  {scheduledOrderValue ? "Change slot" : "Pick slot"}
                </Button>
              </div>
            ) : null}
            {fulfillmentType === "dine-in" ? (
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="guest-count">Guest count</Label>
                <Input id="guest-count" inputMode="numeric" {...register("guestCount", { valueAsNumber: true })} />
                {errors.guestCount ? <p className="text-xs text-destructive">{errors.guestCount.message}</p> : null}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Payment</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { value: "upi", label: "UPI", icon: CreditCard },
                { value: "card", label: "Razorpay", icon: Smartphone },
                { value: "cod", label: "COD", icon: Home },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className="flex min-h-16 cursor-pointer items-center gap-3 rounded-md border bg-card p-3 text-sm font-bold shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      className="sr-only"
                      {...register("payment")}
                    />
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-md border bg-orange-50/70 p-3 text-sm font-semibold leading-6">
            <input type="checkbox" className="mt-1" {...register("acceptedTerms")} />
            <span>
              By placing this order, you agree to{" "}
              <Link href="/terms" className="font-black text-primary">Terms & Conditions</Link>
              {" "}and{" "}
              <Link href="/privacy" className="font-black text-primary">Privacy Policy</Link>.
              {errors.acceptedTerms ? <span className="mt-1 block text-xs text-destructive">{errors.acceptedTerms.message}</span> : null}
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" size="lg" disabled={submitting || !items.length} className="shadow-lg">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bike className="size-4" />
              )}
              {submitting ? "Creating order" : "Place order"}
            </Button>
            <WhatsAppOrderFlow />
          </div>
          {submitError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              {submitError}
            </p>
          ) : null}
          <div className="fixed inset-x-4 bottom-24 z-30 md:hidden">
            <Button type="submit" size="lg" disabled={submitting || !items.length} className="w-full shadow-xl">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Bike className="size-4" />}
              {submitting ? "Creating order" : "Pay and place order"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </>
  );
}

async function createOrderThroughServer(input: CreateOrderInput) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({})) as {
    ok?: boolean;
    orderId?: string;
    error?: string;
  };
  if (!response.ok || !payload.ok || !payload.orderId) {
    throw new Error(payload.error || "Unable to create order right now.");
  }
  return { orderId: payload.orderId };
}

function estimatePrepMinutes(itemCount: number) {
  return Math.max(25, 15 + itemCount * 5);
}

function scheduledOrderFromIso(restaurantId: string, value: string): ScheduledOrderSelection | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const slotStart = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const end = new Date(date.getTime() + 30 * 60_000);
  const slotEnd = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  return {
    orderType: "scheduled",
    scheduledDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    slotStart,
    slotEnd,
    restaurantId,
    scheduledFor: value,
  };
}

function readScheduledOrderDraft(): ScheduledOrderSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ScheduledOrderSelection : null;
  } catch {
    return null;
  }
}

function saveScheduledOrderDraft(value: ScheduledOrderSelection) {
  window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(value));
}

function clearScheduledOrderDraft() {
  window.localStorage.removeItem(SCHEDULE_STORAGE_KEY);
}

function readSavedDeliveryLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("sarva-commerce-location");
    return raw ? (JSON.parse(raw) as CommerceLocation) : null;
  } catch {
    return null;
  }
}

function deliveryLocationPayload(address: string) {
  const location = readSavedDeliveryLocation();
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number" ||
    !location.address
  ) {
    return {};
  }

  const normalizedFormAddress = address.trim().toLowerCase();
  const normalizedLocationAddress = location.address.trim().toLowerCase();
  const coordinatesMatchAddress =
    normalizedFormAddress.includes(normalizedLocationAddress.slice(0, 24)) ||
    normalizedLocationAddress.includes(normalizedFormAddress.slice(0, 24));

  if (!coordinatesMatchAddress) return {};

  return {
    deliveryGeo: { lat: location.latitude, lng: location.longitude },
    deliveryPlaceId: location.placeId,
    deliveryAddressLabel: location.label,
  };
}

function GuestCheckoutAuthGate() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to continue checkout</DialogTitle>
            <DialogDescription>
              Sign in or create an account to save this cart to your profile and place the order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link href="/login?next=/checkout">
                <LogIn className="size-4" />
                Sign in
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup?next=/checkout">Create account</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="customer-surface">
        <CardContent className="grid min-h-80 place-items-center p-6 text-center">
          <div className="max-w-md">
            <LogIn className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-2xl font-black">Login to checkout</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Browse and build a cart as a guest. Checkout starts after account sign in.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button asChild size="lg">
                <Link href="/login?next=/checkout">Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup?next=/checkout">Create account</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
