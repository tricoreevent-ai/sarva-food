"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, Plus, Store, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { MapboxLocationPicker, type MapboxPickedLocation } from "@/components/maps/mapbox-location-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { createEmptyOperatingHours, formatOperatingHours } from "@/lib/operating-hours";
import type { OperatingHoursDay, OperatingHoursSlot } from "@/lib/types";

type OnboardingErrors = Partial<Record<string, string>>;

export function RestaurantOnboardingFlow() {
  const authUser = useAppStore((state) => state.authUser);
  const submitBusinessApplication = useAppStore((state) => state.submitBusinessApplication);
  const saveOwnerBusinessProfile = useAppStore((state) => state.saveOwnerBusinessProfile);
  const profile = useAppStore((state) => state.ownerBusinessProfile);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [preferNoHours, setPreferNoHours] = useState(profile?.operatingHoursPreference === "not-specified");
  const [hours, setHours] = useState<OperatingHoursDay[]>(profile?.operatingHoursSchedule ?? createEmptyOperatingHours());
  const [form, setForm] = useState({
    businessName: profile?.hotelName ?? "",
    ownerName: authUser.name !== "Anonymous" ? authUser.name : "",
    ownerEmail: profile?.supportEmail ?? "",
    mobile: profile?.phoneNumber ?? "",
    area: "",
    address: profile?.businessAddress ?? "",
    latitude: profile?.latitude ?? 0,
    longitude: profile?.longitude ?? 0,
    mapboxPlaceId: profile?.mapboxPlaceId ?? "",
    logo: profile?.logo ?? "",
    googleMapLocation: profile?.googleMapLocation ?? "",
    gstDetails: profile?.gstDetails ?? "",
    supportEmail: profile?.supportEmail ?? "",
    whatsappNumber: profile?.whatsappNumber ?? "",
    cateringPhoneNumber: profile?.cateringPhoneNumber ?? "",
    cateringWhatsappNumber: profile?.cateringWhatsappNumber ?? "",
    cateringEmail: profile?.cateringEmail ?? "",
    emergencySupportNumber: profile?.emergencySupportNumber ?? "",
    fssaiLicense: profile?.fssaiLicense ?? "",
    diningAvailable: profile?.diningAvailable ?? true,
    cloudKitchen: profile?.cloudKitchen ?? false,
    deliveryRadiusKm: String(profile?.deliveryRadiusKm ?? 7),
    restaurantImages: profile?.coverImage ?? profile?.logo ?? "",
    foodImages: "",
  });
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(profile?.cuisineTypes?.length ? profile.cuisineTypes : []);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/cuisines", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { cuisines?: Array<{ name?: string; active?: boolean; enabled?: boolean }> }) => {
        const names = (payload.cuisines ?? [])
          .filter((item) => item.active !== false && item.enabled !== false && item.name)
          .map((item) => item.name as string);
        if (active && names.length) setCuisineOptions(names);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const hoursSummary = useMemo(() => preferNoHours ? "Not specified" : formatOperatingHours(hours), [hours, preferNoHours]);

  function updateField(field: keyof typeof form, value: string | boolean | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLocation(location: MapboxPickedLocation) {
    setForm((current) => ({
      ...current,
      address: location.address,
      googleMapLocation: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
      latitude: location.latitude,
      longitude: location.longitude,
      mapboxPlaceId: location.placeId ?? current.mapboxPlaceId,
      deliveryRadiusKm: String(location.deliveryRadiusKm),
    }));
  }

  function toggleCuisine(name: string) {
    setSelectedCuisines((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  function setDayOpen(index: number, open: boolean) {
    setHours((current) =>
      current.map((day, dayIndex) =>
        dayIndex === index ? { ...day, open, slots: open && !day.slots.length ? [{ start: "11:00", end: "23:00" }] : day.slots } : day,
      ),
    );
  }

  function updateSlot(dayIndex: number, slotIndex: number, field: keyof OperatingHoursSlot, value: string) {
    setHours((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? { ...day, slots: day.slots.map((slot, currentSlotIndex) => currentSlotIndex === slotIndex ? { ...slot, [field]: value } : slot) }
          : day,
      ),
    );
  }

  function addSlot(dayIndex: number) {
    setHours((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex ? { ...day, open: true, slots: [...day.slots, { start: "11:00", end: "23:00" }] } : day,
      ),
    );
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    setHours((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex ? { ...day, slots: day.slots.filter((_, currentSlotIndex) => currentSlotIndex !== slotIndex) } : day,
      ),
    );
  }

  function applyFirstOpenDayToAll() {
    const source = hours.find((day) => day.open && day.slots.length);
    if (!source) return;
    setHours((current) => current.map((day) => ({ ...day, open: true, slots: source.slots.map((slot) => ({ ...slot })) })));
  }

  function validateForm() {
    const next: OnboardingErrors = {};
    if (!form.businessName.trim()) next.businessName = "Hotel name is required.";
    if (!form.ownerName.trim()) next.ownerName = "Owner name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) next.ownerEmail = "Valid owner email is required.";
    if (!form.mobile.trim()) next.mobile = "Phone number is required.";
    if (!selectedCuisines.length) next.cuisines = "Select at least one cuisine.";
    if (!form.address.trim() || !form.googleMapLocation.trim()) next.location = "Verified map location is required.";
    if (!Number(form.deliveryRadiusKm) || Number(form.deliveryRadiusKm) <= 0) next.deliveryRadiusKm = "Delivery radius must be greater than zero.";
    if (!preferNoHours) {
      const openDays = hours.filter((day) => day.open);
      if (!openDays.length) next.hours = "Add operating hours or choose prefer not to specify.";
      if (openDays.some((day) => !day.slots.length || day.slots.some((slot) => !slot.start || !slot.end || slot.start >= slot.end))) {
        next.hours = "Each open day needs valid start and end times.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;
    const radius = Number(form.deliveryRadiusKm) || 7;
    const profilePayload = {
      hotelName: form.businessName.trim(),
      logo: form.logo.trim(),
      coverImage: form.restaurantImages.split(",").map((item) => item.trim()).find(Boolean) ?? form.logo.trim(),
      businessAddress: form.address.trim(),
      googleMapLocation: form.googleMapLocation.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      mapboxPlaceId: form.mapboxPlaceId || undefined,
      locationVerified: true,
      cuisineType: selectedCuisines.join(", "),
      cuisineTypes: selectedCuisines,
      gstDetails: form.gstDetails.trim() || undefined,
      phoneNumber: form.mobile.trim(),
      whatsappNumber: form.whatsappNumber.trim() || form.mobile.trim(),
      supportEmail: form.supportEmail.trim() || form.ownerEmail.trim(),
      cateringPhoneNumber: form.cateringPhoneNumber.trim() || form.mobile.trim(),
      cateringWhatsappNumber: form.cateringWhatsappNumber.trim() || form.whatsappNumber.trim() || form.mobile.trim(),
      cateringEmail: form.cateringEmail.trim() || form.ownerEmail.trim(),
      emergencySupportNumber: form.emergencySupportNumber.trim() || form.mobile.trim(),
      operatingHours: hoursSummary,
      operatingHoursSchedule: preferNoHours ? [] : hours,
      operatingHoursPreference: preferNoHours ? "not-specified" as const : "specified" as const,
      deliveryRadiusKm: radius,
      fssaiLicense: form.fssaiLicense.trim() || undefined,
      diningAvailable: form.diningAvailable,
      cloudKitchen: form.cloudKitchen,
      reviewStatus: "pending_review" as const,
      completed: true,
    };
    await saveOwnerBusinessProfile(profilePayload);
    await submitBusinessApplication({
      businessName: form.businessName.trim(),
      ownerName: form.ownerName.trim(),
      ownerEmail: form.ownerEmail.trim(),
      mobile: form.mobile.trim(),
      cuisine: selectedCuisines.join(", "),
      area: form.area.trim(),
      address: form.address.trim(),
      hotelName: form.businessName.trim(),
      logo: form.logo.trim(),
      googleMapLocation: form.googleMapLocation.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      mapboxPlaceId: form.mapboxPlaceId || undefined,
      locationVerified: true,
      gstDetails: form.gstDetails.trim() || undefined,
      phoneNumber: form.mobile.trim(),
      operatingHours: hoursSummary,
      fssaiLicense: form.fssaiLicense.trim() || undefined,
      diningAvailable: form.diningAvailable,
      cloudKitchen: form.cloudKitchen,
      deliveryRadiusKm: radius,
      restaurantImages: form.restaurantImages.split(",").map((item) => item.trim()).filter(Boolean),
      foodImages: form.foodImages.split(",").map((item) => item.trim()).filter(Boolean),
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Apply for listing"
        description="Submit restaurant details for admin review before the restaurant appears to customers."
        action={<Badge variant={profile?.reviewStatus === "approved" ? "success" : "warning"}>{profile?.reviewStatus === "approved" ? "Approved" : "Pending review"}</Badge>}
      />
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
                <Store className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Business details</h2>
                <p className="text-sm text-muted-foreground">Mandatory profile, owner contacts, service type, and map location.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hotel name" id="business-name" value={form.businessName} onChange={(value) => updateField("businessName", value)} error={errors.businessName} required />
              <Field label="Logo URL" id="logo" value={form.logo} onChange={(value) => updateField("logo", value)} required />
              <Field label="Owner name" id="owner-name" value={form.ownerName} onChange={(value) => updateField("ownerName", value)} error={errors.ownerName} required />
              <Field label="Owner email" id="owner-email" type="email" value={form.ownerEmail} onChange={(value) => updateField("ownerEmail", value)} error={errors.ownerEmail} required />
              <Field label="Phone number" id="mobile" value={form.mobile} onChange={(value) => updateField("mobile", value)} error={errors.mobile} required />
              <Field label="WhatsApp number" id="whatsapp" value={form.whatsappNumber} onChange={(value) => updateField("whatsappNumber", value)} />
              <Field label="Support email" id="support-email" type="email" value={form.supportEmail} onChange={(value) => updateField("supportEmail", value)} />
              <Field label="Catering phone" id="catering-phone" value={form.cateringPhoneNumber} onChange={(value) => updateField("cateringPhoneNumber", value)} />
              <Field label="Catering WhatsApp" id="catering-whatsapp" value={form.cateringWhatsappNumber} onChange={(value) => updateField("cateringWhatsappNumber", value)} />
              <Field label="Catering email" id="catering-email" type="email" value={form.cateringEmail} onChange={(value) => updateField("cateringEmail", value)} />
              <Field label="Emergency support" id="emergency-phone" value={form.emergencySupportNumber} onChange={(value) => updateField("emergencySupportNumber", value)} />
              <Field label="Delivery radius km" id="radius" type="number" value={form.deliveryRadiusKm} onChange={(value) => updateField("deliveryRadiusKm", value)} error={errors.deliveryRadiusKm} required />
              <Field label="Area" id="area" value={form.area} onChange={(value) => updateField("area", value)} required />
              <div className="grid gap-2 md:col-span-2">
                <Label>Cuisine type</Label>
                <div className="flex flex-wrap gap-2 rounded-md border p-3">
                  {cuisineOptions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleCuisine(name)}
                      className={selectedCuisines.includes(name) ? "rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" : "rounded-md border px-3 py-2 text-sm font-bold text-muted-foreground"}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {errors.cuisines ? <p className="text-xs font-semibold text-destructive">{errors.cuisines}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Label>Mapbox verified location</Label>
                <div className="mt-2">
                  <MapboxLocationPicker
                    value={{
                      address: form.address,
                      latitude: Number(form.latitude),
                      longitude: Number(form.longitude),
                      placeId: form.mapboxPlaceId,
                      deliveryRadiusKm: Number(form.deliveryRadiusKm) || 7,
                    }}
                    onChange={updateLocation}
                  />
                </div>
                {errors.location ? <p className="mt-2 text-xs font-semibold text-destructive">{errors.location}</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Operating hours</h2>
                  <p className="text-sm text-muted-foreground">Set open days and multiple time slots.</p>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={applyFirstOpenDayToAll} disabled={preferNoHours}>Apply to all</Button>
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
              <input type="checkbox" checked={preferNoHours} onChange={(event) => setPreferNoHours(event.target.checked)} />
              I prefer not to specify
            </label>
            {!preferNoHours ? (
              <div className="space-y-3">
                {hours.map((day, dayIndex) => (
                  <div key={day.day} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[140px_1fr]">
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={day.open} onChange={(event) => setDayOpen(dayIndex, event.target.checked)} />
                      {day.day}
                    </label>
                    <div className="space-y-2">
                      {day.open ? day.slots.map((slot, slotIndex) => (
                        <div key={`${day.day}-${slotIndex}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input type="time" value={slot.start} onChange={(event) => updateSlot(dayIndex, slotIndex, "start", event.target.value)} />
                          <Input type="time" value={slot.end} onChange={(event) => updateSlot(dayIndex, slotIndex, "end", event.target.value)} />
                          <Button type="button" variant="outline" size="icon" onClick={() => removeSlot(dayIndex, slotIndex)} aria-label={`Remove ${day.day} slot`}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Closed</p>}
                      {day.open ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => addSlot(dayIndex)}>
                          <Plus className="size-4" />
                          Add slot
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="rounded-md bg-muted/40 p-3 text-sm font-semibold">
              Summary: {hoursSummary}
            </div>
            {errors.hours ? <p className="text-xs font-semibold text-destructive">{errors.hours}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="GST details optional" id="gst" value={form.gstDetails} onChange={(value) => updateField("gstDetails", value)} />
            <Field label="FSSAI/license optional" id="fssai" value={form.fssaiLicense} onChange={(value) => updateField("fssaiLicense", value)} />
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="restaurant-images">Restaurant image URLs</Label>
              <Textarea id="restaurant-images" value={form.restaurantImages} onChange={(event) => updateField("restaurantImages", event.target.value)} placeholder="Comma separated image URLs" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="food-images">Food image URLs</Label>
              <Textarea id="food-images" value={form.foodImages} onChange={(event) => updateField("foodImages", event.target.value)} placeholder="Comma separated food image URLs" />
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
              <input type="checkbox" checked={form.diningAvailable} onChange={(event) => updateField("diningAvailable", event.target.checked)} />
              Dining available
            </label>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
              <input type="checkbox" checked={form.cloudKitchen} onChange={(event) => updateField("cloudKitchen", event.target.checked)} />
              Cloud kitchen
            </label>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">
            <CheckCircle2 className="size-4" />
            Submit for review
          </Button>
          {apiMessage ? <p className="text-sm font-semibold text-muted-foreground">{apiMessage}</p> : null}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  required = false,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
