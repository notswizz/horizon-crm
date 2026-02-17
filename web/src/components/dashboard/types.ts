import { AnalyticsData, Job } from "@/types";
import { type ActivityEvent } from "@/app/api/dashboard/route";

export type { ActivityEvent };

export interface DashboardData {
  analytics: AnalyticsData;
  recentJobs: Job[];
  allJobs: Job[];
  activityEvents: ActivityEvent[];
}

export interface DashboardProps {
  analytics: AnalyticsData;
  allJobs: Job[];
  recentJobs: Job[];
  activityEvents: ActivityEvent[];
  activityFilter: string;
  setActivityFilter: (f: string) => void;
  photoDays: 7 | 30 | 90;
  setPhotoDays: (d: 7 | 30 | 90) => void;
  mapStageFilter: string;
  setMapStageFilter: (s: string) => void;
}

export interface CompanyOption {
  id: string;
  name: string;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export const STAGE_COLORS: Record<string, string> = {
  "Audit Pending": "#9CA3AF",
  "Work In Progress": "#F59E0B",
  "Inspection Pending": "#FF6B35",
  Completed: "#10B981",
  Cancelled: "#EF4444",
};

export const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export const ACTIVITY_ICONS_MAP: Record<string, string> = {
  briefcase: "briefcase",
  "arrow-right": "arrow-right",
  "file-text": "file-text",
  "check-circle": "check-circle",
  banknote: "banknote",
  "x-circle": "x-circle",
  clipboard: "clipboard",
  search: "search",
  "alert-triangle": "alert-triangle",
  wrench: "wrench",
};
