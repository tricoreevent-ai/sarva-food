export function ScheduleStepper({ step }: { step: number }) {
  const steps = ["Choose Date & Time", "Select Items", "Review & Confirm"];
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
      {steps.map((label, index) => (
        <div key={label} className={step === index + 1 ? "rounded-xl bg-orange-50 p-3 text-orange-600" : "rounded-xl p-3 text-slate-500"}>
          <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-current text-xs font-black text-white">
            <span className={step === index + 1 ? "text-orange-50" : "text-white"}>{index + 1}</span>
          </span>
          <span className="text-sm font-black">{label}</span>
        </div>
      ))}
    </div>
  );
}
