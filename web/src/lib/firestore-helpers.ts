import { db } from "./firebase-admin";
import { Job, InspectionForm, JobStage, RebateStatus, IssueSeverity } from "@/types";
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

const REBATE_STATUS_MAP: Record<string, RebateStatus> = {
  none: "none",
  pending: "none",
  not_submitted: "none",
  calculated: "calculated",
  submitted: "submitted",
  accepted: "accepted",
  approved: "accepted",
  declined: "declined",
  paid: "paid",
};

function normalizeRebateStatus(raw: unknown): RebateStatus {
  if (typeof raw !== "string" || !raw) return "none";
  return REBATE_STATUS_MAP[raw.toLowerCase()] || "none";
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
  const rebateData = d.rebateData || undefined;

  // Derive rebateAmount from pipeline: paid > approved > claimed > estimated > legacy
  let rebateAmount = d.rebateAmount || 0;
  let rebateStatus: RebateStatus = normalizeRebateStatus(d.rebateOutcome);
  if (rebateData) {
    rebateStatus = normalizeRebateStatus(rebateData.status);
    rebateAmount =
      rebateData.paidAmount || rebateData.approvedAmount ||
      rebateData.claimedAmount || rebateData.estimatedRebate || 0;
  }

  return {
    id: d.id || doc.id,
    streetAddress: d.streetAddress || d.address || "",
    city: d.city || "",
    state: d.state || "",
    zipCode: d.zipCode || "",
    address: [d.streetAddress || d.address || "", d.city || "", d.state || "", d.zipCode || ""]
      .filter((s: string) => s.length > 0)
      .join(", "),
    contactName: d.contactName || "",
    contactPhone: d.contactPhone || "",
    contactEmail: d.contactEmail || "",
    notes: d.notes || "",
    currentStage: normalizeStage(d.currentStage),
    rebateAmount,
    rebateStatus,
    houseImageURL: d.houseImageURL || null,
    latitude: typeof d.latitude === "number" ? d.latitude : null,
    longitude: typeof d.longitude === "number" ? d.longitude : null,
    spots: d.spots || [],
    formCount: d.formCount || 0,
    photoCount: d.photoCount || 0,
    issueCount: d.issueCount || 0,
    fixCount: d.fixCount || 0,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    // Rebate calculator fields
    energyAssessment: d.energyAssessment || undefined,
    projectCosts: d.projectCosts || undefined,
    rebate: rebateData,
    profitMargin: typeof d.profitMargin === "number" ? d.profitMargin : undefined,
    netProfit: typeof d.netProfit === "number" ? d.netProfit : undefined,
    companyId: d.companyId || undefined,
    stageHistory: d.stageHistory || undefined,
    activityLog: d.activityLog || undefined,
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

// ─── Reverse stage map (camelCase → iOS Firestore string) ───────────────

const STAGE_TO_FIRESTORE: Record<JobStage, string> = {
  auditPending: "Audit Pending",
  workInProgress: "Work In Progress",
  inspectionPending: "Inspection Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Firestore sort field map ───────────────────────────────────────────

const SORT_FIELD: Record<string, string> = {
  newest: "createdAt",
  oldest: "createdAt",
  address: "streetAddress",
};
const SORT_DIR: Record<string, FirebaseFirestore.OrderByDirection> = {
  newest: "desc",
  oldest: "asc",
  address: "asc",
};

// ─── Fetch helpers ─────────────────────────────────────────────────────

export async function fetchAllJobs(companyId?: string): Promise<Job[]> {
  let query: FirebaseFirestore.Query = db.collection("jobs");
  if (companyId) {
    query = query.where("companyId", "==", companyId);
  }
  const snap = await query.orderBy("createdAt", "desc").get();
  return snap.docs.map(parseJob);
}

export interface FilteredJobsParams {
  search?: string;
  stage?: string;
  rebate?: string;
  sort?: string;
  page?: number;
  limit?: number;
  companyId?: string;
}

export interface FilteredJobsResult {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchFilteredJobs(params: FilteredJobsParams): Promise<FilteredJobsResult> {
  const { search, stage, rebate, sort = "newest", page = 1, limit = 50, companyId } = params;

  // Stage + companyId requires a composite index; fall back to memory filter
  const needsMemoryFilter = !!search || !!rebate || sort === "issues" || (!!stage && !!companyId);

  // --- Build base query ---
  let baseQuery: FirebaseFirestore.Query = db.collection("jobs");

  if (companyId) {
    baseQuery = baseQuery.where("companyId", "==", companyId);
  }

  // Only push stage filter to Firestore when no companyId (avoids composite index requirement)
  if (stage && STAGE_TO_FIRESTORE[stage as JobStage] && !companyId) {
    baseQuery = baseQuery.where("currentStage", "==", STAGE_TO_FIRESTORE[stage as JobStage]);
  }

  if (!needsMemoryFilter) {
    // ── Optimized path: sort + paginate at Firestore level ──
    const field = SORT_FIELD[sort] || "createdAt";
    const dir = SORT_DIR[sort] || "desc";

    const countSnap = await baseQuery.count().get();
    const total = countSnap.data().count;

    const offset = (page - 1) * limit;
    const snap = await baseQuery.orderBy(field, dir).offset(offset).limit(limit).get();
    const jobs = snap.docs.map(parseJob);

    return { jobs, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Fallback path: fetch matching docs, filter/sort/paginate in memory ──
  const snap = await baseQuery.orderBy("createdAt", "desc").get();
  let filtered = snap.docs.map(parseJob);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.address.toLowerCase().includes(q) ||
        j.contactName.toLowerCase().includes(q) ||
        j.contactEmail.toLowerCase().includes(q)
    );
  }

  if (stage) {
    filtered = filtered.filter((j) => j.currentStage === stage);
  }

  if (rebate) {
    filtered = filtered.filter((j) => j.rebateStatus === rebate);
  }

  switch (sort) {
    case "oldest":
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case "address":
      filtered.sort((a, b) => a.address.localeCompare(b.address));
      break;
    case "issues":
      filtered.sort((a, b) => b.issueCount - a.issueCount);
      break;
    default:
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return { jobs: paginated, total, page, totalPages: Math.ceil(total / limit) };
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

export async function fetchAllForms(companyId?: string): Promise<{ jobId: string; forms: InspectionForm[] }[]> {
  const jobs = await fetchAllJobs(companyId);
  const results = await Promise.all(
    jobs.map(async (job) => {
      const forms = await fetchForms(job.id);
      return { jobId: job.id, forms };
    })
  );
  return results;
}
