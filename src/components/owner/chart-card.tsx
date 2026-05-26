import { DashboardCard } from "@/components/owner/dashboard-card";

export function ChartCard({
  title,
  values,
  labels,
}: {
  title: string;
  values: number[];
  labels: string[];
}) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeValues, 1);
  const chartPoints = safeValues.map((value, index) => {
    const x = 38 + (index / Math.max(1, safeValues.length - 1)) * 520;
    const y = 176 - (value / max) * 136;
    return { x, y, value };
  });
  const line = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${chartPoints.at(-1)?.x ?? 558} 192 L 38 192 Z`;

  return (
    <DashboardCard
      title={title}
      action={
        <span className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-slate-700">7-day trend</span>
      }
    >
      <div className="overflow-x-auto">
        <svg viewBox="0 0 600 236" className="min-h-56 min-w-[520px] w-full" role="img" aria-label={`${title} chart`}>
          {[50, 40, 30, 20, 10, 0].map((tick, index) => {
            const y = 40 + index * 30;
            return (
              <g key={tick}>
                <text x="0" y={y + 4} className="fill-slate-600 text-[12px] font-semibold">₹{tick}K</text>
                <line x1="38" x2="570" y1={y} y2={y} className="stroke-neutral-200" strokeDasharray="4 5" />
              </g>
            );
          })}
          <path d={area} fill="url(#salesGradient)" />
          <path d={line} fill="none" stroke="#ff6b2c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {chartPoints.map((point) => (
            <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="6" fill="#ff6b2c" stroke="#fff" strokeWidth="3">
              <title>{`₹${Math.round(point.value).toLocaleString("en-IN")}`}</title>
            </circle>
          ))}
          {labels.map((label, index) => (
            <text key={label} x={38 + (index / Math.max(1, labels.length - 1)) * 520} y="220" textAnchor="middle" className="fill-slate-600 text-[12px] font-semibold">
              {label}
            </text>
          ))}
          <defs>
            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff6b2c" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#ff6b2c" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </DashboardCard>
  );
}
