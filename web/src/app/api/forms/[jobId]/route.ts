import { NextRequest, NextResponse } from "next/server";
import { fetchForms } from "@/lib/firestore-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const forms = await fetchForms(jobId);
    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
}
