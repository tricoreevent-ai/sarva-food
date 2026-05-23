"use client";

import { CalendarClock, MessageCircle, Phone, ReceiptText } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { formatCurrency } from "@/lib/utils";

export default function CateringRequestsPage() {
  const inquiries = useAppStore((state) => state.cateringInquiries);
  const updateStatus = useAppStore((state) => state.updateCateringInquiryStatus);
  const convertToOrder = useAppStore((state) => state.convertCateringInquiryToOrder);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Catering requests"
        description="Lead pipeline with callback, quotation, WhatsApp contact, and order conversion."
        action={<Button asChild><a href="/catering"><ReceiptText className="size-4" />New inquiry</a></Button>}
      />
      <section className="grid gap-4">
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id}>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black">{inquiry.eventType ?? "Catering event"}</h2>
                  <Badge variant={inquiry.status === "converted" ? "success" : inquiry.status === "quoted" ? "secondary" : "warning"}>
                    {inquiry.status ?? "new"}
                  </Badge>
                  <Badge variant="muted">{inquiry.guestCount} guests</Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{inquiry.name} · {inquiry.phone}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <CalendarClock className="mr-1 inline size-4" />
                  {[inquiry.eventDate, inquiry.eventTime].filter(Boolean).join(" ") || "Date pending"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{inquiry.eventNotes}</p>
                <p className="mt-2 text-lg font-black">{formatCurrency(inquiry.total)}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${inquiry.phone}`}>
                    <Phone className="size-4" />
                    Call
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://wa.me/${(inquiry.whatsapp || inquiry.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
                <Button size="sm" onClick={() => void updateStatus(inquiry.id, "contacted")}>Contacted</Button>
                <Button size="sm" variant="secondary" onClick={() => void updateStatus(inquiry.id, "quoted")}>Send quote</Button>
                <Button size="sm" onClick={() => void convertToOrder(inquiry.id)}>Convert</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!inquiries.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Catering inquiries generated from the customer catering flow will appear here.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
