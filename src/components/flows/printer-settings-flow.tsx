"use client";

import { Cable, FileText, Printer, ReceiptText, Wifi, Wrench } from "lucide-react";
import { useState } from "react";
import { SectionHeader } from "@/components/layout/section-header";
import { KotTicket, RestaurantBill } from "@/components/printing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";
import { buildBillContext, buildEscPosPlan, buildKotContext, defaultBillTemplate, defaultKotTemplate } from "@/lib/print-engine";
import { printTemplateSchema, printerProfileSchema } from "@/lib/schemas/printing";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID, resolveTenantId } from "@/lib/tenant";
import type { PrinterProfile, PrintTemplate, RestaurantBranch } from "@/lib/types";

export function PrinterSettingsFlow() {
  const settings = useAppStore((state) => state.printerSettings);
  const updatePrinterSettings = useAppStore((state) => state.updatePrinterSettings);
  const latestOrder = useAppStore((state) => state.tableOrders[0]);
  const ownerBusinessProfile = useAppStore((state) => state.ownerBusinessProfile);
  const authUser = useAppStore((state) => state.authUser);
  const bill = useAppStore((state) => state.posBill);
  const configuredBranch = useAppStore((state) => state.branches[0]);
  const taxSettings = useAppStore((state) => state.taxSettings);
  const billTemplate = settings.templates?.find((item) => item.type === "bill") ?? defaultBillTemplate;
  const kotTemplate = settings.templates?.find((item) => item.type === "kot") ?? defaultKotTemplate;
  const [testPrintType, setTestPrintType] = useState<"bill" | "kot">("bill");
  const [selectedProfileId, setSelectedProfileId] = useState(settings.profiles?.[0]?.id ?? "");
  const [paperWidth, setPaperWidth] = useState<PrinterProfile["paperWidth"]>(billTemplate.paperWidth);
  const activeProfile = settings.profiles?.find((profile) => profile.id === selectedProfileId) ?? settings.profiles?.[0];
  const branch: RestaurantBranch = configuredBranch ?? {
    id: DEFAULT_BRANCH_ID,
    tenantId: resolveTenantId(authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID),
    restaurantSlug: authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID,
    name: ownerBusinessProfile?.hotelName || "Main Branch",
    address: ownerBusinessProfile?.businessAddress || "Owner operational branch",
    phone: ownerBusinessProfile?.phoneNumber || "",
    managerId: authUser.id,
  };
  const billContext = buildBillContext({ bill: bill.lines.length ? bill : { ...bill, lines: latestOrder?.lines ?? [] }, branch, taxSettings, restaurantName: ownerBusinessProfile?.hotelName, createdAt: latestOrder ? new Date(latestOrder.createdAt) : new Date(0) });
  const kotContext = latestOrder
    ? { kotNumber: `KIT-${latestOrder.id}`, orderNumber: latestOrder.id, orderType: latestOrder.source === "POS" ? "POS" as const : "Dine-in" as const, tableNumber: latestOrder.tableNumber, waiterName: latestOrder.waiterName ?? "Waiter", priority: latestOrder.priority, lines: latestOrder.lines, createdAt: new Date(latestOrder.createdAt) }
    : buildKotContext(billContext);

  function updateProfile(profile: PrinterProfile) {
    const parsed = printerProfileSchema.safeParse({ ...profile, copies: profile.copies ?? 1, autoCut: profile.autoCut ?? true, encoding: profile.encoding ?? "utf-8", marginMm: profile.marginMm ?? 2, fontScale: profile.fontScale ?? "normal" });
    if (!parsed.success) return;
    updatePrinterSettings({
      ...settings,
      profiles: settings.profiles?.map((item) => (item.id === profile.id ? profile : item)),
    });
  }

  function updateTemplate(template: PrintTemplate) {
    const parsed = printTemplateSchema.safeParse(template);
    if (!parsed.success) return;
    updatePrinterSettings({
      ...settings,
      templates: settings.templates?.map((item) => (item.id === template.id ? template : item)),
    });
  }

  function testPrint() {
    window.document.body.classList.add("print-ticket-mode");
    window.setTimeout(() => {
      window.print();
      window.document.body.classList.remove("print-ticket-mode");
    }, 80);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <section className="space-y-4">
        <SectionHeader title="Thermal printers" description="Branch printer routing, ESC/POS hooks, kitchen ticket copies, billing receipts, and browser fallback." />
        <Card>
          <CardContent className="space-y-4 p-5">
            <Field label="Kitchen printer" value={settings.kitchenPrinterName} onChange={(value) => updatePrinterSettings({ ...settings, kitchenPrinterName: value })} />
            <Field label="Billing printer" value={settings.billingPrinterName} onChange={(value) => updatePrinterSettings({ ...settings, billingPrinterName: value })} />
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
              <input type="checkbox" checked={settings.autoPrintOrders} onChange={(event) => updatePrinterSettings({ ...settings, autoPrintOrders: event.target.checked })} />
              Auto print new orders
            </label>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold">
              <input type="checkbox" checked={settings.compactTickets} onChange={(event) => updatePrinterSettings({ ...settings, compactTickets: event.target.checked })} />
              Compact 58/80mm layout
            </label>
            <Badge variant="success"><Wifi className="mr-1 size-3" />{settings.connectionStatus}</Badge>
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={testPrintType} onChange={(value) => setTestPrintType(value as "bill" | "kot")} options={["bill", "kot"]} />
              <Select value={paperWidth} onChange={(value) => setPaperWidth(value as PrinterProfile["paperWidth"])} options={["58mm", "80mm", "100mm", "label", "A4"]} />
              <Select value={activeProfile?.id ?? ""} onChange={setSelectedProfileId} options={settings.profiles?.map((profile) => profile.id) ?? []} />
            </div>
            <Button className="w-full" onClick={testPrint}>
              <Printer className="size-4" />
              Test print
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-black">Template controls</h2>
            {[billTemplate, kotTemplate].map((template) => (
              <div key={template.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{template.name}</p>
                  <Badge variant="muted">{template.paperWidth}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                  {(["showLogo", "showBranch", "showGstBreakup", "showQrCode", "showFooter", "showWaiterName", "showItemNotes"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 rounded bg-muted px-2 py-2">
                      <input type="checkbox" checked={Boolean(template[key])} onChange={(event) => updateTemplate({ ...template, [key]: event.target.checked })} />
                      {key.replace("show", "")}
                    </label>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Field label="Logo URL" value={template.logoUrl ?? ""} onChange={(value) => updateTemplate({ ...template, logoUrl: value })} />
                  <Field label="Footer image URL" value={template.footerImageUrl ?? ""} onChange={(value) => updateTemplate({ ...template, footerImageUrl: value })} />
                  <Select value={template.mode} onChange={(value) => updateTemplate({ ...template, mode: value as PrintTemplate["mode"] })} options={["compact", "standard", "premium", "branded"]} />
                  <Select value={template.paperWidth} onChange={(value) => updateTemplate({ ...template, paperWidth: value as PrintTemplate["paperWidth"] })} options={["58mm", "80mm", "100mm", "label", "A4"]} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={testPrintType === "bill" ? "print-ticket-active" : ""}>
              <div className="mb-3 flex items-center gap-2 font-black"><ReceiptText className="size-5" />Customer bill</div>
              <RestaurantBill context={billContext} template={{ ...billTemplate, paperWidth }} />
            </div>
            <div className={testPrintType === "kot" ? "print-ticket-active" : ""}>
              <div className="mb-3 flex items-center gap-2 font-black"><FileText className="size-5" />Kitchen ticket</div>
              <KotTicket context={kotContext} template={{ ...kotTemplate, paperWidth }} />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <h2 className="font-black">Printer profiles</h2>
            {settings.profiles?.map((profile) => (
              <div key={profile.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{profile.name}</p>
                    <p className="text-muted-foreground">{profile.type} · {profile.paperWidth} · {profile.connection} · copies {profile.copies ?? 1}</p>
                </div>
                <Badge variant={profile.status === "online" ? "success" : "warning"}>{profile.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <Select value={profile.connection} onChange={(value) => updateProfile({ ...profile, connection: value as PrinterProfile["connection"] })} options={["browser", "usb", "bluetooth", "ethernet", "escpos"]} />
                  <Select value={profile.paperWidth} onChange={(value) => updateProfile({ ...profile, paperWidth: value as PrinterProfile["paperWidth"] })} options={["58mm", "80mm", "100mm", "label", "A4"]} />
                  <Select value={profile.encoding ?? "utf-8"} onChange={(value) => updateProfile({ ...profile, encoding: value as PrinterProfile["encoding"] })} options={["utf-8", "cp437", "cp858"]} />
                  <Select value={profile.fontScale ?? "normal"} onChange={(value) => updateProfile({ ...profile, fontScale: value as PrinterProfile["fontScale"] })} options={["compact", "normal", "large"]} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {buildEscPosPlan(profile.type === "billing" ? "bill" : "kot", profile).map((step) => <Badge key={step} variant="muted"><Cable className="mr-1 size-3" />{step}</Badge>)}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3">
            <h2 className="flex items-center gap-2 font-black"><Wrench className="size-5" />Print history & audit</h2>
            {settings.printLogs?.map((log) => (
              <div key={log.id} className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto]">
                <div><p className="font-bold">{log.referenceId} · {log.type}</p><p className="text-muted-foreground">{log.timestamp} · {log.user} · {log.printerProfileId}</p></div>
                <Badge variant={log.status === "printed" ? "success" : "warning"}>{log.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select className="h-10 rounded-md border bg-background px-3 text-xs font-bold" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
