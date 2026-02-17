import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
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

    const [forms, timeSnap] = await Promise.all([
      fetchForms(id),
      db.collection("jobs").doc(id).collection("timeEntries").orderBy("clockInTime", "desc").get(),
    ]);
    const timeEntries = timeSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        clockInTime: data.clockInTime?.toDate?.()?.toISOString() ?? data.clockInTime,
        clockOutTime: data.clockOutTime?.toDate?.()?.toISOString() ?? data.clockOutTime ?? null,
      };
    });
    return NextResponse.json({ job, forms, timeEntries });
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
    const newLogEntries: Array<{ id: string; type: string; title: string; subtitle: string; date: string; icon: string; color: string }> = [];
    const nowISO = new Date().toISOString();
    const addr = job.streetAddress || "Untitled";

    if ("currentStage" in body) {
      const firestoreStage = STAGE_TO_IOS[body.currentStage] || body.currentStage;
      updates.currentStage = firestoreStage;
      updates.stageHistory = FieldValue.arrayUnion({ stage: firestoreStage, date: nowISO });
      const stageLabel = firestoreStage;
      newLogEntries.push({
        id: `stage-${body.currentStage}-${job.id}-${Date.now()}`,
        type: "stage_change",
        title: `Stage: ${stageLabel}`,
        subtitle: addr,
        date: nowISO,
        icon: "arrow-right",
        color: body.currentStage === "completed" ? "#10B981" : "#F59E0B",
      });
    }
    if ("energyAssessment" in body) updates.energyAssessment = body.energyAssessment;
    if ("projectCosts" in body) updates.projectCosts = body.projectCosts;
    if ("rebate" in body) {
      updates.rebateData = body.rebate;
      const oldStatus = job.rebate?.status;
      const newStatus = body.rebate?.status;
      if (newStatus && newStatus !== oldStatus) {
        const rebateEvents: Record<string, { type: string; title: string; icon: string; color: string }> = {
          submitted: { type: "rebate_submitted", title: "Rebate submitted", icon: "file-text", color: "#3B82F6" },
          accepted: { type: "rebate_accepted", title: "Rebate accepted", icon: "check-circle", color: "#10B981" },
          paid: { type: "rebate_paid", title: "Rebate paid", icon: "banknote", color: "#059669" },
          declined: { type: "rebate_declined", title: "Rebate declined", icon: "x-circle", color: "#EF4444" },
        };
        const evt = rebateEvents[newStatus];
        if (evt) {
          const amount = body.rebate.paidAmount || body.rebate.approvedAmount || body.rebate.claimedAmount || body.rebate.estimatedRebate || 0;
          newLogEntries.push({
            id: `${evt.type}-${job.id}-${Date.now()}`,
            type: evt.type,
            title: evt.title,
            subtitle: `${addr} — $${amount.toLocaleString()}`,
            date: nowISO,
            icon: evt.icon,
            color: evt.color,
          });
        }
      }
    }
    if ("profitMargin" in body) updates.profitMargin = body.profitMargin;
    if ("netProfit" in body) updates.netProfit = body.netProfit;

    if (Object.keys(updates).length === 0 && newLogEntries.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Append activityLog entries, capping at 50
    if (newLogEntries.length > 0) {
      const existingLog: unknown[] = job.activityLog || [];
      const merged = [...existingLog, ...newLogEntries].slice(-50);
      updates.activityLog = merged;
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
