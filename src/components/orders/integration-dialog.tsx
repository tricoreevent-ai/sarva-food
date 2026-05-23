"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function IntegrationDialog({
  partner,
  open,
  onOpenChange,
}: {
  partner: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [testing, setTesting] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{partner} integration</DialogTitle>
          <DialogDescription>Configure order import, menu sync, webhooks, and operating controls.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="customer-scroll max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="menu">Menu Sync</TabsTrigger>
            <TabsTrigger value="ops">Operations</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="API key" />
            <Input placeholder="Outlet ID / mapping" />
            <Input placeholder="Store code" />
            <Input placeholder="Default prep time" />
          </TabsContent>
          <TabsContent value="menu" className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Menu sync" />
            <Toggle label="Item availability sync" />
            <Toggle label="Prep time sync" />
            <Input placeholder="Sync interval minutes" />
          </TabsContent>
          <TabsContent value="ops" className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Auto accept orders" />
            <Toggle label="Pause online ordering" />
            <Input placeholder="Auto reject timeout seconds" />
            <Input placeholder="Prep buffer minutes" />
          </TabsContent>
          <TabsContent value="webhooks" className="grid gap-3">
            <Input placeholder="Webhook URL" />
            <Input placeholder="Webhook secret" />
          </TabsContent>
          <TabsContent value="advanced" className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Delivery radius km" />
            <Toggle label="Peak hour auto pause" />
            <Toggle label="Serviceability sync" />
            <Toggle label="Unavailable item sync" />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => { setTesting(true); window.setTimeout(() => setTesting(false), 600); }}>{testing ? "Testing..." : "Test connection"}</Button>
          <Button onClick={() => onOpenChange(false)}>Save configuration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label }: { label: string }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 text-sm font-semibold">
      {label}
      <input type="checkbox" className="accent-orange-500" />
    </label>
  );
}
