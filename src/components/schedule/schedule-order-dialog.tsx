"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buildScheduledOrder, formatScheduleDate, formatScheduleSlot, getScheduleDays, toDateInputValue, type ScheduledOrderSelection } from "@/lib/schedule-slots";
import type { Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";

type ScheduleOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
  value?: ScheduledOrderSelection | null;
  onConfirm: (value: ScheduledOrderSelection) => void;
  maxDays?: number;
};

export function ScheduleOrderDialog({ open, onOpenChange, restaurant, value, onConfirm, maxDays = 14 }: ScheduleOrderDialogProps) {
  const mobile = useMediaQuery("(max-width: 767px)");
  const days = useMemo(() => getScheduleDays(restaurant, maxDays, 30), [restaurant, maxDays]);
  const firstDay = days.find((day) => day.slots.length) ?? days[0];
  const [date, setDate] = useState(value?.scheduledDate || firstDay?.value || toDateInputValue(new Date()));
  const slots = useMemo(() => days.find((day) => day.value === date)?.slots ?? [], [date, days]);
  const [slotStart, setSlotStart] = useState(value?.slotStart || slots[0]?.slotStart || "");
  const selectedSlot = slots.find((slot) => slot.slotStart === slotStart);
  const disabled = !date || !selectedSlot;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const nextDate = value?.scheduledDate || firstDay?.value || toDateInputValue(new Date());
      setDate(nextDate);
      setSlotStart(value?.slotStart || days.find((day) => day.value === nextDate)?.slots[0]?.slotStart || "");
    }, 0);
    return () => window.clearTimeout(id);
  }, [days, firstDay?.value, open, value?.scheduledDate, value?.slotStart]);

  function confirm() {
    if (!selectedSlot) return;
    onConfirm(buildScheduledOrder(restaurant?.slug || restaurant?.id || "restaurant", date, selectedSlot));
    onOpenChange(false);
  }

  const body = (
    <>
      <div className="grid gap-4 md:grid-cols-[minmax(260px,0.95fr)_minmax(300px,1.05fr)] md:gap-5">
        <section className="space-y-3">
          <StepTitle step="1" title="Select date" />
          {mobile ? (
            <Input
              type="date"
              className="h-12 rounded-xl text-base font-bold"
              min={days[0]?.value}
              max={days.at(-1)?.value}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlotStart("");
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {days.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  disabled={!day.slots.length}
                  onClick={() => {
                    setDate(day.value);
                    setSlotStart(day.slots[0]?.slotStart || "");
                  }}
                  className={cn(
                    "min-h-16 rounded-lg border bg-card p-3 text-left text-sm font-black transition",
                    date === day.value ? "border-orange-600 bg-orange-50 text-orange-700" : "hover:bg-muted",
                    !day.slots.length && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="block">{new Date(`${day.value}T00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="text-xs font-bold text-muted-foreground">{day.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <StepTitle step="2" title="Select time slot" />
          <p className="text-xs font-bold text-muted-foreground">30-minute slots from restaurant working hours</p>
          <div className="grid max-h-[38vh] gap-2 overflow-y-auto pr-1 md:max-h-80 md:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => (
              <button
                key={slot.slotStart}
                type="button"
                onClick={() => setSlotStart(slot.slotStart)}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-lg border bg-card px-3 text-left text-sm font-black transition",
                  slotStart === slot.slotStart ? "border-orange-600 bg-orange-50 text-orange-700" : "hover:bg-muted",
                )}
              >
                {slot.label}
                {slotStart === slot.slotStart ? <CheckCircle2 className="size-5 shrink-0 fill-orange-600 text-white" /> : null}
              </button>
            ))}
            {!slots.length ? (
              <div className="rounded-lg border border-dashed p-4 text-sm font-bold text-muted-foreground">
                No slots available for this date.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 -mx-1 mt-4 border-t bg-card/95 px-1 pt-4 backdrop-blur md:static md:border-t">
        <div className="grid gap-3 rounded-lg border border-orange-100 bg-orange-50/70 p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 size-5 text-orange-600" />
            <div className="text-sm">
              <p className="font-black">Selected slot</p>
              <p className="font-bold text-orange-700">{formatScheduleDate(date)}, {formatScheduleSlot(selectedSlot?.slotStart, selectedSlot?.slotEnd)}</p>
            </div>
          </div>
          <Button type="button" className="h-12 bg-orange-600 px-6 font-black hover:bg-orange-700" disabled={disabled} onClick={confirm}>
            Confirm schedule
          </Button>
        </div>
      </div>
    </>
  );

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92svh] overflow-y-auto rounded-t-2xl p-4">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-muted-foreground/30" />
          <SheetHeader>
            <SheetTitle>Schedule your order</SheetTitle>
            <SheetDescription>Select a date and 30-minute time slot.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Schedule your order</DialogTitle>
          <DialogDescription>Select a date and time to schedule your order.</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function StepTitle({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-black">
      <span className="grid size-7 place-items-center rounded-full bg-slate-950 text-xs text-white">{step}</span>
      <Clock className="size-4 text-orange-600" />
      {title}
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
