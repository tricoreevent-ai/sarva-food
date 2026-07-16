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
    <div className="grid gap-3 border-t border-slate-100 bg-slate-50/45 px-4 py-3 lg:grid-cols-[minmax(12rem,0.9fr)_minmax(16rem,1.15fr)_minmax(16rem,1fr)]">
      {facts.length ? (
        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="text-[10px] font-black uppercase text-slate-500">{fact.label}</p>
              <p className={`mt-1 truncate text-sm font-black ${fact.tone === "danger" ? "text-red-700" : fact.tone === "success" ? "text-emerald-700" : "text-slate-900"}`}>{fact.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid content-start gap-2">
        <p className="text-[11px] font-black uppercase text-slate-500">Items</p>
        {items.map((item) => (
          <div key={item.id} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-black text-slate-950">{item.quantity}x {item.name}</p>
              {item.meta ? <span className="shrink-0 text-xs font-bold text-slate-500">{item.meta}</span> : null}
            </div>
            {item.note ? <p className="mt-1 text-xs font-semibold text-slate-600">{item.note}</p> : null}
            {item.warning ? <p className="mt-1 text-xs font-black text-red-700">{item.warning}</p> : null}
          </div>
        ))}
      </section>

      <section className="grid content-start gap-3">
        {progress ? (
          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase text-slate-500">{progress.label}</p>
              <p className="text-xs font-black text-slate-700">{Math.round(progress.value)}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <span className={`block h-full rounded-full ${progressToneClass(progress.tone)}`} style={{ width: `${Math.max(0, Math.min(100, progress.value))}%` }} />
            </div>
            {progress.helper ? <p className="mt-2 text-xs font-bold text-slate-600">{progress.helper}</p> : null}
          </div>
        ) : null}

        {notes.length ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            {notes.map((note) => <p key={note}>{note}</p>)}
          </div>
        ) : null}

        {timeline.length ? (
          <div className="grid gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
          <p className="text-[11px] font-black uppercase text-slate-500">Timeline</p>
          {timeline.map((entry, index) => (
            <div key={`${entry.label}-${entry.time ?? index}`} className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-orange-500" />
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
