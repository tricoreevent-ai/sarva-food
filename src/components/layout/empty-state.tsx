import Link from "next/link";
import { ArrowRight, type LucideIcon, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyStateCard({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel = "Start setup",
  actionHref = "/owner/settings?tab=profile",
  onRetry,
  retryLabel = "Retry",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed bg-card", className)}>
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {actionHref ? (
            <Button asChild>
              <Link href={actionHref}>
                {actionLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
