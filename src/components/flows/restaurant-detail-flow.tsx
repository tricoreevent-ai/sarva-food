"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  Loader2,
  MoreVertical,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import { usePublicCategories, usePublicCuisines, usePublicMenu, usePublicRestaurant } from "@/hooks/use-public-data";
import { useAppStore } from "@/lib/app-store";
import { type CartLine, useCartStore } from "@/lib/cart-store";
import { isOfferActive, isOfferForSurface, offerAppliesToFulfillment, sortOffers } from "@/lib/offer-engine";
import { readableOrderId } from "@/lib/order-display";
import { getRestaurantOperatingStatus } from "@/lib/restaurant-operating-status";
import type { MenuItem, Offer, Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type WizardStep = "menu" | "offers" | "details" | "confirm" | "success";
type FulfillmentType = "delivery" | "parcel" | "dine-in";
type ViewMode = "grid" | "list";
type OrderTiming = "now" | "scheduled";

type CustomerForm = {
  name: string;
  phone: string;
  address: string;
  landmark: string;
  notes: string;
};

const STEP_LABELS: Array<{ id: WizardStep; label: string }> = [
  { id: "menu", label: "Menu" },
  { id: "offers", label: "Offers" },
  { id: "details", label: "Details" },
  { id: "confirm", label: "Confirm" },
];

const ORDER_TYPES: Array<{ id: FulfillmentType; label: string; helper: string; icon: typeof Bike }> = [
  { id: "delivery", label: "Delivery", helper: "Address required", icon: Bike },
  { id: "parcel", label: "Pickup", helper: "Collect from counter", icon: Package },
  { id: "dine-in", label: "Dine-in", helper: "Address optional", icon: Home },
];

export function RestaurantDetailFlow({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchIntent = searchParams.get("intent") ?? searchParams.get("mode");
  const scheduleLaunch = launchIntent === "schedule" || launchIntent === "scheduled";
  const { restaurant, status, retry } = usePublicRestaurant(slug);
  const { items: menu, offers, status: menuStatus, retry: retryMenu } = usePublicMenu(restaurant?.slug);
  const { categories: masterCategories } = usePublicCategories();
  const { cuisines: masterCuisines } = usePublicCuisines();
  const auth = useAuthUser();
  const customerData = useCustomerData(auth.user?.uid);
  const createOrder = useAppStore((state) => state.createOrder);
  const cartItems = useCartStore((state) => state.items);
  const offerCode = useCartStore((state) => state.offerCode);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const applyOffer = useCartStore((state) => state.applyOffer);
  const clearCart = useCartStore((state) => state.clearCart);

  const [step, setStep] = useState<WizardStep>("menu");
  const [query, setQuery] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [foodTypeFilters, setFoodTypeFilters] = useState<string[]>([]);
  const [mealFilters, setMealFilters] = useState<string[]>([]);
  const [spiceFilters, setSpiceFilters] = useState<string[]>([]);
  const [cuisineFilters, setCuisineFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [popularOnly, setPopularOnly] = useState(false);
  const [chefSpecialOnly, setChefSpecialOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [comboOnly, setComboOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode] = useState<ViewMode>("list");
  const [visibleCount, setVisibleCount] = useState(12);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [orderTiming, setOrderTiming] = useState<OrderTiming>(() => scheduleLaunch ? "scheduled" : "now");
  const [scheduledDate, setScheduledDate] = useState(() => defaultScheduleDate());
  const [scheduledTime, setScheduledTime] = useState(() => defaultScheduleTime());
  const [couponDraft, setCouponDraft] = useState("");
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    phone: "",
    address: "",
    landmark: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number; prep: number; scheduledLabel?: string } | null>(null);
  const [customerDistance, setCustomerDistance] = useState<{ key: string; value: number | null }>({ key: "", value: null });

  const restaurantCart = useMemo(
    () => (restaurant ? cartItems.filter((item) => item.restaurantSlug === restaurant.slug) : []),
    [cartItems, restaurant],
  );
  const restaurantCartQuantities = useMemo(
    () => new Map(restaurantCart.map((item) => [item.id, item.quantity])),
    [restaurantCart],
  );

  const visibleOffers = useMemo(
    () => sortOffers(offers.filter((offer) => isOfferForSurface(offer, "restaurant") && isOfferActive(offer))),
    [offers],
  );
  const customerSignedIn = auth.state === "authenticated" && Boolean(auth.user?.uid || auth.profile?.uid) && (auth.profile?.role ? auth.profile.role === "customer" : true);

  const filterOptions = useMemo(() => buildFilterOptions(menu, masterCategories, masterCuisines), [masterCategories, masterCuisines, menu]);
  const restaurantLocationKey = restaurant ? `${restaurant.slug}:${restaurant.latitude ?? ""}:${restaurant.longitude ?? ""}` : "";
  const customerDistanceKm = customerDistance.key === restaurantLocationKey ? customerDistance.value : null;
  const filteredMenu = useMemo(() => {
    const normalizedQuery = normalize(query);
    return menu.filter((item) => {
      if (categoryFilters.length && !categoryFilters.some((value) => normalize(item.category) === normalize(value))) return false;
      if (foodTypeFilters.length && !foodTypeFilters.some((value) => itemMatchesFoodType(item, value))) return false;
      if (mealFilters.length && !mealFilters.some((value) => itemMatchesToken(item, value))) return false;
      if (spiceFilters.length && !spiceFilters.some((value) => normalize(item.spiceLevel) === normalize(value))) return false;
      if (cuisineFilters.length && !cuisineFilters.some((value) => menuItemHasCuisine(item, value))) return false;
      if (tagFilters.length && !tagFilters.some((value) => itemMatchesToken(item, value))) return false;
      if (popularOnly && !item.isPopular) return false;
      if (chefSpecialOnly && !itemMatchesToken(item, "chef")) return false;
      if (comboOnly && !itemMatchesToken(item, "combo")) return false;
      if (availableOnly && item.soldOut) return false;
      if (!normalizedQuery) return true;
      return [item.name, item.description, item.category, item.subcategory, item.spiceLevel, ...(item.tags ?? []), ...(item.badges ?? []), ...(item.searchKeywords ?? []), ...(item.cuisineIds ?? [])]
        .filter(Boolean)
        .some((value) => normalize(value).includes(normalizedQuery));
    });
  }, [availableOnly, categoryFilters, chefSpecialOnly, comboOnly, cuisineFilters, foodTypeFilters, mealFilters, menu, popularOnly, query, spiceFilters, tagFilters]);

  const totals = useMemo(
    () => calculateTotals(restaurantCart, offerCode, visibleOffers, fulfillmentType, restaurant),
    [fulfillmentType, offerCode, restaurant, restaurantCart, visibleOffers],
  );
  const scheduledFor = useMemo(
    () => orderTiming === "scheduled" ? buildScheduledDateTime(scheduledDate, scheduledTime) : null,
    [orderTiming, scheduledDate, scheduledTime],
  );
  const scheduledForLabel = scheduledFor ? formatScheduleDateTime(scheduledFor) : "";

  useEffect(() => {
    if (!restaurant || typeof restaurant.latitude !== "number" || typeof restaurant.longitude !== "number" || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    let active = true;
    const id = window.setTimeout(() => {
      if (!active) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!active) return;
          setCustomerDistance({
            key: restaurantLocationKey,
            value: calculateDistanceKm(
              { latitude: position.coords.latitude, longitude: position.coords.longitude },
              { latitude: restaurant.latitude, longitude: restaurant.longitude },
            ),
          });
        },
        () => {
          if (active) setCustomerDistance({ key: restaurantLocationKey, value: null });
        },
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 4500 },
      );
    }, 1200);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, [restaurant, restaurantLocationKey]);

  useEffect(() => {
    const profile = customerData.profile ?? (auth.profile?.role === "customer" ? auth.profile : null);
    const profileDetails = profile as { displayName?: string; phone?: string } | null;
    const defaultAddress = customerData.addresses.find((address) => address.isDefault) ?? customerData.addresses[0];
    const addressDetails = defaultAddress as { fullAddress?: string; landmark?: string } | undefined;
    const nextName = profileDetails?.displayName || auth.user?.displayName || "";
    const nextPhone = profileDetails?.phone || "";
    const nextAddress = addressDetails?.fullAddress || defaultAddress?.address || "";
    const nextLandmark = addressDetails?.landmark || "";

    if (!nextName && !nextPhone && !nextAddress && !nextLandmark) return;

    const timerId = window.setTimeout(() => {
      setCustomer((current) => {
        const next = {
          ...current,
          name: current.name || nextName,
          phone: current.phone || nextPhone,
          address: current.address || nextAddress,
          landmark: current.landmark || nextLandmark,
        };
        return next.name === current.name && next.phone === current.phone && next.address === current.address && next.landmark === current.landmark ? current : next;
      });
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [auth.profile, auth.user?.displayName, customerData.addresses, customerData.profile]);

  useEffect(() => {
    if (!scheduleLaunch) return;
    window.setTimeout(() => {
      document.getElementById("restaurant-menu-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [scheduleLaunch]);

  if (status === "loading") {
    return (
      <main className="container-page py-6">
        <SkeletonGrid count={4} />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="container-page py-6">
        <RetryState onRetry={retry} />
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="container-page py-6">
        <EmptyStateCard
          title="Restaurant is not live"
          description="This restaurant was not found or has not been approved yet."
          actionLabel="Browse restaurants"
          actionHref="/restaurants"
        />
      </main>
    );
  }

  const cartCount = restaurantCart.reduce((sum, item) => sum + item.quantity, 0);
  const canContinue = restaurantCart.length > 0;
  const contactPhone = restaurant.contact?.phone ?? restaurant.ownerProfile?.businessPhone ?? "";
  const contactWhatsApp = restaurant.contact?.whatsapp ?? restaurant.ownerProfile?.businessWhatsapp ?? contactPhone;
  const heroTitle = restaurant.displayName ?? restaurant.name;
  const operatingStatus = getRestaurantOperatingStatus(restaurant);
  const activeFilterCount = getActiveFilterCount({
    categoryFilters,
    foodTypeFilters,
    mealFilters,
    spiceFilters,
    cuisineFilters,
    tagFilters,
    popularOnly,
    chefSpecialOnly,
    comboOnly,
    availableOnly,
  });

  const resetMenuFilters = () => {
    setCategoryFilters([]);
    setFoodTypeFilters([]);
    setMealFilters([]);
    setSpiceFilters([]);
    setCuisineFilters([]);
    setTagFilters([]);
    setPopularOnly(false);
    setChefSpecialOnly(false);
    setComboOnly(false);
    setAvailableOnly(true);
    setQuery("");
  };

  const goTo = (next: WizardStep) => {
    if (next !== "menu" && !canContinue) {
      toast.error("Please add at least one item first.");
      return;
    }
    if (next !== "menu" && orderTiming === "now" && !operatingStatus.open) {
      showClosedRestaurantPrompt(operatingStatus, startScheduledOrder);
      return;
    }
    if ((next === "details" || next === "confirm") && !customerSignedIn) {
      const redirectPath = typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `/restaurant/${slug}`;
      toast.error("Please sign in before entering customer details.");
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToMenu = () => {
    setStep("menu");
    window.setTimeout(() => {
      document.getElementById("restaurant-menu-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const startOrderNow = () => {
    setOrderTiming("now");
    goToMenu();
  };

  const startScheduledOrder = () => {
    setOrderTiming("scheduled");
    goToMenu();
  };

  const addMenuItem = (item: MenuItem) => {
    if (orderTiming === "now" && !operatingStatus.open) {
      showClosedRestaurantPrompt(operatingStatus, startScheduledOrder);
      return;
    }
    addItem(item);
    toast.success(`${item.name} added.`);
  };

  const validateDetails = () => {
    const scheduleError = validateOrderSchedule(orderTiming, scheduledDate, scheduledTime, restaurant);
    if (scheduleError) return scheduleError;
    if (customer.name.trim().length < 2) return "Enter customer name.";
    if (customer.phone.replace(/\D/g, "").length < 10) return "Enter a valid phone number.";
    if (fulfillmentType === "delivery" && customer.address.trim().length < 8) return "Delivery address is required.";
    return "";
  };

  const submitOrder = async () => {
    const error = validateDetails();
    if (error) {
      toast.error(error);
      setStep("details");
      return;
    }
    if (!restaurantCart.length) {
      toast.error("Your cart is empty.");
      setStep("menu");
      return;
    }
    if (orderTiming === "now" && !operatingStatus.open) {
      showClosedRestaurantPrompt(operatingStatus, startScheduledOrder);
      return;
    }

    setSubmitting(true);
    try {
      const createdAt = new Date().toISOString();
      const scheduledIso = scheduledFor?.toISOString();
      const orderLines = restaurantCart.map((item) => ({
        itemId: item.id,
        name: item.name,
        price: itemPrice(item, fulfillmentType),
        quantity: item.quantity,
      }));
      const order = await createOrder({
        restaurantSlug: restaurant.slug,
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: [customer.address.trim(), customer.landmark.trim()].filter(Boolean).join(", "),
        },
        lines: orderLines,
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          deliveryFee: totals.deliveryFee + totals.packingCharge,
          tax: totals.tax,
          total: totals.total,
        },
        offerCode: totals.appliedOffer?.code,
        payment: "cod",
        channel: "Web",
        fulfillmentType,
        scheduleMode: orderTiming === "scheduled" ? "scheduled" : "now",
        scheduledFor: scheduledIso,
        scheduledStatus: orderTiming === "scheduled" ? "requested" : undefined,
        prepEstimateMinutes: estimatePrepMinutes(restaurantCart),
        cutoffAt: scheduledFor ? new Date(scheduledFor.getTime() - 45 * 60_000).toISOString() : undefined,
      });
      void notifyOwnerAboutOrder({
        orderId: order.id,
        restaurantId: restaurant.id || restaurant.slug,
        restaurantName: heroTitle,
        ownerEmail: restaurant.ownerProfile?.businessEmail || restaurant.contact?.supportEmail || "",
        ownerPhone: restaurant.ownerProfile?.businessPhone || restaurant.contact?.phone || "",
        fulfillmentType,
        scheduleMode: orderTiming === "scheduled" ? "scheduled" : "now",
        scheduledFor: scheduledIso,
        scheduledLabel: orderTiming === "scheduled" ? scheduledForLabel : "",
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: [customer.address.trim(), customer.landmark.trim()].filter(Boolean).join(", "),
          notes: customer.notes.trim(),
        },
        lines: orderLines,
        offerCode: totals.appliedOffer?.code || "",
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          packingCharge: totals.packingCharge,
          deliveryFee: totals.deliveryFee,
          tax: totals.tax,
          total: totals.total,
        },
      });
      clearCart();
      setSuccessOrder({
        id: readableOrderId({
          id: order.id,
          channel: "Web",
          orderType: fulfillmentType,
          createdAt,
        }),
        total: totals.total,
        prep: estimatePrepMinutes(restaurantCart),
        scheduledLabel: orderTiming === "scheduled" ? scheduledForLabel : "",
      });
      setStep("success");
      toast.success(orderTiming === "scheduled" ? "Scheduled order sent to the restaurant." : "Order sent to the restaurant.");
    } catch {
      toast.error("Could not place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] pb-28 text-slate-950 md:pb-10">
      {step === "menu" ? (
        <MobileRestaurantLanding
          restaurant={restaurant}
          title={heroTitle}
          customerDistanceKm={customerDistanceKm}
          orderTiming={orderTiming}
          scheduledDate={scheduledDate}
          scheduledTime={scheduledTime}
          scheduledLabel={scheduledForLabel}
          onModeChange={setOrderTiming}
          onDateChange={setScheduledDate}
          onTimeChange={setScheduledTime}
          query={query}
          setQuery={setQuery}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          offers={visibleOffers}
          onApplyOffer={(code) => {
            applyOffer(code);
            toast.success(`${code} applied.`);
          }}
          menuStatus={menuStatus}
          retryMenu={retryMenu}
          filteredMenu={filteredMenu}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          fulfillmentType={fulfillmentType}
          quantities={restaurantCartQuantities}
          onAdd={addMenuItem}
          onQty={updateQuantity}
        />
      ) : null}

      <div className={step === "menu" ? "hidden xl:block" : "hidden xl:block"}>
        <HeroSection restaurant={restaurant} title={heroTitle} contactPhone={contactPhone} contactWhatsApp={contactWhatsApp} customerDistanceKm={customerDistanceKm} onStart={startOrderNow} onSchedule={startScheduledOrder} />
      </div>

      {step === "success" && successOrder ? (
        <SuccessStep order={successOrder} restaurant={restaurant} contactPhone={contactPhone} contactWhatsApp={contactWhatsApp} onNewOrder={() => setStep("menu")} />
      ) : (
        <div className="container-page grid gap-6 py-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-6">
            {step !== "menu" ? <StepIndicator current={step} onSelect={goTo} /> : null}

            {step === "menu" ? (
              <div className="hidden xl:block">
                <OrderTimingStrip
                  restaurant={restaurant}
                  mode={orderTiming}
                  scheduledDate={scheduledDate}
                  scheduledTime={scheduledTime}
                  scheduledLabel={scheduledForLabel}
                  onModeChange={setOrderTiming}
                  onDateChange={setScheduledDate}
                  onTimeChange={setScheduledTime}
                />

                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
                  <aside className="order-2 space-y-6 xl:order-1">
                    <OfferStrip offers={visibleOffers} onApply={(code) => {
                      applyOffer(code);
                      toast.success(`${code} applied.`);
                    }} />
                    <RestaurantInfoCard restaurant={restaurant} />
                  </aside>

                  <div id="restaurant-menu-panel" className="order-1 rounded-2xl bg-white/95 p-3 shadow-sm sm:p-4 xl:order-2">
                    <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search dishes, combos, cuisines..."
                          className="h-11 w-full rounded-lg border border-orange-100 bg-white pl-10 pr-4 text-sm font-semibold text-slate-950 outline-none ring-orange-500/20 transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4"
                        />
                      </div>
                      <Button variant="outline" className="h-11 rounded-lg border-orange-200 bg-white px-4 font-black text-slate-950 hover:bg-orange-50" onClick={() => setFiltersOpen(true)}>
                        <SlidersHorizontal className="size-4 text-orange-600" />
                        Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
                      </Button>
                    </div>
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-orange-600">Recommended for you</p>
                        <h2 className="text-2xl font-black">Choose your food</h2>
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">{filteredMenu.length} items</span>
                    </div>
                    {menuStatus === "loading" ? (
                      <SkeletonGrid count={8} />
                    ) : menuStatus === "error" ? (
                      <RetryState onRetry={retryMenu} />
                    ) : filteredMenu.length ? (
                      <>
                        <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4" : "grid gap-3"}>
                          {filteredMenu.slice(0, visibleCount).map((item) => (
                            <MenuCard
                              key={item.id}
                              item={item}
                              fulfillmentType={fulfillmentType}
                              quantity={restaurantCartQuantities.get(item.id) ?? 0}
                              viewMode={viewMode}
                              onAdd={() => addMenuItem(item)}
                              onQty={(quantity) => updateQuantity(item.id, quantity)}
                            />
                          ))}
                        </div>
                        {filteredMenu.length > visibleCount ? (
                          <div className="mt-5 text-center">
                            <Button variant="outline" onClick={() => setVisibleCount((count) => count + 12)}>
                              Load more items
                              <ChevronRight className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                        <EmptyStateCard title="No matching items" description="Try removing filters or search with a different dish name." actionHref={null} />
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {step === "offers" ? (
              <OfferValidationStep
                offers={visibleOffers}
                cartItems={restaurantCart}
                offerCode={offerCode}
                couponDraft={couponDraft}
                setCouponDraft={setCouponDraft}
                fulfillmentType={fulfillmentType}
                totals={totals}
                applyOffer={(code) => {
                  const normalizedCode = code.trim().toUpperCase();
                  applyOffer(normalizedCode);
                  toast.success(normalizedCode ? `${normalizedCode} selected.` : "Offer removed.");
                }}
                onBack={() => goTo("menu")}
                onNext={() => goTo("details")}
              />
            ) : null}

            {step === "details" ? (
              <CustomerDetailsStep
                restaurant={restaurant}
                customer={customer}
                setCustomer={setCustomer}
                fulfillmentType={fulfillmentType}
                setFulfillmentType={setFulfillmentType}
                orderTiming={orderTiming}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                scheduledLabel={scheduledForLabel}
                setOrderTiming={setOrderTiming}
                setScheduledDate={setScheduledDate}
                setScheduledTime={setScheduledTime}
                onBack={() => goTo("offers")}
                onNext={() => {
                  const error = validateDetails();
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  goTo("confirm");
                }}
              />
            ) : null}

            {step === "confirm" ? (
              <ConfirmStep
                restaurant={restaurant}
                cartItems={restaurantCart}
                fulfillmentType={fulfillmentType}
                customer={customer}
                totals={totals}
                orderTiming={orderTiming}
                scheduledForLabel={scheduledForLabel}
                contactPhone={contactPhone}
                contactWhatsApp={contactWhatsApp}
                submitting={submitting}
                onBack={() => goTo("details")}
                onSubmit={submitOrder}
              />
            ) : null}
          </section>

          <aside className="hidden xl:block">
            <CartSummary
              restaurant={restaurant}
              items={restaurantCart}
              fulfillmentType={fulfillmentType}
              totals={totals}
              onQty={updateQuantity}
              onRemove={removeItem}
              onAction={() => goTo(nextStep(step))}
              actionLabel={cartActionLabel(step)}
            />
          </aside>
        </div>
      )}

      {step !== "success" && step !== "confirm" ? (
        <FloatingCart
          count={cartCount}
          total={totals.total}
          step={step}
          disabled={!canContinue}
          onClick={() => goTo(nextStep(step))}
        />
      ) : null}

      <AdvancedFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        options={filterOptions}
        categoryFilters={categoryFilters}
        setCategoryFilters={setCategoryFilters}
        foodTypeFilters={foodTypeFilters}
        setFoodTypeFilters={setFoodTypeFilters}
        mealFilters={mealFilters}
        setMealFilters={setMealFilters}
        spiceFilters={spiceFilters}
        setSpiceFilters={setSpiceFilters}
        cuisineFilters={cuisineFilters}
        setCuisineFilters={setCuisineFilters}
        tagFilters={tagFilters}
        setTagFilters={setTagFilters}
        popularOnly={popularOnly}
        setPopularOnly={setPopularOnly}
        chefSpecialOnly={chefSpecialOnly}
        setChefSpecialOnly={setChefSpecialOnly}
        comboOnly={comboOnly}
        setComboOnly={setComboOnly}
        availableOnly={availableOnly}
        setAvailableOnly={setAvailableOnly}
        resultCount={filteredMenu.length}
        onReset={resetMenuFilters}
      />
    </main>
  );
}

function MobileRestaurantLanding({
  restaurant,
  title,
  customerDistanceKm,
  orderTiming,
  scheduledDate,
  scheduledTime,
  scheduledLabel,
  onModeChange,
  onDateChange,
  onTimeChange,
  query,
  setQuery,
  activeFilterCount,
  onOpenFilters,
  offers,
  onApplyOffer,
  menuStatus,
  retryMenu,
  filteredMenu,
  visibleCount,
  setVisibleCount,
  fulfillmentType,
  quantities,
  onAdd,
  onQty,
}: {
  restaurant: Restaurant;
  title: string;
  customerDistanceKm: number | null;
  orderTiming: OrderTiming;
  scheduledDate: string;
  scheduledTime: string;
  scheduledLabel: string;
  onModeChange: (value: OrderTiming) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  offers: Offer[];
  onApplyOffer: (code: string) => void;
  menuStatus: "idle" | "loading" | "success" | "error";
  retryMenu: () => void;
  filteredMenu: MenuItem[];
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  fulfillmentType: FulfillmentType;
  quantities: Map<string, number>;
  onAdd: (item: MenuItem) => void;
  onQty: (id: string, quantity: number) => void;
}) {
  const status = getRestaurantOperatingStatus(restaurant);
  const address = restaurant.address || restaurant.location;
  const heroImage = normalizeHeroImages(restaurant)[0] ?? IMAGE_FALLBACKS.restaurant;
  const eta = restaurant.deliveryTime || (typeof customerDistanceKm === "number" ? `${estimateDeliveryMinutes(customerDistanceKm)} mins` : "");
  const priceForOne = restaurant.priceForTwo ? Math.round(restaurant.priceForTwo / 2) : null;

  function focusSearch() {
    document.getElementById("mobile-restaurant-search")?.focus();
  }

  function shareRestaurant() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const nav = typeof navigator === "undefined" ? null : navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav?.share) {
      void nav.share({ title, text: `Order from ${title}`, url }).catch(() => undefined);
      return;
    }
    if (url && nav?.clipboard) {
      void nav.clipboard.writeText(url).then(() => toast.success("Restaurant link copied."));
    }
  }

  return (
    <div className="xl:hidden">
      <section className="relative min-h-[220px] overflow-hidden bg-slate-950 text-white">
        <SafeImage src={heroImage} alt={`${title} food banner`} fill priority fallbackSrc={IMAGE_FALLBACKS.restaurant} sizes="(max-width: 1279px) 100vw, 50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/82" />

        <div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-4">
          <Button asChild size="icon" variant="ghost" className="size-11 rounded-full border border-white/25 bg-black/20 text-white backdrop-blur" aria-label="Back to restaurants">
            <Link href="/restaurants">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex min-w-0 flex-1 justify-center">
            {address ? (
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-2 text-xs font-black text-white backdrop-blur">
                <MapPin className="size-4 shrink-0 text-orange-400" />
                <span className="truncate">{restaurant.location}</span>
                <ChevronDown className="size-4 shrink-0" />
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="icon" variant="ghost" className="size-11 rounded-full bg-white text-slate-950 shadow-sm" onClick={focusSearch} aria-label="Search dishes">
              <Search className="size-5" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="size-11 rounded-full bg-white text-slate-950 shadow-sm" onClick={shareRestaurant} aria-label="Share restaurant">
              <Share2 className="size-5" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="size-11 rounded-full bg-white text-slate-950 shadow-sm" aria-label="More restaurant actions">
              <MoreVertical className="size-5" />
            </Button>
          </div>
        </div>

        <div className="relative z-10 px-4 pb-6 pt-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className={status.open ? "rounded-full bg-emerald-500 text-white" : "rounded-full bg-amber-500 text-white"}>{status.label}</Badge>
            {status.detail ? <Badge className="rounded-full bg-black/30 text-white ring-1 ring-white/25">{status.detail}</Badge> : null}
          </div>
          {restaurant.logo ? (
            <div className="relative mb-3 size-14 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg">
              <SafeImage src={restaurant.logo} alt={`${title} logo`} fill fallbackSrc={IMAGE_FALLBACKS.logo} sizes="56px" className="object-cover" />
            </div>
          ) : null}
          <h1 className="flex items-center gap-2 text-4xl font-black tracking-tight">
            <span className="min-w-0 truncate">{title}</span>
            {restaurant.approved || restaurant.profileComplete ? <CheckCircle2 className="size-7 shrink-0 fill-orange-600 text-white" /> : null}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-white/92">
            {restaurant.rating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                {restaurant.rating} {restaurant.reviewCount ? `(${restaurant.reviewCount}+ reviews)` : ""}
              </span>
            ) : null}
            {restaurant.cuisine ? <span>• {restaurant.cuisine}</span> : null}
            {eta ? <span>• {eta}</span> : null}
            {priceForOne ? <span>• {formatCurrency(priceForOne)} for one</span> : null}
            {typeof customerDistanceKm === "number" ? <span>• {customerDistanceKm} km</span> : null}
          </div>
          {address ? <p className="mt-2 line-clamp-1 text-sm font-semibold text-white/85">{address}</p> : null}
        </div>
      </section>

      <section className="relative z-10 -mt-4 rounded-t-[1.5rem] bg-[#fffaf5] px-4 pb-5 pt-4">
        <OrderTimingStrip
          restaurant={restaurant}
          mode={orderTiming}
          scheduledDate={scheduledDate}
          scheduledTime={scheduledTime}
          scheduledLabel={scheduledLabel}
          onModeChange={onModeChange}
          onDateChange={onDateChange}
          onTimeChange={onTimeChange}
        />

        <div className="sticky top-0 z-30 -mx-4 mt-4 border-y border-orange-100 bg-[#fffaf5]/95 px-4 py-3 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                id="mobile-restaurant-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dishes, combos..."
                className="h-12 w-full rounded-xl border border-orange-100 bg-white pl-10 pr-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-500/15"
              />
            </div>
            <Button type="button" variant="outline" className="h-12 rounded-xl border-orange-200 bg-white px-3 font-black text-slate-950" onClick={onOpenFilters}>
              <SlidersHorizontal className="size-4 text-orange-600" />
              {activeFilterCount ? `${activeFilterCount}` : "Filters"}
            </Button>
          </div>
        </div>

        <MobileOfferRail offers={offers} onApply={onApplyOffer} />

        <section id="restaurant-menu-panel" className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">Recommended for you</p>
              <h2 className="text-2xl font-black tracking-tight">Choose your food</h2>
            </div>
            <span className="shrink-0 text-sm font-black text-slate-500">{filteredMenu.length} items</span>
          </div>

          {menuStatus === "loading" ? (
            <div className="grid gap-3">
              <MobileMenuSkeleton />
              <MobileMenuSkeleton />
              <MobileMenuSkeleton />
            </div>
          ) : menuStatus === "error" ? (
            <RetryState onRetry={retryMenu} />
          ) : filteredMenu.length ? (
            <div className="grid gap-3">
              {filteredMenu.slice(0, visibleCount).map((item) => (
                <MobileMenuItemCard
                  key={item.id}
                  item={item}
                  fulfillmentType={fulfillmentType}
                  quantity={quantities.get(item.id) ?? 0}
                  onAdd={() => onAdd(item)}
                  onQty={(quantity) => onQty(item.id, quantity)}
                />
              ))}
              {filteredMenu.length > visibleCount ? (
                <Button variant="outline" className="h-12 rounded-xl border-orange-200 bg-white font-black" onClick={() => setVisibleCount((count) => count + 12)}>
                  Load more items
                  <ChevronRight className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : (
            <EmptyStateCard title="No matching items" description="Try removing filters or search with a different dish name." actionHref={null} />
          )}
        </section>

        <MobileRestaurantAbout restaurant={restaurant} />
      </section>
    </div>
  );
}

function MobileOfferRail({ offers, onApply }: { offers: Offer[]; onApply: (code: string) => void }) {
  if (!offers.length) return null;
  return (
    <section className="mt-4">
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {offers.slice(0, 5).map((offer) => (
          <button
            key={offer.code}
            type="button"
            onClick={() => onApply(offer.code)}
            className="relative min-h-28 w-[min(82vw,360px)] shrink-0 overflow-hidden rounded-2xl bg-emerald-50 p-4 text-left shadow-sm"
          >
            {(offer.mobileBanner ?? offer.banner ?? offer.image) ? (
              <SafeImage src={offer.mobileBanner ?? offer.banner ?? offer.image} alt={offer.title} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="360px" className="object-cover opacity-25" />
            ) : (
              <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/60" />
            )}
            <div className="relative max-w-[70%]">
              <Badge className="bg-emerald-100 text-emerald-700">{offer.promoTag || `${offer.discount}${offer.discountType === "percentage" ? "% off" : " off"}`}</Badge>
              <h3 className="mt-2 line-clamp-2 text-lg font-black">{offer.title}</h3>
              <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-600">
                Use code: <span className="text-emerald-700">{offer.code}</span>
                {offer.minimumOrder ? ` • Min order ${formatCurrency(offer.minimumOrder)}` : ""}
              </p>
            </div>
            <span className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-emerald-700 shadow-md">
              <ChevronRight className="size-6" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MobileMenuItemCard({
  item,
  fulfillmentType,
  quantity,
  onAdd,
  onQty,
}: {
  item: MenuItem;
  fulfillmentType: FulfillmentType;
  quantity: number;
  onAdd: () => void;
  onQty: (quantity: number) => void;
}) {
  const price = itemPrice(item, fulfillmentType);
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <span
          aria-label={item.isVeg ? "Vegetarian item" : "Non-vegetarian item"}
          className={`mb-2 grid size-4 place-items-center rounded border ${item.isVeg ? "border-emerald-600 text-emerald-600" : "border-red-600 text-red-600"}`}
        >
          <span className="size-2 rounded-full bg-current" />
        </span>
        <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="line-clamp-2 text-base font-black leading-tight hover:text-orange-600">
          {item.name}
        </Link>
        <p className="mt-1 font-black">{formatCurrency(price)}</p>
        {item.averageRating ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-black text-emerald-700">
            <Star className="size-3 fill-emerald-600 text-emerald-600" />
            {item.averageRating}
            {item.reviewCount ? <span className="text-slate-500">({item.reviewCount})</span> : null}
          </p>
        ) : null}
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-600">{item.description}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="relative block size-20 overflow-hidden rounded-xl bg-orange-50" aria-label={`View ${item.name} details`}>
          <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="80px" className="object-cover" />
          {item.soldOut ? <span className="absolute inset-0 grid place-items-center bg-white/75 text-xs font-black text-slate-700">Unavailable</span> : null}
        </Link>
        <MobileQtyButton quantity={quantity} soldOut={item.soldOut} onAdd={onAdd} onQty={onQty} />
      </div>
    </article>
  );
}

function MobileQtyButton({ quantity, soldOut, onAdd, onQty }: { quantity: number; soldOut?: boolean; onAdd: () => void; onQty: (quantity: number) => void }) {
  if (quantity > 0) {
    return (
      <div className="grid h-8 w-20 grid-cols-3 overflow-hidden rounded-lg border bg-white text-sm font-black">
        <button type="button" className="grid place-items-center hover:bg-orange-50" onClick={() => onQty(quantity - 1)} aria-label="Decrease quantity">
          <Minus className="size-3.5" />
        </button>
        <span className="grid place-items-center">{quantity}</span>
        <button type="button" className="grid place-items-center hover:bg-orange-50" onClick={() => onQty(quantity + 1)} aria-label="Increase quantity">
          <Plus className="size-3.5" />
        </button>
      </div>
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={soldOut} onClick={onAdd} className="h-8 w-20 rounded-lg border-orange-300 px-2 text-xs font-black text-orange-700 hover:bg-orange-50">
      Add
      <Plus className="size-3.5" />
    </Button>
  );
}

function MobileMenuSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="space-y-3">
        <div className="h-4 w-20 rounded-full bg-orange-100" />
        <div className="h-5 w-40 rounded-full bg-slate-100" />
        <div className="h-4 w-16 rounded-full bg-slate-100" />
        <div className="h-10 rounded-xl bg-slate-100" />
      </div>
      <div className="size-20 justify-self-end rounded-xl bg-orange-100" />
    </div>
  );
}

function MobileRestaurantAbout({ restaurant }: { restaurant: Restaurant }) {
  const address = restaurant.address || restaurant.location;
  const contactPhone = restaurant.contact?.phone ?? restaurant.ownerProfile?.businessPhone ?? "";
  const contactWhatsApp = restaurant.contact?.whatsapp ?? restaurant.ownerProfile?.businessWhatsapp ?? contactPhone;
  const mapsHref = restaurant.googleMapLocation || mapsUrl(restaurant);

  return (
    <section className="mt-6 pt-5">
      <h2 className="text-2xl font-black">About this restaurant</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 text-sm font-bold text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-2"><CheckCircle2 className="size-4 text-emerald-600" />Hygienic packaging</span>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-orange-50 px-3 py-2"><CalendarClock className="size-4 text-orange-600" />On-time delivery</span>
        {restaurant.rating ? <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-yellow-50 px-3 py-2"><Star className="size-4 text-yellow-600" />Top rated restaurant</span> : null}
        {restaurant.fssaiLicense ? <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-2"><CheckCircle2 className="size-4 text-slate-600" />FSSAI certified</span> : null}
      </div>
      {address ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
          <MapPin className="mt-1 size-4 shrink-0 text-orange-600" />
          <span>{address}</span>
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-black">
        {contactPhone ? (
          <a href={`tel:${contactPhone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-slate-950 shadow-sm">
            <Phone className="size-4 text-orange-600" />
            Call
          </a>
        ) : null}
        {contactWhatsApp ? (
          <a href={whatsappHref(contactWhatsApp, `Hi ${restaurant.name}, I need help with an order.`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 shadow-sm">
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        ) : null}
        {mapsHref ? (
          <a href={mapsHref} target="_blank" rel="noreferrer" className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-50 text-orange-800 shadow-sm">
            <MapPin className="size-4" />
            View address
          </a>
        ) : null}
      </div>
    </section>
  );
}

function HeroSection({
  restaurant,
  title,
  contactPhone,
  contactWhatsApp,
  customerDistanceKm,
  onStart,
  onSchedule,
}: {
  restaurant: Restaurant;
  title: string;
  contactPhone: string;
  contactWhatsApp: string;
  customerDistanceKm: number | null;
  onStart: () => void;
  onSchedule: () => void;
}) {
  const minOrder = restaurant.minPrice;
  const deliveryFee = restaurant.deliverySettings?.baseFee ?? restaurant.deliveryFee;
  const freeAbove = restaurant.deliverySettings?.freeDeliveryAbove;
  const status = getRestaurantOperatingStatus(restaurant);
  const address = restaurant.address || restaurant.location;
  const mapsHref = restaurant.googleMapLocation || mapsUrl(restaurant);
  const eta = restaurant.deliveryTime || (typeof customerDistanceKm === "number" ? `${estimateDeliveryMinutes(customerDistanceKm)} min` : "");
  const heroImages = useMemo(() => normalizeHeroImages(restaurant), [restaurant]);

  return (
    <section className="pt-0 md:pt-4">
      <div className="relative overflow-hidden bg-slate-950 text-white shadow-xl shadow-orange-950/10">
        <HeroBannerCarousel images={heroImages} title={title} />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/68 to-black/10" />
        <div className="relative grid min-h-[30svh] max-h-[260px] content-end gap-2 px-4 py-4 md:min-h-[380px] md:max-h-none md:gap-4 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <Badge className={status.open ? "rounded-full bg-emerald-500 text-white" : "rounded-full bg-amber-500 text-white"}>{status.label}</Badge>
            {status.detail ? <Badge className="rounded-full bg-white/15 text-white ring-1 ring-white/20">{status.detail}</Badge> : null}
          </div>
          {restaurant.logo ? (
            <div className="relative mt-2 size-12 overflow-hidden rounded-full border-2 border-white/80 bg-white shadow-xl md:mt-5 md:size-20 md:border-4">
              <SafeImage src={restaurant.logo} alt={`${title} logo`} fill fallbackSrc={IMAGE_FALLBACKS.logo} sizes="80px" className="object-cover" />
            </div>
          ) : null}
          <h1 className="mt-2 text-3xl font-black tracking-tight md:mt-4 md:text-7xl">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-white/90 md:mt-3 md:gap-3 md:text-sm">
            {restaurant.rating ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 md:px-3 md:py-1.5">
                <Star className="size-3.5 fill-yellow-400 text-yellow-400 md:size-4" />
                {restaurant.rating} {restaurant.reviewCount ? `(${restaurant.reviewCount}+ reviews)` : ""}
              </span>
            ) : null}
            {restaurant.cuisine ? <span>{restaurant.cuisine}</span> : null}
            {eta ? <span>{eta}</span> : null}
          </div>
          {address ? (
            <p className="mt-4 hidden max-w-2xl items-start gap-2 text-base leading-7 text-white/80 md:flex">
              <MapPin className="mt-1 size-4 shrink-0" />
              <span>{address}</span>
            </p>
          ) : null}
          <div className="mt-5 hidden flex-col gap-3 md:mt-6 md:flex md:flex-row">
            <Button size="lg" onClick={onStart} className="h-12 bg-orange-600 text-white hover:bg-orange-700 sm:h-11">
              Start order
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="secondary" onClick={onSchedule} className="h-12 bg-white text-slate-950 hover:bg-orange-50 sm:h-11">
              <CalendarClock className="size-4" />
              Schedule
            </Button>
            <Button asChild size="lg" variant="secondary" className="hidden bg-white/12 text-white hover:bg-white/20 sm:inline-flex">
              <a href={whatsappHref(contactWhatsApp, `Hi ${title}, I want to place an order.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
            {contactPhone ? (
              <Button asChild size="lg" variant="secondary" className="hidden bg-white/12 text-white hover:bg-white/20 sm:inline-flex">
                <a href={`tel:${contactPhone}`}>
                  <Phone className="size-4" />
                  {contactPhone}
                </a>
              </Button>
            ) : null}
            {mapsHref ? (
              <Button asChild size="lg" variant="secondary" className="hidden bg-white/12 text-white hover:bg-white/20 sm:inline-flex">
                <a href={mapsHref} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" />
                  Map
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="hidden grid-cols-2 gap-2 rounded-2xl bg-black/32 p-3 backdrop-blur md:grid md:grid-cols-4 lg:grid-cols-2">
          {typeof minOrder === "number" ? <HeroFact icon={ShoppingBag} label="Minimum order" value={formatCurrency(minOrder)} /> : null}
          {typeof deliveryFee === "number" ? <HeroFact icon={Bike} label="Delivery fee" value={formatCurrency(deliveryFee)} /> : null}
          {typeof freeAbove === "number" ? <HeroFact icon={Sparkles} label="Free delivery" value={`above ${formatCurrency(freeAbove)}`} /> : null}
          {typeof customerDistanceKm === "number" ? <HeroFact icon={MapPin} label="Distance" value={`${customerDistanceKm} km`} /> : null}
          {restaurant.deliveryRadiusKm ? <HeroFact icon={Bike} label="Delivery radius" value={`${restaurant.deliveryRadiusKm} km`} /> : null}
          {restaurant.cloudKitchen ? <HeroFact icon={Package} label="Kitchen type" value="Cloud kitchen" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <Icon className="size-5 text-orange-300" />
      <p className="mt-2 text-xs font-semibold text-white/70">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function OrderTimingStrip({
  restaurant,
  mode,
  scheduledDate,
  scheduledTime,
  scheduledLabel,
  onModeChange,
  onDateChange,
  onTimeChange,
}: {
  restaurant: Restaurant;
  mode: OrderTiming;
  scheduledDate: string;
  scheduledTime: string;
  scheduledLabel: string;
  onModeChange: (value: OrderTiming) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  const nowSelected = mode === "now";
  const scheduledSelected = mode === "scheduled";
  const selectedButtonClass = "bg-orange-600 text-white shadow-lg shadow-orange-500/20";
  const idleButtonClass = "bg-white text-slate-800 hover:bg-orange-50";
  const slotSelectId = useId();
  const scheduleDays = useMemo(() => buildScheduleDays(restaurant), [restaurant]);
  const selectedDay = scheduleDays.find((day) => day.value === scheduledDate);
  const selectedSlot = selectedDay?.slots.find((slot) => slot.value === scheduledTime);
  const totalSlots = scheduleDays.reduce((sum, day) => sum + day.slots.length, 0);

  useEffect(() => {
    if (mode !== "scheduled" || totalSlots === 0) return;
    const currentValid = Boolean(selectedDay?.slots.some((slot) => slot.value === scheduledTime));
    if (currentValid) return;
    const firstDay = scheduleDays.find((day) => day.slots.length > 0);
    const firstSlot = firstDay?.slots[0];
    if (!firstDay || !firstSlot) return;
    onDateChange(firstDay.value);
    onTimeChange(firstSlot.value);
  }, [mode, onDateChange, onTimeChange, scheduleDays, scheduledTime, selectedDay, totalSlots]);

  return (
    <section className="rounded-2xl bg-transparent p-0 shadow-none">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onModeChange("now")}
          aria-pressed={nowSelected}
          className={`flex min-h-12 items-center gap-2 rounded-xl border-0 px-2.5 py-2 text-left transition sm:min-h-16 sm:gap-3 sm:p-3 ${nowSelected ? selectedButtonClass : idleButtonClass}`}
        >
          <span className={`grid size-8 shrink-0 place-items-center rounded-xl sm:size-9 ${nowSelected ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"}`}>
            <ZapIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black leading-tight sm:text-base">Order right now</span>
            <span className={`hidden text-xs font-semibold sm:block ${nowSelected ? "text-white/85" : "text-muted-foreground"}`}>Send immediately</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("scheduled")}
          aria-pressed={scheduledSelected}
          className={`flex min-h-12 items-center gap-2 rounded-xl border-0 px-2.5 py-2 text-left transition sm:min-h-16 sm:gap-3 sm:p-3 ${scheduledSelected ? selectedButtonClass : idleButtonClass}`}
        >
          <span className={`grid size-8 shrink-0 place-items-center rounded-xl sm:size-9 ${scheduledSelected ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"}`}>
            <CalendarClock className="size-4 sm:size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black leading-tight sm:text-base">Schedule later</span>
            <span className={`hidden text-xs font-semibold sm:block ${scheduledSelected ? "text-white/85" : "text-muted-foreground"}`}>Choose a slot</span>
          </span>
        </button>
      </div>
      {mode === "scheduled" ? (
        <div className="mt-3 rounded-2xl bg-orange-50/70 p-3">
          {totalSlots ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Delivery slot</p>
                  <p className="text-xs font-semibold text-slate-600">Slots follow restaurant hours.</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700">{selectedSlot?.label ?? "Pick time"}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Schedule date">
                {scheduleDays.map((day) => {
                  const active = day.value === scheduledDate;
                  const disabled = day.slots.length === 0;
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onDateChange(day.value);
                        onTimeChange(day.slots[0]?.value ?? "");
                      }}
                      aria-pressed={active}
                      className={`min-w-20 rounded-xl px-3 py-2 text-center text-xs transition ${active ? "bg-orange-600 text-white shadow-md shadow-orange-500/20" : "bg-white text-slate-800 hover:bg-orange-100"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                    >
                      <span className="block font-black">{day.shortLabel}</span>
                      <span className={`mt-0.5 block font-semibold ${active ? "text-white/80" : "text-slate-500"}`}>{day.dateLabel}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <label htmlFor={slotSelectId} className="sr-only">Select delivery time slot</label>
                <select
                  id={slotSelectId}
                  name="scheduleSlot"
                  value={scheduledTime}
                  onChange={(event) => onTimeChange(event.target.value)}
                  className="h-11 w-full rounded-xl border-0 bg-white px-3 text-sm font-black text-slate-950 outline-none ring-1 ring-orange-100 focus:ring-4 focus:ring-orange-500/20 sm:hidden"
                >
                  {(selectedDay?.slots ?? []).map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
                <div className="hidden max-h-40 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid lg:grid-cols-4">
                  {(selectedDay?.slots ?? []).map((slot) => {
                    const active = slot.value === scheduledTime;
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => onTimeChange(slot.value)}
                        aria-pressed={active}
                        className={`h-10 rounded-xl text-xs font-black transition ${active ? "bg-orange-600 text-white shadow-md shadow-orange-500/20" : "bg-white text-slate-800 hover:bg-orange-100"}`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                {scheduledLabel ? `Selected: ${scheduledLabel}` : "Choose a valid slot"}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
              Scheduled ordering is unavailable because operating hours are not configured for upcoming days.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ZapIcon() {
  return <Sparkles className="size-5" />;
}

function HeroBannerCarousel({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const total = images.length;
  const activeIndex = total ? active % total : 0;

  useEffect(() => {
    if (total <= 1) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % total);
    }, 4500);
    return () => window.clearInterval(id);
  }, [total]);

  function goTo(index: number) {
    if (!total) return;
    setActive((index + total) % total);
  }

  return (
    <div className="absolute inset-0">
      {images.map((image, index) => (
        <SafeImage
          key={`${image}-${index}`}
          src={image}
          alt={`${title} banner ${index + 1}`}
          fill
          priority={index === 0}
          loading={index === 0 ? undefined : index === 1 ? "eager" : "lazy"}
          fallbackSrc={IMAGE_FALLBACKS.restaurant}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 100vw, 80vw"
          className={`object-cover opacity-0 transition-opacity duration-700 ease-out ${index === activeIndex ? "opacity-70" : ""}`}
        />
      ))}
      {total > 1 ? (
        <div className="absolute bottom-5 right-5 z-10 hidden items-center gap-2 sm:flex">
          <button type="button" className="grid size-9 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur hover:bg-black/65" onClick={() => goTo(activeIndex - 1)} aria-label="Previous banner">
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex gap-1 rounded-full bg-black/45 px-2 py-2 ring-1 ring-white/20 backdrop-blur">
            {images.map((image, index) => (
              <button
                key={`dot-${image}-${index}`}
                type="button"
                className={index === activeIndex ? "size-2.5 rounded-full bg-white" : "size-2.5 rounded-full bg-white/35"}
                onClick={() => goTo(index)}
                aria-label={`Show banner ${index + 1}`}
              />
            ))}
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur hover:bg-black/65" onClick={() => goTo(activeIndex + 1)} aria-label="Next banner">
            <ChevronRight className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StepIndicator({ current, onSelect }: { current: WizardStep; onSelect: (step: WizardStep) => void }) {
  const currentIndex = STEP_LABELS.findIndex((step) => step.id === current);
  return (
    <div className="rounded-2xl bg-white p-2 shadow-sm">
      <div className="grid grid-cols-4 gap-1">
        {STEP_LABELS.map((step, index) => {
          const active = step.id === current;
          const complete = index < currentIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => (complete || active ? onSelect(step.id) : undefined)}
              className={`flex min-h-12 items-center justify-center rounded-2xl px-2 text-xs font-black transition ${
                active ? "bg-orange-50 text-orange-600" : complete ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground"
              }`}
            >
              <span className={`mr-2 hidden size-6 place-items-center rounded-full sm:grid ${active ? "bg-orange-600 text-white" : complete ? "bg-emerald-100" : "bg-slate-100"}`}>
                {complete ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OfferStrip({ offers, onApply }: { offers: Offer[]; onApply: (code: string) => void }) {
  if (!offers.length) return null;
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-black">Offers for you</h2>
      <div className="mt-4 grid gap-3">
        {offers.slice(0, 3).map((offer, index) => (
          <button
            key={offer.code}
            type="button"
            onClick={() => onApply(offer.code)}
            className="group relative min-h-32 overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-emerald-50" />
            {(offer.mobileBanner ?? offer.banner ?? offer.image) ? (
              <SafeImage src={offer.mobileBanner ?? offer.banner ?? offer.image} alt={offer.title} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="300px" className="object-cover opacity-35 transition group-hover:scale-105" />
            ) : (
              <div className={`absolute -right-8 -top-8 size-32 rounded-full ${index % 2 ? "bg-emerald-200/70" : "bg-orange-200/70"}`} />
            )}
            <div className="relative space-y-3 p-5">
              <Badge className="bg-orange-600 text-white">{offer.promoTag || `${offer.discount}${offer.discountType === "flat" ? " off" : "% off"}`}</Badge>
              <div>
                <h3 className="line-clamp-2 text-lg font-black">{offer.title}</h3>
                <p className="line-clamp-2 text-sm font-semibold text-muted-foreground">{offer.subtitle || offer.description}</p>
              </div>
              <div className="rounded-xl bg-white/70 p-2 text-xs font-bold">
                Use code: <span className="text-orange-600">{offer.code}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RestaurantInfoCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">About {restaurant.displayName ?? restaurant.name}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        Serving {restaurant.cuisine || "fresh food"} with restaurant-managed menus, direct ordering, and live availability.
      </p>
      <div className="mt-5 space-y-3 text-sm font-semibold text-slate-700">
        {restaurant.profileComplete || restaurant.approved ? (
          <p className="flex items-center gap-3"><CheckCircle2 className="size-4 text-emerald-600" />Verified restaurant</p>
        ) : null}
        {restaurant.fssaiLicense ? (
          <p className="flex items-center gap-3"><CheckCircle2 className="size-4 text-emerald-600" />FSSAI certified</p>
        ) : null}
        {restaurant.deliverySettings?.baseFee !== undefined ? (
          <p className="flex items-center gap-3"><Bike className="size-4 text-slate-500" />Restaurant delivery available</p>
        ) : null}
        {restaurant.orderingEnabled !== false ? (
          <p className="flex items-center gap-3"><ShoppingBag className="size-4 text-slate-500" />Direct ordering enabled</p>
        ) : null}
      </div>
    </section>
  );
}

function MenuCard({
  item,
  fulfillmentType,
  quantity,
  viewMode,
  onAdd,
  onQty,
}: {
  item: MenuItem;
  fulfillmentType: FulfillmentType;
  quantity: number;
  viewMode: ViewMode;
  onAdd: () => void;
  onQty: (quantity: number) => void;
}) {
  const price = itemPrice(item, fulfillmentType);
  if (viewMode === "list") {
    return (
      <div className="flex gap-3 rounded-2xl bg-white p-2 shadow-sm transition-transform duration-200">
        <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} aria-label={`View ${item.name} details`}>
          <MenuImage item={item} className="size-20 shrink-0" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="line-clamp-1 font-black hover:text-orange-600">{item.name}</Link>
          <p className="line-clamp-2 text-xs font-semibold text-muted-foreground">{item.description}</p>
          <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="mt-1 text-xs font-black text-orange-600 hover:text-orange-700">More</Link>
          <p className="mt-auto pt-1 font-black">{formatCurrency(price)}</p>
        </div>
        <QtyButton quantity={quantity} soldOut={item.soldOut} onAdd={onAdd} onQty={onQty} />
      </div>
    );
  }
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="relative block aspect-[1.18/1] overflow-hidden bg-orange-50" aria-label={`View ${item.name} details`}>
        <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="(max-width: 768px) 50vw, 260px" className="object-cover transition duration-300 group-hover:scale-105" />
        <span className={`absolute left-2 top-2 grid size-5 place-items-center rounded-md border bg-white ${item.isVeg ? "text-emerald-600" : "text-red-600"}`}>
          <span className="size-2 rounded-full bg-current" />
        </span>
        {item.isPopular ? <Badge className="absolute bottom-2 left-2 bg-yellow-400 text-slate-950">Bestseller</Badge> : null}
        {item.soldOut ? <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-black">Unavailable</div> : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="line-clamp-2 font-black hover:text-orange-600">
            {item.name}
          </Link>
          <p className="mt-1 line-clamp-2 min-h-8 text-xs font-semibold text-muted-foreground">{item.description}</p>
          <Link href={`/restaurant/${item.restaurantSlug}/item/${item.id}`} className="mt-1 inline-flex text-xs font-black text-orange-600 hover:text-orange-700">
            More
          </Link>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="font-black">{formatCurrency(price)}</span>
          <QtyButton quantity={quantity} soldOut={item.soldOut} onAdd={onAdd} onQty={onQty} />
        </div>
      </div>
    </article>
  );
}

function MenuImage({ item, className }: { item: MenuItem; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-orange-50 ${className}`}>
      <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="96px" className="object-cover" />
    </div>
  );
}

function QtyButton({ quantity, soldOut, onAdd, onQty }: { quantity: number; soldOut?: boolean; onAdd: () => void; onQty: (quantity: number) => void }) {
  if (quantity > 0) {
    return (
      <div className="grid h-9 grid-cols-3 overflow-hidden rounded-xl border bg-white text-sm font-black">
        <button type="button" className="grid w-9 place-items-center hover:bg-orange-50" onClick={() => onQty(quantity - 1)} aria-label="Decrease quantity">
          <Minus className="size-4" />
        </button>
        <span className="grid w-9 place-items-center">{quantity}</span>
        <button type="button" className="grid w-9 place-items-center hover:bg-orange-50" onClick={() => onQty(quantity + 1)} aria-label="Increase quantity">
          <Plus className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={soldOut} onClick={onAdd} className="h-9 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50">
      Add
      <Plus className="size-4" />
    </Button>
  );
}

function OfferValidationStep({
  offers,
  cartItems,
  offerCode,
  couponDraft,
  setCouponDraft,
  fulfillmentType,
  totals,
  applyOffer,
  onBack,
  onNext,
}: {
  offers: Offer[];
  cartItems: CartLine[];
  offerCode: string;
  couponDraft: string;
  setCouponDraft: (value: string) => void;
  fulfillmentType: FulfillmentType;
  totals: CartTotals;
  applyOffer: (code: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const selectedOfferCode = offerCode.trim().toUpperCase();
  const draftCode = couponDraft.trim().toUpperCase();
  const removeOffer = () => {
    setCouponDraft("");
    applyOffer("");
  };
  const selectOffer = (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    setCouponDraft(normalizedCode);
    applyOffer(normalizedCode);
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle eyebrow="Step 2" title="Validate offers" description="Apply owner-created coupons and review eligibility before entering customer details." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={couponDraft}
              onChange={(event) => setCouponDraft(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter" && draftCode) selectOffer(draftCode);
              }}
              placeholder="Enter coupon code"
              className="h-12 min-w-0 flex-1 rounded-2xl border px-4 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-orange-500/20"
            />
            <Button onClick={() => selectOffer(draftCode)} disabled={!draftCode}>Apply</Button>
          </div>
          {offerCode ? (
            <div className={`flex items-start justify-between gap-3 rounded-2xl p-3 text-sm font-bold ${totals.appliedOffer ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              <span>{totals.appliedOffer ? `${selectedOfferCode} applied. You saved ${formatCurrency(totals.discount)}.` : `${selectedOfferCode} is not valid for this cart or order type.`}</span>
              <button type="button" onClick={removeOffer} className="shrink-0 rounded-xl bg-white/70 px-3 py-1 text-xs font-black text-current">
                Remove
              </button>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {offers.length ? offers.map((offer) => {
              const eligible = offerEligible(offer, cartItems, fulfillmentType);
              const selected = selectedOfferCode === offer.code.toUpperCase();
              return (
                <button key={offer.code} type="button" onClick={() => (selected ? removeOffer() : selectOffer(offer.code))} className={`rounded-2xl border p-4 text-left transition hover:border-orange-300 ${selected ? "border-orange-600 bg-orange-50 shadow-sm" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <Badge className={eligible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{eligible ? "Eligible" : "Rules apply"}</Badge>
                    <span className={`shrink-0 rounded-xl px-3 py-1 text-xs font-black ${selected ? "bg-white text-orange-700" : "bg-orange-600 text-white"}`}>
                      {selected ? "Remove" : "Apply"}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-black">{offer.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{offer.description}</p>
                  <div className="mt-4 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Offer code</p>
                    <p className="mt-1 break-all text-base font-black text-orange-700">{offer.code}</p>
                  </div>
                  <p className="mt-3 text-xs font-bold leading-5 text-muted-foreground">
                    Min {formatCurrency(offer.minimumOrder)} {offer.appliesTo?.length ? `• ${offer.appliesTo.join(", ")}` : ""}
                  </p>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed p-5 text-sm font-semibold text-muted-foreground">
                No offers are live for this restaurant right now.
              </div>
            )}
          </div>
        </div>
        <MiniCart items={cartItems} totals={totals} />
      </div>
      <WizardActions onBack={onBack} onNext={onNext} nextLabel="Continue to details" />
    </section>
  );
}

function CustomerDetailsStep({
  restaurant,
  customer,
  setCustomer,
  fulfillmentType,
  setFulfillmentType,
  orderTiming,
  scheduledDate,
  scheduledTime,
  scheduledLabel,
  setOrderTiming,
  setScheduledDate,
  setScheduledTime,
  onBack,
  onNext,
}: {
  restaurant: Restaurant;
  customer: CustomerForm;
  setCustomer: (value: CustomerForm) => void;
  fulfillmentType: FulfillmentType;
  setFulfillmentType: (value: FulfillmentType) => void;
  orderTiming: OrderTiming;
  scheduledDate: string;
  scheduledTime: string;
  scheduledLabel: string;
  setOrderTiming: (value: OrderTiming) => void;
  setScheduledDate: (value: string) => void;
  setScheduledTime: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const update = (key: keyof CustomerForm, value: string) => setCustomer({ ...customer, [key]: value });
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle eyebrow="Step 3" title="Customer details" description="Delivery needs an address. Pickup and dine-in can be completed with name and phone." />
      <div className="mt-5">
        <OrderTimingStrip
          restaurant={restaurant}
          mode={orderTiming}
          scheduledDate={scheduledDate}
          scheduledTime={scheduledTime}
          scheduledLabel={scheduledLabel}
          onModeChange={setOrderTiming}
          onDateChange={setScheduledDate}
          onTimeChange={setScheduledTime}
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {ORDER_TYPES.map(({ id, label, helper, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setFulfillmentType(id)} className={`rounded-2xl border p-4 text-left transition ${fulfillmentType === id ? "border-orange-600 bg-orange-50" : "bg-white hover:bg-orange-50/50"}`}>
            <Icon className="size-5 text-orange-600" />
            <p className="mt-2 font-black">{label}</p>
            <p className="text-xs font-semibold text-muted-foreground">{helper}</p>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Field label="Customer name" value={customer.name} onChange={(value) => update("name", value)} placeholder="Enter name" required />
        <Field label="Phone number" value={customer.phone} onChange={(value) => update("phone", value)} placeholder="+91 98765 43210" inputMode="tel" required />
        {fulfillmentType === "delivery" ? (
          <>
            <Field label="Delivery address" value={customer.address} onChange={(value) => update("address", value)} placeholder="House, street, area" required />
            <Field label="Landmark" value={customer.landmark} onChange={(value) => update("landmark", value)} placeholder="Near landmark" />
          </>
        ) : null}
        <label className="md:col-span-2">
          <span className="text-sm font-black">Order notes</span>
          <textarea value={customer.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Less spicy, extra sauce, delivery instructions..." className="mt-2 min-h-24 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-orange-500/20" />
        </label>
      </div>
      <WizardActions onBack={onBack} onNext={onNext} nextLabel="Review order" />
    </section>
  );
}

function ConfirmStep({
  restaurant,
  cartItems,
  fulfillmentType,
  customer,
  totals,
  orderTiming,
  scheduledForLabel,
  contactPhone,
  contactWhatsApp,
  submitting,
  onBack,
  onSubmit,
}: {
  restaurant: Restaurant;
  cartItems: CartLine[];
  fulfillmentType: FulfillmentType;
  customer: CustomerForm;
  totals: CartTotals;
  orderTiming: OrderTiming;
  scheduledForLabel: string;
  contactPhone: string;
  contactWhatsApp: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle eyebrow="Step 4" title={orderTiming === "scheduled" ? "Confirm scheduled order" : "Confirm order"} description="Review items, taxes, charges, contact details, and send the order to the restaurant." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="rounded-2xl bg-orange-50/60 p-4">
            <p className="text-sm font-black">{restaurant.displayName ?? restaurant.name}</p>
            <p className="text-sm text-muted-foreground">
              {fulfillmentLabel(fulfillmentType)} for {customer.name} • {customer.phone}
            </p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700">
              <CalendarClock className="size-4" />
              {orderTiming === "scheduled" ? `Scheduled for ${scheduledForLabel || "selected slot"}` : "Order right now"}
            </p>
            {customer.address ? <p className="mt-2 text-sm font-semibold">{customer.address}{customer.landmark ? `, ${customer.landmark}` : ""}</p> : null}
          </div>
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <MenuImage item={item} className="size-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-black">{item.name}</p>
                <p className="text-sm font-semibold text-muted-foreground">{item.quantity} x {formatCurrency(itemPrice(item, fulfillmentType))}</p>
              </div>
              <p className="font-black">{formatCurrency(itemPrice(item, fulfillmentType) * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <TotalsBlock totals={totals} />
          <div className="grid grid-cols-2 gap-2">
            {contactWhatsApp ? (
              <Button asChild variant="outline">
                <a href={whatsappHref(contactWhatsApp, `Hi ${restaurant.name}, I need help with my order.`)} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {contactPhone ? (
              <Button asChild variant="outline">
                <a href={`tel:${contactPhone}`}>
                  <Phone className="size-4" />
                  Call
                </a>
              </Button>
            ) : null}
          </div>
          <Button className="h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {orderTiming === "scheduled" ? "Send scheduled order" : "Place order and wait for confirmation"}
          </Button>
          <Button className="h-12 w-full" variant="outline" disabled>
            <CreditCard className="size-4" />
            Pay via UPI - Coming soon
          </Button>
        </div>
      </div>
      <div className="mt-5">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to details
        </Button>
      </div>
    </section>
  );
}

function SuccessStep({
  order,
  restaurant,
  contactPhone,
  contactWhatsApp,
  onNewOrder,
}: {
  order: { id: string; total: number; prep: number; scheduledLabel?: string };
  restaurant: Restaurant;
  contactPhone: string;
  contactWhatsApp: string;
  onNewOrder: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-5 text-3xl font-black">{order.scheduledLabel ? "Scheduled order sent!" : "Order sent!"}</h1>
        <p className="mt-2 text-muted-foreground">
          {order.scheduledLabel ? `The restaurant will review your request for ${order.scheduledLabel}.` : "The restaurant will review and confirm your order shortly."}
        </p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
          <InfoRow label="Order ID" value={order.id} />
          <InfoRow label="Restaurant" value={restaurant.displayName ?? restaurant.name} />
          {order.scheduledLabel ? <InfoRow label="Scheduled for" value={order.scheduledLabel} /> : null}
          <InfoRow label="Estimated prep" value={`${order.prep} minutes`} />
          <InfoRow label="Total" value={formatCurrency(order.total)} />
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Button onClick={onNewOrder} className="bg-orange-600 hover:bg-orange-700">Order more</Button>
          {contactWhatsApp ? (
            <Button asChild variant="outline">
              <a href={whatsappHref(contactWhatsApp, `Hi ${restaurant.name}, I placed order ${order.id}.`)} target="_blank" rel="noreferrer">WhatsApp</a>
            </Button>
          ) : null}
          {contactPhone ? (
            <Button asChild variant="outline">
              <a href={`tel:${contactPhone}`}>Call restaurant</a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CartSummary({
  restaurant,
  items,
  fulfillmentType,
  totals,
  onQty,
  onRemove,
  onAction,
  actionLabel,
}: {
  restaurant: Restaurant;
  items: CartLine[];
  fulfillmentType: FulfillmentType;
  totals: CartTotals;
  onQty: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="sticky top-24 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-black">Your Order</h2>
      <p className="text-sm text-muted-foreground">{restaurant.displayName ?? restaurant.name}</p>
      {items.length ? (
        <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <MenuImage item={item} className="size-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-black">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(itemPrice(item, fulfillmentType))}</p>
                </div>
                <button type="button" onClick={() => onRemove(item.id)} className="text-red-500" aria-label="Remove item">
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <QtyButton quantity={item.quantity} onAdd={() => onQty(item.id, item.quantity + 1)} onQty={(quantity) => onQty(item.id, quantity)} />
                <span className="font-black">{formatCurrency(itemPrice(item, fulfillmentType) * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-orange-50/50 p-6 text-center">
          <ShoppingBag className="mx-auto size-10 text-orange-400" />
          <p className="mt-2 font-black">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Add items to continue.</p>
        </div>
      )}
      <div className="mt-4">
        <TotalsBlock totals={totals} />
      </div>
      <Button className="mt-4 h-12 w-full bg-orange-600 hover:bg-orange-700" disabled={!items.length} onClick={onAction}>
        {actionLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function MiniCart({ items, totals }: { items: CartLine[]; totals: CartTotals }) {
  return (
    <div className="rounded-2xl bg-orange-50/70 p-4">
      <h3 className="text-lg font-black">Cart review</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm">
            <span className="line-clamp-1 font-bold">{item.quantity} x {item.name}</span>
            <span className="font-black">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <TotalsBlock totals={totals} compact />
      </div>
    </div>
  );
}

function TotalsBlock({ totals, compact = false }: { totals: CartTotals; compact?: boolean }) {
  return (
    <div className={`space-y-2 ${compact ? "text-sm" : ""}`}>
      <InfoRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
      <InfoRow label="Offer discount" value={`-${formatCurrency(totals.discount)}`} />
      <InfoRow label="Packaging" value={formatCurrency(totals.packingCharge)} />
      <InfoRow label="GST / tax" value={formatCurrency(totals.tax)} />
      <InfoRow label="Delivery" value={formatCurrency(totals.deliveryFee)} />
      <div className="border-t pt-3">
        <InfoRow label="Total" value={formatCurrency(totals.total)} strong />
      </div>
    </div>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "text-lg font-black" : "text-sm"}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function defaultScheduleDate() {
  const date = new Date(Date.now() + 2 * 60 * 60_000);
  return toDateInputValue(date);
}

function defaultScheduleTime() {
  const date = new Date(Date.now() + 2 * 60 * 60_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return toTimeInputValue(date);
}

type ScheduleSlotOption = {
  value: string;
  label: string;
};

type ScheduleDayOption = {
  value: string;
  shortLabel: string;
  dateLabel: string;
  slots: ScheduleSlotOption[];
};

function buildScheduleDays(restaurant: Restaurant): ScheduleDayOption[] {
  if (restaurant.scheduling && restaurant.scheduling.enabled === false) return [];
  const schedule = restaurant.operatingHoursSchedule;
  if (!schedule?.length || restaurant.operatingHoursPreference === "not-specified") return [];

  const slotMinutes = clampSlotMinutes(restaurant.scheduling?.slotMinutes ?? restaurant.deliverySettings?.deliverySlotMinutes ?? 30);
  const cutoffMinutes = restaurant.scheduling?.cutoffMinutes ?? restaurant.scheduling?.minPrepMinutes ?? 45;
  const prepMinutes = restaurant.scheduling?.minPrepMinutes ?? 30;
  const earliest = roundUpDate(new Date(Date.now() + cutoffMinutes * 60_000), slotMinutes);
  const today = new Date();

  return Array.from({ length: 14 }, (_, offset) => {
    const dayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const daySchedule = schedule.find((entry) => entry.day === dayName(dayDate));
    const slots = daySchedule?.open
      ? daySchedule.slots.flatMap((slot) => buildSlotsForDay(dayDate, slot.start, slot.end, slotMinutes, prepMinutes, earliest))
      : [];

    return {
      value: toDateInputValue(dayDate),
      shortLabel: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : dayDate.toLocaleDateString("en-IN", { weekday: "short" }),
      dateLabel: dayDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      slots,
    };
  });
}

function buildSlotsForDay(dayDate: Date, startValue: string, endValue: string, slotMinutes: number, prepMinutes: number, earliest: Date) {
  const startMinutes = scheduleTimeMinutes(startValue);
  const endMinutes = scheduleTimeMinutes(endValue);
  const start = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  const end = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  if (endMinutes <= startMinutes) end.setDate(end.getDate() + 1);

  const latest = new Date(end.getTime() - prepMinutes * 60_000);
  const first = roundUpDate(start.getTime() > earliest.getTime() ? start : earliest, slotMinutes);
  const slots: ScheduleSlotOption[] = [];

  for (let cursor = first; cursor.getTime() <= latest.getTime(); cursor = new Date(cursor.getTime() + slotMinutes * 60_000)) {
    slots.push({
      value: toTimeInputValue(cursor),
      label: formatSlotLabel(cursor),
    });
  }

  return slots;
}

function clampSlotMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 30;
  return Math.max(10, Math.min(120, Math.round(value)));
}

function roundUpDate(date: Date, slotMinutes: number) {
  const rounded = new Date(date);
  const remainder = rounded.getMinutes() % slotMinutes;
  if (remainder) rounded.setMinutes(rounded.getMinutes() + slotMinutes - remainder);
  rounded.setSeconds(0, 0);
  return rounded;
}

function dayName(date: Date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
  return days[date.getDay()];
}

function formatSlotLabel(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildScheduledDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const value = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function validateOrderSchedule(mode: OrderTiming, dateValue: string, timeValue: string, restaurant: Restaurant) {
  if (mode === "now") return "";
  const scheduledFor = buildScheduledDateTime(dateValue, timeValue);
  if (!scheduledFor) return "Choose a schedule date and time.";
  const cutoffMinutes = restaurant.scheduling?.cutoffMinutes ?? restaurant.scheduling?.minPrepMinutes ?? 45;
  const earliest = Date.now() + cutoffMinutes * 60_000;
  if (scheduledFor.getTime() < earliest) return `Schedule at least ${cutoffMinutes} minutes from now.`;
  if (!isScheduledForOpenSlot(restaurant, scheduledFor)) {
    return "Choose a time inside the restaurant's operating hours.";
  }
  return "";
}

function isScheduledForOpenSlot(restaurant: Restaurant, scheduledFor: Date) {
  const schedule = restaurant.operatingHoursSchedule;
  if (!schedule?.length || restaurant.operatingHoursPreference === "not-specified") return false;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const day = days[(scheduledFor.getDay() + 6) % 7];
  const daySchedule = schedule.find((entry) => entry.day === day);
  if (!daySchedule?.open) return false;
  const minutes = scheduledFor.getHours() * 60 + scheduledFor.getMinutes();
  const prepMinutes = restaurant.scheduling?.minPrepMinutes ?? 30;
  return daySchedule.slots.some((slot) => {
    const start = scheduleTimeMinutes(slot.start);
    const end = scheduleTimeMinutes(slot.end);
    const latest = end > start ? end - prepMinutes : end;
    if (end > start) return minutes >= start && minutes <= latest;
    return minutes >= start || minutes <= latest;
  });
}

function scheduleTimeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  return (hours || 0) * 60 + (minutes || 0);
}

function formatScheduleDateTime(value: Date) {
  return value.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function calculateDistanceKm(
  first: { latitude: number; longitude: number },
  second: { latitude?: number; longitude?: number },
) {
  if (typeof second.latitude !== "number" || typeof second.longitude !== "number") return 0;
  const radius = 6371;
  const dLat = ((second.latitude - first.latitude) * Math.PI) / 180;
  const dLon = ((second.longitude - first.longitude) * Math.PI) / 180;
  const lat1 = (first.latitude * Math.PI) / 180;
  const lat2 = (second.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function estimateDeliveryMinutes(distanceKm: number) {
  return Math.max(18, Math.min(55, Math.round(16 + distanceKm * 4)));
}

function mapsUrl(restaurant: Restaurant) {
  if (typeof restaurant.latitude !== "number" || typeof restaurant.longitude !== "number") return "";
  return `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`;
}

function showClosedRestaurantPrompt(status: { detail?: string }, onSchedule: () => void) {
  toast.custom(
    (toastItem) => (
      <div className="w-[min(92vw,380px)] rounded-2xl border border-orange-100 bg-white p-4 text-slate-950 shadow-2xl">
        <h3 className="text-base font-black">Restaurant is currently closed.</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {status.detail ? `${status.detail}. ` : ""}Please wait until the restaurant opens or schedule your order for later.
        </p>
        <div className="mt-4 grid grid-cols-[1.2fr_0.8fr] gap-2">
          <Button
            type="button"
            className="h-11 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700"
            onClick={() => {
              toast.dismiss(toastItem.id);
              onSchedule();
            }}
          >
            Schedule Order
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl font-black" onClick={() => toast.dismiss(toastItem.id)}>
            OK
          </Button>
        </div>
      </div>
    ),
    { duration: 7000 },
  );
}

async function notifyOwnerAboutOrder(payload: Record<string, unknown>) {
  try {
    const response = await fetch("/api/public/order-notification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      console.warn("[Nammude order] Owner email notification was not sent.", body?.error || response.status);
    }
  } catch (error) {
    console.warn("[Nammude order] Owner email notification request failed.", error);
  }
}

function FloatingCart({ count, total, step, disabled, onClick }: { count: number; total: number; step: WizardStep; disabled: boolean; onClick: () => void }) {
  if (disabled) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-40 animate-[fadeIn_220ms_ease-out] rounded-3xl border bg-white p-3 shadow-2xl md:bottom-5 xl:hidden">
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
          <ShoppingBag className="size-5" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-black">{count} item{count === 1 ? "" : "s"} • {formatCurrency(total)}</span>
          <span className="block text-xs font-semibold text-muted-foreground">{cartActionLabel(step)}</span>
        </span>
        <span className="rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white">Continue</span>
      </button>
    </div>
  );
}

function AdvancedFilters({
  open,
  onClose,
  options,
  categoryFilters,
  setCategoryFilters,
  foodTypeFilters,
  setFoodTypeFilters,
  mealFilters,
  setMealFilters,
  spiceFilters,
  setSpiceFilters,
  cuisineFilters,
  setCuisineFilters,
  tagFilters,
  setTagFilters,
  popularOnly,
  setPopularOnly,
  chefSpecialOnly,
  setChefSpecialOnly,
  comboOnly,
  setComboOnly,
  availableOnly,
  setAvailableOnly,
  resultCount,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  options: FilterOptions;
  categoryFilters: string[];
  setCategoryFilters: (value: string[]) => void;
  foodTypeFilters: string[];
  setFoodTypeFilters: (value: string[]) => void;
  mealFilters: string[];
  setMealFilters: (value: string[]) => void;
  spiceFilters: string[];
  setSpiceFilters: (value: string[]) => void;
  cuisineFilters: string[];
  setCuisineFilters: (value: string[]) => void;
  tagFilters: string[];
  setTagFilters: (value: string[]) => void;
  popularOnly: boolean;
  setPopularOnly: (value: boolean) => void;
  chefSpecialOnly: boolean;
  setChefSpecialOnly: (value: boolean) => void;
  comboOnly: boolean;
  setComboOnly: (value: boolean) => void;
  availableOnly: boolean;
  setAvailableOnly: (value: boolean) => void;
  resultCount: number;
  onReset: () => void;
}) {
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const mealOptions = unique(["breakfast", "lunch", "dinner", "snacks", "beverages", ...options.meals]);
  const spiceOptions = unique(["mild", "medium", "spicy", ...options.spiceLevels]);
  const tagOptions = [
    ...options.tags,
    ...(options.hasPopular ? ["bestseller"] : []),
    ...(options.hasCombos ? ["combo"] : []),
    ...(options.hasChefSpecial ? ["chef special"] : []),
  ];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (dragStartY === null) return;
    const distance = event.changedTouches[0]?.clientY - dragStartY;
    setDragStartY(null);
    if (distance > 80) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" onClick={handleOverlayClick}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Menu filters"
        className="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl md:inset-y-4 md:left-auto md:right-4 md:max-h-none md:w-[460px] md:rounded-xl"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => setDragStartY(event.touches[0]?.clientY ?? null)}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600">
              <SlidersHorizontal className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black">Filters</h2>
              <p className="text-sm font-semibold text-muted-foreground">Refine menu items</p>
            </div>
            <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 font-black text-orange-600" onClick={onReset}>
              Reset
            </Button>
            <Button size="icon" variant="ghost" className="rounded-lg" onClick={onClose} aria-label="Close filters">
              <X className="size-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          <FilterChipGroup label="Category" values={categoryFilters} options={options.categories} onChange={setCategoryFilters} />
          <FilterChipGroup label="Cuisine" values={cuisineFilters} options={options.cuisines} onChange={setCuisineFilters} />
          <FilterChipGroup label="Meal type" values={mealFilters} options={mealOptions} onChange={setMealFilters} />
          <FilterChipGroup label="Food type" values={foodTypeFilters} options={options.foodTypes} onChange={setFoodTypeFilters} />
          <FilterChipGroup label="Spice level" values={spiceFilters} options={spiceOptions} onChange={setSpiceFilters} />
          <FilterChipGroup label="Tags" values={tagFilters} options={unique(tagOptions).slice(0, 18)} onChange={setTagFilters} />

          <div className="grid gap-3 border-t border-slate-100 py-4 sm:grid-cols-2">
            {options.hasPopular ? <FilterToggle label="Bestseller only" description="Show popular items only" checked={popularOnly} onChange={setPopularOnly} /> : null}
            {options.hasChefSpecial ? <FilterToggle label="Chef's special" description="Owner-highlighted dishes" checked={chefSpecialOnly} onChange={setChefSpecialOnly} /> : null}
            {options.hasCombos ? <FilterToggle label="Combos" description="Show combo meals only" checked={comboOnly} onChange={setComboOnly} /> : null}
            <FilterToggle label="Available now" description="Hide unavailable items" checked={availableOnly} onChange={setAvailableOnly} />
          </div>
        </div>

        <footer className="sticky bottom-0 grid grid-cols-[minmax(0,1fr)_1.4fr] gap-3 border-t border-slate-100 bg-white p-4">
          <Button type="button" variant="outline" className="h-12 rounded-lg border-0 bg-slate-100 font-black text-slate-950 hover:bg-slate-200" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="h-12 rounded-lg bg-orange-600 font-black text-white hover:bg-orange-700" onClick={onClose}>
            Show {resultCount} result{resultCount === 1 ? "" : "s"}
            <SlidersHorizontal className="size-4" />
          </Button>
        </footer>
      </section>
    </div>
  );
}

function FilterChipGroup({ label, values, options, onChange }: { label: string; values: string[]; options: string[]; onChange: (values: string[]) => void }) {
  if (!options.length) return null;
  const selected = new Set(values.map(normalize));
  return (
    <section className="grid gap-3 border-t border-slate-100 py-4 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-950">{label}</h3>
        {values.length ? (
          <button type="button" className="text-xs font-black text-orange-600" onClick={() => onChange([])}>
            Clear
          </button>
        ) : (
          <span className="text-xs font-black text-orange-600">All</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={!values.length} onClick={() => onChange([])}>All</FilterChip>
        {options.map((option) => (
          <FilterChip
            key={`${label}-${option}`}
            active={selected.has(normalize(option))}
            onClick={() => onChange(toggleFilterValue(values, option))}
          >
            {humanize(option)}
          </FilterChip>
        ))}
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`min-h-11 rounded-lg px-4 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-orange-500/20 ${
        active ? "bg-orange-600 text-white shadow-sm shadow-orange-600/20" : "bg-slate-100 text-slate-800 hover:bg-orange-50 hover:text-orange-700"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FilterToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-20 items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
      <span>
        <span className="block font-black text-slate-950">{label}</span>
        <span className="text-xs font-semibold text-muted-foreground">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-6 accent-orange-600" />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-black">{label}{required ? <span className="text-orange-600"> *</span> : null}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:ring-4 focus:ring-orange-500/20" />
    </label>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-orange-600">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function WizardActions({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <Button onClick={onNext} className="bg-orange-600 hover:bg-orange-700">
        {nextLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function whatsappHref(phone?: string, message?: string) {
  const number = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message ?? "Hi, I need help with an order.");
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

type FilterOptions = {
  categories: string[];
  cuisines: string[];
  meals: string[];
  spiceLevels: string[];
  foodTypes: string[];
  tags: string[];
  hasPopular: boolean;
  hasChefSpecial: boolean;
  hasCombos: boolean;
};

function buildFilterOptions(
  items: MenuItem[],
  masterCategories: Array<{ id: string; slug: string; name: string; sortOrder: number }>,
  masterCuisines: Array<{ id: string; slug: string; name: string; sortOrder: number }>,
): FilterOptions {
  const categories = orderedCategoryNames(items, masterCategories);
  const cuisines = orderedCuisineNames(items, masterCuisines);
  const meals = ["breakfast", "lunch", "dinner"].filter((meal) => items.some((item) => itemMatchesToken(item, meal)));
  const spiceLevels = unique(items.flatMap((item) => (item.spiceLevel ? [item.spiceLevel] : [])));
  const foodTypes = unique(items.flatMap((item) => item.foodType ? [item.foodType] : item.isVeg ? ["veg"] : ["nonveg"]));
  const tags = unique(items.flatMap((item) => [...(item.tags ?? []), ...(item.badges ?? []), ...(item.searchKeywords ?? [])].map(normalize).filter(Boolean)));
  return {
    categories,
    cuisines,
    meals,
    spiceLevels,
    foodTypes,
    tags,
    hasPopular: items.some((item) => item.isPopular || itemMatchesToken(item, "bestseller")),
    hasChefSpecial: items.some((item) => itemMatchesToken(item, "chef special")),
    hasCombos: items.some((item) => itemMatchesToken(item, "combo")),
  };
}

function itemMatchesToken(item: MenuItem, token: string) {
  const normalized = normalize(token);
  return [item.name, item.description, item.category, item.subcategory, item.spiceLevel, ...(item.tags ?? []), ...(item.badges ?? []), ...(item.searchKeywords ?? []), ...(item.dietaryLabels ?? []), ...(item.cuisineIds ?? [])]
    .filter(Boolean)
    .some((value) => normalize(value).includes(normalized));
}

function itemMatchesFoodType(item: MenuItem, foodType: string) {
  const normalizedFoodType = normalize(foodType);
  const itemFoodType = normalize(item.foodType);
  if (itemFoodType === normalizedFoodType) return true;
  if (normalizedFoodType === "veg") return Boolean(item.isVeg);
  if (normalizedFoodType === "nonveg" || normalizedFoodType === "non-veg") return !item.isVeg;
  return itemMatchesToken(item, foodType);
}

function menuItemHasCuisine(item: MenuItem, cuisine: string) {
  const normalizedCuisine = normalize(cuisine);
  return (item.cuisineIds ?? []).some((candidate) => normalize(candidate) === normalizedCuisine)
    || itemMatchesToken(item, cuisine);
}

function toggleFilterValue(values: string[], value: string) {
  const normalizedValue = normalize(value);
  return values.some((item) => normalize(item) === normalizedValue)
    ? values.filter((item) => normalize(item) !== normalizedValue)
    : [...values, value];
}

function getActiveFilterCount({
  categoryFilters,
  foodTypeFilters,
  mealFilters,
  spiceFilters,
  cuisineFilters,
  tagFilters,
  popularOnly,
  chefSpecialOnly,
  comboOnly,
  availableOnly,
}: {
  categoryFilters: string[];
  foodTypeFilters: string[];
  mealFilters: string[];
  spiceFilters: string[];
  cuisineFilters: string[];
  tagFilters: string[];
  popularOnly: boolean;
  chefSpecialOnly: boolean;
  comboOnly: boolean;
  availableOnly: boolean;
}) {
  return categoryFilters.length
    + foodTypeFilters.length
    + mealFilters.length
    + spiceFilters.length
    + cuisineFilters.length
    + tagFilters.length
    + (popularOnly ? 1 : 0)
    + (chefSpecialOnly ? 1 : 0)
    + (comboOnly ? 1 : 0)
    + (availableOnly ? 0 : 1);
}

function orderedCategoryNames(items: MenuItem[], masterCategories: Array<{ id: string; slug: string; name: string; sortOrder: number }>) {
  const present = new Set(items.map((item) => item.category).filter(Boolean));
  const ordered = masterCategories
    .filter((category) => presentHasTaxonomy(present, category))
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((category) => category.name);
  const custom = Array.from(present)
    .filter((category) => !ordered.some((item) => normalize(item) === normalize(category)))
    .sort((first, second) => first.localeCompare(second));
  return [...ordered, ...custom];
}

function orderedCuisineNames(items: MenuItem[], masterCuisines: Array<{ id: string; slug: string; name: string; sortOrder: number }>) {
  const present = new Set(items.flatMap((item) => item.cuisineIds ?? []).filter(Boolean));
  const ordered = masterCuisines
    .filter((cuisine) => presentHasTaxonomy(present, cuisine))
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((cuisine) => cuisine.name);
  const custom = Array.from(present)
    .filter((cuisine) => !ordered.some((item) => normalize(item) === normalize(cuisine)))
    .map(humanize)
    .sort((first, second) => first.localeCompare(second));
  return [...ordered, ...custom];
}

function presentHasTaxonomy(present: Set<string>, item: { id: string; slug: string; name: string }) {
  const values = Array.from(present).map(normalize);
  return [item.id, item.slug, item.name].some((candidate) => values.includes(normalize(candidate)));
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function normalizeHeroImages(restaurant: Restaurant) {
  const seen = new Set<string>();
  const configuredBanners = [
    ...(restaurant.coverImages ?? []),
    restaurant.coverImage,
  ].filter((value): value is string => Boolean(value));
  const images = configuredBanners.length
    ? configuredBanners
    : [restaurant.image || IMAGE_FALLBACKS.restaurant];

  return images
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function normalize(value?: string) {
  return (value ?? "").toLowerCase().replace(/[-_]+/g, " ").trim();
}

function humanize(value: string) {
  return value.replace(/^cat-/, "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function itemPrice(item: MenuItem, fulfillmentType: FulfillmentType) {
  if (fulfillmentType === "dine-in") return item.dineInPrice ?? item.price;
  if (fulfillmentType === "parcel") return item.parcelPrice ?? item.price;
  return item.deliveryPrice ?? item.price;
}

type CartTotals = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  packingCharge: number;
  tax: number;
  total: number;
  appliedOffer: Offer | null;
};

function calculateTotals(items: CartLine[], offerCode: string, offers: Offer[], fulfillmentType: FulfillmentType, restaurant: Restaurant | null): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + itemPrice(item, fulfillmentType) * item.quantity, 0);
  const packingCharge = fulfillmentType === "dine-in" ? 0 : items.reduce((sum, item) => sum + (item.packingCharge ?? 0) * item.quantity, 0);
  const appliedOffer = offers.find((offer) => offer.code.toUpperCase() === offerCode.trim().toUpperCase() && offerEligible(offer, items, fulfillmentType)) ?? null;
  const rawDiscount = appliedOffer
    ? appliedOffer.discountType === "flat" || appliedOffer.offerType === "flat"
      ? Math.min(subtotal, appliedOffer.discount)
      : appliedOffer.discountType === "free-delivery" || appliedOffer.offerType === "free-delivery"
        ? 0
        : Math.round(subtotal * (appliedOffer.discount / 100))
    : 0;
  const discount = appliedOffer?.maxDiscount ? Math.min(rawDiscount, appliedOffer.maxDiscount) : rawDiscount;
  const freeAbove = restaurant?.deliverySettings?.freeDeliveryAbove ?? 399;
  const baseDelivery = fulfillmentType === "delivery" ? restaurant?.deliverySettings?.baseFee ?? restaurant?.deliveryFee ?? 39 : 0;
  const deliveryFee = appliedOffer?.discountType === "free-delivery" || subtotal >= freeAbove ? 0 : baseDelivery;
  const taxable = Math.max(0, subtotal - discount + packingCharge);
  const tax = Math.round(taxable * 0.05);
  return {
    subtotal,
    discount,
    packingCharge,
    deliveryFee,
    tax,
    total: Math.max(0, subtotal - discount + packingCharge + deliveryFee + tax),
    appliedOffer,
  };
}

function offerEligible(offer: Offer, items: CartLine[], fulfillmentType: FulfillmentType) {
  if (!isOfferActive(offer)) return false;
  const subtotal = items.reduce((sum, item) => sum + itemPrice(item, fulfillmentType) * item.quantity, 0);
  if (subtotal < offer.minimumOrder) return false;
  if (!offerAppliesToFulfillment(offer, fulfillmentType)) return false;
  if (offer.applicableItemIds?.length && !items.some((item) => offer.applicableItemIds?.includes(item.id))) return false;
  if (offer.applicableCategories?.length && !items.some((item) => offer.applicableCategories?.includes(item.category))) return false;
  return true;
}

function estimatePrepMinutes(items: CartLine[]) {
  return Math.max(20, Math.min(55, 20 + items.reduce((sum, item) => sum + item.quantity, 0) * 4));
}

function nextStep(step: WizardStep): WizardStep {
  if (step === "menu") return "offers";
  if (step === "offers") return "details";
  if (step === "details") return "confirm";
  return "confirm";
}

function cartActionLabel(step: WizardStep) {
  if (step === "menu") return "View cart";
  if (step === "offers") return "Continue to details";
  if (step === "details") return "Review order";
  return "Confirm order";
}

function fulfillmentLabel(value: FulfillmentType) {
  if (value === "dine-in") return "Dine-in";
  if (value === "parcel") return "Pickup";
  return "Delivery";
}
