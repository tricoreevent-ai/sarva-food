import { CalendarClock, Clock } from "lucide-react";
import { SimpleDataTable } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const scheduled = [
  { post: "Lunch story", channel: "Instagram Story", time: "Today 12:00", status: "Queued" },
  { post: "Weekend combo", channel: "Feed Post", time: "Fri 18:30", status: "Draft" },
  { post: "Event catering", channel: "Carousel", time: "Mon 09:00", status: "Queued" },
];

export default function StudioScheduledPostsPage() {
  // Screen note: Schedule queue uses table patterns to keep future publishing status clear.
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scheduled posts"
        description="Queue for drafts, approvals, and future social publishing integrations."
        action={
          <Button>
            <CalendarClock className="size-4" />
            Schedule post
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <SimpleDataTable columns={["post", "channel", "time", "status"]} rows={scheduled} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <Clock className="size-5 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Approval flows, token refresh, and publisher APIs are future backend work.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
