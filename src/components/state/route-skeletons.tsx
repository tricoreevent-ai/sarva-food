import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CustomerSkeletonVariant = "home" | "restaurants" | "restaurant" | "menu" | "checkout" | "cart" | "orders" | "profile";
type DashboardSkeletonVariant = "dashboard" | "orders" | "menu" | "analytics" | "customers" | "library" | "table";

export function CustomerRouteSkeleton({
  variant = "home",
}: {
  variant?: CustomerSkeletonVariant;
}) {
  if (variant === "checkout" || variant === "cart") {
    return (
      <main className="container-page space-y-5 py-5" aria-busy="true" aria-label="Loading page">
        <Skeleton className="h-36 rounded-lg" />
        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            {Array.from({ length: variant === "cart" ? 3 : 5 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </section>
      </main>
    );
  }

  if (variant === "profile") {
    return (
      <main className="container-page grid gap-5 py-5 lg:grid-cols-[260px_1fr]" aria-busy="true" aria-label="Loading profile">
        <aside className="hidden space-y-3 lg:block">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </aside>
        <section className="space-y-5">
          <Skeleton className="h-48 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </section>
      </main>
    );
  }

  return (
    <main className="customer-theme space-y-5 pb-24" aria-busy="true" aria-label="Loading page">
      <section className={cn("container-page pt-5", variant === "restaurant" && "px-0 pt-0 xl:px-4 xl:pt-5")}>
        <Skeleton className={cn("h-72 rounded-lg md:h-[22rem]", variant === "menu" && "h-52", variant === "restaurants" && "h-64")} />
      </section>
      <section className="container-page space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-8 w-56 rounded-md" />
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", variant === "orders" && "xl:grid-cols-2")}>
          {Array.from({ length: variant === "home" ? 6 : 8 }).map((_, index) => (
            <Skeleton key={index} className={cn("h-72 rounded-lg", variant === "menu" && "h-64", variant === "orders" && "h-48")} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function DashboardRouteSkeleton({
  app = "owner",
  variant = "dashboard",
}: {
  app?: "owner" | "admin";
  variant?: DashboardSkeletonVariant;
}) {
  const metricCount = app === "admin" ? 4 : 5;
  return (
    <main className={cn(app === "admin" ? "admin-premium" : "owner-premium", "min-h-screen p-4 sm:p-5")} aria-busy="true" aria-label={`Loading ${app} view`}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-9 w-72 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: metricCount }).map((_, index) => <Skeleton key={index} className="h-24 rounded-lg" />)}
        </div>
        {variant === "orders" ? <OrderRows /> : variant === "menu" || variant === "library" ? <MenuGrid /> : <DashboardPanels />}
      </div>
    </main>
  );
}

export function KitchenRouteSkeleton() {
  return (
    <main className="owner-premium min-h-screen space-y-4 p-4" aria-busy="true" aria-label="Loading kitchen">
      <Skeleton className="h-20 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <section key={index} className="space-y-3">
            <Skeleton className="h-12 rounded-lg" />
            {Array.from({ length: 3 }).map((__, cardIndex) => <Skeleton key={cardIndex} className="h-44 rounded-lg" />)}
          </section>
        ))}
      </div>
    </main>
  );
}

export function PosRouteSkeleton() {
  return (
    <main className="owner-premium grid min-h-screen gap-4 p-4 xl:grid-cols-[260px_1fr_380px]" aria-busy="true" aria-label="Loading POS">
      <Skeleton className="hidden rounded-lg xl:block" />
      <section className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-lg" />)}
        </div>
      </section>
      <Skeleton className="h-[calc(100svh-2rem)] rounded-lg" />
    </main>
  );
}

function DashboardPanels() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Skeleton className="h-[420px] rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </section>
  );
}

function MenuGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} className="h-52 rounded-lg" />)}
    </section>
  );
}

function OrderRows() {
  return (
    <section className="space-y-3">
      {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
    </section>
  );
}
