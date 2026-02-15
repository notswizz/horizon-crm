import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { fetchJob, fetchForms } from "@/lib/firestore-helpers";
import { getAuthSession } from "@/lib/auth-helpers";

const STAGE_TO_IOS: Record<string, string> = {
  auditPending: "Audit Pending",
  workInProgress: "Work In Progress",
  inspectionPending: "Inspection Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const job = await fetchJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Ownership check (admin bypasses)
    if (!session.isAdmin && job.companyId && job.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const forms = await fetchForms(id);
    return NextResponse.json({ job, forms });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Ownership check
    const job = await fetchJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!session.isAdmin && job.companyId && job.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if ("currentStage" in body) {
      updates.currentStage = STAGE_TO_IOS[body.currentStage] || body.currentStage;
    }
    if ("energyAssessment" in body) updates.energyAssessment = body.energyAssessment;
    if ("projectCosts" in body) updates.projectCosts = body.projectCosts;
    if ("rebate" in body) updates.rebateData = body.rebate;
    if ("profitMargin" in body) updates.profitMargin = body.profitMargin;
    if ("netProfit" in body) updates.netProfit = body.netProfit;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updatedAt = Timestamp.now();
    await db.collection("jobs").doc(id).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Ownership check
    const job = await fetchJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!session.isAdmin && job.companyId && job.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formsSnap = await db.collection("jobs").doc(id).collection("forms").get();
    const batch = db.batch();
    formsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection("jobs").doc(id));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
