import { Clock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function KitchenTicket({
  orderId,
  items,
  lane,
  time,
}: {
  orderId: string;
  items: string;
  lane: string;
  time: string;
}) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{orderId}</CardTitle>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {time}
          </p>
        </div>
        <Badge variant="secondary">{lane}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6">{items}</p>
        <div className="flex gap-2">
          <Button size="sm">Start</Button>
          <Button size="sm" variant="outline">
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
