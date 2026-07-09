import type { ReactNode } from "react";

export type OrderDelayLevel = "none" | "yellow" | "orange" | "red" | "critical";
export type OrderBadgeTone = "default" | "success" | "warning" | "danger" | "info" | "muted";
export type OrderActionVariant = "primary" | "secondary" | "danger" | "ghost";

export type OrderAccordionBadge = {
  label: string;
  tone?: OrderBadgeTone;
  icon?: ReactNode;
};

export type OrderAccordionDelay = {
  delayed: boolean;
  level?: OrderDelayLevel;
  label?: string;
  lateMinutes?: number;
  waitingLabel?: string;
};

export type OrderAccordionItem = {
  id: string;
  name: string;
  quantity: number;
  note?: string;
  meta?: string;
  warning?: string;
};

export type OrderAccordionFact = {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
};

export type OrderAccordionTimelineItem = {
  label: string;
  time?: string;
};

export type OrderAccordionAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: OrderActionVariant;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
};

export type CompactOrderAccordionProps = {
  id: string;
  orderNumber: string;
  etaLabel: string;
  orderTypeLabel: string;
  tableLabel?: string;
  itemCountLabel: string;
  status: OrderAccordionBadge;
  priority?: OrderAccordionBadge;
  badges?: OrderAccordionBadge[];
  delay?: OrderAccordionDelay;
  items: OrderAccordionItem[];
  facts?: OrderAccordionFact[];
  timeline?: OrderAccordionTimelineItem[];
  notes?: string[];
  primaryAction?: OrderAccordionAction;
  secondaryActions?: OrderAccordionAction[];
  moreActions?: OrderAccordionAction[];
  isOpen: boolean;
  highlighted?: boolean;
  className?: string;
  onOpenChange: (open: boolean) => void;
};
