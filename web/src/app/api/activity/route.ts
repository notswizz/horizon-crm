import { NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/firestore-helpers";
import { getAuthSession } from "@/lib/auth-helpers";
import { stageConfig } from "@/lib/utils";
import { Job } from "@/types";

export interface ActivityEvent {
  id: string;
  type: "job_created" | "stage_change" | "issue_found" | "fix_applied" | "rebate_submitted" | "rebate_accepted" | "rebate_paid" | "rebate_declined" | "job_updated";
  title: string;
  subtitle: string;
  date: string;
  jobId: string;
  icon: string;
  color: string;
}

function legacyEventsForJob(job: Job): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const addr = job.streetAddress || "Untitled";

  events.push({
    id: `job-created-${job.id}`,
    type: "job_created",
    title: "New job created",
    subtitle: addr,
    date: new Date(job.createdAt).toISOString(),
    jobId: job.id,
    icon: "briefcase",
    color: "#FF6B35",
  });

  const created = new Date(job.createdAt).getTime();
  const updated = new Date(job.updatedAt).getTime();
  if (updated - created > 60000) {
    const stageLabel = stageConfig[job.currentStage]?.label || job.currentStage;
    events.push({
      id: `job-updated-${job.id}`,
      type: "stage_change",
      title: `Stage: ${stageLabel}`,
      subtitle: addr,
      date: new Date(job.updatedAt).toISOString(),
      jobId: job.id,
      icon: "arrow-right",
      color: job.currentStage === "completed" ? "#10B981" : "#F59E0B",
    });
  }

  if (job.issueCount > 0) {
    events.push({
      id: `issues-${job.id}`,
      type: "issue_found",
      title: `${job.issueCount} issue${job.issueCount !== 1 ? "s" : ""} found`,
      subtitle: addr,
      date: new Date(job.updatedAt).toISOString(),
      jobId: job.id,
      icon: "alert-triangle",
      color: "#EF4444",
    });
  }

  if (job.fixCount > 0) {
    events.push({
      id: `fixes-${job.id}`,
      type: "fix_applied",
      title: `${job.fixCount} fix${job.fixCount !== 1 ? "es" : ""} applied`,
      subtitle: addr,
      date: new Date(job.updatedAt).toISOString(),
      jobId: job.id,
      icon: "wrench",
      color: "#10B981",
    });
  }

  if (job.rebate) {
    if (job.rebate.submittedDate) {
      events.push({
        id: `rebate-submitted-${job.id}`,
        type: "rebate_submitted",
        title: "Rebate submitted",
        subtitle: `${addr} — $${(job.rebate.claimedAmount || job.rebate.estimatedRebate || 0).toLocaleString()}`,
        date: new Date(job.rebate.submittedDate).toISOString(),
        jobId: job.id,
        icon: "file-text",
        color: "#3B82F6",
      });
    }
    if (job.rebate.approvedDate) {
      events.push({
        id: `rebate-accepted-${job.id}`,
        type: "rebate_accepted",
        title: "Rebate accepted",
        subtitle: `${addr} — $${(job.rebate.approvedAmount || 0).toLocaleString()}`,
        date: new Date(job.rebate.approvedDate).toISOString(),
        jobId: job.id,
        icon: "check-circle",
        color: "#10B981",
      });
    }
    if (job.rebate.paidDate) {
      events.push({
        id: `rebate-paid-${job.id}`,
        type: "rebate_paid",
        title: "Rebate paid",
        subtitle: `${addr} — $${(job.rebate.paidAmount || 0).toLocaleString()}`,
        date: new Date(job.rebate.paidDate).toISOString(),
        jobId: job.id,
        icon: "banknote",
        color: "#059669",
      });
    }
    if (job.rebate.status === "declined" && job.rebate.declineReason) {
      events.push({
        id: `rebate-declined-${job.id}`,
        type: "rebate_declined",
        title: "Rebate declined",
        subtitle: `${addr} — ${job.rebate.declineReason}`,
        date: new Date(job.updatedAt).toISOString(),
        jobId: job.id,
        icon: "x-circle",
        color: "#EF4444",
      });
    }
  }

  return events;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const filterCompany = url.searchParams.get("companyId");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
    const since = url.searchParams.get("since");

    const companyId = session.isAdmin ? (filterCompany || undefined) : session.companyId;
    const jobs = await fetchAllJobs(companyId);

    let events: ActivityEvent[] = [];

    for (const job of jobs) {
      if (job.activityLog && job.activityLog.length > 0) {
        for (const entry of job.activityLog) {
          events.push({ ...entry, jobId: job.id } as ActivityEvent);
        }
      } else {
        events.push(...legacyEventsForJob(job));
      }
    }

    if (since) {
      const sinceTime = new Date(since).getTime();
      events = events.filter((e) => new Date(e.date).getTime() > sinceTime);
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const trimmed = events.slice(0, limit);

    return NextResponse.json({ events: trimmed });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
