import { AlertCircle, Bike, ChefHat, Loader2, PackageOpen, RefreshCw, Utensils } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <main className="container-page py-6" aria-busy="true" aria-label="Loading page">
      <section className="customer-surface mb-5 overflow-hidden rounded-lg p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <FoodLoadingMark />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase text-primary">Heating the kitchen</p>
            <h1 className="mt-1 text-2xl font-black">Getting fresh restaurants ready.</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Menus, offers, and nearby delivery data are syncing for this location.
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="shimmer h-72 rounded-lg" />
        <div className="grid gap-4">
          <Skeleton className="shimmer h-32 rounded-lg" />
          <Skeleton className="shimmer h-32 rounded-lg" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Skeleton className="shimmer h-24 rounded-lg" />
        <Skeleton className="shimmer h-24 rounded-lg" />
        <Skeleton className="shimmer h-24 rounded-lg" />
      </div>
    </main>
  );
}

export function InlineLoading({ label = "Loading" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center text-sm font-semibold text-muted-foreground">
        <FoodLoadingMark compact />
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

function FoodLoadingMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "relative size-14 shrink-0" : "relative size-20 shrink-0"} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-primary/12" />
      <div className="plate-loader absolute inset-2 grid place-items-center rounded-full border-4 border-secondary bg-card text-primary shadow-lg">
        <Utensils className={compact ? "size-5" : "size-7"} />
      </div>
      <ChefHat className="steam-loader absolute -top-1 left-1/2 size-5 -translate-x-1/2 text-primary" />
      <Bike className="delivery-loader absolute -bottom-1 left-1 size-5 text-accent" />
      <Loader2 className="absolute right-0 top-1 size-4 animate-spin text-muted-foreground" />
    </div>
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
