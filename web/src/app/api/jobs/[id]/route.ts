import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { fetchJob, fetchForms } from "@/lib/firestore-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await fetchJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const forms = await fetchForms(id);
    return NextResponse.json({ job, forms });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = ["currentStage", "rebateOutcome", "rebateAmount"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();
    await db.collection("jobs").doc(id).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Delete forms subcollection
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
