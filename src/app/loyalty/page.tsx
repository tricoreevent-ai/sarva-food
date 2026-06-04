"use client";

import Link from "next/link";
import { Award, BadgePercent, Gift, History, LogIn, PartyPopper, ShieldCheck, ShoppingBag, Sparkles, Star, TicketPercent, Trophy } from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { CustomerShell } from "@/components/layout/customer-shell";
import { InlineLoading, RetryState } from "@/components/state/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCustomerData } from "@/hooks/use-customer-data";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { formatCurrency } from "@/lib/utils";

export default function LoyaltyPage() {
  const { user, loading } = useAuthUser();
  const customer = useCustomerData(user?.uid);
  const cmsSettings = useAppStore((state) => state.cmsSettings);
  const loyaltySettings = cmsSettings.loyalty ?? defaultCmsSettings.loyalty!;
  const points = customer.loyalty?.points ?? 0;
  const totalOrders = customer.loyalty?.totalOrders ?? customer.orders.length;
  const rewardValue = Math.floor(points / Math.max(1, loyaltySettings.redemptionPointsPerRupee));
  const tier = tierForPoints(points, loyaltySettings.tiers);
  const nextTier = nextTierForPoints(points, loyaltySettings.tiers);
  const progress = nextTier ? Math.min(100, Math.round((points / nextTier.minPoints) * 100)) : 100;
  const coupons = customer.coupons.filter((coupon) => coupon.active !== false && coupon.status !== "expired" && coupon.status !== "used");
  const activeCoupons = coupons.length;
  const savings = activeCoupons * 50 + rewardValue;
  const recentRows = customer.orders.slice(0, 4).map((order) => ({
    id: order.id,
    restaurant: "restaurantName" in order && typeof order.restaurantName === "string" ? order.restaurantName : "Sarva restaurant",
    amount: order.total,
    points: earnedPointsForOrder(order.total, loyaltySettings),
    status: order.status === "delivered" || order.status === "completed" ? "Delivered" : order.status,
  }));

  if (loading || customer.status === "loading") {
    return (
      <CustomerShell>
        <main className="container-page py-6">
          <InlineLoading label="Loading rewards" />
        </main>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell>
      <main className="container-page space-y-6 py-6">
        <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#ff6a2f_0%,#ffb23f_48%,#0b8f6f_100%)] p-7 text-white shadow-2xl md:p-10">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <Badge className="bg-white text-primary"><Star className="mr-1 size-3 fill-current" />Sarva Rewards</Badge>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight md:text-5xl">Rewards linked to your orders</h1>
              <p className="mt-3 max-w-2xl text-base font-semibold text-white/90">Earn points every time you order food, unlock exciting benefits, and enjoy exclusive member rewards.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <HeroBenefit icon={Star} title="Earn Points" text="Get points on every order" />
                <HeroBenefit icon={Gift} title="Unlock Rewards" text="Redeem points for discounts" />
                <HeroBenefit icon={TicketPercent} title="Exclusive Benefits" text="Member-only offers" />
              </div>
            </div>
            <div className="rounded-2xl bg-white/95 p-6 text-foreground shadow-2xl">
              <p className="text-sm font-semibold text-muted-foreground">Available Points</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <Star className="size-7 fill-current" />
                </span>
                <p className="text-4xl font-black">{points}</p>
              </div>
              <Badge className="mt-3 bg-orange-100 text-primary">Worth {formatCurrency(rewardValue)}</Badge>
              <div className="mt-6">
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>{nextTier ? `${nextTier.minPoints - points} more points to unlock ${nextTier.name}` : "Top membership unlocked"}</span>
                  <span>{nextTier?.minPoints ?? points} pts</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p className="mt-4 text-xs font-black text-muted-foreground">Membership Level: {tier.name} Member</p>
            </div>
          </div>
        </section>

        {!user ? (
          <Card className="mobile-premium-card">
            <CardContent className="space-y-4 p-5 text-center">
              <LogIn className="mx-auto size-9 text-primary" />
              <h2 className="text-2xl font-black">Login to view rewards</h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">Start ordering food to unlock exciting rewards and savings.</p>
              <Button asChild size="lg"><Link href="/login?next=/loyalty">Login</Link></Button>
            </CardContent>
          </Card>
        ) : customer.status === "error" ? (
          <RetryState description={customer.error ?? undefined} onRetry={customer.retry} />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard icon={ShoppingBag} value={`${totalOrders} Orders`} label="All-time completed food orders" tone="green" />
              <SummaryCard icon={Star} value={`${points} Points`} label="Collected from orders and promotions" tone="orange" />
              <SummaryCard icon={BadgePercent} value={`${activeCoupons} Active Coupons`} label="Available to use during checkout" tone="purple" />
              <SummaryCard icon={Gift} value={`${formatCurrency(savings)} Saved`} label="Savings from coupons and rewards" tone="blue" />
            </section>

            <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <Card className="customer-surface">
                <CardContent className="space-y-4 p-5">
                  <h2 className="text-xl font-black">How You Earn</h2>
                  <EarnRow icon={ShoppingBag} title="Order Rewards" text={`${loyaltySettings.earnPoints} points for every ${formatCurrency(loyaltySettings.earnAmount)} spent on orders.`} />
                  <EarnRow icon={PartyPopper} title="Festival Bonus" text="Weekend offers, festival sales, and restaurant promotions." />
                  <EarnRow icon={Award} title="Review Rewards" text="Rate restaurants, write reviews, and upload food photos." />
                </CardContent>
              </Card>

              <Card className="customer-surface">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black">Recent Orders & Points Earned</h2>
                    <Button asChild variant="ghost" size="sm"><Link href="/orders">View all orders</Link></Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border">
                    {recentRows.length ? recentRows.map((row) => (
                      <div key={row.id} className="grid gap-2 border-b p-3 text-sm last:border-b-0 md:grid-cols-[1fr_120px_120px_100px] md:items-center">
                        <div>
                          <p className="font-black">{row.restaurant}</p>
                          <p className="text-xs text-muted-foreground">Order #{row.id.slice(0, 8)}</p>
                        </div>
                        <p className="font-bold">{formatCurrency(row.amount)}</p>
                        <p className="font-black text-green-700">+{row.points} pts</p>
                        <Badge variant="success">{row.status}</Badge>
                      </div>
                    )) : <EmptyStateCard icon={History} title="No Recent Orders" description="Your recent food orders and earned points will appear here." actionHref={null} />}
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card className="customer-surface">
              <CardContent className="grid gap-5 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                <span className="grid size-20 place-items-center rounded-full bg-orange-100 text-primary"><Gift className="size-10" /></span>
                <div>
                  <h2 className="text-2xl font-black">Redeem your points</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your reward points to get exciting discounts on future food orders.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["₹50 OFF Coupon", "Free Delivery Pass", "Buy 1 Get 1 Offers", "Restaurant Special Deals"].map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                  </div>
                </div>
                <Button asChild size="lg"><Link href="/offers">View Rewards</Link></Button>
              </CardContent>
            </Card>

            <section className="grid gap-4 md:grid-cols-3">
              {loyaltySettings.tiers.map((item, index) => (
                <TierCard
                  key={item.name}
                  icon={index === 0 ? ShieldCheck : index === loyaltySettings.tiers.length - 1 ? Trophy : Sparkles}
                  title={item.name}
                  range={tierRange(item, loyaltySettings.tiers[index + 1])}
                  items={item.benefits}
                  active={tier.name === item.name}
                />
              ))}
            </section>
          </>
        )}
      </main>
    </CustomerShell>
  );
}

function HeroBenefit({ icon: Icon, title, text }: { icon: typeof Star; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-full bg-white/20"><Icon className="size-5" /></span>
      <span><span className="block font-black">{title}</span><span className="text-sm text-white/85">{text}</span></span>
    </div>
  );
}

function SummaryCard({ icon: Icon, value, label, tone }: { icon: typeof ShoppingBag; value: string; label: string; tone: string }) {
  const tones: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-primary",
    purple: "bg-purple-100 text-purple-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <Card className="customer-surface">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`grid size-14 place-items-center rounded-full ${tones[tone]}`}><Icon className="size-6" /></span>
        <span><span className="block text-2xl font-black">{value}</span><span className="text-sm text-muted-foreground">{label}</span></span>
      </CardContent>
    </Card>
  );
}

function EarnRow({ icon: Icon, title, text }: { icon: typeof ShoppingBag; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-lg bg-orange-50/60 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-primary"><Icon className="size-5" /></span>
      <div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
    </div>
  );
}

function TierCard({ icon: Icon, title, range, items, active }: { icon: typeof Trophy; title: string; range: string; items: string[]; active: boolean }) {
  return (
    <Card className={active ? "customer-surface border-primary/50" : "customer-surface"}>
      <CardContent className="space-y-3 p-5">
        <Icon className="size-7 text-primary" />
        <div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-muted-foreground">{range}</p></div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

function earnedPointsForOrder(total: number, settings: NonNullable<typeof defaultCmsSettings.loyalty>) {
  const earnAmount = Math.max(1, settings.earnAmount);
  const earnPoints = Math.max(0, settings.earnPoints);
  return Math.max(earnPoints, Math.floor(total / earnAmount) * earnPoints);
}

function tierForPoints(points: number, tiers: NonNullable<typeof defaultCmsSettings.loyalty>["tiers"]) {
  return [...tiers].sort((first, second) => second.minPoints - first.minPoints).find((tier) => points >= tier.minPoints) ?? tiers[0];
}

function nextTierForPoints(points: number, tiers: NonNullable<typeof defaultCmsSettings.loyalty>["tiers"]) {
  return [...tiers].sort((first, second) => first.minPoints - second.minPoints).find((tier) => points < tier.minPoints) ?? null;
}

function tierRange(tier: NonNullable<typeof defaultCmsSettings.loyalty>["tiers"][number], next?: NonNullable<typeof defaultCmsSettings.loyalty>["tiers"][number]) {
  return next ? `${tier.minPoints} - ${Math.max(tier.minPoints, next.minPoints - 1)} points` : `${tier.minPoints}+ points`;
}
