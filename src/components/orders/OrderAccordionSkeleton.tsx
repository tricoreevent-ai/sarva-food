export function OrderAccordionSkeleton() {
  return (
    <div className="min-h-[84px] animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-6 w-24 rounded bg-slate-200" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-slate-100" />
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
