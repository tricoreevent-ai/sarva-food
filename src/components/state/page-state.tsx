import Image from "next/image";
import { AlertCircle, PackageOpen, RefreshCw } from "lucide-react";
import { BrandLogo, LoadingLogo } from "@/components/brand/brand-logo";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { APP_NAME } from "@/lib/constants";

export function PageLoading() {
  return (
    <main className="customer-theme grid min-h-[70dvh] place-items-center px-6 py-10" aria-busy="true" aria-label="Loading app">
      <AppSplashLoading />
    </main>
  );
}

export function CustomerHomeLoading() {
  return (
    <main className="customer-theme min-h-[1600px] space-y-5 pb-24" aria-busy="true" aria-live="polite" aria-label={`Loading ${APP_NAME}`}>
      <section className="px-4 pb-4 pt-4 md:hidden">
        <div className="grid grid-cols-[1fr_7.6rem] items-end gap-1">
          <div className="space-y-2 pb-2">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-20 w-60 rounded-lg" />
          </div>
          <Skeleton className="size-32 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-12 rounded-[1.35rem]" />
      </section>
      <section className="container-page hidden pt-6 md:block">
        <Skeleton className="h-[22.5rem] rounded-[1.35rem]" />
      </section>
      <section className="container-page space-y-5 py-5">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-lg" />
          ))}
        </div>
      </section>
    </main>
  );
}

export function ModuleLoading({ module = "customer" }: { module?: "customer" | "owner" | "admin" }) {
  if (module === "admin") {
    return (
      <main className="admin-premium min-h-screen p-5" aria-busy="true" aria-label="Loading admin console">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-14 w-72 shimmer rounded-lg bg-muted" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="shimmer h-28 rounded-lg" />)}
          </div>
          <Skeleton className="shimmer h-[420px] rounded-lg" />
        </div>
      </main>
    );
  }

  if (module === "owner") {
    return <OwnerLoadingScreen />;
  }

  return <PageLoading />;
}

export function OwnerLoadingScreen({ label = "Loading....." }: { label?: string }) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading owner dashboard"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#fff",
        padding: 24,
      }}
    >
      <section style={{ display: "grid", placeItems: "center", gap: 18, textAlign: "center" }}>
        <Image
          src={BRAND_ASSETS.primaryLogo}
          alt={APP_NAME}
          width={320}
          height={152}
          priority
          style={{ width: "min(72vw, 320px)", height: "auto", objectFit: "contain" }}
        />
        <p style={{ margin: 0, color: "#1f2a14", font: "700 15px/1.4 system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>{label}</p>
      </section>
    </main>
  );
}

export function InlineLoading({ label = "Loading" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center text-sm font-semibold text-muted-foreground">
        <LoadingLogo className="size-14" />
        <span>{label}</span>
      </CardContent>
    </Card>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <section aria-label="Loading content" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="shimmer h-36 rounded-lg" />
            <Skeleton className="shimmer h-5 w-2/3" />
            <Skeleton className="shimmer h-4 w-full" />
            <Skeleton className="shimmer h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function AppSplashLoading() {
  return (
    <section className="grid w-full max-w-md place-items-center rounded-[2rem] bg-card/96 p-8 text-center text-card-foreground shadow-2xl ring-1 ring-orange-100">
      <div className="relative grid w-full place-items-center rounded-3xl bg-white px-5 py-6 shadow-inner">
        <BrandLogo variant="vertical" className="h-28 w-full max-w-80 animate-[customer-loading-breathe_1.8s_ease-in-out_infinite]" priority sizes="320px" />
      </div>
      <p className="mt-5 text-sm font-black text-muted-foreground">Finding restaurants near you</p>
      <div className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-primary/10">
        <div className="customer-loading-progress h-full w-2/5 rounded-full bg-primary" />
      </div>
    </section>
  );
}

export function PageError({
  title = "Something needs a quick retry",
  description = "The interface could not finish loading this view. No order or account action was submitted.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <main className="container-page grid min-h-screen place-items-center py-10">
      <Card className="max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          {onRetry ? (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="size-4" />
              Retry
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

export function PageEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <EmptyState icon={PackageOpen} title={title} description={description} />;
}

export function RetryState({
  title = "Could not load data",
  description = "Check the connection and try again. Unsynced actions stay in the offline queue.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5 text-center">
        <div className="mx-auto grid size-10 place-items-center rounded-md bg-warning/10 text-warning">
          <AlertCircle className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
