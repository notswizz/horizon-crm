"use client";

import { JobStage } from "@/types";
import { stageConfig, cn } from "@/lib/utils";

export function StageBadge({ stage, size = "default" }: { stage: JobStage; size?: "default" | "sm" }) {
  const config = stageConfig[stage] || { label: stage, color: "text-gray-500", bg: "bg-gray-100" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        config.bg,
        config.color,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
    >
      {config.label}
    </span>
  );
}
