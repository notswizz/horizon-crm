import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { fetchAllJobs, fetchForms } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase-admin";
import { toDate } from "@/lib/utils";
import { TimeEntry } from "@/types";
import { getAuthSession } from "@/lib/auth-helpers";

const SCHEMA_VERSION = "1.0";

async function fetchTimeEntries(jobId: string): Promise<TimeEntry[]> {
  const snap = await db.collection("jobs").doc(jobId).collection("timeEntries").orderBy("clockInTime", "desc").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      jobId: data.jobId || jobId,
      workerId: data.workerId || "",
      workerName: data.workerName || "",
      clockInTime: toDate(data.clockInTime)?.toISOString?.() || data.clockInTime || "",
      clockOutTime: data.clockOutTime ? (toDate(data.clockOutTime)?.toISOString?.() || data.clockOutTime) : undefined,
      clockInLocation: data.clockInLocation || { latitude: 0, longitude: 0 },
      clockOutLocation: data.clockOutLocation || undefined,
      totalSeconds: data.totalSeconds || undefined,
      isAutoStopped: data.isAutoStopped || false,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const body = await req.json();
    const {
      format = "jsonl",
      anonymize = false,
      rebateFilter = "all",
      rebateFilters = [],
      stageFilter = "all",
      stageFilters = [],
      companyFilters = [],
      dateFrom = "",
      dateTo = "",
      minPhotos = 0,
      minIssues = 0,
      hasFormsOnly = false,
    } = body;

    let jobs = await fetchAllJobs();

    // Filters
    if (companyFilters.length > 0) {
      jobs = jobs.filter((j) => companyFilters.includes(j.companyId || ""));
    }
    if (rebateFilters.length > 0) {
      jobs = jobs.filter((j) => rebateFilters.includes(j.rebateStatus));
    } else if (rebateFilter !== "all") {
      jobs = jobs.filter((j) => j.rebateStatus === rebateFilter);
    }
    if (stageFilters.length > 0) {
      jobs = jobs.filter((j) => stageFilters.includes(j.currentStage));
    } else if (stageFilter !== "all") {
      jobs = jobs.filter((j) => j.currentStage === stageFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      jobs = jobs.filter((j) => new Date(j.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      jobs = jobs.filter((j) => new Date(j.createdAt).getTime() < to);
    }
    if (minPhotos > 0) {
      jobs = jobs.filter((j) => j.photoCount >= minPhotos);
    }
    if (minIssues > 0) {
      jobs = jobs.filter((j) => j.issueCount >= minIssues);
    }

    // Fetch forms and time entries for each job in parallel
    const jobsWithData = await Promise.all(
      jobs.map(async (job) => {
        const [forms, timeEntries] = await Promise.all([
          fetchForms(job.id),
          fetchTimeEntries(job.id),
        ]);
        return { job, forms, timeEntries };
      })
    );

    let filtered = jobsWithData;
    if (hasFormsOnly) {
      filtered = filtered.filter(({ forms }) => forms.length > 0);
    }

    if (format === "csv") {
      const rows: string[] = [];
      rows.push([
        "job_id", "street_address", "city", "state", "zip_code", "contact_name", "contact_phone", "contact_email",
        "stage", "rebate_status", "rebate_amount",
        "latitude", "longitude", "house_image_url",
        "photo_count", "issue_count", "fix_count", "form_count",
        "rebate_program", "income_tier", "estimated_rebate", "claimed_amount", "approved_amount", "paid_amount",
        "energy_baseline_kwh", "energy_projected_kwh", "energy_savings_pct",
        "cost_materials", "cost_labor", "cost_total", "profit_margin", "net_profit",
        "time_entries", "total_labor_hours",
        "created_at", "updated_at",
      ].join(","));

      filtered.forEach(({ job, forms, timeEntries }) => {
        const esc = (v: string | undefined | null) => {
          if (!v) return "";
          const s = String(v).replace(/"/g, '""');
          return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
        };
        const r = job.rebate;
        const ea = job.energyAssessment;
        const pc = job.projectCosts;
        const totalLaborHours = timeEntries.reduce((s, e) => s + (e.totalSeconds || 0), 0) / 3600;

        rows.push([
          job.id,
          anonymize ? "REDACTED" : esc(job.streetAddress),
          anonymize ? "REDACTED" : esc(job.city),
          anonymize ? "REDACTED" : esc(job.state),
          anonymize ? "REDACTED" : esc(job.zipCode),
          anonymize ? "REDACTED" : esc(job.contactName),
          anonymize ? "REDACTED" : esc(job.contactPhone),
          anonymize ? "REDACTED" : esc(job.contactEmail),
          job.currentStage,
          job.rebateStatus,
          String(job.rebateAmount),
          job.latitude != null ? String(job.latitude) : "",
          job.longitude != null ? String(job.longitude) : "",
          job.houseImageURL || "",
          String(job.photoCount),
          String(job.issueCount),
          String(job.fixCount),
          String(forms.length),
          r?.program || "",
          r?.incomeTier || "",
          r?.estimatedRebate != null ? String(r.estimatedRebate) : "",
          r?.claimedAmount != null ? String(r.claimedAmount) : "",
          r?.approvedAmount != null ? String(r.approvedAmount) : "",
          r?.paidAmount != null ? String(r.paidAmount) : "",
          ea?.baselineKWh != null ? String(ea.baselineKWh) : "",
          ea?.projectedKWh != null ? String(ea.projectedKWh) : "",
          ea?.savingsPercent != null ? String(ea.savingsPercent) : "",
          pc?.materials != null ? String(pc.materials) : "",
          pc?.labor != null ? String(pc.labor) : "",
          pc?.total != null ? String(pc.total) : "",
          job.profitMargin != null ? String(job.profitMargin) : "",
          job.netProfit != null ? String(job.netProfit) : "",
          String(timeEntries.length),
          totalLaborHours > 0 ? totalLaborHours.toFixed(2) : "",
          new Date(job.createdAt).toISOString(),
          new Date(job.updatedAt).toISOString(),
        ].join(","));
      });

      return new NextResponse(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="retrofitiq_export_${Date.now()}.csv"`,
        },
      });
    }

    // JSONL format — full structured data for AI training
    const lines: string[] = [];

    // Totals for metadata
    const totalPhotos = filtered.reduce((s, { job }) => s + job.photoCount, 0);
    const totalIssues = filtered.reduce((s, { job }) => s + job.issueCount, 0);
    const totalFixes = filtered.reduce((s, { job }) => s + job.fixCount, 0);
    const totalForms = filtered.reduce((s, { forms }) => s + forms.length, 0);
    const totalTimeEntries = filtered.reduce((s, { timeEntries }) => s + timeEntries.length, 0);

    const exportId = randomUUID();

    // Line 1: Metadata
    lines.push(
      JSON.stringify({
        _type: "metadata",
        schemaVersion: SCHEMA_VERSION,
        exportId,
        exportDate: new Date().toISOString(),
        totalJobs: filtered.length,
        totalForms,
        totalPhotos,
        totalIssues,
        totalFixes,
        totalTimeEntries,
        anonymized: anonymize,
        filters: {
          companyFilters: companyFilters.length > 0 ? companyFilters : "all",
          stageFilters: stageFilters.length > 0 ? stageFilters : "all",
          rebateFilters: rebateFilters.length > 0 ? rebateFilters : "all",
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          minPhotos,
          minIssues,
          hasFormsOnly,
        },
      })
    );

    // Line 2: Data dictionary — describes every field so buyers never have to guess
    lines.push(
      JSON.stringify({
        _type: "schema",
        schemaVersion: SCHEMA_VERSION,
        description: "RetrofitIQ home energy retrofit inspection dataset. Each job record captures the full lifecycle: audit → work → inspection → rebate claim → payment.",
        job: {
          id: { type: "string (UUID)", description: "Unique job identifier" },
          companyId: { type: "string | null", description: "Tenant company that owns this job" },
          streetAddress: { type: "string", description: "Street address of the property", pii: true },
          city: { type: "string", description: "City name", pii: true },
          state: { type: "string", description: "US state abbreviation (e.g. GA)", pii: true },
          zipCode: { type: "string", description: "ZIP code", pii: true },
          address: { type: "string", description: "Computed display address: street, city, state, zip", pii: true },
          contactName: { type: "string", description: "Homeowner or site contact name", pii: true },
          contactPhone: { type: "string", description: "Contact phone number", pii: true },
          contactEmail: { type: "string", description: "Contact email address", pii: true },
          latitude: { type: "number | null", description: "GPS latitude of property" },
          longitude: { type: "number | null", description: "GPS longitude of property" },
          houseImageURL: { type: "string | null", description: "Firebase Storage URL of exterior house photo" },
          currentStage: { type: "enum", values: ["auditPending", "workInProgress", "inspectionPending", "completed", "cancelled"], description: "Current lifecycle stage of the job" },
          notes: { type: "string", description: "Free-text notes about the job" },
          spots: {
            type: "array",
            description: "Service areas within the property (e.g. Attic, Crawlspace)",
            items: {
              id: { type: "string (UUID)", description: "Spot identifier" },
              title: { type: "string", description: "Name of the area (e.g. 'Attic', 'Garage')" },
              jobType: { type: "enum", values: ["Insulation", "Air Sealing", "HVAC Installation", "Duct Sealing", "Weatherization", "Attic Insulation", "Crawlspace Encapsulation"], description: "Type of retrofit work for this spot" },
            },
          },
          formCount: { type: "integer", description: "Number of inspection forms submitted" },
          photoCount: { type: "integer", description: "Total photos across all forms (issues + fixes)" },
          issueCount: { type: "integer", description: "Total issue photos across all audit forms" },
          fixCount: { type: "integer", description: "Total fix photos across all inspection forms" },
          rebateAmount: { type: "number", description: "Derived rebate dollar amount (paid > approved > claimed > estimated)" },
          rebateStatus: { type: "enum", values: ["none", "calculated", "submitted", "accepted", "declined", "paid"], description: "Current status of the rebate claim" },
          rebate: {
            type: "object | null",
            description: "Full rebate pipeline data. Null if no rebate has been calculated.",
            fields: {
              program: { type: "enum", values: ["HER", "HEAR", "both"], description: "HER = Home Energy Rebate (whole-home savings), HEAR = Home Electrification and Appliance Rebate (per-item)" },
              incomeTier: { type: "enum", values: ["below_80", "80_to_150", "above_150"], description: "Household income as % of area median income (AMI). Determines rebate caps." },
              incomeVerified: { type: "boolean", description: "Whether income tier has been verified with documentation" },
              incomeDocType: { type: "enum | null", values: ["tax_return", "pay_stub", "self_cert", "none"], description: "Type of income documentation provided" },
              herTier: { type: "string | null", description: "HER rebate tier bracket (e.g. '$2k', '$4k', '$10k', '$16k')" },
              herAmount: { type: "number | null", description: "Dollar amount from HER program" },
              hearItems: {
                type: "array",
                description: "Individual HEAR line items (appliances/equipment)",
                items: {
                  id: { type: "string (UUID)", description: "Item identifier" },
                  name: { type: "string", description: "Appliance or equipment name" },
                  cost: { type: "number", description: "Installed cost" },
                  maxRebate: { type: "number", description: "Maximum rebate allowed for this item" },
                  rebateAmount: { type: "number", description: "Actual rebate amount for this item" },
                },
              },
              hearTotal: { type: "number | null", description: "Sum of all HEAR item rebates" },
              estimatedRebate: { type: "number", description: "Initial estimated rebate before submission" },
              claimedAmount: { type: "number | null", description: "Amount claimed on the rebate application" },
              submittedDate: { type: "ISO date string | null", description: "Date rebate was submitted to the program" },
              submittedTo: { type: "enum | null", values: ["GEFA", "Georgia Power"], description: "Entity the rebate was submitted to" },
              claimNumber: { type: "string | null", description: "External claim/reference number from the program" },
              status: { type: "enum", values: ["none", "calculated", "submitted", "accepted", "declined", "paid"], description: "Rebate pipeline status" },
              approvedAmount: { type: "number | null", description: "Amount approved by the program" },
              approvedDate: { type: "ISO date string | null", description: "Date of approval" },
              declineReason: { type: "string | null", description: "Reason given if rebate was declined" },
              paidAmount: { type: "number | null", description: "Actual amount paid out" },
              paidDate: { type: "ISO date string | null", description: "Date payment was received" },
              paymentMethod: { type: "string | null", description: "Payment method (e.g. ACH, check)" },
              variance: { type: "number | null", description: "Difference between claimed and approved/paid amounts" },
            },
          },
          energyAssessment: {
            type: "object | null",
            description: "Pre-retrofit energy modeling data. Null if no assessment performed.",
            fields: {
              baselineKWh: { type: "number", description: "Annual energy consumption before retrofit (kWh)" },
              projectedKWh: { type: "number", description: "Projected annual consumption after retrofit (kWh)" },
              savingsPercent: { type: "number", description: "Projected energy savings as percentage" },
              assessmentDate: { type: "ISO date string", description: "Date the assessment was performed" },
              assessor: { type: "string", description: "Name of the energy assessor", pii: true },
              modelingNotes: { type: "string | null", description: "Notes on methodology (e.g. blower door test results)" },
            },
          },
          projectCosts: {
            type: "object | null",
            description: "Itemized project cost breakdown. Null if costs not entered.",
            fields: {
              materials: { type: "number", description: "Total material costs ($)" },
              labor: { type: "number", description: "Total labor costs ($)" },
              laborHours: { type: "number | null", description: "Total labor hours" },
              laborRate: { type: "number | null", description: "Hourly labor rate ($)" },
              assessmentFee: { type: "number", description: "Energy assessment fee ($)" },
              overhead: { type: "number", description: "Overhead costs ($)" },
              other: { type: "number", description: "Other miscellaneous costs ($)" },
              otherDescription: { type: "string | null", description: "Description of other costs" },
              total: { type: "number", description: "Sum of all cost categories ($)" },
              billableAmount: { type: "number | null", description: "Amount billed to customer (costs + margin)" },
            },
          },
          profitMargin: { type: "number | null", description: "Profit margin percentage" },
          netProfit: { type: "number | null", description: "Net profit in dollars" },
          stageHistory: {
            type: "array",
            description: "Ordered log of stage transitions",
            items: {
              stage: { type: "enum", description: "Stage transitioned to" },
              date: { type: "ISO date string", description: "When the transition occurred" },
              changedBy: { type: "string | null", description: "What triggered the change (e.g. 'web', 'ios')" },
            },
          },
          activityLog: {
            type: "array",
            description: "Recent activity events on the job (capped at 50)",
            items: {
              id: { type: "string", description: "Event identifier" },
              type: { type: "string", description: "Event type (e.g. 'form', 'stage', 'rebate')" },
              title: { type: "string", description: "Short event title" },
              subtitle: { type: "string", description: "Event details" },
              date: { type: "ISO date string", description: "When the event occurred" },
            },
          },
          createdAt: { type: "ISO date string", description: "When the job was created" },
          updatedAt: { type: "ISO date string", description: "When the job was last modified" },
          forms: {
            type: "array",
            description: "Inspection forms — audits document issues, inspections document fixes",
            items: {
              id: { type: "string (UUID)", description: "Form identifier" },
              formType: { type: "enum", values: ["audit", "inspection"], description: "Audit = pre-work issue documentation, Inspection = post-work fix verification" },
              inspectorName: { type: "string", description: "Name of the inspector who submitted the form", pii: true },
              date: { type: "ISO date string", description: "Date the form was submitted" },
              notes: { type: "string", description: "General form notes" },
              spots: {
                type: "array",
                description: "Service areas documented in this form",
                items: {
                  id: { type: "string", description: "Spot identifier (matches job.spots[].id)" },
                  title: { type: "string", description: "Spot name" },
                  jobType: { type: "string", description: "Type of work at this spot" },
                  issuePhotos: {
                    type: "array",
                    description: "Photos documenting problems found during audit",
                    items: {
                      id: { type: "string (UUID)", description: "Photo identifier" },
                      photoURL: { type: "string | null", description: "Firebase Storage download URL" },
                      category: { type: "string", description: "Issue category (e.g. 'Gaps in Insulation', 'Missing Caulk/Sealant', 'Code Violation')" },
                      severity: { type: "enum", values: ["critical", "major", "minor"], description: "Issue severity level" },
                      notes: { type: "string", description: "Inspector notes describing the issue" },
                      dateTaken: { type: "ISO date string", description: "When the photo was captured" },
                    },
                  },
                  fixPhotos: {
                    type: "array",
                    description: "Photos documenting completed repairs during inspection",
                    items: {
                      id: { type: "string (UUID)", description: "Photo identifier" },
                      linkedAuditIssueId: { type: "string | null", description: "ID of the audit issuePhoto this fix resolves. Enables issue→fix pairing." },
                      photoURL: { type: "string | null", description: "Firebase Storage download URL" },
                      resolutionNotes: { type: "string", description: "Description of how the issue was fixed" },
                      dateTaken: { type: "ISO date string", description: "When the photo was captured" },
                    },
                  },
                  materials: {
                    type: "array",
                    description: "Materials used at this spot",
                    items: {
                      id: { type: "string (UUID)", description: "Material identifier" },
                      name: { type: "string", description: "Material product name" },
                      type: { type: "enum", values: ["insulation", "sealant", "hvacUnit", "ductwork", "other"], description: "Material category" },
                      quantity: { type: "string", description: "Amount used (e.g. '1200 sqft', '6 cans')" },
                      cost: { type: "number | null", description: "Material cost in dollars" },
                    },
                  },
                },
              },
            },
          },
          timeEntries: {
            type: "array",
            description: "GPS-verified labor time tracking entries from field workers",
            items: {
              id: { type: "string (UUID)", description: "Time entry identifier" },
              workerId: { type: "string", description: "Worker's user ID" },
              workerName: { type: "string", description: "Worker's display name", pii: true },
              clockInTime: { type: "ISO date string", description: "When the worker clocked in" },
              clockOutTime: { type: "ISO date string | null", description: "When the worker clocked out (null if still active)" },
              clockInLocation: { type: "{ latitude, longitude }", description: "GPS coordinates at clock-in" },
              clockOutLocation: { type: "{ latitude, longitude } | null", description: "GPS coordinates at clock-out" },
              totalSeconds: { type: "integer | null", description: "Total duration in seconds" },
              isAutoStopped: { type: "boolean", description: "Whether the entry was auto-stopped by the system (e.g. worker forgot to clock out)" },
            },
          },
        },
      })
    );

    // Lines 3+: One per job — every field included
    filtered.forEach(({ job, forms, timeEntries }) => {
      const entry: Record<string, unknown> = {
        _type: "job",
        id: job.id,
        companyId: job.companyId || null,

        // Address — structured + display
        streetAddress: anonymize ? undefined : job.streetAddress,
        city: anonymize ? undefined : job.city,
        state: anonymize ? undefined : job.state,
        zipCode: anonymize ? undefined : job.zipCode,
        address: anonymize ? undefined : job.address,

        // Contact
        contactName: anonymize ? undefined : job.contactName,
        contactPhone: anonymize ? undefined : job.contactPhone,
        contactEmail: anonymize ? undefined : job.contactEmail,

        // Location
        latitude: job.latitude,
        longitude: job.longitude,
        houseImageURL: job.houseImageURL,

        // Status
        currentStage: job.currentStage,
        notes: job.notes,

        // Spots (service areas)
        spots: job.spots,

        // Counts
        formCount: forms.length,
        photoCount: job.photoCount,
        issueCount: job.issueCount,
        fixCount: job.fixCount,

        // Rebate summary
        rebateAmount: job.rebateAmount,
        rebateStatus: job.rebateStatus,

        // Full rebate pipeline
        rebate: job.rebate ? {
          program: job.rebate.program,
          incomeTier: job.rebate.incomeTier,
          incomeVerified: job.rebate.incomeVerified,
          incomeDocType: job.rebate.incomeDocType || null,
          herTier: job.rebate.herTier || null,
          herAmount: job.rebate.herAmount || null,
          hearItems: job.rebate.hearItems || [],
          hearTotal: job.rebate.hearTotal || null,
          estimatedRebate: job.rebate.estimatedRebate,
          claimedAmount: job.rebate.claimedAmount || null,
          submittedDate: job.rebate.submittedDate || null,
          submittedTo: job.rebate.submittedTo || null,
          claimNumber: job.rebate.claimNumber || null,
          status: job.rebate.status,
          approvedAmount: job.rebate.approvedAmount || null,
          approvedDate: job.rebate.approvedDate || null,
          declineReason: job.rebate.declineReason || null,
          paidAmount: job.rebate.paidAmount || null,
          paidDate: job.rebate.paidDate || null,
          paymentMethod: job.rebate.paymentMethod || null,
          variance: job.rebate.variance || null,
        } : null,

        // Energy assessment
        energyAssessment: job.energyAssessment ? {
          baselineKWh: job.energyAssessment.baselineKWh,
          projectedKWh: job.energyAssessment.projectedKWh,
          savingsPercent: job.energyAssessment.savingsPercent,
          assessmentDate: job.energyAssessment.assessmentDate,
          assessor: anonymize ? undefined : job.energyAssessment.assessor,
          modelingNotes: job.energyAssessment.modelingNotes || null,
        } : null,

        // Project costs
        projectCosts: job.projectCosts ? {
          materials: job.projectCosts.materials,
          labor: job.projectCosts.labor,
          laborHours: job.projectCosts.laborHours || null,
          laborRate: job.projectCosts.laborRate || null,
          assessmentFee: job.projectCosts.assessmentFee,
          overhead: job.projectCosts.overhead,
          other: job.projectCosts.other,
          otherDescription: job.projectCosts.otherDescription || null,
          total: job.projectCosts.total,
          billableAmount: job.projectCosts.billableAmount || null,
        } : null,

        // Financials
        profitMargin: job.profitMargin ?? null,
        netProfit: job.netProfit ?? null,

        // History & activity
        stageHistory: job.stageHistory || [],
        activityLog: job.activityLog || [],

        // Timestamps
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,

        // Forms — full nested structure
        forms: forms.map((f) => ({
          id: f.id,
          formType: f.formType,
          inspectorName: anonymize ? undefined : f.inspectorName,
          date: f.date,
          notes: f.notes,
          spots: f.spots.map((s) => ({
            id: s.id,
            title: s.title,
            jobType: s.jobType,
            issuePhotos: s.issuePhotos.map((p) => ({
              id: p.id,
              photoURL: p.photoURL,
              category: p.category,
              severity: p.severity,
              notes: p.notes,
              dateTaken: p.dateTaken,
            })),
            fixPhotos: s.fixPhotos.map((p) => ({
              id: p.id,
              linkedAuditIssueId: p.linkedAuditIssueId,
              photoURL: p.photoURL,
              resolutionNotes: p.resolutionNotes,
              dateTaken: p.dateTaken,
            })),
            materials: s.materials.map((m) => ({
              id: m.id,
              name: m.name,
              type: m.type,
              quantity: m.quantity,
              cost: m.cost,
            })),
          })),
        })),

        // Time entries — labor tracking
        timeEntries: timeEntries.map((t) => ({
          id: t.id,
          workerId: t.workerId,
          workerName: anonymize ? undefined : t.workerName,
          clockInTime: t.clockInTime,
          clockOutTime: t.clockOutTime || null,
          clockInLocation: t.clockInLocation,
          clockOutLocation: t.clockOutLocation || null,
          totalSeconds: t.totalSeconds || null,
          isAutoStopped: t.isAutoStopped,
        })),
      };
      lines.push(JSON.stringify(entry));
    });

    // Final line: content hash for licensing/provenance
    const dataLines = lines.join("\n");
    const contentHash = createHash("sha256").update(dataLines).digest("hex");
    lines.push(
      JSON.stringify({
        _type: "fingerprint",
        exportId,
        schemaVersion: SCHEMA_VERSION,
        sha256: contentHash,
        jobIds: filtered.map(({ job }) => job.id),
        recordCount: filtered.length,
      })
    );

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="retrofitiq_export_${exportId}.jsonl"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
