"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import {
  canRolePerform,
  getPlanDefinition,
  planAllowsFeature,
  planMeetsMinimum,
  roleAllowsFeature,
  type AccessOperation,
  type OwnerFeatureKey,
} from "@/lib/access-control";
import type { Restaurant, StaffRole } from "@/lib/types";

type GuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function PlanGuard({
  plan,
  minimumPlan,
  children,
  fallback,
}: GuardProps & {
  plan?: Restaurant["subscriptionPlan"];
  minimumPlan: Restaurant["subscriptionPlan"];
}) {
  if (planMeetsMinimum(plan, minimumPlan)) return <>{children}</>;
  return <>{fallback ?? <UpgradeFallback plan={plan} minimumPlan={minimumPlan} />}</>;
}

export function FeatureGuard({
  feature,
  plan,
  role,
  children,
  fallback,
}: GuardProps & {
  feature: OwnerFeatureKey;
  plan?: Restaurant["subscriptionPlan"];
  role?: StaffRole | "admin";
}) {
  if (planAllowsFeature(plan, feature) && roleAllowsFeature(role, feature)) return <>{children}</>;
  return <>{fallback ?? <UpgradeFallback plan={plan} feature={feature} />}</>;
}

export function RoleGuard({
  feature,
  operation = "read",
  role,
  children,
  fallback,
}: GuardProps & {
  feature: OwnerFeatureKey;
  operation?: AccessOperation;
  role?: StaffRole | "admin";
}) {
  if (role && canRolePerform(role, feature, operation)) return <>{children}</>;
  return <>{fallback ?? <AccessFallback />}</>;
}

export function CurrentRestaurantFeatureGuard({
  feature,
  operation = "read",
  children,
  fallback,
}: GuardProps & {
  feature: OwnerFeatureKey;
  operation?: AccessOperation;
}) {
  const authUser = useAppStore((state) => state.authUser);
  const restaurants = useAppStore((state) => state.restaurants);
  const restaurant = restaurants.find((item) => item.slug === authUser.restaurantSlug || item.id === authUser.restaurantSlug);
  const role = authUser.role as StaffRole | "admin";

  if (restaurant && planAllowsFeature(restaurant.subscriptionPlan, feature) && roleAllowsFeature(role, feature) && canRolePerform(role, feature, operation)) {
    return <>{children}</>;
  }

  return <>{fallback ?? <UpgradeFallback plan={restaurant?.subscriptionPlan} feature={feature} />}</>;
}

function UpgradeFallback({ plan, minimumPlan, feature }: { plan?: Restaurant["subscriptionPlan"]; minimumPlan?: Restaurant["subscriptionPlan"]; feature?: string }) {
  const current = getPlanDefinition(plan);
  const target = minimumPlan ?? "Growth";
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <LockKeyhole className="size-5" />
        </span>
        <div>
          <h2 className="font-black">Upgrade required</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {feature ? `${feature} is not available on ${current.label}.` : `${current.label} does not include this access.`} Upgrade to {target} or above to enable it.
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/plans">Open plan management</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function AccessFallback() {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="font-black">Access restricted</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Your role does not include permission for this action.
      </p>
    </section>
  );
}
