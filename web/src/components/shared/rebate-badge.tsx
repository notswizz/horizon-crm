"use client";

import { RebateOutcome } from "@/types";
import { rebateConfig, cn } from "@/lib/utils";

export function RebateBadge({ outcome }: { outcome: RebateOutcome }) {
  const config = rebateConfig[outcome] || { label: outcome, color: "text-gray-500", bg: "bg-gray-100" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", config.bg, config.color)}>
      {config.label}
    </span>
  );
}
