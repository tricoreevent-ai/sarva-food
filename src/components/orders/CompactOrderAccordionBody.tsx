import { memo } from "react";
import { progressToneClass } from "./OrderAccordion.utils";
import type { OrderAccordionFact, OrderAccordionItem, OrderAccordionProgress, OrderAccordionTimelineItem } from "./OrderAccordion.types";

export const CompactOrderAccordionBody = memo(function CompactOrderAccordionBody({
  items,
  facts = [],
  timeline = [],
  notes = [],
  progress,
}: {
  items: OrderAccordionItem[];
  facts?: OrderAccordionFact[];
  timeline?: OrderAccordionTimelineItem[];
  notes?: string[];
  progress?: OrderAccordionProgress;
}) {
  return (
    <div className="grid min-w-0 divide-y divide-slate-100 xl:grid-cols-[minmax(13rem,0.85fr)_minmax(15rem,1fr)_minmax(17rem,1.15fr)] xl:divide-x xl:divide-y-0">
      {facts.length ? (
        <section className="min-w-0 p-4">
          <p className="mb-3 text-[11px] font-black uppercase text-slate-500">Order Information</p>
          <dl className="grid gap-1.5">
            {facts.map((fact) => (
              <div key={fact.label} className="grid min-w-0 grid-cols-[5.25rem_0.5rem_minmax(0,1fr)] gap-1 text-xs">
                <dt className="font-bold text-slate-500">{fact.label}</dt>
                <span className="text-slate-300">:</span>
                <dd className={`min-w-0 break-words font-black ${fact.tone === "danger" ? "text-red-700" : fact.tone === "success" ? "text-emerald-700" : "text-slate-800"}`}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="min-w-0 p-4">
        <p className="mb-3 text-[11px] font-black uppercase text-slate-500">Items ({items.length})</p>
        <div className="grid gap-2.5">
          {items.map((item) => (
            <div key={item.id} className="min-w-0 text-xs">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-black text-slate-800">{item.quantity}x {item.name}</p>
                {item.total || item.price ? <span className="shrink-0 font-black text-slate-700">{item.total ?? item.price}</span> : null}
              </div>
              {item.meta ? <p className="mt-0.5 font-semibold text-slate-500">{item.meta}</p> : null}
              {item.note ? <p className="mt-0.5 font-semibold text-slate-600">Note: {item.note}</p> : null}
              {item.warning ? <p className="mt-0.5 font-black text-red-700">{item.warning}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 content-start gap-3 p-4">
        {progress ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase text-slate-500">{progress.label}</p>
              <p className="text-xs font-black text-slate-700">{Math.round(progress.value)}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <span className={`block h-full rounded-full ${progressToneClass(progress.tone)}`} style={{ width: `${Math.max(0, Math.min(100, progress.value))}%` }} />
            </div>
            {progress.helper ? <p className="mt-2 text-xs font-bold text-slate-600">{progress.helper}</p> : null}
            {progress.readyLabel || progress.pendingLabel || progress.kotLabel ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                {progress.readyLabel ? <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">{progress.readyLabel}</span> : null}
                {progress.pendingLabel ? <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">{progress.pendingLabel}</span> : null}
                {progress.kotLabel ? <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">{progress.kotLabel}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {notes.length ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            {notes.map((note) => <p key={note}>{note}</p>)}
          </div>
        ) : null}

        {timeline.length ? (
          <div className="grid gap-2 border-t border-slate-100 pt-3">
          <p className="text-[11px] font-black uppercase text-slate-500">Timeline</p>
          {timeline.map((entry, index) => (
            <div key={`${entry.label}-${entry.time ?? index}`} className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-black text-slate-700">{entry.label}</span>
              {entry.time ? <span className="font-semibold text-slate-500">{entry.time}</span> : null}
            </div>
          ))}
          </div>
        ) : null}
      </section>
    </div>
  );
});
