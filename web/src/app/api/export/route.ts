import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs, fetchForms } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase-admin";
import { estimateJobValue, DEFAULT_WEIGHTS, calculateJobRevenueValue, DEFAULT_VALUATION, toDate } from "@/lib/utils";
import { DatasetValueWeights, DatasetValuationConfig, TimeEntry } from "@/types";
import { getAuthSession } from "@/lib/auth-helpers";

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

    // Fetch config for dataset value calculations
    const configDoc = await db.doc("config/dropdowns").get();
    const configData = configDoc.exists ? configDoc.data() : {};
    const weights: DatasetValueWeights = configData?.datasetValueWeights || DEFAULT_WEIGHTS;
    const valuation: DatasetValuationConfig = configData?.datasetValuation || DEFAULT_VALUATION;

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
        "dataset_value_points", "dataset_value_revenue",
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
          String(estimateJobValue(job, forms, weights)),
          String(calculateJobRevenueValue(job, valuation)),
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

    // Metadata line
    lines.push(
      JSON.stringify({
        _type: "metadata",
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

    // One line per job — every field included
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

        // Dataset value scores
        datasetValuePoints: estimateJobValue(job, forms, weights),
        datasetValueRevenue: calculateJobRevenueValue(job, valuation),

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

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="retrofitiq_export_${Date.now()}.jsonl"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
