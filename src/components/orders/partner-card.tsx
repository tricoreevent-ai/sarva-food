import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PartnerStatus = "connected" | "disconnected" | "sync-failed";

export function PartnerCard({
  name,
  connected,
  status,
  lastSync,
  onConfigure,
}: {
  name: string;
  connected: boolean;
  status?: PartnerStatus;
  lastSync: string;
  onConfigure: () => void;
}) {
  const resolvedStatus: PartnerStatus = status ?? (connected ? "connected" : "disconnected");

  return (
    <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-black text-orange-600">{name[0]}</span>
          <p className="min-w-0 flex-1 truncate font-black text-neutral-950">{name}</p>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 capitalize",
              resolvedStatus === "connected" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              resolvedStatus === "disconnected" && "border-slate-200 bg-slate-50 text-slate-600",
              resolvedStatus === "sync-failed" && "border-orange-200 bg-orange-50 text-orange-700",
            )}
          >
            {resolvedStatus.replace("-", " ")}
          </Badge>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">Last sync: {lastSync}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onConfigure} className="justify-center">
        <Settings className="size-4" />
        Configure
      </Button>
    </div>
  );
}
