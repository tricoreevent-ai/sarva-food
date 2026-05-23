"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Stat } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClass: Record<Stat["tone"], string> = {
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  info: "text-info bg-info/10",
  accent: "text-accent bg-accent/10",
};

export function StatsCard({ stat }: { stat: Stat }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </div>
            <span className={cn("rounded-full p-2", toneClass[stat.tone])}>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">{stat.delta}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
