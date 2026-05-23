import Link from "next/link";
import { ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import { CheckoutSummary } from "@/components/commerce/checkout-summary";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { CustomerShell } from "@/components/layout/customer-shell";
import { ResponsibilityDisclaimer } from "@/components/legal/responsibility-disclaimer";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseOfferCode } from "@/lib/social-commerce";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; offer?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const fastMode = params.mode === "fast";
  const initialOfferCode = parseOfferCode(params.offer);

  // Screen note: Checkout is a two-column desktop flow and stacked mobile form with offer code support.
  return (
    <CustomerShell>
      <main className="container-page space-y-6 py-5 sm:py-8">
        <section className="customer-surface overflow-hidden rounded-lg food-gradient p-5 text-white sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white text-primary">
              <Zap className="mr-1 size-3" />
              Fast checkout
            </Badge>
            <Badge className="bg-white/16 text-white ring-1 ring-white/20">
              <ShieldCheck className="mr-1 size-3" />
              Secure payment
            </Badge>
          </div>
          <SectionHeader
            title="Checkout"
            description="Minimal details, UPI-first payment, offer applied, WhatsApp fallback ready."
            action={
              <Button asChild className="bg-white text-primary hover:bg-white/92">
                <Link href="/restaurants">
                  <ArrowLeft className="size-4" />
                  Add more
                </Link>
              </Button>
            }
          />
        </section>
        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <CheckoutForm fastMode={fastMode} initialOfferCode={initialOfferCode} />
          <CheckoutSummary />
        </section>
        <ResponsibilityDisclaimer surface="checkout" />
      </main>
    </CustomerShell>
  );
}
