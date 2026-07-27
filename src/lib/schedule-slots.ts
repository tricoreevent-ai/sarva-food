import type { Restaurant } from "@/lib/types";

export const SCHEDULE_STORAGE_KEY = "food-gedi.scheduledOrder";
export const LEGACY_SCHEDULE_STORAGE_KEYS = ["nammude.scheduledOrder"] as const;

export type ScheduleTimeSlot = {
  slotStart: string;
  slotEnd: string;
  label: string;
  value: string;
  startMinutes: number;
  endMinutes: number;
};

export type ScheduledOrderSelection = {
  orderType: "scheduled";
  scheduledDate: string;
  slotStart: string;
  slotEnd: string;
  restaurantId: string;
  scheduledFor: string;
};

export type ScheduleDayOption = {
  value: string;
  label: string;
  slots: ScheduleTimeSlot[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function generateTimeSlots(openTime: string, closeTime: string, interval = 30): ScheduleTimeSlot[] {
  const start = parseTime(openTime);
  let end = parseTime(closeTime);
  if (end <= start) end += 24 * 60;
  const slots: ScheduleTimeSlot[] = [];

  for (let minutes = start; minutes + interval <= end; minutes += interval) {
    const slotStart = formatInputTime(minutes);
    const slotEnd = formatInputTime(minutes + interval);
    slots.push({
      slotStart,
      slotEnd,
      label: `${formatDisplayTime(slotStart)} - ${formatDisplayTime(slotEnd)}`,
      value: slotStart,
      startMinutes: minutes,
      endMinutes: minutes + interval,
    });
  }

  return slots;
}

export function getScheduleDays(restaurant: Restaurant | null, days = 14, interval = 30): ScheduleDayOption[] {
  const today = new Date();
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const schedule = getWindowsForDate(restaurant, date);
    const minTime = offset === 0 ? roundUpMinutes(nowMinutes() + (restaurant?.scheduling?.cutoffMinutes ?? restaurant?.scheduling?.minPrepMinutes ?? 45), interval) : 0;
    const slots = schedule.flatMap(({ start, end }) =>
      generateTimeSlots(start, end, interval).filter((slot) => offset !== 0 || slot.startMinutes >= minTime),
    );

    return {
      value: toDateInputValue(date),
      label: date.toLocaleDateString("en-IN", { dateStyle: "medium" }),
      slots,
    };
  });
}

export function getScheduleSlotsForDate(restaurant: Restaurant | null, dateValue: string, days = 14, interval = 30) {
  return getScheduleDays(restaurant, days, interval).find((day) => day.value === dateValue)?.slots ?? [];
}

export function buildScheduledOrder(restaurantId: string, scheduledDate: string, slot: ScheduleTimeSlot): ScheduledOrderSelection {
  return {
    orderType: "scheduled",
    scheduledDate,
    slotStart: slot.slotStart,
    slotEnd: slot.slotEnd,
    restaurantId,
    scheduledFor: combineScheduleDateTime(scheduledDate, slot.slotStart),
  };
}

export function combineScheduleDateTime(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

export function formatScheduleDate(dateValue: string) {
  return dateValue ? new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Select date";
}

export function formatScheduleSlot(slotStart?: string, slotEnd?: string) {
  return slotStart && slotEnd ? `${formatDisplayTime(slotStart)} - ${formatDisplayTime(slotEnd)}` : "Select slot";
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWindowsForDate(restaurant: Restaurant | null, date: Date) {
  const day = DAY_NAMES[date.getDay()];
  const entry = restaurant?.operatingHoursSchedule?.find((item) => item.day === day);
  if (restaurant?.scheduling?.enabled === false) return [];
  if (entry) return entry.open ? entry.slots.map((slot) => ({ start: slot.start, end: slot.end })) : [];
  return parseOperatingHours(restaurant?.operatingHours) ?? [{ start: "10:30", end: "23:30" }];
}

function parseOperatingHours(value?: string) {
  if (!value) return null;
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-\u2013]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  const start = normalizeClock(match[1], match[2], match[3] ?? match[6]);
  const end = normalizeClock(match[4], match[5], match[6]);
  return start && end ? [{ start, end }] : null;
}

function normalizeClock(hours: string, minutes = "00", meridiem?: string) {
  let hour = Number(hours);
  const minute = Number(minutes);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (meridiem?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (meridiem?.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatInputTime(minutes: number) {
  const value = minutes % (24 * 60);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function formatDisplayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2026, 0, 1, hours, minutes).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function roundUpMinutes(minutes: number, interval: number) {
  return Math.ceil(minutes / interval) * interval;
}
