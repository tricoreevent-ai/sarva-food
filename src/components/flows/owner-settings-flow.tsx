"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BellRing, Bot, PackageCheck, Play, RotateCcw, Save, Volume2, type LucideIcon } from "lucide-react";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useAppStore } from "@/lib/app-store";
import { operationalSoundOptions, playOperationalSound, type OperationalSound } from "@/lib/operational-sounds";
import type { TaxSettings } from "@/lib/types";

type SoundTarget = "onlineOrder" | "waiterOrder" | "kitchenReady";
type SoundPrefs = Record<SoundTarget, {
  sound: OperationalSound;
  volume: number;
  repeatCount: number;
  repeatUntilAcknowledged: boolean;
  muted: boolean;
}>;

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

export function OwnerSettingsFlow() {
  const taxSettings = useAppStore((state) => state.taxSettings);
  const updateTaxSettings = useAppStore((state) => state.updateTaxSettings);
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

  useEffect(() => {
    window.localStorage.setItem(soundStorageKey, JSON.stringify(soundPrefs));
  }, [soundPrefs]);

  const automationSummary = useMemo(
    () => Object.entries(automation).filter(([, value]) => value === true).length,
    [automation],
  );

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
    toast.success("Charges saved for POS billing.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">Owner Settings</h1>
          <p className="mt-2 text-base font-semibold text-slate-600">Notification, automation, charges, printer, and sync preferences for restaurant operations.</p>
        </div>
        <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
          <RotateCcw className="size-4" />
          Open Sync Center
        </Button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
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
                      <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700" value={prefs.sound} onChange={(event) => updateSound(target, { sound: event.target.value as OperationalSound })}>
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
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-700">
                        <input type="checkbox" checked={prefs.muted} onChange={(event) => updateSound(target, { muted: event.target.checked })} />
                        Mute
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-700">
                        <input type="checkbox" checked={prefs.repeatUntilAcknowledged} onChange={(event) => updateSound(target, { repeatUntilAcknowledged: event.target.checked })} />
                        Until acknowledged
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>

        <div className="space-y-5">
          <DashboardCard title="Order Automation">
            <div className="space-y-3">
              {(["website", "swiggy", "zomato", "pos", "scheduled"] as const).map((key) => (
                <ToggleRow key={key} label={`${key[0].toUpperCase()}${key.slice(1)} orders`} checked={automation[key]} onChange={(value) => setAutomation((current) => ({ ...current, [key]: value }))} />
              ))}
              <div className="my-3 border-t border-slate-100" />
              <ToggleRow label="Business hours only" checked={automation.businessHoursOnly} onChange={(value) => setAutomation((current) => ({ ...current, businessHoursOnly: value }))} />
              <ToggleRow label="Staffing availability required" checked={automation.staffingRequired} onChange={(value) => setAutomation((current) => ({ ...current, staffingRequired: value }))} />
              <NumberRow label="Max active order limit" value={automation.maxActiveOrders} onChange={(value) => setAutomation((current) => ({ ...current, maxActiveOrders: value }))} />
              <NumberRow label="Delivery radius limit km" value={automation.deliveryRadiusLimit} onChange={(value) => setAutomation((current) => ({ ...current, deliveryRadiusLimit: value }))} />
              <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{automationSummary} automation controls enabled.</p>
            </div>
          </DashboardCard>

          <DashboardCard title="Charges">
            <div className="space-y-3">
              <ToggleRow label="Enable parcel charge" checked={charges.parcelEnabled} onChange={(value) => setCharges((current) => ({ ...current, parcelEnabled: value }))} />
              <ToggleRow label="Apply GST" checked={charges.gstEnabled} onChange={(value) => setCharges((current) => ({ ...current, gstEnabled: value }))} />
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Charge type
                <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700" value={charges.chargeType} onChange={(event) => setCharges((current) => ({ ...current, chargeType: event.target.value }))}>
                  <option value="fixed">Fixed</option>
                  <option value="per-item">Per item</option>
                  <option value="category">Category based</option>
                </select>
              </label>
              <NumberRow label="Fixed parcel charge" value={charges.fixedParcelCharge} onChange={(value) => setCharges((current) => ({ ...current, fixedParcelCharge: value }))} />
              <NumberRow label="Per-item parcel charge" value={charges.perItemParcelCharge} onChange={(value) => setCharges((current) => ({ ...current, perItemParcelCharge: value }))} />
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Packaging GST
                <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700" value={charges.packagingGst} onChange={(event) => setCharges((current) => ({ ...current, packagingGst: Number(event.target.value) === 18 ? 18 : 5 }))}>
                  <option value={5}>5%</option>
                  <option value={18}>18%</option>
                </select>
              </label>
              <Button className="w-full" onClick={() => void saveCharges()}>
                <Save className="size-4" />
                Save Charges
              </Button>
            </div>
          </DashboardCard>
        </div>
      </section>

      <DashboardCard title="Data & Sync">
        <div className="grid gap-4 md:grid-cols-3">
          <SettingTile icon={PackageCheck} title="Access model" description="restaurantId, branchId, role, and permissions are resolved once after login and used by POS, billing, kitchen, and sync." />
          <SettingTile icon={Volume2} title="Sound logic" description="Online orders use loud alerts, waiter POS orders use medium POS alerts, and kitchen ready uses kitchen alert." />
          <SettingTile icon={Bot} title="Automation" description="Auto-accept rules are separated by channel and constrained by hours, active load, radius, and staffing." />
        </div>
      </DashboardCard>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
      <span className="inline-flex items-center gap-2">
        {label}
        <InfoTooltip label={`${label} can be changed without leaving operations.`} className="hidden sm:inline-flex" />
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
      {label}
      <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-700" type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
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
