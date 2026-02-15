import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs, fetchForms } from "@/lib/firestore-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      format = "jsonl",
      anonymize = false,
      rebateFilter = "all",
    } = body;

    let jobs = await fetchAllJobs();

    // Rebate filter
    if (rebateFilter !== "all") {
      jobs = jobs.filter((j) => j.rebateOutcome === rebateFilter);
    }

    // Fetch forms for each job
    const jobsWithForms = await Promise.all(
      jobs.map(async (job) => {
        const forms = await fetchForms(job.id);
        return { job, forms };
      })
    );

    if (format === "csv") {
      // Flattened CSV
      const rows: string[] = [];
      rows.push("job_id,address,contact_name,stage,rebate_outcome,rebate_amount,photo_count,issue_count,fix_count,created_at");
      jobsWithForms.forEach(({ job }) => {
        const address = anonymize ? "REDACTED" : job.address.replace(/,/g, ";");
        const contact = anonymize ? "REDACTED" : job.contactName.replace(/,/g, ";");
        rows.push(
          `${job.id},${address},${contact},${job.currentStage},${job.rebateOutcome},${job.rebateAmount},${job.photoCount},${job.issueCount},${job.fixCount},${new Date(job.createdAt).toISOString()}`
        );
      });

      return new NextResponse(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="horizon_export_${Date.now()}.csv"`,
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
        rebateOutcome: job.rebateOutcome,
        spots: job.spots,
        photoCount: job.photoCount,
        issueCount: job.issueCount,
        fixCount: job.fixCount,
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
        "Content-Disposition": `attachment; filename="horizon_training_data_${Date.now()}.jsonl"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
