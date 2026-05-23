"use client";

export function DateSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: date.toISOString().slice(0, 10),
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "short" }),
      sub: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    };
  });

  return (
    <div className="customer-scroll flex gap-3 overflow-x-auto pb-1">
      {days.map((day) => (
        <button
          key={day.value}
          type="button"
          onClick={() => onChange(day.value)}
          className={value === day.value ? "min-w-24 rounded-2xl border border-orange-500 bg-orange-50 p-3 text-orange-600" : "min-w-24 rounded-2xl border border-slate-200 bg-white p-3 text-slate-700"}
        >
          <span className="block text-sm font-black">{day.label}</span>
          <span className="mt-1 block text-xs font-semibold">{day.sub}</span>
        </button>
      ))}
    </div>
  );
}
