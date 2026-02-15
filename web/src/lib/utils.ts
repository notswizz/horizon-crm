import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Job, InspectionForm, JobStage, RebateStatus, IssueSeverity, DatasetValueWeights, DatasetValuationConfig } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Stage colors (matches iOS DS.Colors) ──────────────────────────────

export const stageConfig: Record<JobStage, { label: string; color: string; bg: string; icon: string }> = {
  auditPending: { label: "Audit Pending", color: "text-indigo-600", bg: "bg-indigo-100", icon: "📋" },
  workInProgress: { label: "Work In Progress", color: "text-amber-600", bg: "bg-amber-100", icon: "🔨" },
  inspectionPending: { label: "Inspection Pending", color: "text-purple-600", bg: "bg-purple-100", icon: "🔍" },
  completed: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-100", icon: "✅" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-100", icon: "❌" },
};

export const rebateConfig: Record<RebateStatus, { label: string; color: string; bg: string }> = {
  none: { label: "None", color: "text-gray-500", bg: "bg-gray-100" },
  calculated: { label: "Calculated", color: "text-orange-600", bg: "bg-orange-100" },
  submitted: { label: "Submitted", color: "text-blue-600", bg: "bg-blue-100" },
  accepted: { label: "Accepted", color: "text-emerald-600", bg: "bg-emerald-100" },
  declined: { label: "Declined", color: "text-red-600", bg: "bg-red-100" },
  paid: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-100" },
};

export const severityConfig: Record<IssueSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "text-red-600", bg: "bg-red-100" },
  major: { label: "Major", color: "text-amber-600", bg: "bg-amber-100" },
  minor: { label: "Minor", color: "text-yellow-600", bg: "bg-yellow-100" },
};

// ─── Dataset value estimation (matches iOS formula) ────────────────────

export const DEFAULT_WEIGHTS: DatasetValueWeights = {
  basePoints: 5,
  photoPoints: 2,
  issuePoints: 3,
  rebateMultiplier: 1.5,
  pairMultiplier: 1.3,
  pairThreshold: 80,
  materialMultiplier: 1.2,
};

export function estimateJobValue(job: Job, forms: InspectionForm[], w: DatasetValueWeights = DEFAULT_WEIGHTS): number {
  const base = w.basePoints + job.photoCount * w.photoPoints + job.issueCount * w.issuePoints;

  const hasRebateResult = job.rebateStatus === "accepted" || job.rebateStatus === "declined" || job.rebateStatus === "paid";
  const rebateMult = hasRebateResult ? w.rebateMultiplier : 1.0;

  const allFixPhotos = forms
    .filter((f) => f.formType === "inspection")
    .flatMap((f) => f.spots.flatMap((s) => s.fixPhotos));
  const linkedFixCount = allFixPhotos.filter((f) => f.linkedAuditIssueId).length;
  const pairRatio = job.issueCount > 0 ? linkedFixCount / job.issueCount : 0;
  const pairMult = pairRatio > (w.pairThreshold / 100) ? w.pairMultiplier : 1.0;

  const allMaterials = forms.flatMap((f) => f.spots.flatMap((s) => s.materials));
  const hasCostData = allMaterials.some((m) => m.cost != null && m.cost > 0);
  const materialMult = hasCostData ? w.materialMultiplier : 1.0;

  return base * rebateMult * pairMult * materialMult;
}

export function estimateSimpleJobValue(job: Job): number {
  return 5 + job.photoCount * 2 + job.issueCount * 3;
}

// ─── Revenue-based dataset valuation ─────────────────────────────────

export const DEFAULT_VALUATION: DatasetValuationConfig = {
  basePercent: 10,
};

export function calculateJobRevenueValue(job: Job, config: DatasetValuationConfig = DEFAULT_VALUATION): number {
  if (!job.rebate) return 0;
  const status = job.rebate.status;
  const amount =
    status === "paid" ? (job.rebate.paidAmount || 0) :
    status === "accepted" ? (job.rebate.approvedAmount || 0) : 0;
  return Math.round(amount * (config.basePercent / 100));
}

export function calculateTotalRevenueValue(jobs: Job[], config: DatasetValuationConfig = DEFAULT_VALUATION) {
  const rebateJobs = jobs.filter((j) => j.rebate?.status === "accepted" || j.rebate?.status === "paid");
  const totalRevenue = rebateJobs.reduce((s, j) => {
    const amt = j.rebate?.status === "paid" ? (j.rebate.paidAmount || 0) : (j.rebate?.approvedAmount || 0);
    return s + amt;
  }, 0);
  return { totalRevenue, totalValue: Math.round(totalRevenue * (config.basePercent / 100)) };
}

// ─── Firestore timestamp conversion ────────────────────────────────────

export function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === "object" && val !== null && "_seconds" in val) {
    return new Date((val as { _seconds: number })._seconds * 1000);
  }
  if (typeof val === "string") return new Date(val);
  return new Date();
}

// ─── Format helpers ────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}
