import type { OperatingHoursDay, Restaurant } from "@/lib/types";

export type RestaurantOperatingStatus = {
  open: boolean;
  label: "Open" | "Closed";
  detail: string;
  reason?: string;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type ClosureLike = {
  active?: boolean;
  enabled?: boolean;
  closed?: boolean;
  isClosed?: boolean;
  from?: string;
  start?: string;
  startAt?: string;
  startsAt?: string;
  to?: string;
  end?: string;
  endAt?: string;
  endsAt?: string;
  date?: string;
  reason?: string;
};

type RestaurantWithClosureSettings = Restaurant & {
  active?: boolean;
  holidaySettings?: unknown;
  holidayClosures?: unknown;
  holidays?: unknown;
  temporaryClosure?: unknown;
  temporaryClosures?: unknown;
  temporaryClosed?: boolean;
  temporarilyClosed?: boolean;
  emergencyClosure?: unknown;
  emergencyClosures?: unknown;
  emergencyClosed?: boolean;
  closedUntil?: string;
};

export function getRestaurantOperatingStatus(restaurant: Restaurant, at = new Date()): RestaurantOperatingStatus {
  if (restaurant.active === false || restaurant.orderingEnabled === false || restaurant.frozen) {
    return { open: false, label: "Closed", detail: "Ordering unavailable", reason: "disabled" };
  }

  const closure = activeClosureReason(restaurant as RestaurantWithClosureSettings, at);
  if (closure) {
    return { open: false, label: "Closed", detail: closure, reason: "closure" };
  }

  const schedule = restaurant.operatingHoursSchedule;
  if (!schedule?.length || restaurant.operatingHoursPreference === "not-specified") {
    return { open: false, label: "Closed", detail: "Hours unavailable", reason: "missing-hours" };
  }

  const todayIndex = (at.getDay() + 6) % 7;
  const minutes = at.getHours() * 60 + at.getMinutes();
  const today = findScheduleDay(schedule, DAYS[todayIndex]);
  const activeSlot = today?.open ? today.slots.find((slot) => slotContainsMinute(slot.start, slot.end, minutes)) : undefined;

  if (activeSlot) {
    return { open: true, label: "Open", detail: `${formatOperatingTime(activeSlot.start)} - ${formatOperatingTime(activeSlot.end)}` };
  }

  const nextSlot = findNextOpening(schedule, todayIndex, minutes);
  if (nextSlot) {
    return {
      open: false,
      label: "Closed",
      detail: nextSlot.offset === 0
        ? `Opens at ${formatOperatingTime(nextSlot.start)}`
        : `Opens ${nextSlot.offset === 1 ? "tomorrow" : nextSlot.day} at ${formatOperatingTime(nextSlot.start)}`,
    };
  }

  return { open: false, label: "Closed", detail: "Hours unavailable", reason: "no-open-slots" };
}

function findScheduleDay(schedule: OperatingHoursDay[], day: string) {
  return schedule.find((entry) => normalize(entry.day) === normalize(day));
}

function findNextOpening(schedule: OperatingHoursDay[], todayIndex: number, currentMinutes: number) {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = DAYS[(todayIndex + offset) % 7];
    const entry = findScheduleDay(schedule, day);
    if (!entry?.open) continue;

    const slot = entry.slots
      .slice()
      .sort((first, second) => timeMinutes(first.start) - timeMinutes(second.start))
      .find((candidate) => offset > 0 || timeMinutes(candidate.start) > currentMinutes);

    if (slot) return { offset, day, start: slot.start };
  }

  return null;
}

function slotContainsMinute(start: string, end: string, minutes: number) {
  const startMinutes = timeMinutes(start);
  const endMinutes = timeMinutes(end);
  if (startMinutes === endMinutes) return true;
  if (endMinutes > startMinutes) return minutes >= startMinutes && minutes < endMinutes;
  return minutes >= startMinutes || minutes < endMinutes;
}

function activeClosureReason(restaurant: RestaurantWithClosureSettings, at: Date) {
  if (restaurant.emergencyClosed) return "Emergency closure";
  if (restaurant.temporaryClosed || restaurant.temporarilyClosed) return "Temporarily closed";
  if (restaurant.closedUntil && Date.parse(restaurant.closedUntil) > at.getTime()) return `Closed until ${formatClosureDate(restaurant.closedUntil)}`;

  const checks: Array<[unknown, string]> = [
    [restaurant.emergencyClosure, "Emergency closure"],
    [restaurant.emergencyClosures, "Emergency closure"],
    [restaurant.temporaryClosure, "Temporarily closed"],
    [restaurant.temporaryClosures, "Temporarily closed"],
    [restaurant.holidaySettings, "Holiday"],
    [restaurant.holidayClosures, "Holiday"],
    [restaurant.holidays, "Holiday"],
  ];

  for (const [value, fallback] of checks) {
    const reason = closureValueReason(value, at, fallback);
    if (reason) return reason;
  }

  return "";
}

function closureValueReason(value: unknown, at: Date, fallback: string): string {
  if (!value) return "";
  if (typeof value === "boolean") return value ? fallback : "";
  if (Array.isArray(value)) {
    for (const entry of value) {
      const reason = closureValueReason(entry, at, fallback);
      if (reason) return reason;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const closure = value as ClosureLike;
  if (closure.active === false || closure.enabled === false || closure.closed === false || closure.isClosed === false) return "";
  const date = closure.date;
  if (date && sameLocalDate(date, at)) return closure.reason || fallback;

  const start = closure.from ?? closure.start ?? closure.startAt ?? closure.startsAt;
  const end = closure.to ?? closure.end ?? closure.endAt ?? closure.endsAt;
  if (!start && !end && (closure.active || closure.closed || closure.isClosed)) return closure.reason || fallback;

  const startMs = start ? Date.parse(start) : 0;
  const endMs = end ? Date.parse(end) : Number.POSITIVE_INFINITY;
  const now = at.getTime();
  if ((!start || Number.isFinite(startMs)) && (!end || Number.isFinite(endMs)) && now >= startMs && now <= endMs) {
    return closure.reason || fallback;
  }

  return "";
}

function sameLocalDate(value: string, at: Date) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() === at.getFullYear() &&
    parsed.getMonth() === at.getMonth() &&
    parsed.getDate() === at.getDate();
}

function formatClosureDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((item) => Number(item));
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatOperatingTime(value: string) {
  const [rawHours, rawMinutes] = value.split(":").map((item) => Number(item));
  const period = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(rawMinutes || 0).padStart(2, "0")} ${period}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
