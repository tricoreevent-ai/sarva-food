import { LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function SocialTemplateCard({
  name,
  format,
  mood,
  palette,
}: {
  name: string;
  format: string;
  mood: string;
  palette: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="soft-grid-bg grid aspect-[4/5] place-items-center bg-secondary/20">
        <div className="grid size-16 place-items-center rounded-full bg-card shadow-sm">
          <LayoutTemplate className="size-7 text-primary" aria-hidden="true" />
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">{name}</h3>
            <p className="text-sm text-muted-foreground">{mood}</p>
          </div>
          <Badge variant="outline">{format}</Badge>
        </div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">{palette}</p>
      </CardContent>
    </Card>
  );
}
