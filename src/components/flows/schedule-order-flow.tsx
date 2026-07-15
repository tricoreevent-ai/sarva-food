"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Filter,
  LocateFixed,
  Mail,
  MapPin,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LocationHydrationBoundary } from "@/components/location/location-hydration-boundary";
import { LocationSuggestionList } from "@/components/location/location-suggestion-list";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { BulkOrderForm, type BulkDraft } from "@/components/schedule/bulk-order-form";
import { CateringForm, type CateringDraft } from "@/components/schedule/catering-form";
import { ScheduleOrderDialog } from "@/components/schedule/schedule-order-dialog";
import { ScheduleCart, type ScheduleCartLine } from "@/components/schedule/schedule-cart";
import { ScheduleRestaurantCard } from "@/components/schedule/restaurant-card";
import { ScheduleStepper } from "@/components/schedule/schedule-stepper";
import { ScheduleSummary } from "@/components/schedule/schedule-summary";
import { Button } from "@/components/ui/button";
import { useLocationCommerce, type CommerceLocation } from "@/hooks/use-location-commerce";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import { usePublicMenu, usePublicRestaurants } from "@/hooks/use-public-data";
import { formatScheduleDate, formatScheduleSlot, getScheduleSlotsForDate, type ScheduledOrderSelection } from "@/lib/schedule-slots";
import type { MenuItem, Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { placeCustomerOrder } from "@/services/customer-order-api";
import type { CateringQuote } from "@/lib/types";

type ScheduleType = "delivery" | "pickup" | "bulk" | "catering";
type DiscoveryMode = "scheduled" | "catering";
type DietFilter = "all" | "veg" | "nonveg";

const defaultCatering: CateringDraft = {
  fullName: "",
  phone: "",
  email: "",
  whatsapp: "",
  eventType: "",
  guestCount: "",
  eventAddress: "",
  servingTime: "",
  budget: "",
  setupRequired: false,
  vesselsNeeded: false,
  liveCounter: false,
  notes: "",
};

export function ScheduleOrderFlow() {
  const { restaurants } = usePublicRestaurants();
  const auth = useAuthUser();
  const customer = useCustomerData(auth.user?.uid);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [step, setStep] = useState(1);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("scheduled");
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResultsOpen, setLocationResultsOpen] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [activeChip, setActiveChip] = useState("All");
  const [selectedDate, setSelectedDate] = useState(() => defaultScheduleDate());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("delivery");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [mealFilter, setMealFilter] = useState("All");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [cart, setCart] = useState<ScheduleCartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [placedResult, setPlacedResult] = useState<{ id: string; kind: "order" | "catering" } | null>(null);
  const [catering, setCatering] = useState<CateringDraft>(defaultCatering);
  const [bulk, setBulk] = useState<BulkDraft>({ quantityEstimate: "", packaging: "Individual packs", instructions: "" });
  const { items: menuItems } = usePublicMenu(restaurant?.slug);
  const {
    location,
    locationRestaurants,
    nearbyRestaurants,
    suggestions,
    status,
    detecting,
    hydrated,
    permission,
    detectLocation,
    searchPlaces,
    selectLocation,
  } = useLocationCommerce(restaurants);
  const visibleSuggestions = useMemo(() => uniqueLocations(suggestions).slice(0, 5), [suggestions]);
  const slots = useMemo(() => buildSlots(selectedDate, restaurant, scheduleType), [selectedDate, restaurant, scheduleType]);
  const selectedSlotData = slots.find((slot) => slot.value === selectedSlot);
  const selectedSlotLabel = selectedSlotData?.label ?? "";
  const dateLabel = selectedDate ? new Date(`${selectedDate}T00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "";
  const scheduledOrderValue = useMemo<ScheduledOrderSelection | null>(() => {
    if (!restaurant || !selectedSlotData) return null;
    return {
      orderType: "scheduled",
      scheduledDate: selectedDate,
      slotStart: selectedSlotData.slotStart,
      slotEnd: selectedSlotData.slotEnd,
      restaurantId: restaurant.slug,
      scheduledFor: selectedSlotData.value,
    };
  }, [restaurant, selectedDate, selectedSlotData]);
  const scheduleDays = scheduleType === "catering" || discoveryMode === "catering" ? 120 : 14;
  const restaurantsForLocation = nearbyOnly ? nearbyRestaurants : locationRestaurants;
  const landingChips = useMemo(() => buildDiscoveryChips(restaurantsForLocation), [restaurantsForLocation]);
  const scheduledRestaurants = useMemo(() => {
    const normalized = restaurantQuery.trim().toLowerCase();
    return restaurantsForLocation
      .filter((item) => item.approved !== false && item.scheduling?.enabled !== false)
      .filter((item) => matchesRestaurant(item, normalized, activeChip, discoveryMode))
      .sort((first, second) => (first.distanceKm ?? 999) - (second.distanceKm ?? 999) || second.rating - first.rating);
  }, [activeChip, discoveryMode, restaurantQuery, restaurantsForLocation]);
  const categories = useMemo(() => Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean))), [menuItems]);
  const menuFilters = useMemo(() => {
    const values = menuItems.flatMap((item) => [
      item.subcategory,
      ...(item.tags ?? []),
      ...(item.badges ?? []),
      ...(item.searchKeywords ?? []),
    ]);
    return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).slice(0, 16);
  }, [menuItems]);
  const cuisines = useMemo(() => {
    const restaurantCuisines = (restaurant?.cuisine ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const itemCuisines = menuItems.flatMap((item) => item.cuisineIds ?? []).map(humanize);
    return Array.from(new Set([...restaurantCuisines, ...itemCuisines])).filter(Boolean);
  }, [menuItems, restaurant?.cuisine]);
  const visibleMenu = useMemo(() => {
    const normalized = itemQuery.trim().toLowerCase();
    return menuItems.filter((item) => matchesMenuItem(item, { query: normalized, categoryFilter, cuisineFilter, mealFilter, dietFilter }));
  }, [categoryFilter, cuisineFilter, dietFilter, itemQuery, mealFilter, menuItems]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function selectRestaurant(next: Restaurant) {
    setRestaurant(next);
    setStep(1);
    setItemQuery("");
    setCart([]);
    setPlacedResult(null);
    setScheduleType(discoveryMode === "catering" ? "catering" : "delivery");
    setSelectedSlot("");
  }

  function handleLocationSelect(nextLocation: CommerceLocation) {
    selectLocation(nextLocation);
    setLocationQuery(nextLocation.label);
    setLocationResultsOpen(false);
  }

  function updateQuantity(itemId: string, quantity: number) {
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.id !== itemId)
        : current.map((item) => item.id === itemId ? { ...item, quantity } : item),
    );
  }

  function addItem(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      return existing ? current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { ...item, quantity: 1 }];
    });
  }

  function continueToMenu() {
    if (!selectedSlot) {
      toast.error("Select a delivery or pickup time slot.");
      return;
    }
    if (scheduleType === "catering" && !isValidCateringBasics(catering)) {
      toast.error("Add catering contact, email, guests, event type, and address.");
      return;
    }
    setStep(2);
  }

  function confirmSchedule(value: ScheduledOrderSelection) {
    setSelectedDate(value.scheduledDate);
    setSelectedSlot(value.scheduledFor);
  }

  function reviewOrder() {
    if (!cart.length && scheduleType !== "catering") {
      toast.error("Add at least one item before review.");
      return;
    }
    setStep(3);
  }

  async function confirmOrder() {
    if (!restaurant || !selectedSlot) {
      toast.error("Select restaurant and time slot first.");
      return;
    }
    if (!cart.length && scheduleType !== "catering") {
      toast.error("Add at least one item before confirming.");
      return;
    }
    if (scheduleType === "catering" && !isValidCateringBasics(catering)) {
      toast.error("Catering requests need contact, email, guests, event type, and address.");
      return;
    }

    setSubmitting(true);
    try {
      if (scheduleType === "catering") {
        if (!auth.user) throw new Error("Sign in before sending a catering request.");
        const response = await fetch("/api/customer/catering", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
          restaurantId: restaurant.slug,
          name: catering.fullName,
          phone: catering.phone,
          email: catering.email,
          whatsapp: catering.whatsapp,
          guestCount: Number(catering.guestCount) || 0,
          packageId: "custom-catering-request",
          eventDate: selectedDate,
          eventTime: selectedSlotLabel || catering.servingTime,
          eventType: catering.eventType,
          eventNotes: buildCateringNotes(catering, cart, restaurant),
          callbackRequested: true,
          contactPreference: "email",
          }),
        });
        const payload = await response.json().catch(() => ({})) as { data?: CateringQuote; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error || "Could not create catering request.");
        const quote = payload.data;
        setPlacedResult({ id: quote.id, kind: "catering" });
        toast.success("Catering request sent. The restaurant will email a revised quotation.");
        return;
      }

      const tax = taxEnabled ? Math.round(subtotal * 0.05) : 0;
      const deliveryFee = scheduleType === "pickup" ? 0 : restaurant.deliveryFee ?? 39;
      const lineNote = scheduleType === "bulk"
        ? `Bulk order: ${bulk.quantityEstimate || "quantity pending"}; ${bulk.packaging}; ${bulk.instructions}`
        : undefined;
      if (!auth.user) throw new Error("Sign in before scheduling an order.");
      const profile = customer.profile as { displayName?: string; phone?: string } | null;
      const address = customer.addresses.find((item) => item.isDefault) ?? customer.addresses[0];
      const order = await placeCustomerOrder({
        restaurantId: restaurant.slug,
        customerName: profile?.displayName || auth.user.displayName || "Scheduled Customer",
        customerPhone: profile?.phone || auth.user.phoneNumber || "",
        deliveryAddress: scheduleType === "pickup" ? "" : address?.fullAddress || address?.address || "",
        deliveryGeo: scheduleType === "pickup" || typeof address?.latitude !== "number" || typeof address.longitude !== "number" ? undefined : { lat: address.latitude, lng: address.longitude },
        deliveryPlaceId: address?.placeId,
        deliveryAddressLabel: address?.label,
        lines: cart.map((item) => ({ itemId: item.id, name: item.name, price: item.price, quantity: item.quantity, notes: lineNote })),
        totals: { subtotal, discount: 0, deliveryFee, tax, total: subtotal + deliveryFee + tax },
        fulfillmentType: scheduleType === "pickup" || scheduleType === "bulk" ? "parcel" : "delivery",
        scheduleMode: "scheduled",
        scheduledFor: selectedSlot,
      });
      setPlacedResult({ id: order.id, kind: "order" });
      toast.success("Scheduled order sent to the restaurant.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (placedResult && restaurant) {
    return (
      <SuccessScreen
        kind={placedResult.kind}
        id={placedResult.id}
        restaurantName={restaurant.displayName ?? restaurant.name}
        dateLabel={dateLabel}
        slotLabel={selectedSlotLabel}
        onReset={() => {
          setPlacedResult(null);
          setRestaurant(null);
          setStep(1);
          setCart([]);
        }}
      />
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-6 pb-24 md:pb-8">
        <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-black text-orange-600 shadow-sm">
                <Sparkles className="size-4" />
                Plan ahead, enjoy fresh
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Schedule your favorite food <span className="text-orange-600">for later</span>
              </h1>
              <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-600">
                Book delivery, pickup, bulk food, or catering with restaurants around your GPS location.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoPill icon={CalendarClock} title="Food orders" text="Up to 14 days" />
                <InfoPill icon={Users} title="Catering" text="2-4 months advance" />
                <InfoPill icon={Mail} title="Quotation" text="Owner replies by email" />
              </div>
            </div>
            <ScheduleHeroArt />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[260px_1fr_auto]">
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 size-4 text-orange-600" />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-orange-500"
                value={locationQuery}
                onChange={(event) => {
                  setLocationQuery(event.target.value);
                  setLocationResultsOpen(Boolean(event.target.value.trim()));
                  void searchPlaces(event.target.value);
                }}
                onFocus={() => setLocationResultsOpen(Boolean(locationQuery.trim()))}
                placeholder="Search delivery area"
              />
              {locationResultsOpen ? <LocationSuggestionList locations={visibleSuggestions} onSelect={handleLocationSelect} /> : null}
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-3.5 size-4 text-slate-400" />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-orange-500"
                value={restaurantQuery}
                onChange={(event) => setRestaurantQuery(event.target.value)}
                placeholder="Search restaurants, cuisines, dishes..."
              />
            </label>
            <Button
              type="button"
              className="h-12 bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                setLocationResultsOpen(false);
                detectLocation();
              }}
              disabled={detecting}
            >
              <LocateFixed className="size-4" />
              {detecting ? "Finding" : "Use GPS"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <LocationHydrationBoundary>{location.address}</LocationHydrationBoundary>
            <span>•</span>
            <span>{hydrated ? status : "Choose delivery location"}</span>
            <span>•</span>
            <span>{permission === "granted" ? "GPS active" : permission === "denied" ? "Manual location" : "GPS optional"}</span>
          </div>
        </section>

        <div className="customer-scroll flex gap-2 overflow-x-auto pb-1">
          <ModeButton active={discoveryMode === "scheduled"} onClick={() => { setDiscoveryMode("scheduled"); setActiveChip("All"); }}>Scheduled Orders</ModeButton>
          <ModeButton active={discoveryMode === "catering"} onClick={() => { setDiscoveryMode("catering"); setActiveChip("Catering Available"); }}>Catering</ModeButton>
          {landingChips.map((chip) => (
            <FilterPill key={chip} active={activeChip === chip} onClick={() => setActiveChip(chip)}>
              {chip}
            </FilterPill>
          ))}
          <FilterPill active={nearbyOnly} onClick={() => setNearbyOnly((value) => !value)}>
            Nearby only
          </FilterPill>
        </div>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-orange-600">{discoveryMode === "catering" ? "Catering partners" : "Scheduled partners"}</p>
              <h2 className="text-xl font-black text-slate-950">
                {scheduledRestaurants.length} restaurants near <LocationHydrationBoundary>{location.label}</LocationHydrationBoundary>
              </h2>
            </div>
            <Button type="button" variant="outline" onClick={() => setNearbyOnly((value) => !value)}>
              <SlidersHorizontal className="size-4" />
              {nearbyOnly ? "Show all areas" : "Nearby first"}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {scheduledRestaurants.map((item) => (
              <button key={item.slug} className="group text-left" onClick={() => selectRestaurant(item)}>
                <ScheduleRestaurantCard restaurant={item} mode={discoveryMode} advanceDays={discoveryMode === "catering" ? 120 : 14} />
              </button>
            ))}
            {!scheduledRestaurants.length ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center sm:col-span-2 xl:col-span-4">
                <p className="font-black text-slate-950">No restaurants match these filters.</p>
                <p className="mt-2 text-sm text-slate-500">Try another cuisine, GPS location, or clear one filter.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      <ScheduleOrderDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        restaurant={restaurant}
        value={scheduledOrderValue}
        onConfirm={confirmSchedule}
        maxDays={scheduleDays}
      />
      <button className="inline-flex items-center gap-2 text-sm font-black" onClick={() => setRestaurant(null)}><ArrowLeft className="size-4" />Back to restaurants</button>
      <RestaurantHeader restaurant={restaurant} scheduleDays={scheduleDays} />
      <ScheduleStepper step={step} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <main className="space-y-6">
          {step === 1 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black">Choose date and time</h2>
              <div className="mt-3 grid gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase text-orange-600">Selected slot</p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {selectedSlotData ? `${formatScheduleDate(selectedDate)}, ${formatScheduleSlot(selectedSlotData.slotStart, selectedSlotData.slotEnd)}` : "Select date and time"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">30-minute slots from restaurant working hours.</p>
                </div>
                <Button type="button" className="h-12 bg-orange-600 font-black hover:bg-orange-700" onClick={() => setScheduleDialogOpen(true)}>
                  <CalendarClock className="size-4" />
                  {selectedSlotData ? "Change slot" : "Pick slot"}
                </Button>
              </div>
              <h2 className="mt-6 font-black">Select order type</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <OrderTypeCard type="delivery" active={scheduleType === "delivery"} onClick={() => setScheduleType("delivery")} />
                <OrderTypeCard type="pickup" active={scheduleType === "pickup"} onClick={() => setScheduleType("pickup")} />
                <OrderTypeCard type="bulk" active={scheduleType === "bulk"} onClick={() => setScheduleType("bulk")} />
                <OrderTypeCard type="catering" active={scheduleType === "catering"} onClick={() => setScheduleType("catering")} />
              </div>
              {scheduleType === "catering" ? <div className="mt-4"><CateringForm value={catering} onChange={setCatering} /></div> : null}
              {scheduleType === "bulk" ? <div className="mt-4"><BulkOrderForm value={bulk} onChange={setBulk} /></div> : null}
              <Button className="mt-6 h-12 w-full bg-orange-600 hover:bg-orange-700 sm:w-auto" onClick={continueToMenu}>Continue to Menu</Button>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <h2 className="mr-auto text-xl font-black">Select Items</h2>
                <label className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                  <input className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-500" value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search items..." />
                </label>
              </div>
              <div className="customer-scroll flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
                <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}
                </select>
                <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)}>
                  <option value="all">All cuisines</option>
                  {cuisines.map((cuisine) => <option key={cuisine} value={cuisine}>{cuisine}</option>)}
                </select>
                <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={mealFilter} onChange={(event) => setMealFilter(event.target.value)}>
                  <option value="All">All menu tags</option>
                  {menuFilters.map((meal) => <option key={meal} value={meal}>{meal}</option>)}
                </select>
                <select className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={dietFilter} onChange={(event) => setDietFilter(event.target.value as DietFilter)}>
                  <option value="all">Veg and Non-Veg</option>
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-Veg</option>
                </select>
                <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => { setCategoryFilter("all"); setCuisineFilter("all"); setMealFilter("All"); setDietFilter("all"); setItemQuery(""); }}>
                  <Filter className="size-4" />
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleMenu.map((item) => (
                  <MenuProductCard key={item.id} item={item} quantity={cart.find((line) => line.id === item.id)?.quantity ?? 0} onAdd={() => addItem(item)} onQuantity={(quantity) => updateQuantity(item.id, quantity)} />
                ))}
                {!visibleMenu.length ? (
                  <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 md:col-span-3 xl:col-span-4">
                    No menu items match these filters.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <ScheduleSummary
              restaurantName={restaurant.displayName ?? restaurant.name}
              dateLabel={dateLabel}
              slotLabel={selectedSlotLabel}
              orderType={scheduleType}
              items={cart}
              submitting={submitting}
              taxEnabled={taxEnabled}
              onBack={() => setStep(2)}
              onEditSlot={() => setStep(1)}
              onEditItems={() => setStep(2)}
              onEditType={() => setStep(1)}
              onConfirm={() => void confirmOrder()}
            />
          ) : null}
        </main>
        <div className="hidden xl:block">
          <ScheduleCart items={cart} dateLabel={dateLabel} slotLabel={selectedSlotLabel} orderType={scheduleType} taxEnabled={taxEnabled} onTaxToggle={setTaxEnabled} onQuantity={updateQuantity} onReview={reviewOrder} />
        </div>
      </div>
      <MobileCartBar items={cart} orderType={scheduleType} taxEnabled={taxEnabled} onReview={reviewOrder} />
    </div>
  );
}

function InfoPill({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white/80 p-3 shadow-sm">
      <Icon className="size-5 text-orange-600" />
      <p className="mt-2 text-sm font-black text-slate-950">{title}</p>
      <p className="text-xs font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function ScheduleHeroArt() {
  return (
    <div className="relative min-h-72 rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="absolute right-6 top-6 grid size-24 place-items-center rounded-3xl bg-orange-100 text-orange-600">
        <CalendarClock className="size-12" />
      </div>
      <div className="absolute bottom-6 left-6 w-44 rounded-3xl border border-orange-100 bg-white p-3 shadow-md">
        <div className="relative h-28 overflow-hidden rounded-2xl bg-orange-50">
          <SafeImage src={IMAGE_FALLBACKS.food} alt="Scheduled food" fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="200px" className="object-cover" />
        </div>
        <p className="mt-3 text-sm font-black">Fresh at your time</p>
      </div>
      <div className="absolute bottom-14 right-10 rounded-3xl bg-orange-600 px-5 py-4 text-white shadow-lg">
        <p className="text-xs font-black uppercase">Today</p>
        <p className="text-2xl font-black">11:30 AM</p>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={active ? "h-11 shrink-0 rounded-2xl bg-orange-600 px-5 text-sm font-black text-white shadow-sm" : "h-11 shrink-0 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"} onClick={onClick}>
      {children}
    </button>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={active ? "h-10 shrink-0 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700" : "h-10 shrink-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600"} onClick={onClick}>
      {children}
    </button>
  );
}

function RestaurantHeader({ restaurant, scheduleDays }: { restaurant: Restaurant; scheduleDays: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-24 w-32 overflow-hidden rounded-xl bg-slate-100">
          <SafeImage src={restaurant.image} alt={restaurant.name} fill fallbackSrc={IMAGE_FALLBACKS.restaurant} cloudinaryPreset="restaurantCard" sizes="160px" className="object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-black">{restaurant.displayName ?? restaurant.name}</h1>
          <p className="mt-1 text-sm text-slate-600"><Star className="mr-1 inline size-4 fill-amber-400 text-amber-400" />{restaurant.rating || "New"} · {restaurant.cuisine}</p>
          <p className="mt-1 text-sm text-slate-500">{restaurant.deliveryTime} · Schedule up to {scheduleDays} days in advance</p>
        </div>
      </div>
    </section>
  );
}

function OrderTypeCard({ type, active, onClick }: { type: ScheduleType; active: boolean; onClick: () => void }) {
  const text = type === "delivery" ? "Get it delivered" : type === "pickup" ? "Self pickup" : type === "bulk" ? "For offices and parties" : "Events and quotations";
  return (
    <button type="button" className={active ? "rounded-2xl border border-orange-500 bg-orange-50 p-4 text-left text-orange-700" : "rounded-2xl border border-slate-200 p-4 text-left text-slate-700"} onClick={onClick}>
      <span className="text-sm font-black capitalize">{type}</span>
      <span className="mt-1 block text-xs font-semibold">{text}</span>
    </button>
  );
}

function MenuProductCard({ item, quantity, onAdd, onQuantity }: { item: MenuItem; quantity: number; onAdd: () => void; onQuantity: (quantity: number) => void }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[1.18] bg-orange-50">
        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} cloudinaryPreset="productGrid" sizes="220px" className="object-cover" />
        <span className={item.isVeg ? "absolute left-2 top-2 size-3 rounded-full bg-emerald-500 ring-4 ring-white" : "absolute left-2 top-2 size-3 rounded-full bg-red-500 ring-4 ring-white"} />
        {item.isPopular ? <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">Bestseller</span> : null}
      </div>
      <div className="space-y-2 p-3">
        <div>
          <p className="line-clamp-2 min-h-10 text-sm font-black text-slate-950">{item.name}</p>
          <p className="line-clamp-1 text-xs font-semibold text-slate-500">{humanize(item.category)}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-black">{formatCurrency(item.price)}</span>
          {quantity ? (
            <div className="flex items-center rounded-xl border border-slate-200">
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onQuantity(quantity - 1)}><Minus className="size-4" /></Button>
              <span className="w-6 text-center text-sm font-black">{quantity}</span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onQuantity(quantity + 1)}><Plus className="size-4" /></Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="border-orange-300 text-orange-600" onClick={onAdd}>Add</Button>
          )}
        </div>
      </div>
    </article>
  );
}

function MobileCartBar({ items, orderType, taxEnabled, onReview }: { items: ScheduleCartLine[]; orderType: ScheduleType; taxEnabled: boolean; onReview: () => void }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = taxEnabled ? Math.round(subtotal * 0.05) : 0;
  const packaging = items.length ? 10 : 0;
  const total = subtotal + tax + packaging;
  if (!items.length && orderType !== "catering") return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 xl:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-orange-100 bg-white p-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950">{items.length ? `${items.length} item${items.length > 1 ? "s" : ""}` : "Catering request"}</p>
          <p className="text-xs font-semibold text-slate-500">{formatCurrency(total)}</p>
        </div>
        <Button type="button" className="bg-orange-600 hover:bg-orange-700" onClick={onReview}>Review</Button>
      </div>
    </div>
  );
}

function SuccessScreen({ kind, id, restaurantName, dateLabel, slotLabel, onReset }: { kind: "order" | "catering"; id: string; restaurantName: string; dateLabel: string; slotLabel: string; onReset: () => void }) {
  const isCatering = kind === "catering";
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-20 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-black">{isCatering ? "Catering Request Sent" : "Order Placed"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isCatering ? `${restaurantName} will review your event details and email a revised quotation.` : `We sent your scheduled order to ${restaurantName}. The restaurant will accept it soon.`}
        </p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-sm">
          <p><b>{isCatering ? "Request ID" : "Order ID"}:</b> {id}</p>
          <p><b>Date:</b> {dateLabel}</p>
          <p><b>Time Slot:</b> {slotLabel}</p>
        </div>
        <Button className="mt-5 w-full" onClick={onReset}>Schedule another request</Button>
      </div>
    </div>
  );
}

function buildSlots(dateValue: string, restaurant: Restaurant | null, scheduleType: ScheduleType) {
  const max = scheduleType === "catering" ? 18 : 12;
  return getScheduleSlotsForDate(restaurant, dateValue, scheduleType === "catering" ? 120 : 14, 30)
    .slice(0, max)
    .map((slot) => ({
      value: new Date(`${dateValue}T${slot.slotStart}:00`).toISOString(),
      label: slot.label,
      slotStart: slot.slotStart,
      slotEnd: slot.slotEnd,
    }));
}

function buildDiscoveryChips(restaurants: Restaurant[]) {
  const chips = new Set<string>(["All"]);
  for (const restaurant of restaurants) {
    const tagText = [...(restaurant.tags ?? []), ...(restaurant.categoryTags ?? [])].join(" ").toLowerCase();
    if (restaurant.foodTypes?.includes("veg")) chips.add("Veg");
    if (restaurant.foodTypes?.includes("nonveg")) chips.add("Non-Veg");
    if (Number.parseInt(restaurant.deliveryTime, 10) <= 30) chips.add("Fast Delivery");
    if (tagText.includes("bulk") || restaurant.advancedFeatures?.officeOrdering || restaurant.advancedFeatures?.groupOrdering) chips.add("Bulk Friendly");
    if (tagText.includes("catering") || restaurant.scheduling?.enabled) chips.add("Catering Available");
    for (const value of [
      restaurant.cuisine,
      ...(restaurant.tags ?? []),
      ...(restaurant.categoryTags ?? []),
    ]) {
      const label = value.trim();
      if (label) chips.add(label);
    }
  }
  return Array.from(chips).slice(0, 10);
}

function matchesRestaurant(restaurant: Restaurant, normalizedQuery: string, chip: string, mode: DiscoveryMode) {
  const text = [
    restaurant.name,
    restaurant.displayName,
    restaurant.cuisine,
    restaurant.location,
    restaurant.deliveryTime,
    ...(restaurant.tags ?? []),
    ...(restaurant.categoryTags ?? []),
    ...(restaurant.popularItems ?? []),
  ].join(" ").toLowerCase();
  if (normalizedQuery && !text.includes(normalizedQuery)) return false;
  if (mode === "catering" && chip === "All") return true;
  if (chip === "All") return true;
  if (chip === "Veg") return restaurant.foodTypes?.includes("veg") ?? text.includes("veg");
  if (chip === "Non-Veg") return restaurant.foodTypes?.includes("nonveg") ?? text.includes("non");
  if (chip === "Fast Delivery") return Number.parseInt(restaurant.deliveryTime, 10) <= 30;
  if (chip === "Bulk Friendly") return text.includes("bulk") || text.includes("office") || text.includes("party");
  if (chip === "Catering Available") return true;
  return text.includes(chip.toLowerCase());
}

function matchesMenuItem(item: MenuItem, filters: { query: string; categoryFilter: string; cuisineFilter: string; mealFilter: string; dietFilter: DietFilter }) {
  const text = [item.name, item.description, item.category, ...(item.tags ?? []), ...(item.cuisineIds ?? []), ...(item.dietaryLabels ?? [])].join(" ").toLowerCase();
  if (filters.query && !text.includes(filters.query)) return false;
  if (filters.categoryFilter !== "all" && item.category !== filters.categoryFilter) return false;
  if (filters.cuisineFilter !== "all" && !text.includes(filters.cuisineFilter.toLowerCase())) return false;
  if (filters.mealFilter !== "All" && !text.includes(filters.mealFilter.toLowerCase())) return false;
  if (filters.dietFilter === "veg" && !(item.isVeg || item.foodType === "veg" || item.foodType === "vegan" || item.foodType === "jain")) return false;
  if (filters.dietFilter === "nonveg" && (item.isVeg || item.foodType === "veg" || item.foodType === "vegan" || item.foodType === "jain")) return false;
  return true;
}

function isValidCateringBasics(value: CateringDraft) {
  return Boolean(value.fullName.trim() && value.phone.trim().length >= 8 && value.email.includes("@") && value.guestCount.trim() && value.eventType.trim() && value.eventAddress.trim());
}

function buildCateringNotes(catering: CateringDraft, cart: ScheduleCartLine[], restaurant: Restaurant) {
  const lines = cart.length ? cart.map((item) => `${item.quantity} x ${item.name}`).join(", ") : "Menu undecided; customer wants owner quotation.";
  return [
    `Restaurant: ${restaurant.displayName ?? restaurant.name}`,
    `Event address: ${catering.eventAddress}`,
    `Serving time: ${catering.servingTime || "To be confirmed"}`,
    `Expected budget: ${catering.budget || "Not specified"}`,
    `Items: ${lines}`,
    `Setup required: ${catering.setupRequired ? "Yes" : "No"}`,
    `Vessels needed: ${catering.vesselsNeeded ? "Yes" : "No"}`,
    `Live counter: ${catering.liveCounter ? "Yes" : "No"}`,
    `Notes: ${catering.notes || "No extra notes"}`,
  ].join("\n");
}

function defaultScheduleDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function humanize(value: string) {
  return value.replace(/^cat-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueLocations(locations: CommerceLocation[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = `${location.placeId ?? location.address}-${location.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
