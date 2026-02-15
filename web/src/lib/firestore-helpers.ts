import { db } from "./firebase-admin";
import { Job, InspectionForm, JobStage, RebateOutcome, IssueSeverity } from "@/types";
import { toDate } from "./utils";

// ─── Normalize Firestore enum values ────────────────────────────────────

const STAGE_MAP: Record<string, JobStage> = {
  auditpending: "auditPending",
  workinprogress: "workInProgress",
  inspectionpending: "inspectionPending",
  completed: "completed",
  cancelled: "cancelled",
};

function normalizeStage(raw: unknown): JobStage {
  if (typeof raw !== "string" || !raw) return "auditPending";
  return STAGE_MAP[raw.toLowerCase().replace(/[\s_-]/g, "")] || "auditPending";
}

const REBATE_MAP: Record<string, RebateOutcome> = {
  pending: "pending",
  approved: "approved",
  declined: "declined",
};

function normalizeRebate(raw: unknown): RebateOutcome {
  if (typeof raw !== "string" || !raw) return "pending";
  return REBATE_MAP[raw.toLowerCase()] || "pending";
}

const SEVERITY_MAP: Record<string, IssueSeverity> = {
  critical: "critical",
  major: "major",
  minor: "minor",
};

function normalizeSeverity(raw: unknown): IssueSeverity {
  if (typeof raw !== "string" || !raw) return "minor";
  return SEVERITY_MAP[raw.toLowerCase()] || "minor";
}

// ─── Parse Firestore documents ─────────────────────────────────────────

export function parseJob(doc: FirebaseFirestore.DocumentSnapshot): Job {
  const d = doc.data()!;
  return {
    id: d.id || doc.id,
    address: d.address || "",
    contactName: d.contactName || "",
    contactPhone: d.contactPhone || "",
    contactEmail: d.contactEmail || "",
    notes: d.notes || "",
    currentStage: normalizeStage(d.currentStage),
    rebateAmount: d.rebateAmount || 0,
    rebateOutcome: normalizeRebate(d.rebateOutcome),
    spots: d.spots || [],
    formCount: d.formCount || 0,
    photoCount: d.photoCount || 0,
    issueCount: d.issueCount || 0,
    fixCount: d.fixCount || 0,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export function parseForm(doc: FirebaseFirestore.DocumentSnapshot): InspectionForm {
  const d = doc.data()!;
  return {
    id: d.id || doc.id,
    formType: (typeof d.formType === "string" ? d.formType.toLowerCase() : "audit") as "audit" | "inspection",
    inspectorName: d.inspectorName || "",
    date: toDate(d.date),
    notes: d.notes || "",
    spots: (d.spots || []).map((s: Record<string, unknown>) => ({
      id: s.id || "",
      title: s.title || "",
      jobType: s.jobType || "",
      issuePhotos: ((s.issuePhotos as Record<string, unknown>[]) || []).map((p) => ({
        ...p,
        severity: normalizeSeverity(p.severity),
        dateTaken: toDate(p.dateTaken),
      })),
      fixPhotos: ((s.fixPhotos as Record<string, unknown>[]) || []).map((p) => ({
        ...p,
        dateTaken: toDate(p.dateTaken),
      })),
      materials: (s.materials as Record<string, unknown>[]) || [],
    })),
  };
}

// ─── Fetch helpers ─────────────────────────────────────────────────────

export async function fetchAllJobs(): Promise<Job[]> {
  const snap = await db.collection("jobs").orderBy("createdAt", "desc").get();
  return snap.docs.map(parseJob);
}

export async function fetchJob(jobId: string): Promise<Job | null> {
  const doc = await db.collection("jobs").doc(jobId).get();
  if (!doc.exists) return null;
  return parseJob(doc);
}

export async function fetchForms(jobId: string): Promise<InspectionForm[]> {
  const snap = await db.collection("jobs").doc(jobId).collection("forms").get();
  return snap.docs.map(parseForm);
}

export async function fetchAllForms(): Promise<{ jobId: string; forms: InspectionForm[] }[]> {
  const jobs = await fetchAllJobs();
  const results = await Promise.all(
    jobs.map(async (job) => {
      const forms = await fetchForms(job.id);
      return { jobId: job.id, forms };
    })
  );
  return results;
}
