import { Camera, KeyRound, ListChecks, MessageCircle, ShieldCheck } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const history: Array<{ id: string; channel: string; status: string; time: string }> = [];

export default function AdminMetaPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Meta integrations"
        description="Official Nammude account connection, token storage, page selection, and posting history."
        action={<Badge variant="muted">Graph API ready</Badge>}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <IntegrationCard icon={<Camera className="size-5" />} title="Instagram" account="@sarva.food" />
        <IntegrationCard icon={<MessageCircle className="size-5" />} title="Facebook" account="Nammude Official" />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Meta Graph API configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="App ID" value="" />
          <Field label="Page ID" value="" />
          <Field label="Instagram business account ID" value="" />
          <Field label="Long-lived token" value="••••••••••••••••" />
          <Button className="md:col-span-2" variant="secondary">
            <KeyRound className="size-4" />
            Save token
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Posting history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {history.length ? history.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="font-bold">{item.id}</p>
                <p className="text-sm text-muted-foreground">{item.channel} · {item.time}</p>
              </div>
              <Badge variant={item.status === "Published" ? "success" : "warning"}>{item.status}</Badge>
            </div>
          )) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No Meta posting history has synced yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationCard({ icon, title, account }: { icon: React.ReactNode; title: string; account: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
            <div>
              <h2 className="font-black">{title} integration</h2>
              <p className="text-sm text-muted-foreground">{account}</p>
            </div>
          </div>
          <Badge variant="success">Connected</Badge>
        </div>
        <Button variant="outline" className="w-full">
          <ShieldCheck className="size-4" />
          Manage connection
        </Button>
        <Button variant="outline" className="w-full">
          <ListChecks className="size-4" />
          Select page
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input defaultValue={value} />
    </div>
  );
}
