"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Leaf,
  Minus,
  Package,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Utensils,
  Zap,
} from "lucide-react";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { RetryState, SkeletonGrid } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePublicMenu, usePublicRestaurant, usePublicReviews } from "@/hooks/use-public-data";
import { useWhatsAppShare } from "@/hooks/useWhatsAppShare";
import { useCartStore } from "@/lib/cart-store";
import { ROUTES } from "@/lib/constants";
import { canonicalMenuItemId } from "@/lib/menu-item-links";
import type { MenuItem, Offer, Restaurant, Review } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type PriceOption = {
  id: string;
  name: string;
  price: number;
  groupName?: string;
};

const spiceLabels: Record<NonNullable<MenuItem["spiceLevel"]>, string> = {
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
};

export function FoodItemDetailFlow({
  restaurant,
  item,
  restaurantSlug,
  itemId,
  source,
  offerCode,
}: {
  restaurant?: Restaurant;
  item?: MenuItem;
  restaurantSlug?: string;
  itemId?: string;
  source?: string;
  offerCode?: string;
}) {
  const router = useRouter();
  const { restaurant: loadedRestaurant, status: restaurantStatus, retry: retryRestaurant } = usePublicRestaurant(restaurant?.slug ?? restaurantSlug ?? "");
  const activeRestaurant = restaurant ?? loadedRestaurant;
  const { items, offers, status: menuStatus, retry: retryMenu } = usePublicMenu(activeRestaurant?.slug ?? restaurantSlug);
  const requestedItemId = canonicalMenuItemId(itemId ?? "");
  const activeItem = item ?? items.find((entry) => canonicalMenuItemId(entry.id) === requestedItemId || publicItemSlug(entry.name) === requestedItemId.toLowerCase());
  const { reviews, summary: reviewSummary } = usePublicReviews(activeRestaurant?.slug, activeItem?.id);
  const activeOffer = offers.find((offer) => offer.code === offerCode);
  const addItem = useCartStore((state) => state.addItem);
  const whatsappShare = useWhatsAppShare();
  const cartQuantity = useCartStore((state) => {
    if (!activeItem?.id) return 0;
    return state.items
      .filter((line) => line.id === activeItem.id || line.id.startsWith(`${activeItem.id}::`))
      .reduce((total, line) => total + line.quantity, 0);
  });

  const currentItemId = activeItem?.id ?? "";
  const [imageSelection, setImageSelection] = useState({ itemId: "", index: 0 });
  const [quantitySelection, setQuantitySelection] = useState({ itemId: "", value: 1 });
  const [modifierSelection, setModifierSelection] = useState({ itemId: "", id: "" });
  const [addOnSelection, setAddOnSelection] = useState<{ itemId: string; ids: Set<string> }>(() => ({
    itemId: "",
    ids: new Set(),
  }));
  const [favorite, setFavorite] = useState(false);

  const applyOffer = useCartStore((state) => state.applyOffer);

  useEffect(() => {
    if (activeOffer) {
      applyOffer(activeOffer.code);
    }
  }, [activeOffer, applyOffer]);

  const galleryImages = useMemo(() => uniqueImages(activeItem), [activeItem]);
  const modifierOptions = useMemo(() => getModifierOptions(activeItem), [activeItem]);
  const addOnOptions = useMemo(() => getAddOnOptions(activeItem), [activeItem]);
  const relatedItems = useMemo(
    () => getRelatedItems(items, activeItem),
    [items, activeItem],
  );
  const emptyAddOnSelection = useMemo(() => new Set<string>(), []);
  const selectedImageIndex = imageSelection.itemId === currentItemId
    ? Math.min(imageSelection.index, Math.max(galleryImages.length - 1, 0))
    : 0;
  const quantity = quantitySelection.itemId === currentItemId ? quantitySelection.value : 1;
  const selectedModifierId =
    modifierSelection.itemId === currentItemId && modifierOptions.some((option) => option.id === modifierSelection.id)
      ? modifierSelection.id
      : modifierOptions[0]?.id ?? "";
  const selectedAddOnIds = addOnSelection.itemId === currentItemId ? addOnSelection.ids : emptyAddOnSelection;

  const selectedModifier = modifierOptions.find((option) => option.id === selectedModifierId);
  const selectedAddOns = addOnOptions.filter((option) => selectedAddOnIds.has(option.id));
  const basePrice = activeItem ? activeItem.deliveryPrice ?? activeItem.price : 0;
  const modifierPrice = selectedModifier?.price ?? 0;
  const addOnTotal = selectedAddOns.reduce((total, option) => total + option.price, 0);
  const unitPrice = Math.max(0, basePrice + modifierPrice + addOnTotal);
  const itemTotal = unitPrice * quantity;
  const ratingValue = reviewSummary.averageRating || activeItem?.averageRating || activeRestaurant?.rating || 0;
  const reviewCount = reviewSummary.ratingCount || activeItem?.reviewCount || activeRestaurant?.reviewCount || 0;
  const selectedImage = galleryImages[selectedImageIndex] ?? activeItem?.image ?? IMAGE_FALLBACKS.food;
  const hasCustomization = modifierOptions.length > 0 || addOnOptions.length > 0;

  function toggleAddOn(id: string) {
    setAddOnSelection((current) => {
      const next = current.itemId === currentItemId ? new Set(current.ids) : new Set<string>();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { itemId: currentItemId, ids: next };
    });
  }

  function changeQuantity(delta: number) {
    setQuantitySelection((current) => {
      const baseValue = current.itemId === currentItemId ? current.value : 1;
      return { itemId: currentItemId, value: Math.max(1, Math.min(20, baseValue + delta)) };
    });
  }

  function selectImage(index: number) {
    setImageSelection({ itemId: currentItemId, index });
  }

  function buildCartItem(): MenuItem | null {
    if (!activeItem) return null;
    const customizationParts = [
      selectedModifier ? selectedModifier.id : "",
      ...selectedAddOns.map((option) => option.id),
    ].filter(Boolean);
    const customizationLabels = [
      selectedModifier ? selectedModifier.name : "",
      ...selectedAddOns.map((option) => option.name),
    ].filter(Boolean);
    const customizationKey = customizationParts.join("|");
    const labelSuffix = customizationLabels.length ? ` (${customizationLabels.join(", ")})` : "";

    return {
      ...activeItem,
      id: customizationKey ? `${activeItem.id}::${customizationKey}` : activeItem.id,
      name: `${activeItem.name}${labelSuffix}`,
      price: unitPrice,
      deliveryPrice: unitPrice,
      modifiers: selectedModifier ? [{ name: selectedModifier.name, price: selectedModifier.price }] : undefined,
      addOns: selectedAddOns.map((option) => ({ name: option.name, price: option.price })),
    };
  }

  function addSelectionToCart() {
    if (!activeItem || activeItem.soldOut) return;
    const cartItem = buildCartItem();
    if (!cartItem) return;
    Array.from({ length: quantity }).forEach(() => addItem(cartItem));
  }

  function orderNow() {
    if (!activeItem || activeItem.soldOut) return;
    addSelectionToCart();
    const query = new URLSearchParams({ mode: "fast" });
    if (activeOffer) query.set("offer", activeOffer.code);
    if (source?.startsWith("campaign:")) query.set("campaign", source.slice("campaign:".length));
    router.push(`${ROUTES.checkout}?${query.toString()}`);
  }

  function scheduleOrder() {
    if (!activeItem || activeItem.soldOut) return;
    addSelectionToCart();
    const slug = activeRestaurant?.slug ?? activeItem.restaurantSlug ?? restaurantSlug;
    router.push(`${ROUTES.restaurant(slug)}?intent=schedule`);
  }

  function shareItem() {
    if (!activeItem || !activeRestaurant) return;
    void whatsappShare.openShare({ item: activeItem, restaurant: activeRestaurant });
  }

  if (restaurantStatus === "loading" || menuStatus === "loading") {
    return (
      <main className="container-page py-6">
        <SkeletonGrid count={4} />
      </main>
    );
  }

  if (restaurantStatus === "error") {
    return (
      <main className="container-page py-6">
        <RetryState onRetry={retryRestaurant} />
      </main>
    );
  }

  if (menuStatus === "error") {
    return (
      <main className="container-page py-6">
        <RetryState onRetry={retryMenu} />
      </main>
    );
  }

  if (!activeRestaurant || !activeItem) {
    return (
      <main className="container-page py-6">
        <EmptyStateCard
          title="Item is not available"
          description="This menu item was not found in the active owner menu or is not currently orderable."
          actionLabel="Browse menu"
          actionHref={activeRestaurant ? `/restaurant/${activeRestaurant.slug}/menu` : "/restaurants"}
        />
      </main>
    );
  }

  return (
    <main className="bg-[#fffaf7] pb-40 text-slate-950 md:pb-10">
      <MobileItemBar
        item={activeItem}
        favorite={favorite}
        onBack={() => router.back()}
        onShare={shareItem}
        onFavorite={() => setFavorite((value) => !value)}
      />

      <div className="container-page hidden py-5 md:block">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="size-4 text-slate-400" aria-hidden="true" />
          <Link href={ROUTES.restaurant(activeRestaurant.slug)} className="hover:text-primary">
            {activeRestaurant.name}
          </Link>
          <ChevronRight className="size-4 text-slate-400" aria-hidden="true" />
          <Link href={ROUTES.menu(activeRestaurant.slug)} className="hover:text-primary">
            {activeItem.category}
          </Link>
          <ChevronRight className="size-4 text-slate-400" aria-hidden="true" />
          <span className="text-primary">{activeItem.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-5 px-0 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="space-y-5">
          <div className="grid gap-5 bg-white md:rounded-2xl md:border md:border-orange-100 md:bg-transparent lg:grid-cols-[minmax(360px,520px)_minmax(0,1fr)]">
            <ImageGallery
              itemName={activeItem.name}
              images={galleryImages}
              selectedImage={selectedImage}
              selectedIndex={selectedImageIndex}
              onSelect={selectImage}
            />

            <DishSummary
              restaurant={activeRestaurant}
              item={activeItem}
              ratingValue={ratingValue}
              reviewCount={reviewCount}
              source={source}
              onShare={shareItem}
              favorite={favorite}
              onFavorite={() => setFavorite((value) => !value)}
              price={basePrice}
            />
          </div>

          <div className="grid gap-5 px-4 md:px-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <AboutDish item={activeItem} />
            <CustomizeDish
              modifierOptions={modifierOptions}
              addOnOptions={addOnOptions}
              selectedModifierId={selectedModifierId}
              selectedAddOnIds={selectedAddOnIds}
              onModifierChange={(id) => setModifierSelection({ itemId: currentItemId, id })}
              onAddOnToggle={toggleAddOn}
            />
          </div>

          <div className="grid gap-5 px-4 md:px-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <Allergens item={activeItem} />
            <DishInformation item={activeItem} restaurant={activeRestaurant} />
          </div>

          <div className="grid gap-5 px-4 md:px-0 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <CustomerReviews reviews={reviews} ratingValue={ratingValue} reviewCount={reviewCount} />
            <RecommendedItems restaurant={activeRestaurant} items={relatedItems} />
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <OrderPanel
              item={activeItem}
              restaurant={activeRestaurant}
              quantity={quantity}
              itemTotal={itemTotal}
              unitPrice={unitPrice}
              hasCustomization={hasCustomization}
              activeOffer={activeOffer}
              cartQuantity={cartQuantity}
              onQuantityChange={changeQuantity}
              onAddToCart={addSelectionToCart}
              onOrderNow={orderNow}
              onScheduleOrder={scheduleOrder}
            />
            <TrustPanel restaurant={activeRestaurant} item={activeItem} />
          </div>
        </aside>
      </div>

      <MobileOrderBar
        item={activeItem}
        quantity={quantity}
        itemTotal={itemTotal}
        cartQuantity={cartQuantity}
        onQuantityChange={changeQuantity}
        onAddToCart={addSelectionToCart}
        onScheduleOrder={scheduleOrder}
      />
      <WhatsAppShareModal
        preview={whatsappShare.preview}
        open={Boolean(whatsappShare.preview) || whatsappShare.isPreparing}
        preparing={whatsappShare.isPreparing}
        onOpenChange={(open) => {
          if (!open) whatsappShare.closeShare();
        }}
        onCopy={() => void whatsappShare.copyMessage()}
        onWhatsApp={whatsappShare.openWhatsApp}
        onChannel={whatsappShare.openChannel}
      />
    </main>
  );
}

function MobileItemBar({
  item,
  favorite,
  onBack,
  onShare,
  onFavorite,
}: {
  item: MenuItem;
  favorite: boolean;
  onBack: () => void;
  onShare: () => void;
  onFavorite: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-orange-100 bg-white px-3 md:hidden">
      <button type="button" onClick={onBack} className="grid size-10 place-items-center rounded-full text-slate-950" aria-label="Go back">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </button>
      <p className="min-w-0 flex-1 truncate px-2 text-center text-sm font-black text-slate-950">{item.name}</p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onFavorite} className="grid size-10 place-items-center rounded-full text-slate-950" aria-label="Save item">
          <Heart className={cn("size-5", favorite && "fill-primary text-primary")} aria-hidden="true" />
        </button>
        <button type="button" onClick={onShare} className="grid size-10 place-items-center rounded-full text-slate-950" aria-label="Share item">
          <Share2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ImageGallery({
  itemName,
  images,
  selectedImage,
  selectedIndex,
  onSelect,
}: {
  itemName: string;
  images: string[];
  selectedImage: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const hasMany = images.length > 1;
  const visibleThumbs = images.slice(0, 5);

  function move(delta: number) {
    if (!hasMany) return;
    onSelect((selectedIndex + delta + images.length) % images.length);
  }

  return (
    <div className="space-y-3 md:p-4">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 md:rounded-2xl">
        <SafeImage
          src={selectedImage}
          alt={itemName}
          fill
          priority
          fallbackSrc={IMAGE_FALLBACKS.food}
          cloudinaryPreset="large"
          sizes="(min-width: 1024px) 520px, 100vw"
          className="object-cover"
        />
        <Badge className="absolute left-4 top-4 border-0 bg-green-600 text-white shadow-sm">Bestseller</Badge>
        {hasMany ? (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-950 shadow-md md:grid"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-950 shadow-md md:grid"
              aria-label="Next image"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-black text-white md:hidden">
              {selectedIndex + 1}/{images.length}
            </div>
          </>
        ) : null}
      </div>

      {images.length ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 md:px-0">
          {visibleThumbs.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 md:h-[72px] md:w-[92px]",
                selectedIndex === index ? "border-primary" : "border-white",
              )}
              aria-label={`Show image ${index + 1}`}
            >
              <SafeImage
                src={image}
                alt={`${itemName} ${index + 1}`}
                fill
                fallbackSrc={IMAGE_FALLBACKS.food}
                cloudinaryPreset="cart"
                sizes="92px"
                className="object-cover"
              />
              {index === visibleThumbs.length - 1 && images.length > visibleThumbs.length ? (
                <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-black text-white">
                  +{images.length - visibleThumbs.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DishSummary({
  restaurant,
  item,
  ratingValue,
  reviewCount,
  source,
  onShare,
  favorite,
  onFavorite,
  price,
}: {
  restaurant: Restaurant;
  item: MenuItem;
  ratingValue: number;
  reviewCount: number;
  source?: string;
  onShare: () => void;
  favorite: boolean;
  onFavorite: () => void;
  price: number;
}) {
  const badgeList = getDishBadges(item);

  return (
    <div className="space-y-4 px-4 pb-5 md:p-5 lg:py-7">
      <div className="hidden justify-end gap-3 md:flex">
        <button
          type="button"
          onClick={onFavorite}
          className="grid size-12 place-items-center rounded-xl border border-orange-200 bg-white text-primary shadow-sm"
          aria-label="Save item"
        >
          <Heart className={cn("size-5", favorite && "fill-primary")} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onShare}
          className="grid size-12 place-items-center rounded-xl border border-orange-200 bg-white text-slate-950 shadow-sm"
          aria-label="Share item"
        >
          <Share2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-green-700">
          <span>{restaurant.name}</span>
          <BadgeCheck className="size-4 fill-green-600 text-white" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">{item.name}</h1>
          <p className="shrink-0 pt-1 text-2xl font-black text-slate-950 md:hidden">{formatCurrency(price)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-black text-slate-950 ring-1 ring-orange-100">
          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          {ratingValue ? ratingValue.toFixed(1) : "New"}
        </span>
        {reviewCount ? <span className="text-sm font-bold text-primary">{reviewCount} reviews</span> : null}
      </div>

      {badgeList.length ? (
        <div className="flex flex-wrap gap-2">
          {badgeList.map((badge) => (
            <Badge key={badge} className={cn("border-0 px-3 py-1", badgeTone(badge))}>{badge}</Badge>
          ))}
          {source === "instagram" ? <Badge variant="outline">From Instagram</Badge> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 border-y border-orange-100 py-3 text-sm font-semibold text-slate-700">
        <InfoPill icon={<FoodTypeIcon item={item} />} label={foodTypeLabel(item)} />
        {item.cuisineIds?.length ? <InfoPill icon={<Utensils className="size-4" />} label={item.cuisineIds.join(", ")} /> : null}
        {item.prepTime ? <InfoPill icon={<Clock3 className="size-4" />} label={item.prepTime} /> : null}
        {item.spiceLevel ? <InfoPill icon={<Flame className="size-4 text-primary" />} label={spiceLabels[item.spiceLevel]} /> : null}
      </div>

      <p className="max-w-2xl text-base font-medium leading-7 text-slate-700">{item.description}</p>
      <p className="hidden text-4xl font-black text-slate-950 md:block">{formatCurrency(price)}</p>

      <div className="hidden gap-3 md:flex">
        <Button asChild variant="outline" className="border-orange-200 bg-white">
          <Link href={ROUTES.menu(restaurant.slug)}>
            Browse full menu
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <CartDrawer />
      </div>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      {label}
    </span>
  );
}

function AboutDish({ item }: { item: MenuItem }) {
  const notes = getAboutNotes(item);
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
      <h2 className="text-xl font-black text-slate-950">About this dish</h2>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
        {item.longDescription || item.description || "The restaurant has not added a detailed description for this dish yet."}
      </p>
      {notes.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {notes.map((note) => (
            <span key={note} className="inline-flex items-center gap-2 text-xs font-black text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
              {note}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CustomizeDish({
  modifierOptions,
  addOnOptions,
  selectedModifierId,
  selectedAddOnIds,
  onModifierChange,
  onAddOnToggle,
}: {
  modifierOptions: PriceOption[];
  addOnOptions: PriceOption[];
  selectedModifierId: string;
  selectedAddOnIds: Set<string>;
  onModifierChange: (id: string) => void;
  onAddOnToggle: (id: string) => void;
}) {
  if (!modifierOptions.length && !addOnOptions.length) {
    return (
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
        <h2 className="text-xl font-black text-slate-950">Customize your dish</h2>
        <p className="mt-3 text-sm font-semibold text-slate-700">No modifiers or add-ons are configured for this item.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
      <h2 className="text-xl font-black text-slate-950">Customize your dish</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {modifierOptions.length ? (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-sm font-black text-slate-950">Modifiers</p>
              <span className="text-xs font-semibold text-slate-500">(Choose one)</span>
            </div>
            <div className="divide-y divide-orange-100">
              {modifierOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 py-3 text-sm font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="dish-modifier"
                    checked={selectedModifierId === option.id}
                    onChange={() => onModifierChange(option.id)}
                    className="size-4 accent-primary"
                  />
                  <span className="min-w-0 flex-1">{option.name}</span>
                  <span className={cn("font-black", option.price ? "text-slate-950" : "text-green-700")}>
                    {formatOptionPrice(option.price)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {addOnOptions.length ? (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-sm font-black text-slate-950">Add-ons</p>
              <span className="text-xs font-semibold text-slate-500">(Choose any)</span>
            </div>
            <div className="divide-y divide-orange-100">
              {addOnOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 py-3 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedAddOnIds.has(option.id)}
                    onChange={() => onAddOnToggle(option.id)}
                    className="size-4 rounded accent-primary"
                  />
                  <span className="min-w-0 flex-1">{option.name}</span>
                  <span className="font-black text-slate-950">{formatOptionPrice(option.price)}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Allergens({ item }: { item: MenuItem }) {
  const allergens = item.allergenLabels ?? [];
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
      <h2 className="text-xl font-black text-slate-950">Allergens</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {allergens.length ? "This dish contains the following allergens:" : "No allergen tags have been configured for this item."}
      </p>
      {allergens.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {allergens.map((allergen) => (
            <span key={allergen} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{allergen}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DishInformation({ item, restaurant }: { item: MenuItem; restaurant: Restaurant }) {
  const priceRows = [
    { label: "Dine-in", value: item.dineInPrice },
    { label: "Parcel", value: item.parcelPrice },
    { label: "Delivery", value: item.deliveryPrice ?? item.price },
  ].filter((row) => typeof row.value === "number");

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
      <h2 className="text-xl font-black text-slate-950">Dish information</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoBlock icon={<FoodTypeIcon item={item} />} label="Food Type" value={foodTypeLabel(item)} />
        <InfoBlock icon={<Utensils className="size-6" />} label="Cuisine" value={item.cuisineIds?.join(", ") || restaurant.cuisine || "Not specified"} />
        <InfoBlock icon={<Clock3 className="size-6" />} label="Prep Time" value={item.prepTime || "Not specified"} />
        <InfoBlock icon={<Flame className="size-6" />} label="Spice Level" value={item.spiceLevel ? spiceLabels[item.spiceLevel] : "Not specified"} />
      </div>
      {priceRows.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {priceRows.map((row) => (
            <div key={row.label} className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3">
              <p className="text-xs font-black uppercase text-slate-500">{row.label} price</p>
              <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(row.value ?? 0)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-50 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
        <span className="block truncate text-sm font-black text-slate-950">{value}</span>
      </span>
    </div>
  );
}

function CustomerReviews({
  reviews,
  ratingValue,
  reviewCount,
}: {
  reviews: Review[];
  ratingValue: number;
  reviewCount: number;
}) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">Customer reviews</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
            <span>{ratingValue ? ratingValue.toFixed(1) : "New"} out of 5</span>
            {ratingValue ? <StarRow rating={ratingValue} /> : null}
            {reviewCount ? <span>{reviewCount} reviews</span> : null}
          </div>
        </div>
      </div>

      {reviews.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {reviews.slice(0, 4).map((review) => (
            <article key={review.id} className="rounded-xl border border-orange-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{review.customerName}</p>
                  <p className="text-xs font-semibold text-slate-500">{relativeDateLabel(review.createdAt)}</p>
                </div>
                <StarRow rating={review.rating} />
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{review.comment}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">No reviews yet for this dish.</p>
      )}
    </section>
  );
}

function RecommendedItems({ restaurant, items }: { restaurant: Restaurant; items: MenuItem[] }) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/30">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">You may also like</h2>
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link href={ROUTES.menu(restaurant.slug)}>View all</Link>
        </Button>
      </div>

      {items.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={ROUTES.item(restaurant.slug, item.id)} className="group overflow-hidden rounded-xl border border-orange-100 bg-white">
              <div className="relative aspect-[4/3] bg-slate-100">
                <SafeImage
                  src={item.image}
                  alt={item.name}
                  fill
                  fallbackSrc={IMAGE_FALLBACKS.food}
                  cloudinaryPreset="productGrid"
                  sizes="240px"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-10 text-sm font-black text-slate-950">{item.name}</p>
                <p className="mt-1 text-sm font-black text-slate-950">{formatCurrency(item.deliveryPrice ?? item.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">No related items are available yet.</p>
      )}
    </section>
  );
}

function OrderPanel({
  item,
  restaurant,
  quantity,
  itemTotal,
  unitPrice,
  hasCustomization,
  activeOffer,
  cartQuantity,
  onQuantityChange,
  onAddToCart,
  onOrderNow,
  onScheduleOrder,
}: {
  item: MenuItem;
  restaurant: Restaurant;
  quantity: number;
  itemTotal: number;
  unitPrice: number;
  hasCustomization: boolean;
  activeOffer?: Offer;
  cartQuantity: number;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onOrderNow: () => void;
  onScheduleOrder: () => void;
}) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/40">
      <h2 className="text-xl font-black text-slate-950">Customize your order</h2>
      <div className="mt-3 h-px w-20 bg-primary" />

      <div className="mt-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-black text-slate-950">Quantity</p>
          <QuantityStepper value={quantity} onChange={onQuantityChange} />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-orange-100 pt-4">
          <div>
            <p className="font-black text-slate-950">Item total</p>
            {hasCustomization ? <p className="text-xs font-semibold text-slate-500">Includes selected options</p> : null}
          </div>
          <p className="text-xl font-black text-slate-950">{formatCurrency(itemTotal)}</p>
        </div>
      </div>

      {activeOffer ? (
        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-3">
          <p className="text-xs font-black uppercase text-green-700">Offer applied</p>
          <div className="mt-2">
            <OfferBadge offer={activeOffer} />
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        <Button size="lg" className="h-12 rounded-lg" onClick={onAddToCart} disabled={item.soldOut}>
          <ShoppingBag className="size-4" />
          {cartQuantity ? `Add more (${cartQuantity} in cart)` : "Add to cart"}
        </Button>
        <Button size="lg" className="h-12 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={onOrderNow} disabled={item.soldOut}>
          <Zap className="size-4" />
          Order now
        </Button>
        <Button size="lg" variant="outline" className="h-12 rounded-lg border-orange-200 text-slate-950 hover:bg-orange-50" onClick={onScheduleOrder} disabled={item.soldOut}>
          <CalendarClock className="size-4" />
          Schedule
        </Button>
      </div>

      <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-800">
        {restaurant.deliverySettings?.freeDeliveryAbove ? (
          <span className="flex items-center gap-3">
            <Package className="size-5" aria-hidden="true" />
            Free delivery above {formatCurrency(restaurant.deliverySettings.freeDeliveryAbove)}
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            Unit price {formatCurrency(unitPrice)}
          </span>
        )}
      </div>
    </section>
  );
}

function TrustPanel({ restaurant, item }: { restaurant: Restaurant; item: MenuItem }) {
  const rows = [
    item.prepTime ? "Freshly prepared" : "",
    restaurant.profileComplete || restaurant.approved ? "Restaurant verified" : "",
    restaurant.fssaiLicense ? "FSSAI licensed" : "",
    restaurant.cloudKitchen ? "Cloud kitchen" : restaurant.diningAvailable ? "Dine-in available" : "",
  ].filter(Boolean);

  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/40">
      <h2 className="text-lg font-black text-slate-950">Why you will love it</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <p key={row} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <CheckCircle2 className="size-4 text-green-700" aria-hidden="true" />
            {row}
          </p>
        ))}
      </div>
      <ShieldCheck className="ml-auto mt-3 size-10 text-green-700" aria-hidden="true" />
    </section>
  );
}

function MobileOrderBar({
  item,
  quantity,
  itemTotal,
  cartQuantity,
  onQuantityChange,
  onAddToCart,
  onScheduleOrder,
}: {
  item: MenuItem;
  quantity: number;
  itemTotal: number;
  cartQuantity: number;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onScheduleOrder: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[72px] z-40 border-t border-orange-100 bg-white px-3 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] md:hidden">
      {cartQuantity ? (
        <p className="mb-2 text-center text-xs font-black text-primary">{cartQuantity} item{cartQuantity === 1 ? "" : "s"} in cart</p>
      ) : null}
      <div className="flex items-center gap-2">
        <QuantityStepper value={quantity} onChange={onQuantityChange} compact />
        <Button className="h-12 min-w-0 flex-1 rounded-xl text-sm font-black" onClick={onAddToCart} disabled={item.soldOut}>
          <ShoppingBag className="size-4" />
          Add to cart
        </Button>
        <Button className="h-12 rounded-xl border-orange-200 px-3 text-sm font-black" variant="outline" onClick={onScheduleOrder} disabled={item.soldOut}>
          <CalendarClock className="size-4" />
          <span className="sr-only">Schedule</span>
        </Button>
        <div className="min-w-[76px] text-right text-base font-black text-slate-950">{formatCurrency(itemTotal)}</div>
      </div>
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (delta: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-xl border border-orange-200 bg-white", compact ? "h-12 w-[104px]" : "h-12 w-36")}>
      <button type="button" onClick={() => onChange(-1)} className="grid h-full w-11 place-items-center text-primary" aria-label="Decrease quantity">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="text-base font-black text-slate-950">{value}</span>
      <button type="button" onClick={() => onChange(1)} className="grid h-full w-11 place-items-center text-primary" aria-label="Increase quantity">
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={cn("size-3.5", index < rounded && "fill-amber-400")} aria-hidden="true" />
      ))}
    </span>
  );
}

function FoodTypeIcon({ item }: { item: MenuItem }) {
  const type = normalizedFoodType(item);
  if (type === "veg" || type === "vegan" || type === "jain") return <Leaf className="size-4 text-green-700" />;
  return <span className="grid size-4 place-items-center rounded-full bg-primary text-[8px] font-black text-white">N</span>;
}

function normalizedFoodType(item: MenuItem) {
  return item.foodType ?? (item.isVeg ? "veg" : "nonveg");
}

function publicItemSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function foodTypeLabel(item: MenuItem) {
  const type = normalizedFoodType(item);
  if (type === "nonveg") return "Non-Veg";
  if (type === "veg") return "Veg";
  if (type === "jain") return "Jain";
  if (type === "vegan") return "Vegan";
  return "Egg";
}

function getDishBadges(item: MenuItem) {
  return Array.from(new Set([
    ...(item.isPopular ? ["Popular"] : []),
    ...(item.badges ?? []),
    ...(item.tags ?? []).filter((tag) => ["popular", "bestseller", "chef's choice", "chef choice"].includes(tag.toLowerCase())),
  ].filter(Boolean))).slice(0, 5);
}

function badgeTone(badge: string) {
  const value = badge.toLowerCase();
  if (value.includes("best")) return "bg-amber-100 text-amber-900";
  if (value.includes("chef")) return "bg-violet-100 text-violet-900";
  return "bg-green-100 text-green-900";
}

function uniqueImages(item?: MenuItem) {
  const images = [item?.image, ...(item?.images ?? [])]
    .filter((image): image is string => Boolean(image?.trim()));
  return Array.from(new Set(images));
}

function getModifierOptions(item?: MenuItem): PriceOption[] {
  const inline = (item?.modifiers ?? []).map((option, index) => ({
    id: optionId("modifier", option.name, index),
    name: option.name,
    price: option.price,
  }));
  if (inline.length) return inline;

  const requiredGroup = item?.modifierGroups?.find((group) => group.required && group.options.length);
  const groupOptions = (requiredGroup?.options ?? item?.variantGroups?.[0]?.options ?? []).map((option, index) => ({
    id: option.id || optionId("modifier", option.name, index),
    name: option.name,
    price: option.price,
    groupName: requiredGroup?.name,
  }));
  return groupOptions;
}

function getAddOnOptions(item?: MenuItem): PriceOption[] {
  const inline = (item?.addOns ?? []).map((option, index) => ({
    id: optionId("addon", option.name, index),
    name: option.name,
    price: option.price,
  }));
  if (inline.length) return inline;

  return (item?.modifierGroups ?? [])
    .filter((group) => !group.required)
    .flatMap((group) =>
      group.options.map((option, index) => ({
        id: option.id || optionId(`addon-${group.id}`, option.name, index),
        name: option.name,
        price: option.price,
        groupName: group.name,
      })),
    );
}

function getRelatedItems(items: MenuItem[], item?: MenuItem) {
  if (!item) return [];
  const itemTags = new Set((item.tags ?? []).map((tag) => tag.toLowerCase()));
  return items
    .filter((entry) => entry.id !== item.id && !entry.soldOut)
    .map((entry) => ({
      item: entry,
      score:
        (entry.category === item.category ? 2 : 0) +
        ((entry.tags ?? []).some((tag) => itemTags.has(tag.toLowerCase())) ? 1 : 0),
    }))
    .sort((first, second) => second.score - first.score)
    .map((entry) => entry.item)
    .slice(0, 4);
}

function getAboutNotes(item: MenuItem) {
  const notes = [
    ...(item.dietaryLabels ?? []),
    ...(item.badges ?? []),
    ...(item.tags ?? []),
  ].filter((note) => note.length <= 28);
  return Array.from(new Set(notes)).slice(0, 3);
}

function optionId(prefix: string, name: string, index: number) {
  return `${prefix}-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function formatOptionPrice(price: number) {
  if (!price) return "Included";
  return `+ ${formatCurrency(price)}`;
}

function relativeDateLabel(value: string) {
  const timestamp = Date.parse(value);
  if (!timestamp) return "Recently";
  const days = Math.max(0, Math.round((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
