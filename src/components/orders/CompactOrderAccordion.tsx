"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CompactOrderAccordionActions } from "./CompactOrderAccordionActions";
import { CompactOrderAccordionBody } from "./CompactOrderAccordionBody";
import { CompactOrderAccordionHeader } from "./CompactOrderAccordionHeader";
import { OrderDelayIndicator } from "./OrderDelayIndicator";
import { accentCardClass, delayCardClass } from "./OrderAccordion.utils";
import type { CompactOrderAccordionProps } from "./OrderAccordion.types";

export const CompactOrderAccordion = memo(function CompactOrderAccordion(props: CompactOrderAccordionProps) {
  const { id, accent, delay, highlighted, className, isOpen, items, facts, timeline, notes, progress, primaryAction, secondaryActions, moreActions } = props;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        accentCardClass(accent),
        highlighted && "ring-2 ring-orange-400 ring-offset-2",
        delay?.delayed && delayCardClass(delay.level),
        className,
      )}
      aria-labelledby={`${id}-header`}
    >
      <div id={`${id}-header`}>
        <CompactOrderAccordionHeader {...props} />
      </div>
      {delay?.delayed ? <div className="px-4 pb-3"><OrderDelayIndicator delay={delay} /></div> : null}
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <CompactOrderAccordionBody items={items} facts={facts} timeline={timeline} notes={notes} progress={progress} />
            <CompactOrderAccordionActions primaryAction={primaryAction} secondaryActions={secondaryActions} moreActions={moreActions} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
});
