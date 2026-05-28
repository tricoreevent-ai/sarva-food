"use client";

import type { LucideIcon } from "lucide-react";
import { Mail, MessageCircle, PhoneCall } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";

const faqs = [
  ["How do I track an order?", "Open Track Order and enter your order ID or use the Orders page after signing in."],
  ["Can I cancel after payment?", "Cancellation depends on restaurant acceptance, preparation, and dispatch status."],
  ["Who handles food quality?", "The restaurant is responsible for preparation, hygiene, ingredients, allergens, and packaging."],
];

export default function HelpPage() {
  const branding = useAppStore((state) => state.cmsSettings.branding) ?? defaultCmsSettings.branding!;
  const supportEmail = branding.supportEmail || defaultCmsSettings.branding!.supportEmail;
  const phoneDigits = (branding.supportPhone || "").replace(/\D/g, "");
  const whatsappDigits = (branding.onboardingWhatsapp || branding.supportPhone || "").replace(/\D/g, "");

  return (
    <CustomerShell>
      <main className="container-page space-y-5 py-8">
        <section>
          <h1 className="text-3xl font-black">Help & Support</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">Get help with orders, payments, delivery, and restaurant support.</p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <SupportCard icon={MessageCircle} title="WhatsApp support" action="Open WhatsApp" href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined} />
          <SupportCard icon={Mail} title="Email support" action="Email us" href={supportEmail ? `mailto:${supportEmail}` : undefined} />
          <SupportCard icon={PhoneCall} title="Call support" action="Call" href={phoneDigits ? `tel:${phoneDigits}` : undefined} />
        </section>
        <Card className="customer-surface" id="faqs">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-xl font-black">FAQs</h2>
            {faqs.map(([question, answer]) => (
              <div key={question} className="rounded-xl border p-4">
                <h3 className="font-black">{question}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}

function SupportCard({ icon: Icon, title, action, href }: { icon: LucideIcon; title: string; action: string; href?: string }) {
  return (
    <Card className="customer-surface">
      <CardContent className="space-y-3 p-5">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <h2 className="font-black">{title}</h2>
        {href ? (
          <Button asChild variant="outline"><a href={href}>{action}</a></Button>
        ) : (
          <Button variant="outline" disabled>Coming soon</Button>
        )}
      </CardContent>
    </Card>
  );
}
