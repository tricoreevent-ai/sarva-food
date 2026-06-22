"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowDown, ArrowUp, BellRing, CheckCircle2, ChevronRight, Clock, CloudOff, Database, Download, HardDrive, ImageIcon, MonitorSmartphone, Moon, PackageCheck, Pencil, Play, Plus, RefreshCcw, RotateCcw, Save, Share2, Store, Sun, Trash2, X, type LucideIcon } from "lucide-react";
import { MapboxLocationPicker, type MapboxPickedLocation } from "@/components/maps/mapbox-location-picker";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { Button } from "@/components/ui/button";
import { CreatableMultiSelect, type MultiSelectOption } from "@/components/ui/creatable-multi-select";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/app-store";
import { useThemeMode } from "@/lib/theme-provider";
import { getConnectivitySnapshot, offlineQueueManager, startOfflineSyncEngine, subscribeConnectivity, subscribeOfflineQueue, type ConnectivitySnapshot, type OfflineQueueEntry } from "@/lib/offline";
import { operationalSoundOptions, playOperationalSound, type OperationalSound } from "@/lib/operational-sounds";
import type { AppCuisine, OperatingHoursDay, OperatingHoursSlot, OwnerBusinessProfile, TaxSettings } from "@/lib/types";

type SoundTarget = "onlineOrder" | "waiterOrder" | "kitchenReady";
type SettingsTab = "profile" | "branding" | "appearance" | "delivery" | "payments" | "ordering" | "notifications" | "hours" | "taxes" | "social" | "sync";
type SoundPrefs = Record<SoundTarget, {
  sound: OperationalSound;
  volume: number;
  repeatCount: number;
  repeatUntilAcknowledged: boolean;
  muted: boolean;
}>;

type ProfileDraft = {
  ownerName: string;
  hotelName: string;
  logo: string;
  coverImage: string;
  coverImages: string[];
  businessAddress: string;
  googleMapLocation: string;
  cuisineType: string;
  cuisineTypes: string[];
  phoneNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  cateringPhoneNumber: string;
  cateringWhatsappNumber: string;
  cateringEmail: string;
  emergencySupportNumber: string;
  deliveryRadiusKm: string;
  deliveryCharge: string;
  minimumOrder: string;
  freeDeliveryThreshold: string;
  latitude: string;
  longitude: string;
  mapboxPlaceId: string;
  gstDetails: string;
  fssaiLicense: string;
  diningAvailable: boolean;
  cloudKitchen: boolean;
  upiId: string;
  codEnabled: boolean;
  paymentMethods: Array<"upi" | "cod" | "cash" | "card">;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  phonePeEnabled: boolean;
  phonePeMerchantId: string;
  paytmEnabled: boolean;
  paytmMerchantId: string;
};

const soundLabels: Record<SoundTarget, string> = {
  onlineOrder: "New online order",
  waiterOrder: "Waiter POS order",
  kitchenReady: "Kitchen ready alert",
};

const defaultSoundPrefs: SoundPrefs = {
  onlineOrder: { sound: "loud-alarm", volume: 85, repeatCount: 3, repeatUntilAcknowledged: true, muted: false },
  waiterOrder: { sound: "pos-alert", volume: 70, repeatCount: 2, repeatUntilAcknowledged: false, muted: false },
  kitchenReady: { sound: "kitchen-alert", volume: 80, repeatCount: 2, repeatUntilAcknowledged: false, muted: false },
};

const soundStorageKey = "sarva-owner-sound-settings:v1";
const settingsTabs: Array<{ value: SettingsTab; label: string }> = [
  { value: "profile", label: "Restaurant Profile" },
  { value: "branding", label: "Branding" },
  { value: "appearance", label: "Appearance" },
  { value: "delivery", label: "Delivery" },
  { value: "payments", label: "Payments" },
  { value: "ordering", label: "Ordering" },
  { value: "notifications", label: "Notifications" },
  { value: "hours", label: "Operating Hours" },
  { value: "taxes", label: "Taxes & Charges" },
  { value: "social", label: "Social & Marketing" },
  { value: "sync", label: "Data & Sync" },
];

const weekDays: OperatingHoursDay["day"][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function createEmptyHours(): OperatingHoursDay[] {
  return weekDays.map((day) => ({ day, open: false, slots: [] }));
}

export function OwnerSettingsFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taxSettings = useAppStore((state) => state.taxSettings);
  const updateTaxSettings = useAppStore((state) => state.updateTaxSettings);
  const authUser = useAppStore((state) => state.authUser);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const ownerProfile = useAppStore((state) => state.ownerBusinessProfile);
  const saveOwnerBusinessProfile = useAppStore((state) => state.saveOwnerBusinessProfile);
  const { theme, setTheme } = useThemeMode();
  const activeTab = parseSettingsTab(searchParams.get("tab"));
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => toProfileDraft(ownerProfile, authUser.name));
  const [cuisineOptions, setCuisineOptions] = useState<MultiSelectOption[]>([]);
  const [hours, setHours] = useState<OperatingHoursDay[]>(() => ownerProfile?.operatingHoursSchedule?.length ? ownerProfile.operatingHoursSchedule : createEmptyHours());
  const [preferNoHours, setPreferNoHours] = useState(ownerProfile?.operatingHoursPreference === "not-specified");
  const [soundPrefs, setSoundPrefs] = useState<SoundPrefs>(() => {
    if (typeof window === "undefined") return defaultSoundPrefs;
    try {
      const stored = window.localStorage.getItem(soundStorageKey);
      return stored ? { ...defaultSoundPrefs, ...JSON.parse(stored) as Partial<SoundPrefs> } : defaultSoundPrefs;
    } catch {
      return defaultSoundPrefs;
    }
  });
  const [charges, setCharges] = useState({
    parcelEnabled: taxSettings.defaultPackingCharge > 0,
    chargeType: "fixed",
    fixedParcelCharge: taxSettings.defaultPackingCharge,
    perItemParcelCharge: 10,
    packagingGst: taxSettings.defaultGstRate,
    gstEnabled: taxSettings.gstEnabled,
  });
  const [automation, setAutomation] = useState({
    website: false,
    swiggy: false,
    zomato: false,
    pos: false,
    scheduled: false,
    businessHoursOnly: true,
    maxActiveOrders: 20,
    deliveryRadiusLimit: 7,
    staffingRequired: true,
  });
  const [successNotice, setSuccessNotice] = useState("");
  const dismissSuccessNotice = useCallback(() => setSuccessNotice(""), []);

  useEffect(() => {
    window.localStorage.setItem(soundStorageKey, JSON.stringify(soundPrefs));
  }, [soundPrefs]);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/cuisines", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { cuisines?: AppCuisine[] }) => {
        if (!active) return;
        const options = (payload.cuisines ?? [])
          .filter((item) => item.active !== false && item.name)
          .sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name))
          .map((item) => ({ value: item.name, label: item.name }));
        setCuisineOptions(options);
      })
      .catch(() => setCuisineOptions([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const nextDraft = toProfileDraft(ownerProfile, authUser.name);
    queueMicrotask(() => {
      setProfileDraft(nextDraft);
      setHours(ownerProfile?.operatingHoursSchedule?.length ? ownerProfile.operatingHoursSchedule : createEmptyHours());
      setPreferNoHours(ownerProfile?.operatingHoursPreference === "not-specified");
    });
  }, [authUser.name, ownerProfile]);

  const automationSummary = useMemo(
    () => Object.entries(automation).filter(([, value]) => value === true).length,
    [automation],
  );

  function selectSettingsTab(value: string) {
    const tab = parseSettingsTab(value);
    router.replace(tab === "profile" ? "/owner/settings" : `/owner/settings?tab=${tab}`, { scroll: false });
  }

  function updateSound(target: SoundTarget, patch: Partial<SoundPrefs[SoundTarget]>) {
    setSoundPrefs((current) => ({ ...current, [target]: { ...current[target], ...patch } }));
  }

  async function testSound(target: SoundTarget) {
    const prefs = soundPrefs[target];
    if (prefs.muted) {
      toast.error(`${soundLabels[target]} is muted.`);
      return;
    }
    await playOperationalSound({ sound: prefs.sound, volume: prefs.volume / 100, repeatCount: prefs.repeatCount });
    toast.success(`${soundLabels[target]} sound played.`);
  }

  async function saveCharges() {
    const nextSettings: TaxSettings = {
      ...taxSettings,
      gstEnabled: charges.gstEnabled,
      defaultPackingCharge: charges.parcelEnabled ? Number(charges.fixedParcelCharge) || 0 : 0,
      defaultGstRate: charges.packagingGst === 18 ? 18 : 5,
    };
    await updateTaxSettings(nextSettings);
    setSuccessNotice("Charges saved for POS billing.");
  }

  async function saveProfile() {
    const currentProfile = ownerProfile ?? createDraftOwnerProfile(authUser.name);
    const hotelName = profileDraft.hotelName.trim() || currentProfile.hotelName || "Draft restaurant";
    const phoneNumber = profileDraft.phoneNumber.trim() || currentProfile.phoneNumber || "";
    const businessAddress = profileDraft.businessAddress.trim() || currentProfile.businessAddress || "";
    const hasStructuredHours = hours.some((day) => day.open && day.slots.length);
    const hoursNotSpecified = preferNoHours || !hasStructuredHours;
    if (!hoursNotSpecified && hours.some((day) => day.open && day.slots.some((slot) => !slot.start || !slot.end || slot.start >= slot.end))) {
      toast.error("Each operating slot needs a valid opening and closing time.");
      return;
    }
    const cuisineTypes = profileDraft.cuisineTypes.map((item) => item.trim()).filter(Boolean);
    const coverImages = normalizeImageList(profileDraft.coverImages.length ? profileDraft.coverImages : [profileDraft.coverImage]);
    const primaryCoverImage = profileDraft.coverImage.trim() || coverImages[0] || "";
    const hoursSummary = hoursNotSpecified ? "Not specified" : formatOperatingHours(hours);
    const hasVerifiedLocation = Boolean(
      profileDraft.googleMapLocation.trim() ||
      (Number(profileDraft.latitude) && Number(profileDraft.longitude)) ||
      profileDraft.mapboxPlaceId,
    );
    const completed = Boolean(hotelName && phoneNumber && businessAddress && cuisineTypes.length && coverImages.length && hasVerifiedLocation && !hoursNotSpecified);
    try {
      await saveOwnerBusinessProfile({
        ...currentProfile,
        ownerName: profileDraft.ownerName.trim() || authUser.name,
        hotelName,
        logo: profileDraft.logo.trim(),
        coverImage: primaryCoverImage,
        coverImages,
        businessAddress,
        googleMapLocation: profileDraft.googleMapLocation.trim(),
        latitude: Number(profileDraft.latitude) || undefined,
        longitude: Number(profileDraft.longitude) || undefined,
        mapboxPlaceId: profileDraft.mapboxPlaceId || undefined,
        locationVerified: Boolean(profileDraft.mapboxPlaceId || (profileDraft.latitude && profileDraft.longitude)),
        cuisineType: cuisineTypes.join(", "),
        cuisineTypes,
        phoneNumber,
        whatsappNumber: profileDraft.whatsappNumber.trim(),
        supportEmail: profileDraft.supportEmail.trim(),
        cateringPhoneNumber: profileDraft.cateringPhoneNumber.trim(),
        cateringWhatsappNumber: profileDraft.cateringWhatsappNumber.trim(),
        cateringEmail: profileDraft.cateringEmail.trim(),
        emergencySupportNumber: profileDraft.emergencySupportNumber.trim(),
        operatingHours: hoursSummary,
        operatingHoursSchedule: hoursNotSpecified ? [] : hours,
        operatingHoursPreference: hoursNotSpecified ? "not-specified" : "specified",
        deliveryRadiusKm: Number(profileDraft.deliveryRadiusKm) || currentProfile.deliveryRadiusKm || 5,
        deliveryCharge: Number(profileDraft.deliveryCharge) || 0,
        minimumOrder: Number(profileDraft.minimumOrder) || 0,
        freeDeliveryThreshold: Number(profileDraft.freeDeliveryThreshold) || undefined,
        gstDetails: profileDraft.gstDetails.trim(),
        fssaiLicense: profileDraft.fssaiLicense.trim(),
        diningAvailable: profileDraft.diningAvailable,
        cloudKitchen: profileDraft.cloudKitchen,
        paymentConfig: {
          upiId: profileDraft.upiId.trim(),
          codEnabled: profileDraft.codEnabled,
          methods: profileDraft.paymentMethods,
          razorpayEnabled: profileDraft.razorpayEnabled,
          razorpayKeyId: profileDraft.razorpayKeyId.trim(),
          phonePeEnabled: profileDraft.phonePeEnabled,
          phonePeMerchantId: profileDraft.phonePeMerchantId.trim(),
          paytmEnabled: profileDraft.paytmEnabled,
          paytmMerchantId: profileDraft.paytmMerchantId.trim(),
        },
        reviewStatus: completed ? "pending_review" : "draft",
        completed,
      });
      setAuthUser({ ...authUser, name: profileDraft.ownerName.trim() || authUser.name });
      setSuccessNotice(completed ? "Restaurant settings saved successfully." : "Draft saved. Complete the missing fields when ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Owner profile could not be saved.");
    }
  }

  function updateProfileLocation(location: MapboxPickedLocation) {
    setProfileDraft((current) => ({
      ...current,
      businessAddress: location.address,
      googleMapLocation: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      mapboxPlaceId: location.placeId ?? current.mapboxPlaceId,
      deliveryRadiusKm: String(location.deliveryRadiusKm),
    }));
  }

  function updateCuisineTypes(cuisineTypes: string[]) {
    setProfileDraft((current) => ({
      ...current,
      cuisineTypes,
      cuisineType: cuisineTypes.join(", "),
    }));
  }

  function updateCoverImages(nextImages: string[]) {
    const coverImages = normalizeImageList(nextImages.map(optimizeCloudinaryUrl));
    setProfileDraft((current) => ({
      ...current,
      coverImages,
      coverImage: current.coverImage && coverImages.includes(current.coverImage)
        ? current.coverImage
        : coverImages[0] ?? "",
    }));
  }

  function addCoverImage(url: string) {
    const image = optimizeCloudinaryUrl(url);
    if (!image) return;
    setProfileDraft((current) => {
      const coverImages = normalizeImageList([...(current.coverImages.length ? current.coverImages : [current.coverImage]), image]);
      return {
        ...current,
        coverImages,
        coverImage: current.coverImage || coverImages[0] || "",
      };
    });
  }

  function togglePaymentMethod(method: ProfileDraft["paymentMethods"][number], enabled: boolean) {
    setProfileDraft((current) => {
      const methods = new Set(current.paymentMethods);
      if (enabled) methods.add(method);
      else methods.delete(method);
      return {
        ...current,
        codEnabled: method === "cod" ? enabled : current.codEnabled,
        paymentMethods: Array.from(methods),
      };
    });
  }

  return (
    <div className="space-y-6">
      <CenteredSuccessNotice message={successNotice} onClose={dismissSuccessNotice} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Settings</h1>
          <p className="mt-2 text-base font-semibold text-muted-foreground">Owner profile, notification, automation, charges, printer, and sync preferences.</p>
        </div>
        <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
          <RotateCcw className="size-4" />
          Open Sync Center
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={selectSettingsTab} className="space-y-5">
        <TabsList className="customer-scroll max-w-full justify-start overflow-x-auto rounded-2xl bg-card p-1 shadow-sm">
          {settingsTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="profile">
          <DashboardCard title="Owner Profile" action={<Button onClick={() => void saveProfile()}><Save className="size-4" />Save profile</Button>}>
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileField label="Owner name" value={profileDraft.ownerName} onChange={(ownerName) => setProfileDraft({ ...profileDraft, ownerName })} />
                <ProfileField label="Hotel name" value={profileDraft.hotelName} onChange={(hotelName) => setProfileDraft({ ...profileDraft, hotelName })} required />
                <ProfileField label="Phone number" value={profileDraft.phoneNumber} onChange={(phoneNumber) => setProfileDraft({ ...profileDraft, phoneNumber })} />
                <ProfileField label="WhatsApp number" value={profileDraft.whatsappNumber} onChange={(whatsappNumber) => setProfileDraft({ ...profileDraft, whatsappNumber })} />
                <ProfileField label="Support email" type="email" value={profileDraft.supportEmail} onChange={(supportEmail) => setProfileDraft({ ...profileDraft, supportEmail })} />
                <label className="grid gap-2 text-sm font-bold text-muted-foreground">
                  Cuisine types
                  <CreatableMultiSelect
                    options={cuisineOptions}
                    value={profileDraft.cuisineTypes}
                    onChange={updateCuisineTypes}
                    placeholder="Select or create cuisine types"
                    allowCreateOptions
                  />
                </label>
                <ProfileField label="GST number" value={profileDraft.gstDetails} onChange={(gstDetails) => setProfileDraft({ ...profileDraft, gstDetails })} />
                <ProfileField label="FSSAI license" value={profileDraft.fssaiLicense} onChange={(fssaiLicense) => setProfileDraft({ ...profileDraft, fssaiLicense })} />
              </div>
              <div className="space-y-3">
                <label className="grid gap-2 text-sm font-bold text-muted-foreground">
                  Business address
                  <textarea className="min-h-28 rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" value={profileDraft.businessAddress} onChange={(event) => setProfileDraft({ ...profileDraft, businessAddress: event.target.value })} />
                </label>
                <ProfileField label="Google map location" value={profileDraft.googleMapLocation} onChange={(googleMapLocation) => setProfileDraft({ ...profileDraft, googleMapLocation })} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleRow label="Dining available" checked={profileDraft.diningAvailable} onChange={(diningAvailable) => setProfileDraft({ ...profileDraft, diningAvailable })} />
                  <ToggleRow label="Cloud kitchen" checked={profileDraft.cloudKitchen} onChange={(cloudKitchen) => setProfileDraft({ ...profileDraft, cloudKitchen })} />
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-card text-emerald-700"><Store className="size-5" /></span>
                    <div>
                      <p className="font-black text-emerald-950">{profileDraft.hotelName || "Hotel name"}</p>
                      <p className="text-sm font-semibold text-emerald-700">{profileDraft.cuisineTypes.join(", ") || "Cuisine not set"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="branding">
          <DashboardCard title="Branding" action={<Button onClick={() => void saveProfile()}><Save className="size-4" />Save branding</Button>}>
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <div className="space-y-4">
                <ImagePreview title="Logo Preview" src={profileDraft.logo} shape="circle" fallback={IMAGE_FALLBACKS.logo} />
                <ProfileField label="Logo URL" value={profileDraft.logo} onChange={(logo) => setProfileDraft({ ...profileDraft, logo: optimizeCloudinaryUrl(logo) })} />
                <CloudinaryUploadWidget folder="profile" restaurantId={authUser.restaurantSlug} aspectRatio={1} tags={["owner-logo"]} label="Upload logo" onUpload={(logo) => setProfileDraft({ ...profileDraft, logo: optimizeCloudinaryUrl(logo) })} />
              </div>
              <div className="space-y-4">
                <ImagePreview title="Cover Image Preview" src={profileDraft.coverImage} shape="banner" fallback={IMAGE_FALLBACKS.restaurant} />
                <ProfileField
                  label="Primary cover image URL"
                  value={profileDraft.coverImage}
                  onChange={(coverImage) => {
                    const image = optimizeCloudinaryUrl(coverImage);
                    setProfileDraft((current) => ({
                      ...current,
                      coverImage: image,
                      coverImages: normalizeImageList([image, ...current.coverImages]),
                    }));
                  }}
                />
                <CloudinaryUploadWidget folder="profile" restaurantId={authUser.restaurantSlug} aspectRatio={16 / 9} tags={["owner-cover"]} label="Upload banner" onUpload={addCoverImage} />
                <BannerManager
                  images={profileDraft.coverImages}
                  primary={profileDraft.coverImage}
                  onChange={updateCoverImages}
                  onPrimary={(coverImage) => setProfileDraft((current) => ({ ...current, coverImage }))}
                  onAdd={addCoverImage}
                />
                <CustomerBannerPreview
                  restaurantName={profileDraft.hotelName || "Restaurant name"}
                  cuisine={profileDraft.cuisineTypes.join(", ") || profileDraft.cuisineType || "Cuisine not set"}
                  address={profileDraft.businessAddress || "Address not set"}
                  images={profileDraft.coverImages.length ? profileDraft.coverImages : [profileDraft.coverImage].filter(Boolean)}
                  logo={profileDraft.logo}
                />
              </div>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="delivery">
          <DashboardCard title="Delivery & Location" action={<Button onClick={() => void saveProfile()}><Save className="size-4" />Save delivery</Button>}>
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="space-y-4">
                <MapboxLocationPicker
                  value={{
                    address: profileDraft.businessAddress,
                    latitude: Number(profileDraft.latitude) || 12.9716,
                    longitude: Number(profileDraft.longitude) || 77.5946,
                    placeId: profileDraft.mapboxPlaceId || undefined,
                    deliveryRadiusKm: Number(profileDraft.deliveryRadiusKm) || 5,
                  }}
                  onChange={(location) => updateProfileLocation(location)}
                />
                <label className="grid gap-2 text-sm font-bold text-muted-foreground">
                  Business address
                  <textarea className="min-h-28 rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" value={profileDraft.businessAddress} onChange={(event) => setProfileDraft({ ...profileDraft, businessAddress: event.target.value })} />
                </label>
                <ProfileField label="Google map location" value={profileDraft.googleMapLocation} onChange={(googleMapLocation) => setProfileDraft({ ...profileDraft, googleMapLocation })} />
              </div>
              <div className="grid gap-3">
                <ProfileField label="Latitude" type="number" value={profileDraft.latitude} onChange={(latitude) => setProfileDraft({ ...profileDraft, latitude })} />
                <ProfileField label="Longitude" type="number" value={profileDraft.longitude} onChange={(longitude) => setProfileDraft({ ...profileDraft, longitude })} />
                <ProfileField label="Place ID" value={profileDraft.mapboxPlaceId} onChange={(mapboxPlaceId) => setProfileDraft({ ...profileDraft, mapboxPlaceId })} />
                <ProfileField label="Delivery radius km" type="number" value={profileDraft.deliveryRadiusKm} onChange={(deliveryRadiusKm) => setProfileDraft({ ...profileDraft, deliveryRadiusKm })} />
                <ProfileField label="Delivery charge" type="number" value={profileDraft.deliveryCharge} onChange={(deliveryCharge) => setProfileDraft({ ...profileDraft, deliveryCharge })} />
                <ProfileField label="Minimum order" type="number" value={profileDraft.minimumOrder} onChange={(minimumOrder) => setProfileDraft({ ...profileDraft, minimumOrder })} />
                <ProfileField label="Free delivery threshold" type="number" value={profileDraft.freeDeliveryThreshold} onChange={(freeDeliveryThreshold) => setProfileDraft({ ...profileDraft, freeDeliveryThreshold })} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleRow label="Dining available" checked={profileDraft.diningAvailable} onChange={(diningAvailable) => setProfileDraft({ ...profileDraft, diningAvailable })} />
                  <ToggleRow label="Cloud kitchen" checked={profileDraft.cloudKitchen} onChange={(cloudKitchen) => setProfileDraft({ ...profileDraft, cloudKitchen })} />
                </div>
              </div>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="payments">
          <DashboardCard title="Payments" action={<Button onClick={() => void saveProfile()}><Save className="size-4" />Save payments</Button>}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProfileField label="UPI ID" value={profileDraft.upiId} onChange={(upiId) => setProfileDraft({ ...profileDraft, upiId })} placeholder="restaurant@upi" />
              <ToggleRow label="COD enabled" checked={profileDraft.codEnabled} onChange={(codEnabled) => togglePaymentMethod("cod", codEnabled)} />
              <PaymentMethodToggle label="UPI" method="upi" draft={profileDraft} setDraft={setProfileDraft} />
              <PaymentMethodToggle label="Cash" method="cash" draft={profileDraft} setDraft={setProfileDraft} />
              <PaymentMethodToggle label="Card" method="card" draft={profileDraft} setDraft={setProfileDraft} />
              <ToggleRow label="Razorpay ready" checked={profileDraft.razorpayEnabled} onChange={(razorpayEnabled) => setProfileDraft({ ...profileDraft, razorpayEnabled })} />
              <ProfileField label="Razorpay key ID" value={profileDraft.razorpayKeyId} onChange={(razorpayKeyId) => setProfileDraft({ ...profileDraft, razorpayKeyId })} />
              <ToggleRow label="PhonePe ready" checked={profileDraft.phonePeEnabled} onChange={(phonePeEnabled) => setProfileDraft({ ...profileDraft, phonePeEnabled })} />
              <ProfileField label="PhonePe merchant ID" value={profileDraft.phonePeMerchantId} onChange={(phonePeMerchantId) => setProfileDraft({ ...profileDraft, phonePeMerchantId })} />
              <ToggleRow label="Paytm ready" checked={profileDraft.paytmEnabled} onChange={(paytmEnabled) => setProfileDraft({ ...profileDraft, paytmEnabled })} />
              <ProfileField label="Paytm merchant ID" value={profileDraft.paytmMerchantId} onChange={(paytmMerchantId) => setProfileDraft({ ...profileDraft, paytmMerchantId })} />
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="hours">
          <DashboardCard title="Operating Hours" action={<Button onClick={() => void saveProfile()}><Save className="size-4" />Save hours</Button>}>
            <OperatingHoursEditor hours={hours} setHours={setHours} preferNoHours={preferNoHours} setPreferNoHours={setPreferNoHours} />
          </DashboardCard>
        </TabsContent>

        <TabsContent value="notifications">
          <DashboardCard title="Notification & Sound">
            <div className="space-y-4">
              {(Object.keys(soundLabels) as SoundTarget[]).map((target) => {
                const prefs = soundPrefs[target];
                return (
                  <div key={target} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                          <BellRing className="size-5" />
                        </span>
                        <div>
                          <p className="font-black text-slate-950">{soundLabels[target]}</p>
                          <p className="text-xs font-semibold text-slate-500">Cached Web Audio alert, plays after first user interaction.</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void testSound(target)}>
                        <Play className="size-4" />
                        Test sound
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-5">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500 md:col-span-2">
                        Sound type
                        <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold normal-case text-foreground" value={prefs.sound} onChange={(event) => updateSound(target, { sound: event.target.value as OperationalSound })}>
                          {operationalSoundOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Volume
                        <input type="range" min={0} max={100} value={prefs.volume} onChange={(event) => updateSound(target, { volume: Number(event.target.value) })} />
                        <span className="text-xs font-semibold normal-case text-slate-500">{prefs.volume}%</span>
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Repeat count
                        <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case" type="number" min={1} max={12} value={prefs.repeatCount} onChange={(event) => updateSound(target, { repeatCount: Number(event.target.value) || 1 })} />
                      </label>
                      <div className="grid gap-2 text-xs font-black uppercase text-slate-500">
                        Controls
                        <ToggleRow label="Mute" checked={prefs.muted} onChange={(muted) => updateSound(target, { muted })} />
                        <ToggleRow label="Until acknowledged" checked={prefs.repeatUntilAcknowledged} onChange={(repeatUntilAcknowledged) => updateSound(target, { repeatUntilAcknowledged })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="appearance">
          <DashboardCard title="Appearance">
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <ThemeChoice icon={Sun} label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
                <ThemeChoice icon={Moon} label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
                <ThemeChoice icon={MonitorSmartphone} label="System" active={theme === "system"} onClick={() => setTheme("system")} />
              </div>
              <FullscreenToggle />
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="ordering">
          <DashboardCard title="Order Automation">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(["website", "swiggy", "zomato", "pos", "scheduled"] as const).map((key) => (
                <ToggleRow key={key} label={`${key[0].toUpperCase()}${key.slice(1)} orders`} checked={automation[key]} onChange={(value) => setAutomation((current) => ({ ...current, [key]: value }))} />
              ))}
              <ToggleRow label="Business hours only" checked={automation.businessHoursOnly} onChange={(value) => setAutomation((current) => ({ ...current, businessHoursOnly: value }))} />
              <ToggleRow label="Staffing availability required" checked={automation.staffingRequired} onChange={(value) => setAutomation((current) => ({ ...current, staffingRequired: value }))} />
              <NumberRow label="Max active order limit" value={automation.maxActiveOrders} onChange={(value) => setAutomation((current) => ({ ...current, maxActiveOrders: value }))} />
              <NumberRow label="Delivery radius limit km" value={automation.deliveryRadiusLimit} onChange={(value) => setAutomation((current) => ({ ...current, deliveryRadiusLimit: value }))} />
              <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 md:col-span-2 xl:col-span-3">{automationSummary} automation controls enabled.</p>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="taxes">
          <DashboardCard title="Charges">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ToggleRow label="Enable parcel charge" checked={charges.parcelEnabled} onChange={(value) => setCharges((current) => ({ ...current, parcelEnabled: value }))} />
              <ToggleRow label="Apply GST" checked={charges.gstEnabled} onChange={(value) => setCharges((current) => ({ ...current, gstEnabled: value }))} />
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Charge type
                <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold normal-case text-foreground" value={charges.chargeType} onChange={(event) => setCharges((current) => ({ ...current, chargeType: event.target.value }))}>
                  <option value="fixed">Fixed</option>
                  <option value="per-item">Per item</option>
                  <option value="category">Category based</option>
                </select>
              </label>
              <NumberRow label="Fixed parcel charge" value={charges.fixedParcelCharge} onChange={(value) => setCharges((current) => ({ ...current, fixedParcelCharge: value }))} />
              <NumberRow label="Per-item parcel charge" value={charges.perItemParcelCharge} onChange={(value) => setCharges((current) => ({ ...current, perItemParcelCharge: value }))} />
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Packaging GST
                <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold normal-case text-foreground" value={charges.packagingGst} onChange={(event) => setCharges((current) => ({ ...current, packagingGst: Number(event.target.value) === 18 ? 18 : 5 }))}>
                  <option value={5}>5%</option>
                  <option value={18}>18%</option>
                </select>
              </label>
              <Button className="md:col-span-2 xl:col-span-3" onClick={() => void saveCharges()}>
                <Save className="size-4" />
                Save Charges
              </Button>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="social">
          <DashboardCard title="Social & Marketing">
            <div className="grid gap-4 md:grid-cols-3">
              <SettingTile icon={Share2} title="Social posts" description="Create food posts with Cloudinary media and submit them for admin review." />
              <SettingTile icon={ImageIcon} title="Brand media" description="Logo and cover image updates from Branding sync to customer restaurant pages." />
              <Button asChild className="h-auto min-h-24 justify-start p-4 text-left">
                <a href="/owner/social-posts">Open social posts</a>
              </Button>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="sync">
          <DashboardCard title="Data & Sync">
            <DataSyncPanel />
          </DashboardCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CenteredSuccessNotice({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onClose, 30000);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/20 px-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -24, rotate: -1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <button
              type="button"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
              aria-label="Close success message"
            >
              <X className="size-4" />
            </button>
            <motion.span
              className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-700"
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 360, damping: 18 }}
            >
              <CheckCircle2 className="size-11" />
            </motion.span>
            <p className="mt-5 text-xl font-black text-slate-950">Saved successfully</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{message}</p>
            <Button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700" onClick={onClose}>
              Done
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-input bg-card p-3 text-sm font-semibold text-foreground">
      <span className="inline-flex items-center gap-2">
        {label}
        <InfoTooltip label={`${label} can be changed without leaving operations.`} className="hidden sm:inline-flex" />
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function readLastBackupTime() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("sarva-owner-last-backup-at") ?? "";
  } catch {
    return "";
  }
}

function formatSyncDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function DataSyncPanel() {
  const authUser = useAppStore((state) => state.authUser);
  const menuItems = useAppStore((state) => state.menuItems);
  const offers = useAppStore((state) => state.offers);
  const orders = useAppStore((state) => state.orders);
  const loyaltyCustomers = useAppStore((state) => state.loyaltyCustomers);
  const restaurants = useAppStore((state) => state.restaurants);
  const ownerProfile = useAppStore((state) => state.ownerBusinessProfile);
  const printerSettings = useAppStore((state) => state.printerSettings);
  const tableOrders = useAppStore((state) => state.tableOrders);
  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot>(() => ({ online: true, lastChangedAt: new Date(0).toISOString() }));
  const [queue, setQueue] = useState<OfflineQueueEntry[]>([]);
  const restaurantSlug = authUser.restaurantSlug ?? restaurants[0]?.slug ?? "restaurant";
  const restaurantMenu = menuItems.filter((item) => item.restaurantSlug === restaurantSlug);
  const restaurantOffers = offers.filter((offer) => !offer.restaurantSlug || offer.restaurantSlug === restaurantSlug);
  const pending = queue.filter((item) => item.status === "queued" || item.status === "retrying").length;
  const failed = queue.filter((item) => item.status === "failed" || item.status === "conflict").length;
  const lastSynced = queue
    .map((item) => item.syncedAt || item.lastAttemptAt || item.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const latestBackup = readLastBackupTime();
  const activityLogs = [
    ...restaurantMenu.slice(0, 4).map((item) => ({ module: "Menu", action: `${item.name} metadata ready`, time: item.id })),
    ...restaurantOffers.slice(0, 3).map((offer) => ({ module: "Offers", action: `${offer.code} ${offer.status ?? "active"}`, time: offer.validTo ?? "No end date" })),
    ...(ownerProfile ? [{ module: "Settings", action: `${ownerProfile.hotelName || "Restaurant"} profile ${ownerProfile.completed ? "completed" : "draft"}`, time: ownerProfile.reviewStatus ?? "draft" }] : []),
  ].slice(0, 8);

  useEffect(() => {
    startOfflineSyncEngine();
    const timer = window.setTimeout(() => setConnectivity(getConnectivitySnapshot()), 0);
    const unsubscribeConnectivity = subscribeConnectivity(setConnectivity);
    const unsubscribeQueue = subscribeOfflineQueue(setQueue);
    return () => {
      window.clearTimeout(timer);
      unsubscribeConnectivity();
      unsubscribeQueue();
    };
  }, []);

  function exportJson(label: string, payload: unknown) {
    downloadText(`${restaurantSlug}-${label}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportCsv(label: string, rows: Record<string, unknown>[]) {
    const columns = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()));
    const csv = [
      columns.join(","),
      ...rows.map((row) => columns.map((column) => escapeCsv(String(row[column] ?? ""))).join(",")),
    ].join("\n");
    downloadText(`${restaurantSlug}-${label}.csv`, csv, "text/csv");
  }

  function createBackup() {
    const payload = {
      generatedAt: new Date().toISOString(),
      restaurantSlug,
      ownerProfile,
      menuItems: restaurantMenu,
      offers: restaurantOffers,
      orders: orders.filter((order) => order.restaurantSlug === restaurantSlug),
      customers: loyaltyCustomers,
      syncQueue: queue,
    };
    window.localStorage.setItem("sarva-owner-last-backup-at", payload.generatedAt);
    exportJson("backup", payload);
    toast.success("Restaurant backup created.");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SyncMetric icon={RefreshCcw} label="Pending sync" value={pending} tone={pending ? "warning" : "success"} />
        <SyncMetric icon={CloudOff} label="Failed sync" value={failed} tone={failed ? "warning" : "success"} />
        <SyncMetric icon={HardDrive} label="Offline queue" value={queue.length} tone={queue.length ? "warning" : "success"} />
        <SyncMetric icon={Database} label="Latest backup" value={latestBackup ? formatSyncDate(latestBackup) : "Not created"} tone={latestBackup ? "success" : "muted"} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SettingTile icon={PackageCheck} title="Sync Queue Status" description={`${pending} pending, ${failed} failed/conflict. Retry keeps local actions and pushes them through the owner sync API.`} />
            <SettingTile icon={Activity} title="Offline Mode Status" description={`${connectivity.online ? "Online" : "Offline"} since ${formatSyncDate(connectivity.lastChangedAt)}. Last sync ${lastSynced ? formatSyncDate(lastSynced) : "not recorded"}.`} />
            <SettingTile icon={MonitorSmartphone} title="Device Sync" description={`${printerSettings.profiles?.length ?? 0} printer/POS profiles, ${tableOrders.length} kitchen display tickets, browser queue active.`} />
          </div>
          <div className="rounded-2xl border border-input bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-foreground">Activity Logs</h3>
                <p className="text-sm font-semibold text-muted-foreground">Recent menu, offer, settings, and pricing activity for this restaurant.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
                <RotateCcw className="size-4" />
                Open Sync Center
              </Button>
            </div>
            <div className="mt-4 grid gap-2">
              {activityLogs.length ? activityLogs.map((log) => (
                <div key={`${log.module}-${log.action}`} className="grid gap-2 rounded-xl border border-input p-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <span className="text-xs font-black uppercase text-muted-foreground">{log.module}</span>
                  <span className="text-sm font-semibold text-foreground">{log.action}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{log.time}</span>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-input p-5 text-center text-sm font-semibold text-muted-foreground">
                  No local restaurant activity has been recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-3 rounded-2xl border border-input bg-card p-4">
          <h3 className="font-black text-foreground">Backup & Export</h3>
          <p className="text-sm font-semibold leading-6 text-muted-foreground">Exports use the live local store and offline queue, so the owner can recover data even when Firebase is temporarily unavailable.</p>
          <Button type="button" className="w-full" onClick={createBackup}>
            <Download className="size-4" />
            Create Backup
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => exportCsv("orders", orders.filter((order) => order.restaurantSlug === restaurantSlug).map((order) => ({ id: order.id, customer: order.customer.name, phone: order.customer.phone, total: order.totals.total, status: order.status, createdAt: order.createdAt })))}>
            <Download className="size-4" />
            Orders CSV
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => exportCsv("customers", loyaltyCustomers.map((customer) => ({ name: customer.name, phone: customer.phone, points: customer.points, tier: customer.tier, totalOrders: customer.totalOrders ?? 0 })))}>
            <Download className="size-4" />
            Customers CSV
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => exportJson("menu-export", restaurantMenu)}>
            <Download className="size-4" />
            Menu Export
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!queue.length || !connectivity.online}
            onClick={() => toast.promise(offlineQueueManager.retryAll(), {
              loading: "Retrying sync queue...",
              success: "Sync retry started.",
              error: "Could not retry sync queue.",
            })}
          >
            <RefreshCcw className="size-4" />
            Retry Sync
          </Button>
        </aside>
      </section>
    </div>
  );
}

function SyncMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number | string; tone: "success" | "warning" | "muted" }) {
  const toneClassName = tone === "success" ? "bg-success/10 text-success" : tone === "warning" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-2xl border border-input bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${toneClassName}`}><Icon className="size-4" /></span>
      </div>
      <p className="mt-3 text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-muted-foreground">
      {label}
      <input className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold normal-case text-foreground" type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </label>
  );
}

function ThemeChoice({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary/10 text-primary" : "border-input bg-card text-foreground hover:border-primary/50"}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-background">
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-black">{label}</span>
    </button>
  );
}

function ProfileField({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-muted-foreground">
      {label}{required ? " *" : ""}
      <input className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

function SettingTile({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function ImagePreview({ title, src, shape, fallback }: { title: string; src: string; shape: "circle" | "banner"; fallback: string }) {
  const [invalidSrc, setInvalidSrc] = useState("");
  const invalid = Boolean(src) && invalidSrc === src;
  const imageSrc = optimizeCloudinaryUrl(src || fallback);
  return (
    <div className="space-y-2">
      <p className="text-sm font-black text-muted-foreground">{title}</p>
      <div className={shape === "circle" ? "relative size-28 overflow-hidden rounded-full border bg-slate-100" : "relative aspect-[16/9] overflow-hidden rounded-2xl border bg-slate-100"}>
        <SafeImage src={imageSrc} alt={title} fill fallbackSrc={fallback} sizes={shape === "circle" ? "112px" : "720px"} className="object-cover" onError={() => setInvalidSrc(src)} />
      </div>
      {!src ? <p className="text-xs font-semibold text-slate-500">Placeholder shown until an image is added.</p> : null}
      {invalid ? <p className="text-xs font-semibold text-red-600">Image could not be loaded. Check the URL or upload again.</p> : null}
    </div>
  );
}

function BannerManager({
  images,
  primary,
  onChange,
  onPrimary,
  onAdd,
}: {
  images: string[];
  primary: string;
  onChange: (images: string[]) => void;
  onPrimary: (image: string) => void;
  onAdd: (image: string) => void;
}) {
  const [draftUrl, setDraftUrl] = useState("");
  const normalizedImages = normalizeImageList(images);
  const maxReached = normalizedImages.length >= 5;
  function moveBanner(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= normalizedImages.length) return;
    const next = [...normalizedImages];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    onChange(next);
  }
  return (
    <div className="space-y-3 rounded-2xl border border-input bg-card p-4">
      <div>
        <p className="text-sm font-black text-foreground">Restaurant page banners</p>
        <p className="text-xs font-semibold text-muted-foreground">Add multiple banners. Customer page will fade between them automatically.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          placeholder="Paste banner URL"
        />
        <Button
          type="button"
          variant="outline"
          disabled={maxReached}
          onClick={() => {
            onAdd(draftUrl);
            setDraftUrl("");
          }}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      {maxReached ? <p className="text-xs font-semibold text-muted-foreground">Maximum 5 active banners. Delete one to add another.</p> : null}
      {normalizedImages.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {normalizedImages.map((image, index) => (
            <div key={image} className="overflow-hidden rounded-xl border border-input bg-muted">
              <div className="relative aspect-[16/7]">
                <SafeImage src={image} alt={`Restaurant banner ${index + 1}`} fill fallbackSrc={IMAGE_FALLBACKS.restaurant} sizes="320px" className="object-cover" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-2">
                <Button type="button" size="sm" variant={primary === image ? "secondary" : "outline"} onClick={() => onPrimary(image)}>
                  {primary === image ? "Primary" : "Set primary"}
                </Button>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="outline" disabled={index === 0} onClick={() => moveBanner(index, -1)} aria-label={`Move banner ${index + 1} up`}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" disabled={index === normalizedImages.length - 1} onClick={() => moveBanner(index, 1)} aria-label={`Move banner ${index + 1} down`}>
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Delete banner ${index + 1}`}
                  onClick={() => onChange(normalizedImages.filter((item) => item !== image))}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-input p-4 text-sm font-semibold text-muted-foreground">
          No banners added yet. Upload or paste a banner URL.
        </div>
      )}
    </div>
  );
}

function CustomerBannerPreview({
  restaurantName,
  cuisine,
  address,
  images,
  logo,
}: {
  restaurantName: string;
  cuisine: string;
  address: string;
  images: string[];
  logo: string;
}) {
  const normalizedImages = normalizeImageList(images);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (normalizedImages.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % normalizedImages.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [normalizedImages.length]);

  const activeImage = normalizedImages[activeIndex] || IMAGE_FALLBACKS.restaurant;

  return (
    <div className="overflow-hidden rounded-2xl border border-input bg-slate-950 text-white shadow-sm">
      <div className="relative min-h-[280px]">
        <SafeImage src={activeImage} alt={`${restaurantName} customer banner preview`} fill fallbackSrc={IMAGE_FALLBACKS.restaurant} sizes="900px" className="object-cover opacity-70 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
        <div className="relative z-10 flex min-h-[280px] flex-col justify-end gap-4 p-5">
          <div className="flex items-end gap-3">
            <span className="relative grid size-16 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-white/15 text-lg font-black backdrop-blur">
              {logo ? <SafeImage src={logo} alt={`${restaurantName} logo preview`} fill fallbackSrc={IMAGE_FALLBACKS.logo} sizes="64px" className="object-cover" /> : restaurantName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-xs font-black uppercase text-emerald-200">Customer restaurant page preview</p>
              <h3 className="mt-1 text-3xl font-black">{restaurantName}</h3>
              <p className="mt-1 text-sm font-semibold text-white/80">{cuisine}</p>
            </div>
          </div>
          <p className="max-w-xl text-sm font-semibold text-white/80">{address}</p>
          <div className="flex flex-wrap items-center gap-2">
            {normalizedImages.map((image, index) => (
              <button
                key={image}
                type="button"
                className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/45"}`}
                aria-label={`Preview banner ${index + 1}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/5 p-3 text-xs font-semibold text-white/70">
        <span>This mirrors the customer hero banner rotation for this restaurant.</span>
        <span>{normalizedImages.length || 1} banner{(normalizedImages.length || 1) === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}

function PaymentMethodToggle({
  label,
  method,
  draft,
  setDraft,
}: {
  label: string;
  method: ProfileDraft["paymentMethods"][number];
  draft: ProfileDraft;
  setDraft: Dispatch<SetStateAction<ProfileDraft>>;
}) {
  const checked = draft.paymentMethods.includes(method);
  return (
    <ToggleRow
      label={`${label} enabled`}
      checked={checked}
      onChange={(enabled) => setDraft((current) => {
        const methods = new Set(current.paymentMethods);
        if (enabled) methods.add(method);
        else methods.delete(method);
        return { ...current, paymentMethods: Array.from(methods) };
      })}
    />
  );
}

function OperatingHoursEditor({
  hours,
  setHours,
  preferNoHours,
  setPreferNoHours,
}: {
  hours: OperatingHoursDay[];
  setHours: Dispatch<SetStateAction<OperatingHoursDay[]>>;
  preferNoHours: boolean;
  setPreferNoHours: (value: boolean) => void;
}) {
  const [editor, setEditor] = useState<{ title: string; indexes: number[] } | null>(null);
  const orderedDays: OperatingHoursDay["day"][] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayIndexByName = (dayName: OperatingHoursDay["day"]) => hours.findIndex((day) => day.day === dayName);
  const allIndexes = orderedDays.map(dayIndexByName).filter((index) => index >= 0);
  const monSatIndexes = orderedDays.filter((day) => day !== "Sunday").map(dayIndexByName).filter((index) => index >= 0);
  const sundayIndex = dayIndexByName("Sunday");

  function setDayOpen(index: number, open: boolean) {
    setHours((current) => current.map((day, dayIndex) =>
      dayIndex === index ? { ...day, open, slots: open && !day.slots.length ? [{ start: "11:00", end: "23:00" }] : day.slots } : day,
    ));
  }

  function updateSlot(dayIndex: number, slotIndex: number, field: keyof OperatingHoursSlot, value: string) {
    setHours((current) => current.map((day, currentDayIndex) =>
      currentDayIndex === dayIndex
        ? { ...day, slots: day.slots.map((slot, currentSlotIndex) => currentSlotIndex === slotIndex ? { ...slot, [field]: value } : slot) }
        : day,
    ));
  }

  function addSlot(dayIndex: number) {
    setHours((current) => current.map((day, currentDayIndex) =>
      currentDayIndex === dayIndex ? { ...day, open: true, slots: [...day.slots, { start: "11:00", end: "23:00" }] } : day,
    ));
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    setHours((current) => current.map((day, currentDayIndex) =>
      currentDayIndex === dayIndex ? { ...day, slots: day.slots.filter((_, currentSlotIndex) => currentSlotIndex !== slotIndex) } : day,
    ));
  }

  function applyToAll() {
    const source = editor
      ? editor.indexes.map((index) => hours[index]).find((day) => day?.open && day.slots.length)
      : hours.find((day) => day.open && day.slots.length);
    if (!source) return toast.error("Open one day before applying it to all days.");
    const targetIndexes = new Set(editor?.indexes ?? allIndexes);
    setHours((current) => current.map((day, index) => targetIndexes.has(index) ? { ...day, open: true, slots: source.slots.map((slot) => ({ ...slot })) } : day));
  }

  function copyPrevious(dayIndex: number) {
    if (dayIndex <= 0) return;
    const previous = hours[dayIndex - 1];
    setHours((current) => current.map((day, currentDayIndex) =>
      currentDayIndex === dayIndex ? { ...day, open: previous.open, slots: previous.slots.map((slot) => ({ ...slot })) } : day,
    ));
  }

  function set24Hours(dayIndex: number) {
    setHours((current) => current.map((day, currentDayIndex) =>
      currentDayIndex === dayIndex ? { ...day, open: true, slots: [{ start: "00:00", end: "23:59" }] } : day,
    ));
  }

  function closeDay(dayIndex: number) {
    setHours((current) => current.map((day, currentDayIndex) =>
      currentDayIndex === dayIndex ? { ...day, open: false, slots: [] } : day,
    ));
  }

  function closeAllDays() {
    setPreferNoHours(false);
    setHours((current) => current.map((day) => ({ ...day, open: false, slots: [] })));
    setEditor(null);
  }

  function openEditor(title: string, indexes: number[]) {
    setPreferNoHours(false);
    setEditor({ title, indexes });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-foreground">Hours</h3>
        <p className="text-sm font-semibold text-muted-foreground">Restaurant operating schedule</p>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-input bg-card p-4 text-left text-sm font-semibold text-foreground hover:bg-muted"
        onClick={closeAllDays}
      >
        <span className="inline-flex items-center gap-3">
          <Clock className="size-5 text-muted-foreground" />
          <span>Mark as temporarily or permanently closed</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>

      <div className="space-y-1 rounded-2xl bg-card p-2">
        {orderedDays.map((dayName) => {
          const dayIndex = dayIndexByName(dayName);
          const day = hours[dayIndex];
          if (!day) return null;
          return (
            <div key={day.day} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 text-sm">
              <p className="font-semibold text-foreground">{day.day}</p>
              <p className={day.open ? "text-right font-semibold text-foreground" : "text-right font-semibold text-muted-foreground"}>
                {preferNoHours ? "Not specified" : daySummary(day)}
              </p>
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit ${day.day} hours`} onClick={() => openEditor(`Edit ${day.day}`, [dayIndex])}>
                <Pencil className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-input pb-5">
        <Button type="button" variant="outline" onClick={() => openEditor("Edit all hours", allIndexes)}>Edit all hours</Button>
        <Button type="button" variant="outline" onClick={() => openEditor("Edit Mon-Sat", monSatIndexes)}>Edit Mon-Sat</Button>
        {sundayIndex >= 0 ? <Button type="button" variant="outline" onClick={() => openEditor("Edit Sunday", [sundayIndex])}>Edit Sunday</Button> : null}
        <Button type="button" variant="outline" onClick={() => setPreferNoHours(!preferNoHours)}>{preferNoHours ? "Show hours" : "Hide hours"}</Button>
      </div>

      {editor ? (
        <div className="space-y-4 rounded-2xl border border-input bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-foreground">{editor.title}</p>
              <p className="text-xs font-semibold text-muted-foreground">Use multiple slots for lunch and dinner breaks.</p>
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditor(null)} aria-label="Close hours editor">
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={applyToAll}>Apply first open day to selected</Button>
          </div>
          <div className="space-y-3">
            {editor.indexes.map((dayIndex) => {
              const day = hours[dayIndex];
              if (!day) return null;
              return (
                <div key={day.day} className="grid gap-3 rounded-xl border border-input p-3 lg:grid-cols-[140px_1fr]">
                  <label className="flex items-center gap-2 text-sm font-black text-foreground">
                    <input type="checkbox" checked={day.open} onChange={(event) => setDayOpen(dayIndex, event.target.checked)} />
                    {day.day}
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {dayIndex > 0 ? <Button type="button" size="sm" variant="outline" onClick={() => copyPrevious(dayIndex)}>Copy previous</Button> : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => set24Hours(dayIndex)}>24 hours</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => closeDay(dayIndex)}>Closed</Button>
                    </div>
                    {day.open ? day.slots.map((slot, slotIndex) => (
                      <div key={`${day.day}-${slotIndex}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground" type="time" value={slot.start} onChange={(event) => updateSlot(dayIndex, slotIndex, "start", event.target.value)} />
                        <input className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground" type="time" value={slot.end} onChange={(event) => updateSlot(dayIndex, slotIndex, "end", event.target.value)} />
                        <Button type="button" size="icon" variant="outline" onClick={() => removeSlot(dayIndex, slotIndex)} aria-label={`Remove ${day.day} slot`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )) : <p className="text-sm font-semibold text-muted-foreground">Closed</p>}
                    {day.open ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => addSlot(dayIndex)}>
                        <Plus className="size-4" />
                        Add slot
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatOperatingHours(schedule: OperatingHoursDay[]) {
  const openDays = schedule.filter((day) => day.open && day.slots.length > 0);
  if (!openDays.length) return "Closed";
  const firstSlot = openDays[0]?.slots[0];
  const allSame = openDays.every((day) => day.slots.length === 1 && day.slots[0]?.start === firstSlot?.start && day.slots[0]?.end === firstSlot?.end);
  if (openDays.length === 7 && allSame && firstSlot) return `Daily ${firstSlot.start} - ${firstSlot.end}`;
  return openDays.map((day) => `${day.day.slice(0, 3)} ${day.slots.map((slot) => `${slot.start}-${slot.end}`).join(", ")}`).join("; ");
}

function daySummary(day: OperatingHoursDay) {
  if (!day.open || !day.slots.length) return "Closed";
  if (day.slots.length === 1 && day.slots[0]?.start === "00:00" && day.slots[0]?.end === "23:59") return "Open 24 hours";
  return day.slots.map((slot) => `${formatHour(slot.start)}-${formatHour(slot.end)}`).join(", ");
}

function formatHour(value: string) {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return value;
  const date = new Date();
  date.setHours(hourValue, minuteValue, 0, 0);
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function optimizeCloudinaryUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes("res.cloudinary.com") || !trimmed.includes("/upload/")) return trimmed;
  if (trimmed.includes("/upload/f_auto") || trimmed.includes("/upload/q_auto") || /\/upload\/[^/]*q_auto/.test(trimmed)) return trimmed;
  return trimmed.replace("/upload/", "/upload/f_auto,q_auto/");
}

function parseSettingsTab(value: string | null): SettingsTab {
  return settingsTabs.some((tab) => tab.value === value) ? value as SettingsTab : "profile";
}

function toProfileDraft(profile: OwnerBusinessProfile | undefined, ownerName: string): ProfileDraft {
  const cuisineTypes = profile?.cuisineTypes?.length
    ? profile.cuisineTypes
    : profile?.cuisineType
      ? profile.cuisineType.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const coverImages = normalizeImageList(profile?.coverImages?.length ? profile.coverImages : [profile?.coverImage ?? ""]);
  return {
    ownerName: profile?.ownerName || (ownerName === "Anonymous" ? "" : ownerName),
    hotelName: profile?.hotelName ?? "",
    logo: profile?.logo ?? "",
    coverImage: profile?.coverImage ?? coverImages[0] ?? "",
    coverImages,
    businessAddress: profile?.businessAddress ?? "",
    googleMapLocation: profile?.googleMapLocation ?? "",
    cuisineType: cuisineTypes.join(", "),
    cuisineTypes,
    phoneNumber: profile?.phoneNumber ?? "",
    whatsappNumber: profile?.whatsappNumber ?? "",
    supportEmail: profile?.supportEmail ?? "",
    cateringPhoneNumber: profile?.cateringPhoneNumber ?? "",
    cateringWhatsappNumber: profile?.cateringWhatsappNumber ?? "",
    cateringEmail: profile?.cateringEmail ?? "",
    emergencySupportNumber: profile?.emergencySupportNumber ?? "",
    deliveryRadiusKm: String(profile?.deliveryRadiusKm ?? ""),
    deliveryCharge: String(profile?.deliveryCharge ?? ""),
    minimumOrder: String(profile?.minimumOrder ?? ""),
    freeDeliveryThreshold: String(profile?.freeDeliveryThreshold ?? ""),
    latitude: String(profile?.latitude ?? ""),
    longitude: String(profile?.longitude ?? ""),
    mapboxPlaceId: profile?.mapboxPlaceId ?? "",
    gstDetails: profile?.gstDetails ?? "",
    fssaiLicense: profile?.fssaiLicense ?? "",
    diningAvailable: profile?.diningAvailable ?? true,
    cloudKitchen: profile?.cloudKitchen ?? false,
    upiId: profile?.paymentConfig?.upiId ?? "",
    codEnabled: profile?.paymentConfig?.codEnabled ?? true,
    paymentMethods: profile?.paymentConfig?.methods ?? ["cod", "upi"],
    razorpayEnabled: profile?.paymentConfig?.razorpayEnabled ?? false,
    razorpayKeyId: profile?.paymentConfig?.razorpayKeyId ?? "",
    phonePeEnabled: profile?.paymentConfig?.phonePeEnabled ?? false,
    phonePeMerchantId: profile?.paymentConfig?.phonePeMerchantId ?? "",
    paytmEnabled: profile?.paymentConfig?.paytmEnabled ?? false,
    paytmMerchantId: profile?.paymentConfig?.paytmMerchantId ?? "",
  };
}

function createDraftOwnerProfile(ownerName: string): OwnerBusinessProfile {
  return {
    ownerName: ownerName === "Anonymous" ? "" : ownerName,
    hotelName: "",
    logo: "",
    coverImage: "",
    coverImages: [],
    businessAddress: "",
    googleMapLocation: "",
    cuisineType: "",
    cuisineTypes: [],
    phoneNumber: "",
    operatingHours: "Not specified",
    operatingHoursSchedule: [],
    operatingHoursPreference: "not-specified",
    deliveryRadiusKm: 5,
    diningAvailable: true,
    cloudKitchen: false,
    paymentConfig: {
      codEnabled: true,
      methods: ["cod", "upi"],
    },
    reviewStatus: "draft",
    completed: false,
  };
}

function normalizeImageList(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 5);
}
