// ─── Firestore Data Types (matches iOS app) ────────────────────────────

export type JobStage =
  | "auditPending"
  | "workInProgress"
  | "inspectionPending"
  | "completed"
  | "cancelled";

export type RebateOutcome = "pending" | "approved" | "declined";

export type JobType =
  | "Insulation"
  | "Air Sealing"
  | "HVAC Installation"
  | "Duct Sealing"
  | "Weatherization"
  | "Attic Insulation"
  | "Crawlspace Encapsulation";

export type IssueSeverity = "critical" | "major" | "minor";

export type MaterialType =
  | "insulation"
  | "sealant"
  | "hvacUnit"
  | "ductwork"
  | "other";

export interface Spot {
  id: string;
  title: string;
  jobType: JobType;
}

export interface Job {
  id: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  currentStage: JobStage;
  rebateAmount: number;
  rebateOutcome: RebateOutcome;
  spots: Spot[];
  formCount: number;
  photoCount: number;
  issueCount: number;
  fixCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssuePhoto {
  id: string;
  photoURL: string | null;
  category: string;
  severity: IssueSeverity;
  notes: string;
  dateTaken: Date;
}

export interface FixPhoto {
  id: string;
  linkedAuditIssueId: string | null;
  photoURL: string | null;
  resolutionNotes: string;
  dateTaken: Date;
}

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  quantity: string;
  cost: number | null;
}

export interface FormSpot {
  id: string;
  title: string;
  jobType: string;
  issuePhotos: IssuePhoto[];
  fixPhotos: FixPhoto[];
  materials: Material[];
}

export interface InspectionForm {
  id: string;
  formType: "audit" | "inspection";
  inspectorName: string;
  date: Date;
  notes: string;
  spots: FormSpot[];
}

// ─── Derived / UI Types ────────────────────────────────────────────────

export interface JobWithForms extends Job {
  forms: InspectionForm[];
}

export interface PhotoWithContext {
  photo: IssuePhoto | FixPhoto;
  type: "issue" | "fix";
  jobId: string;
  jobAddress: string;
  spotTitle: string;
  formId: string;
  formType: "audit" | "inspection";
  inspectorName: string;
}

export interface AnalyticsData {
  totalJobs: number;
  totalPhotos: number;
  totalIssues: number;
  totalFixes: number;
  estimatedValue: number;
  jobsByStage: Record<JobStage, number>;
  issuesByCategory: { category: string; count: number }[];
  rebateBreakdown: { outcome: string; count: number }[];
  jobsOverTime: { date: string; count: number }[];
  photosTrend: { date: string; count: number }[];
  topInspectors: { name: string; count: number }[];
  materialsByType: { type: string; count: number }[];
}
