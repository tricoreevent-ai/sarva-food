import { AlertCircle, PackageOpen, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ErrorAlert({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-black text-destructive">{title}</p>
        <p className="mt-1 leading-6 text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function RetryCard({
  title = "Could not load data",
  message = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5 text-center">
        <AlertCircle className="mx-auto size-8 text-warning" aria-hidden="true" />
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

export function OfflineState({
  message = "You are offline. Recent customer data remains available when cached.",
}: {
  message?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4 text-sm font-semibold text-muted-foreground">
        <WifiOff className="size-5 text-warning" aria-hidden="true" />
        {message}
      </CardContent>
    </Card>
  );
}

export function ProductionEmptyState({
  icon: Icon = PackageOpen,
  title,
  message,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="grid min-h-44 place-items-center p-6 text-center">
        <div>
          <Icon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 font-black">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
