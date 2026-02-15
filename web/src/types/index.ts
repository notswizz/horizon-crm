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

// ─── Rebate Types ─────────────────────────────────────────────────────

export type IncomeTier = "below_80" | "80_to_150" | "above_150";
export type RebateProgram = "HER" | "HEAR" | "both";
export type HERTier = "$2k" | "$4k" | "$10k" | "$16k";
export type RebateStatus = "not_submitted" | "submitted" | "approved" | "declined" | "paid";

export interface HEARItem {
  id: string;
  name: string;
  cost: number;
  maxRebate: number;
  rebateAmount: number;
}

export interface EnergyAssessment {
  baselineKWh: number;
  projectedKWh: number;
  savingsPercent: number;
  assessmentDate: string;
  assessor: string;
  modelingNotes?: string;
}

export interface ProjectCosts {
  materials: number;
  labor: number;
  laborHours?: number;
  laborRate?: number;
  assessmentFee: number;
  overhead: number;
  other: number;
  otherDescription?: string;
  total: number;
  billableAmount?: number; // What you charge/claim (costs + markup)
}

export interface RebateInfo {
  program: RebateProgram;
  incomeTier: IncomeTier;
  incomeVerified: boolean;
  incomeDocType?: "tax_return" | "pay_stub" | "self_cert" | "none";
  herTier?: string;
  herAmount?: number;
  hearItems?: HEARItem[];
  hearTotal?: number;
  estimatedRebate: number;
  claimedAmount?: number;
  submittedDate?: string;
  submittedTo?: "GEFA" | "Georgia Power";
  claimNumber?: string;
  status: RebateStatus;
  approvedAmount?: number;
  approvedDate?: string;
  declineReason?: string;
  paidAmount?: number;
  paidDate?: string;
  paymentMethod?: string;
  variance?: number;
}

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
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  address: string; // computed display: "street, city, state, zip"
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  currentStage: JobStage;
  rebateAmount: number;
  rebateOutcome: RebateOutcome;
  houseImageURL: string | null;
  latitude: number | null;
  longitude: number | null;
  spots: Spot[];
  formCount: number;
  photoCount: number;
  issueCount: number;
  fixCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Rebate fields
  energyAssessment?: EnergyAssessment;
  projectCosts?: ProjectCosts;
  rebate?: RebateInfo;
  profitMargin?: number;
  netProfit?: number;
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

// ─── Configurable Dropdown Options ────────────────────────────────────

export interface IssueCategoryConfig {
  name: string;
  jobTypes: string[]; // empty = applies to ALL job types
}

export interface DropdownConfig {
  jobTypes: string[];
  issueCategories: IssueCategoryConfig[];
  materialTypes: string[];
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
