"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Grid2X2,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicMenu, usePublicRestaurant } from "@/hooks/use-public-data";
import { useAppStore } from "@/lib/app-store";
import { type CartLine, useCartStore } from "@/lib/cart-store";
import { isOfferActive, isOfferForSurface, offerAppliesToFulfillment, sortOffers } from "@/lib/offer-engine";
import { readableOrderId } from "@/lib/order-display";
import type { MenuItem, Offer, Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type WizardStep = "menu" | "offers" | "details" | "confirm" | "success";
type FulfillmentType = "delivery" | "parcel" | "dine-in";
type ViewMode = "grid" | "list";

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
  const { restaurant, status, retry } = usePublicRestaurant(slug);
  const { items: menu, offers, status: menuStatus, retry: retryMenu } = usePublicMenu(restaurant?.slug);
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
  const [category, setCategory] = useState("all");
  const [diet, setDiet] = useState("all");
  const [meal, setMeal] = useState("all");
  const [spice, setSpice] = useState("all");
  const [cuisine, setCuisine] = useState("all");
  const [tag, setTag] = useState("all");
  const [popularOnly, setPopularOnly] = useState(false);
  const [chefSpecialOnly, setChefSpecialOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [comboOnly, setComboOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(12);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [couponDraft, setCouponDraft] = useState("");
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    phone: "",
    address: "",
    landmark: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ id: string; total: number; prep: number } | null>(null);
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

  const filterOptions = useMemo(() => buildFilterOptions(menu), [menu]);
  const restaurantLocationKey = restaurant ? `${restaurant.slug}:${restaurant.latitude ?? ""}:${restaurant.longitude ?? ""}` : "";
  const customerDistanceKm = customerDistance.key === restaurantLocationKey ? customerDistance.value : null;
  const filteredMenu = useMemo(() => {
    const normalizedQuery = normalize(query);
    return menu.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (diet !== "all" && item.foodType !== diet && (diet === "veg" ? !item.isVeg : item.isVeg)) return false;
      if (meal !== "all" && !itemMatchesToken(item, meal)) return false;
      if (spice !== "all" && item.spiceLevel !== spice) return false;
      if (cuisine !== "all" && !(item.cuisineIds ?? []).includes(cuisine) && !itemMatchesToken(item, cuisine)) return false;
      if (tag !== "all" && !itemMatchesToken(item, tag)) return false;
      if (popularOnly && !item.isPopular) return false;
      if (chefSpecialOnly && !itemMatchesToken(item, "chef")) return false;
      if (comboOnly && !itemMatchesToken(item, "combo")) return false;
      if (availableOnly && item.soldOut) return false;
      if (!normalizedQuery) return true;
      return [item.name, item.description, item.category, item.subcategory, item.spiceLevel, ...(item.tags ?? []), ...(item.badges ?? []), ...(item.searchKeywords ?? []), ...(item.cuisineIds ?? [])]
        .filter(Boolean)
        .some((value) => normalize(value).includes(normalizedQuery));
    });
  }, [availableOnly, category, chefSpecialOnly, comboOnly, cuisine, diet, meal, menu, popularOnly, query, spice, tag]);

  const totals = useMemo(
    () => calculateTotals(restaurantCart, offerCode, visibleOffers, fulfillmentType, restaurant),
    [fulfillmentType, offerCode, restaurant, restaurantCart, visibleOffers],
  );

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

  const goTo = (next: WizardStep) => {
    if (next !== "menu" && !canContinue) {
      toast.error("Please add at least one item first.");
      return;
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateDetails = () => {
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

    setSubmitting(true);
    try {
      const createdAt = new Date().toISOString();
      const order = await createOrder({
        restaurantSlug: restaurant.slug,
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: [customer.address.trim(), customer.landmark.trim()].filter(Boolean).join(", "),
        },
        lines: restaurantCart.map((item) => ({
          itemId: item.id,
          name: item.name,
          price: itemPrice(item, fulfillmentType),
          quantity: item.quantity,
        })),
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
        scheduleMode: "now",
        prepEstimateMinutes: estimatePrepMinutes(restaurantCart),
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
      });
      setStep("success");
      toast.success("Order sent to the restaurant.");
    } catch {
      toast.error("Could not place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] pb-28 text-slate-950 md:pb-10">
      <MobileRestaurantHeader restaurantName={heroTitle} cartCount={cartCount} onCart={() => goTo(canContinue ? "offers" : "menu")} />

      <section className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1520px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/restaurants" className="hidden rounded-full border bg-white px-3 py-2 text-sm font-bold hover:bg-orange-50 md:inline-flex">
            <ArrowLeft className="mr-2 size-4" />
            Restaurants
          </Link>
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dishes, combos, cuisines..."
                className="h-11 w-full rounded-2xl border bg-white pl-10 pr-4 text-sm outline-none ring-orange-500/20 transition focus:ring-4"
              />
            </div>
          </div>
          <Button variant="outline" className="hidden md:inline-flex" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
        </div>
      </section>

      <HeroSection restaurant={restaurant} title={heroTitle} contactPhone={contactPhone} contactWhatsApp={contactWhatsApp} customerDistanceKm={customerDistanceKm} onStart={() => goTo("menu")} />

      {step === "success" && successOrder ? (
        <SuccessStep order={successOrder} restaurant={restaurant} contactPhone={contactPhone} contactWhatsApp={contactWhatsApp} onNewOrder={() => setStep("menu")} />
      ) : (
        <div className="mx-auto grid w-full max-w-[1520px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 space-y-5">
            {step !== "menu" ? <StepIndicator current={step} onSelect={goTo} /> : null}

            {step === "menu" ? (
              <>
                <OfferStrip offers={visibleOffers} onApply={(code) => {
                  applyOffer(code);
                  toast.success(`${code} applied.`);
                }} />
                <FilterBar
                  options={filterOptions}
                  category={category}
                  diet={diet}
                  meal={meal}
                  spice={spice}
                  cuisine={cuisine}
                  tag={tag}
                  popularOnly={popularOnly}
                  chefSpecialOnly={chefSpecialOnly}
                  comboOnly={comboOnly}
                  availableOnly={availableOnly}
                  viewMode={viewMode}
                  onCategory={setCategory}
                  onDiet={setDiet}
                  onMeal={setMeal}
                  onSpice={setSpice}
                  onCuisine={setCuisine}
                  onTag={setTag}
                  onPopular={setPopularOnly}
                  onChefSpecial={setChefSpecialOnly}
                  onCombo={setComboOnly}
                  onAvailable={setAvailableOnly}
                  onViewMode={setViewMode}
                  onOpenAdvanced={() => setFiltersOpen(true)}
                  onClear={() => {
                    setCategory("all");
                    setDiet("all");
                    setMeal("all");
                    setSpice("all");
                    setCuisine("all");
                    setTag("all");
                    setPopularOnly(false);
                    setChefSpecialOnly(false);
                    setComboOnly(false);
                    setAvailableOnly(true);
                    setQuery("");
                  }}
                />
                <StepIndicator current={step} onSelect={goTo} />

                <div className="rounded-3xl border bg-white p-3 shadow-sm sm:p-4">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-orange-600">Our Menu</p>
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
                      <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid gap-2"}>
                        {filteredMenu.slice(0, visibleCount).map((item) => (
                          <MenuCard
                            key={item.id}
                            item={item}
                            fulfillmentType={fulfillmentType}
                            quantity={restaurantCartQuantities.get(item.id) ?? 0}
                            viewMode={viewMode}
                            onAdd={() => {
                              addItem(item);
                              toast.success(`${item.name} added.`);
                            }}
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
                    <EmptyStateCard title="No matching items" description="Try removing filters or search with a different dish name." />
                  )}
                </div>
              </>
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
                  applyOffer(code);
                  toast.success(`${code || "Offer"} updated.`);
                }}
                onBack={() => goTo("menu")}
                onNext={() => goTo("details")}
              />
            ) : null}

            {step === "details" ? (
              <CustomerDetailsStep
                customer={customer}
                setCustomer={setCustomer}
                fulfillmentType={fulfillmentType}
                setFulfillmentType={setFulfillmentType}
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
        category={category}
        setCategory={setCategory}
        diet={diet}
        setDiet={setDiet}
        meal={meal}
        setMeal={setMeal}
        spice={spice}
        setSpice={setSpice}
        cuisine={cuisine}
        setCuisine={setCuisine}
        tag={tag}
        setTag={setTag}
        popularOnly={popularOnly}
        setPopularOnly={setPopularOnly}
        chefSpecialOnly={chefSpecialOnly}
        setChefSpecialOnly={setChefSpecialOnly}
        comboOnly={comboOnly}
        setComboOnly={setComboOnly}
        availableOnly={availableOnly}
        setAvailableOnly={setAvailableOnly}
      />
    </main>
  );
}

function MobileRestaurantHeader({ restaurantName, cartCount, onCart }: { restaurantName: string; cartCount: number; onCart: () => void }) {
  return (
    <div className="sticky top-0 z-40 border-b bg-white/95 px-3 py-2 shadow-sm backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" aria-label="Back">
          <Link href="/restaurants">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{restaurantName}</p>
          <p className="text-xs font-semibold text-emerald-600">Open for orders</p>
        </div>
        <Button size="icon" variant="outline" aria-label="Open cart" onClick={onCart} className="relative">
          <ShoppingBag className="size-5" />
          {cartCount ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-orange-600 text-[10px] font-black text-white">{cartCount}</span> : null}
        </Button>
      </div>
    </div>
  );
}

function HeroSection({
  restaurant,
  title,
  contactPhone,
  contactWhatsApp,
  customerDistanceKm,
  onStart,
}: {
  restaurant: Restaurant;
  title: string;
  contactPhone: string;
  contactWhatsApp: string;
  customerDistanceKm: number | null;
  onStart: () => void;
}) {
  const minOrder = restaurant.minPrice;
  const deliveryFee = restaurant.deliverySettings?.baseFee ?? restaurant.deliveryFee;
  const freeAbove = restaurant.deliverySettings?.freeDeliveryAbove;
  const status = getOperatingStatus(restaurant);
  const address = restaurant.address || restaurant.location;
  const mapsHref = restaurant.googleMapLocation || mapsUrl(restaurant);
  const eta = restaurant.deliveryTime || (typeof customerDistanceKm === "number" ? `${estimateDeliveryMinutes(customerDistanceKm)} min` : "");
  const heroImages = useMemo(() => normalizeHeroImages(restaurant), [restaurant]);

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <HeroBannerCarousel images={heroImages} title={title} />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
      <div className="relative mx-auto grid min-h-[440px] w-full max-w-[1520px] content-end gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <Badge className={status.open ? "rounded-full bg-emerald-500 text-white" : "rounded-full bg-amber-500 text-white"}>{status.label}</Badge>
            {status.detail ? <Badge className="rounded-full bg-white/15 text-white ring-1 ring-white/20">{status.detail}</Badge> : null}
          </div>
          {restaurant.logo ? (
            <div className="relative mt-5 size-20 overflow-hidden rounded-full border-4 border-white/80 bg-white shadow-xl">
              <SafeImage src={restaurant.logo} alt={`${title} logo`} fill fallbackSrc={IMAGE_FALLBACKS.logo} sizes="80px" className="object-cover" />
            </div>
          ) : null}
          <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-7xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/90">
            {restaurant.rating ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                {restaurant.rating} {restaurant.reviewCount ? `(${restaurant.reviewCount}+ reviews)` : ""}
              </span>
            ) : null}
            {restaurant.cuisine ? <span>{restaurant.cuisine}</span> : null}
            {eta ? <span>{eta}</span> : null}
          </div>
          {address ? (
            <p className="mt-4 flex max-w-2xl items-start gap-2 text-base leading-7 text-white/80">
              <MapPin className="mt-1 size-4 shrink-0" />
              <span>{address}</span>
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onStart} className="bg-orange-600 text-white hover:bg-orange-700">
              Start order
              <ArrowRight className="size-4" />
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-white/12 text-white hover:bg-white/20">
              <a href={whatsappHref(contactWhatsApp, `Hi ${title}, I want to place an order.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
            {contactPhone ? (
              <Button asChild size="lg" variant="secondary" className="bg-white/12 text-white hover:bg-white/20">
                <a href={`tel:${contactPhone}`}>
                  <Phone className="size-4" />
                  {contactPhone}
                </a>
              </Button>
            ) : null}
            {mapsHref ? (
              <Button asChild size="lg" variant="secondary" className="bg-white/12 text-white hover:bg-white/20">
                <a href={mapsHref} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" />
                  Map
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/32 p-3 ring-1 ring-white/12 backdrop-blur sm:grid-cols-4 lg:grid-cols-2">
          {typeof minOrder === "number" ? <HeroFact icon={ShoppingBag} label="Minimum order" value={formatCurrency(minOrder)} /> : null}
          {typeof deliveryFee === "number" ? <HeroFact icon={Bike} label="Delivery fee" value={formatCurrency(deliveryFee)} /> : null}
          {typeof freeAbove === "number" ? <HeroFact icon={Sparkles} label="Free delivery" value={`above ${formatCurrency(freeAbove)}`} /> : null}
          {typeof customerDistanceKm === "number" ? <HeroFact icon={MapPin} label="Distance" value={`${customerDistanceKm} km`} /> : null}
          {restaurant.deliveryRadiusKm ? <HeroFact icon={Bike} label="Delivery radius" value={`${restaurant.deliveryRadiusKm} km`} /> : null}
          {restaurant.cloudKitchen ? <HeroFact icon={Package} label="Kitchen type" value="Cloud kitchen" /> : null}
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
          fallbackSrc={IMAGE_FALLBACKS.restaurant}
          sizes="100vw"
          className={`object-cover opacity-0 transition-opacity duration-700 ease-out ${index === activeIndex ? "opacity-70" : ""}`}
        />
      ))}
      {total > 1 ? (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-2">
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
    <div className="rounded-3xl border bg-white p-2 shadow-sm">
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
    <section className="space-y-3">
      <h2 className="text-xl font-black">Offers for you</h2>
      <div className="customer-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {offers.slice(0, 8).map((offer, index) => (
          <button
            key={offer.code}
            type="button"
            onClick={() => onApply(offer.code)}
            className="group relative min-w-[240px] overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-[300px]"
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

function FilterBar({
  options,
  category,
  diet,
  meal,
  spice,
  cuisine,
  tag,
  popularOnly,
  chefSpecialOnly,
  comboOnly,
  availableOnly,
  viewMode,
  onCategory,
  onDiet,
  onMeal,
  onSpice,
  onCuisine,
  onTag,
  onPopular,
  onChefSpecial,
  onCombo,
  onAvailable,
  onViewMode,
  onOpenAdvanced,
  onClear,
}: {
  options: FilterOptions;
  category: string;
  diet: string;
  meal: string;
  spice: string;
  cuisine: string;
  tag: string;
  popularOnly: boolean;
  chefSpecialOnly: boolean;
  comboOnly: boolean;
  availableOnly: boolean;
  viewMode: ViewMode;
  onCategory: (value: string) => void;
  onDiet: (value: string) => void;
  onMeal: (value: string) => void;
  onSpice: (value: string) => void;
  onCuisine: (value: string) => void;
  onTag: (value: string) => void;
  onPopular: (value: boolean) => void;
  onChefSpecial: (value: boolean) => void;
  onCombo: (value: boolean) => void;
  onAvailable: (value: boolean) => void;
  onViewMode: (value: ViewMode) => void;
  onOpenAdvanced: () => void;
  onClear: () => void;
}) {
  const activeFilters = [category, diet, meal, spice, cuisine, tag].filter((value) => value !== "all").length + [popularOnly, chefSpecialOnly, comboOnly, !availableOnly].filter(Boolean).length;
  return (
    <div className="space-y-3 rounded-3xl border bg-white p-3 shadow-sm">
      <div className="customer-scroll flex gap-2 overflow-x-auto pb-1">
        <Chip active={category === "all"} onClick={() => onCategory("all")}>All</Chip>
        {options.categories.slice(0, 10).map((option) => (
          <Chip key={option} active={category === option} onClick={() => onCategory(option)}>{humanize(option)}</Chip>
        ))}
      </div>
      <div className="customer-scroll flex gap-2 overflow-x-auto pb-1">
        {options.foodTypes.length ? <Chip active={diet === "all"} onClick={() => onDiet("all")}>All food</Chip> : null}
        {options.foodTypes.map((option) => (
          <Chip key={option} active={diet === option} onClick={() => onDiet(option)}>{humanize(option)}</Chip>
        ))}
        {options.meals.map((option) => (
          <Chip key={option} active={meal === option} onClick={() => onMeal(option)}>{humanize(option)}</Chip>
        ))}
        {options.spiceLevels.map((option) => (
          <Chip key={option} active={spice === option} onClick={() => onSpice(option)}>{humanize(option)}</Chip>
        ))}
        {options.cuisines.map((option) => (
          <Chip key={option} active={cuisine === option} onClick={() => onCuisine(option)}>{humanize(option)}</Chip>
        ))}
        {options.tags.slice(0, 12).map((option) => (
          <Chip key={option} active={tag === option} onClick={() => onTag(option)}>{humanize(option)}</Chip>
        ))}
        {options.hasPopular ? <Chip active={popularOnly} onClick={() => onPopular(!popularOnly)}>Bestseller</Chip> : null}
        {options.hasChefSpecial ? <Chip active={chefSpecialOnly} onClick={() => onChefSpecial(!chefSpecialOnly)}>Chef&apos;s Special</Chip> : null}
        {options.hasCombos ? <Chip active={comboOnly} onClick={() => onCombo(!comboOnly)}>Combos</Chip> : null}
        <Chip active={availableOnly} onClick={() => onAvailable(!availableOnly)}>Available Now</Chip>
        <Button variant="outline" className="h-10 shrink-0 rounded-xl" onClick={onOpenAdvanced}>
          <Filter className="size-4" />
          More
        </Button>
        <Button variant="ghost" className="h-10 shrink-0 rounded-xl text-orange-600" onClick={onClear}>
          Clear {activeFilters ? `(${activeFilters})` : ""}
        </Button>
        <div className="ml-auto hidden gap-1 md:flex">
          <Button size="icon" variant={viewMode === "grid" ? "default" : "outline"} onClick={() => onViewMode("grid")} aria-label="Grid view">
            <Grid2X2 className="size-4" />
          </Button>
          <Button size="icon" variant={viewMode === "list" ? "default" : "outline"} onClick={() => onViewMode("list")} aria-label="List view">
            <Utensils className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-xl border px-4 text-sm font-bold transition ${active ? "border-orange-600 bg-orange-600 text-white" : "bg-white hover:bg-orange-50"}`}
    >
      {children}
    </button>
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
      <div className="flex gap-3 rounded-2xl border bg-white p-2 shadow-sm transition-transform duration-200">
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
  return (
    <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle eyebrow="Step 2" title="Validate offers" description="Apply owner-created coupons and review eligibility before entering customer details." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={couponDraft} onChange={(event) => setCouponDraft(event.target.value)} placeholder="Enter coupon code" className="h-12 min-w-0 flex-1 rounded-2xl border px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/20" />
            <Button onClick={() => applyOffer(couponDraft)}>Apply</Button>
          </div>
          {offerCode ? (
            <div className={`rounded-2xl p-3 text-sm font-bold ${totals.appliedOffer ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {totals.appliedOffer ? `${offerCode} applied. You saved ${formatCurrency(totals.discount)}.` : `${offerCode} is not valid for this cart or order type.`}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => {
              const eligible = offerEligible(offer, cartItems, fulfillmentType);
              return (
                <button key={offer.code} type="button" onClick={() => applyOffer(offer.code)} className={`rounded-2xl border p-4 text-left transition hover:border-orange-300 ${offerCode === offer.code ? "border-orange-600 bg-orange-50" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className={eligible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{eligible ? "Eligible" : "Rules apply"}</Badge>
                      <h3 className="mt-2 font-black">{offer.title}</h3>
                      <p className="text-sm text-muted-foreground">{offer.description}</p>
                    </div>
                    <span className="rounded-xl bg-orange-600 px-2 py-1 text-xs font-black text-white">{offer.code}</span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-muted-foreground">
                    Min {formatCurrency(offer.minimumOrder)} {offer.appliesTo?.length ? `• ${offer.appliesTo.join(", ")}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
        <MiniCart items={cartItems} totals={totals} />
      </div>
      <WizardActions onBack={onBack} onNext={onNext} nextLabel="Continue to details" />
    </section>
  );
}

function CustomerDetailsStep({
  customer,
  setCustomer,
  fulfillmentType,
  setFulfillmentType,
  onBack,
  onNext,
}: {
  customer: CustomerForm;
  setCustomer: (value: CustomerForm) => void;
  fulfillmentType: FulfillmentType;
  setFulfillmentType: (value: FulfillmentType) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const update = (key: keyof CustomerForm, value: string) => setCustomer({ ...customer, [key]: value });
  return (
    <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle eyebrow="Step 3" title="Customer details" description="Delivery needs an address. Pickup and dine-in can be completed with name and phone." />
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
  contactPhone: string;
  contactWhatsApp: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-6">
      <SectionTitle eyebrow="Step 4" title="Confirm order" description="Review items, taxes, charges, contact details, and send the order to the restaurant." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="rounded-2xl border bg-orange-50/60 p-4">
            <p className="text-sm font-black">{restaurant.displayName ?? restaurant.name}</p>
            <p className="text-sm text-muted-foreground">
              {fulfillmentLabel(fulfillmentType)} for {customer.name} • {customer.phone}
            </p>
            {customer.address ? <p className="mt-2 text-sm font-semibold">{customer.address}{customer.landmark ? `, ${customer.landmark}` : ""}</p> : null}
          </div>
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border p-3">
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
            Place order and wait for confirmation
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
  order: { id: string; total: number; prep: number };
  restaurant: Restaurant;
  contactPhone: string;
  contactWhatsApp: string;
  onNewOrder: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-5 text-3xl font-black">Order sent!</h1>
        <p className="mt-2 text-muted-foreground">The restaurant will review and confirm your order shortly.</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
          <InfoRow label="Order ID" value={order.id} />
          <InfoRow label="Restaurant" value={restaurant.displayName ?? restaurant.name} />
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
    <div className="sticky top-24 rounded-3xl border bg-white p-4 shadow-sm">
      <h2 className="font-black">Your Order</h2>
      <p className="text-sm text-muted-foreground">{restaurant.displayName ?? restaurant.name}</p>
      {items.length ? (
        <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border p-3">
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
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center">
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
    <div className="rounded-2xl border bg-slate-50 p-4">
      <h3 className="font-black">Cart review</h3>
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

function getOperatingStatus(restaurant: Restaurant) {
  const schedule = restaurant.operatingHoursSchedule;
  if (!schedule?.length || restaurant.operatingHoursPreference === "not-specified") {
    return {
      open: restaurant.isOpen,
      label: restaurant.isOpen ? "Open now" : "Taking preorders",
      detail: restaurant.operatingHours || "",
    };
  }

  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = schedule.find((day) => day.day === days[todayIndex]);
  const activeSlot = today?.open ? today.slots.find((slot) => minutes >= timeMinutes(slot.start) && minutes < timeMinutes(slot.end)) : undefined;
  if (activeSlot) {
    return { open: true, label: "Open now", detail: `Closes at ${formatTime(activeSlot.end)}` };
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const dayName = days[(todayIndex + offset) % 7];
    const day = schedule.find((entry) => entry.day === dayName);
    const nextSlot = day?.open ? day.slots.find((slot) => offset > 0 || timeMinutes(slot.start) > minutes) : undefined;
    if (nextSlot) {
      return {
        open: false,
        label: "Closed now",
        detail: offset === 0 ? `Opens at ${formatTime(nextSlot.start)}` : `Opens ${offset === 1 ? "tomorrow" : dayName} at ${formatTime(nextSlot.start)}`,
      };
    }
  }

  return { open: false, label: "Closed now", detail: "" };
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  return (hours || 0) * 60 + (minutes || 0);
}

function formatTime(value: string) {
  const [rawHours, rawMinutes] = value.split(":").map((item) => Number(item));
  const period = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(rawMinutes || 0).padStart(2, "0")} ${period}`;
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
  category,
  setCategory,
  diet,
  setDiet,
  meal,
  setMeal,
  spice,
  setSpice,
  cuisine,
  setCuisine,
  tag,
  setTag,
  popularOnly,
  setPopularOnly,
  chefSpecialOnly,
  setChefSpecialOnly,
  comboOnly,
  setComboOnly,
  availableOnly,
  setAvailableOnly,
}: {
  open: boolean;
  onClose: () => void;
  options: FilterOptions;
  category: string;
  setCategory: (value: string) => void;
  diet: string;
  setDiet: (value: string) => void;
  meal: string;
  setMeal: (value: string) => void;
  spice: string;
  setSpice: (value: string) => void;
  cuisine: string;
  setCuisine: (value: string) => void;
  tag: string;
  setTag: (value: string) => void;
  popularOnly: boolean;
  setPopularOnly: (value: boolean) => void;
  chefSpecialOnly: boolean;
  setChefSpecialOnly: (value: boolean) => void;
  comboOnly: boolean;
  setComboOnly: (value: boolean) => void;
  availableOnly: boolean;
  setAvailableOnly: (value: boolean) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/35">
      <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl md:left-auto md:right-5 md:top-5 md:h-[calc(100vh-2.5rem)] md:w-[380px] md:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Filters</h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close filters">
            <X className="size-5" />
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          <FilterSelect label="Category" value={category} onChange={setCategory} options={options.categories} />
          <FilterSelect label="Cuisine" value={cuisine} onChange={setCuisine} options={options.cuisines} />
          <FilterSelect label="Tags" value={tag} onChange={setTag} options={options.tags} />
          <FilterSelect label="Meal type" value={meal} onChange={setMeal} options={options.meals} />
          <FilterSelect label="Spice level" value={spice} onChange={setSpice} options={options.spiceLevels} />
          <FilterSelect label="Food type" value={diet} onChange={setDiet} options={options.foodTypes} />
          {options.hasPopular ? <ToggleLine label="Bestseller" checked={popularOnly} onChange={setPopularOnly} /> : null}
          {options.hasChefSpecial ? <ToggleLine label="Chef's special" checked={chefSpecialOnly} onChange={setChefSpecialOnly} /> : null}
          {options.hasCombos ? <ToggleLine label="Combos" checked={comboOnly} onChange={setComboOnly} /> : null}
          <ToggleLine label="Available now" checked={availableOnly} onChange={setAvailableOnly} />
        </div>
        <Button className="mt-5 h-12 w-full bg-orange-600 hover:bg-orange-700" onClick={onClose}>Show menu</Button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-black">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border bg-white px-3 text-sm font-bold">
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{humanize(option)}</option>
        ))}
      </select>
    </label>
  );
}

function ToggleLine({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border p-3">
      <span className="font-bold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-orange-600" />
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

function buildFilterOptions(items: MenuItem[]): FilterOptions {
  const categories = unique(items.map((item) => item.category).filter(Boolean));
  const cuisines = unique(items.flatMap((item) => item.cuisineIds ?? []).filter(Boolean));
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
  return (value ?? "").toLowerCase().trim();
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
