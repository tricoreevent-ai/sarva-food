import type { OperatingHoursDay } from "@/lib/types";

export const weekDayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function createEmptyOperatingHours(): OperatingHoursDay[] {
  return weekDayNames.map((day) => ({ day, open: false, slots: [] }));
}

export function formatOperatingHours(schedule: OperatingHoursDay[] = []) {
  const openDays = schedule.filter((day) => day.open && day.slots.length > 0);
  if (!openDays.length) return "Not specified";
  const firstSlot = openDays[0]?.slots[0];
  const allSame = openDays.every((day) =>
    day.slots.length === 1 &&
    day.slots[0]?.start === firstSlot?.start &&
    day.slots[0]?.end === firstSlot?.end,
  );
  if (openDays.length === 7 && allSame && firstSlot) {
    return `Daily ${firstSlot.start} - ${firstSlot.end}`;
  }
  return openDays
    .map((day) => `${day.day.slice(0, 3)} ${day.slots.map((slot) => `${slot.start}-${slot.end}`).join(", ")}`)
    .join("; ");
}
