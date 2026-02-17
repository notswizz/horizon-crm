import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs, fetchForms } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase-admin";
import { estimateJobValue, DEFAULT_WEIGHTS, calculateJobRevenueValue, DEFAULT_VALUATION } from "@/lib/utils";
import { DatasetValueWeights, DatasetValuationConfig } from "@/types";
import { getAuthSession } from "@/lib/auth-helpers";

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

    // Filters (support both legacy single and new multi-select)
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
      const to = new Date(dateTo).getTime() + 86400000; // end of day
      jobs = jobs.filter((j) => new Date(j.createdAt).getTime() < to);
    }
    if (minPhotos > 0) {
      jobs = jobs.filter((j) => j.photoCount >= minPhotos);
    }
    if (minIssues > 0) {
      jobs = jobs.filter((j) => j.issueCount >= minIssues);
    }

    // Fetch forms for each job
    let jobsWithForms = await Promise.all(
      jobs.map(async (job) => {
        const forms = await fetchForms(job.id);
        return { job, forms };
      })
    );

    if (hasFormsOnly) {
      jobsWithForms = jobsWithForms.filter(({ forms }) => forms.length > 0);
    }

    if (format === "csv") {
      // Flattened CSV
      const rows: string[] = [];
      rows.push("job_id,address,contact_name,stage,rebate_status,rebate_amount,photo_count,issue_count,fix_count,created_at");
      jobsWithForms.forEach(({ job }) => {
        const address = anonymize ? "REDACTED" : job.address.replace(/,/g, ";");
        const contact = anonymize ? "REDACTED" : job.contactName.replace(/,/g, ";");
        rows.push(
          `${job.id},${address},${contact},${job.currentStage},${job.rebateStatus},${job.rebateAmount},${job.photoCount},${job.issueCount},${job.fixCount},${new Date(job.createdAt).toISOString()}`
        );
      });

      return new NextResponse(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="retrofitiq_export_${Date.now()}.csv"`,
        },
      });
    }

    // JSONL format (matches iOS export)
    const lines: string[] = [];

    // Metadata line
    lines.push(
      JSON.stringify({
        exportDate: new Date().toISOString(),
        totalJobs: jobsWithForms.length,
        totalPhotos: jobs.reduce((s, j) => s + j.photoCount, 0),
        totalIssues: jobs.reduce((s, j) => s + j.issueCount, 0),
        anonymized: anonymize,
      })
    );

    // One line per job
    jobsWithForms.forEach(({ job, forms }) => {
      const entry: Record<string, unknown> = {
        id: job.id,
        address: anonymize ? undefined : job.address,
        contactName: anonymize ? undefined : job.contactName,
        contactPhone: anonymize ? undefined : job.contactPhone,
        contactEmail: anonymize ? undefined : job.contactEmail,
        notes: job.notes,
        currentStage: job.currentStage,
        rebateAmount: job.rebateAmount,
        rebateStatus: job.rebateStatus,
        spots: job.spots,
        photoCount: job.photoCount,
        issueCount: job.issueCount,
        fixCount: job.fixCount,
        datasetValuePoints: estimateJobValue(job, forms, weights),
        datasetValueRevenue: calculateJobRevenueValue(job, valuation),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        forms: forms.map((f) => ({
          id: f.id,
          formType: f.formType,
          inspectorName: anonymize ? undefined : f.inspectorName,
          date: f.date,
          notes: f.notes,
          spots: f.spots,
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
