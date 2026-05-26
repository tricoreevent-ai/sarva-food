"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";

export function OwnerAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useAppStore((state) => state.ownerBusinessProfile);
  const unlocked = profile?.completed;

  if (unlocked || pathname === "/owner/settings" || pathname === "/owner/profile" || pathname === "/owner/onboarding") {
    return children;
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center">
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="size-7" />
          </div>
          <Badge variant="warning">Business profile required</Badge>
          <h1 className="text-2xl font-black">Complete your hotel setup first</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Owner tools stay locked until hotel name, logo, address, map location, phone,
            hours, delivery radius, and service type are saved.
          </p>
          <Button asChild>
            <Link href="/owner/settings?tab=profile">
              <Store className="size-4" />
              Finish onboarding
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
