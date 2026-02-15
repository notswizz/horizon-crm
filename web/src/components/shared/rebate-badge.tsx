"use client";

import { RebateStatus } from "@/types";
import { rebateConfig, cn } from "@/lib/utils";

export function RebateBadge({ status }: { status: RebateStatus }) {
  const config = rebateConfig[status] || { label: status, color: "text-gray-500", bg: "bg-gray-100" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", config.bg, config.color, status === "paid" && "ring-1 ring-yellow-400")}>
      {config.label}
    </span>
  );
}
