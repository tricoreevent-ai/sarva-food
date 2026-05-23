import { Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Offer } from "@/lib/types";

export function OfferBadge({ offer }: { offer: Offer }) {
  return (
    <Badge variant={offer.channel === "Instagram" ? "accent" : "secondary"}>
      <Percent className="mr-1 size-3" aria-hidden="true" />
      {offer.code}
    </Badge>
  );
}
