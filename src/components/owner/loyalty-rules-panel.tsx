"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/owner/dashboard-card";

type Rules = { pointsPerRupee: number; signupBonus: number; birthdayBonus: number; referralBonus: number; tierThresholds: Record<"Bronze" | "Silver" | "Gold" | "Platinum" | "VIP", number> };

const empty: Rules = { pointsPerRupee: 0.01, signupBonus: 0, birthdayBonus: 0, referralBonus: 0, tierThresholds: { Bronze: 0, Silver: 5_000, Gold: 15_000, Platinum: 50_000, VIP: 100_000 } };

export function LoyaltyRulesPanel() {
  const [rules, setRules] = useState<Rules>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/owner/loyalty-rules", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: Rules }) => setRules((current) => payload.data ? { ...current, ...payload.data, tierThresholds: { ...current.tierThresholds, ...payload.data.tierThresholds } } : current));
  }, []);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/owner/loyalty-rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules }) });
    setSaving(false);
    if (!response.ok) return toast.error("Unable to save loyalty rules.");
    toast.success("Loyalty rules saved.");
  }

  return (
    <DashboardCard title="Loyalty Rules" action={<Button onClick={() => void save()} disabled={saving}><Save className="size-4" />Save rules</Button>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NumberField label="Points per Rupee" value={rules.pointsPerRupee} onChange={(pointsPerRupee) => setRules({ ...rules, pointsPerRupee })} step="0.01" />
        <NumberField label="Signup bonus" value={rules.signupBonus} onChange={(signupBonus) => setRules({ ...rules, signupBonus })} />
        <NumberField label="Birthday bonus" value={rules.birthdayBonus} onChange={(birthdayBonus) => setRules({ ...rules, birthdayBonus })} />
        <NumberField label="Referral bonus" value={rules.referralBonus} onChange={(referralBonus) => setRules({ ...rules, referralBonus })} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(Object.keys(rules.tierThresholds) as Array<keyof Rules["tierThresholds"]>).map((tier) => <NumberField key={tier} label={`${tier} threshold`} value={rules.tierThresholds[tier]} onChange={(value) => setRules({ ...rules, tierThresholds: { ...rules.tierThresholds, [tier]: value } })} />)}
      </div>
    </DashboardCard>
  );
}

function NumberField({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-muted-foreground">{label}<input className="h-10 rounded-xl border border-input bg-card px-3 text-foreground" type="number" min="0" step={step} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} /></label>;
}
