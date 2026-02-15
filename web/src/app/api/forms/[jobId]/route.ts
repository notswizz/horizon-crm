import { NextRequest, NextResponse } from "next/server";
import { fetchForms, fetchJob } from "@/lib/firestore-helpers";
import { getAuthSession } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;

    // Verify parent job ownership
    const job = await fetchJob(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!session.isAdmin && job.companyId && job.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const forms = await fetchForms(jobId);
    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
}
