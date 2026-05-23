"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, ImagePlus, Loader2, MessageCircle, Users } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { formatCurrency } from "@/lib/utils";

const cateringSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  guestCount: z.number().min(10, "Minimum 10 guests"),
  packageId: z.string().min(2),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().min(1, "Event time is required"),
  eventType: z.string().min(2, "Event type is required"),
  eventNotes: z.string().min(8, "Add event notes"),
  imageUrls: z.string().optional(),
  callbackRequested: z.boolean().default(true),
  contactPreference: z.enum(["phone", "whatsapp", "email"]).default("phone"),
});

type CateringFormValues = z.infer<typeof cateringSchema>;

export function CateringFlow() {
  const packages = useAppStore((state) => state.cateringPackages);
  const latestQuote = useAppStore((state) => state.latestQuote);
  const createCateringQuote = useAppStore((state) => state.createCateringQuote);
  const apiPhase = useAppStore((state) => state.apiPhase);
  const form = useForm<CateringFormValues>({
    resolver: zodResolver(cateringSchema) as Resolver<CateringFormValues>,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      whatsapp: "",
      guestCount: 80,
      packageId: packages[0]?.id,
      eventDate: "",
      eventTime: "12:30",
      eventType: "Corporate lunch",
      eventNotes: "Lunch event with veg and non-veg options.",
      imageUrls: "",
      callbackRequested: true,
      contactPreference: "phone",
    },
  });
  const watchedPackageId = useWatch({ control: form.control, name: "packageId" });
  const selectedPackage = packages.find((item) => item.id === watchedPackageId) ?? packages[0];

  async function handleSubmit(values: CateringFormValues) {
    await createCateringQuote({
      ...values,
      imageUrls: splitLinks(values.imageUrls),
    });
  }

  // Quotation uses the configured catering package prices and can later sync
  // into cateringRequests/{id}, quote revisions, and owner notifications.
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardContent className="space-y-4 p-5">
          <SectionHeader title="Event inquiry" description="Capture event details and generate a package quote." />
          <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="event-name">Name</Label>
              <Input id="event-name" {...form.register("name")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-phone">Phone</Label>
              <Input id="event-phone" inputMode="tel" {...form.register("phone")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-whatsapp">WhatsApp</Label>
              <Input id="event-whatsapp" inputMode="tel" {...form.register("whatsapp")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-email">Email</Label>
              <Input id="event-email" type="email" {...form.register("email")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guests">Guest count</Label>
              <Input
                id="guests"
                inputMode="numeric"
                {...form.register("guestCount", { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="package">Package</Label>
              <select
                id="package"
                className="h-11 rounded-md border bg-background px-3 text-sm"
                {...form.register("packageId")}
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-type">Event type</Label>
              <Input id="event-type" {...form.register("eventType")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="event-date">Event date</Label>
                <Input id="event-date" type="date" {...form.register("eventDate")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-time">Event time</Label>
                <Input id="event-time" type="time" {...form.register("eventTime")} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-notes">Event notes</Label>
              <Textarea id="event-notes" {...form.register("eventNotes")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-images">Notes or image links</Label>
              <Input id="event-images" placeholder="Paste image links or setup notes" {...form.register("imageUrls")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-bold">
                <input type="checkbox" {...form.register("callbackRequested")} />
                Request callback
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Contact by
                <select className="h-10 rounded-md border bg-background px-3" {...form.register("contactPreference")}>
                  <option value="phone">Phone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </label>
            </div>
            <Button className="w-full" size="lg" disabled={apiPhase === "loading"}>
              {apiPhase === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarPlus className="size-4" />
              )}
              Generate quote
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent("I want a catering callback from Sarva Food.")}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp quick contact
              </a>
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-5">
        <SectionHeader
          title="Package selection"
          description="Package cards update the inquiry form and quote preview."
          action={
            <Button asChild variant="outline">
              <Link href="/catering/packages">All packages</Link>
            </Button>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              className="text-left"
              onClick={() => form.setValue("packageId", pkg.id)}
            >
              <Card className={pkg.id === selectedPackage?.id ? "border-primary" : ""}>
                <CardContent className="space-y-4 p-5">
                <Users className="size-6 text-primary" aria-hidden="true" />
                  <div>
                    <h2 className="font-bold">{pkg.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{pkg.guests}</p>
                  </div>
                  <Badge variant="secondary">{pkg.price}</Badge>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {pkg.inclusions.map((inclusion) => (
                      <li key={inclusion}>{inclusion}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-bold">Quotation preview</h2>
            {latestQuote ? (
              <>
                <div className="flex justify-between text-sm">
                  <span>Quote ID</span>
                  <span className="font-semibold">{latestQuote.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Guests</span>
                  <span>{latestQuote.guestCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Event</span>
                  <span>{[latestQuote.eventDate, latestQuote.eventTime].filter(Boolean).join(" ") || "Date pending"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(latestQuote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service fee</span>
                  <span>{formatCurrency(latestQuote.serviceFee)}</span>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(latestQuote.total)}</span>
                </div>
                {latestQuote.callbackRequested ? (
                  <Badge variant="success">
                    <ImagePlus className="mr-1 size-3" />
                    Callback requested
                  </Badge>
                ) : null}
              </>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Submit the inquiry to generate a quote preview for the selected package.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function splitLinks(value?: string) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}
