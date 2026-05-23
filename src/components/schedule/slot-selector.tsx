"use client";

export type ScheduleSlot = {
  value: string;
  label: string;
  disabled?: boolean;
  busy?: boolean;
};

export function SlotSelector({ slots, value, onChange }: { slots: ScheduleSlot[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((slot) => (
        <button
          key={slot.value}
          type="button"
          disabled={slot.disabled}
          onClick={() => onChange(slot.value)}
          className={
            value === slot.value
              ? "rounded-2xl border border-orange-500 bg-orange-50 p-4 text-left text-orange-600"
              : slot.disabled
                ? "rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-slate-300"
                : "rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-700"
          }
        >
          <span className="block text-sm font-black">{slot.label}</span>
          {slot.busy ? <span className="mt-1 block text-xs font-bold text-amber-600">Peak slot</span> : null}
        </button>
      ))}
    </div>
  );
}
