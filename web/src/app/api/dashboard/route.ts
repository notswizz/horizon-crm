import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { fetchAllJobs, fetchAllForms } from "@/lib/firestore-helpers";
import { estimateJobValue, DEFAULT_WEIGHTS, calculateTotalRevenueValue, DEFAULT_VALUATION, stageConfig } from "@/lib/utils";
import { AnalyticsData, JobStage, DatasetValueWeights, DatasetValuationConfig, Job } from "@/types";
import { getAuthSession } from "@/lib/auth-helpers";

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

function deriveActivityEvents(jobs: Job[], limit: number, since?: string): ActivityEvent[] {
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
  return events.slice(0, limit);
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const filterCompany = url.searchParams.get("companyId");
    const activityOnly = url.searchParams.get("activityOnly") === "true";

    const companyId = session.isAdmin ? (filterCompany || undefined) : session.companyId;

    const jobs = await fetchAllJobs(companyId);

    // Lightweight polling: just return fresh activity events
    if (activityOnly) {
      const since = url.searchParams.get("since") || undefined;
      const activityEvents = deriveActivityEvents(jobs, 30, since);
      return NextResponse.json({ activityEvents });
    }

    // Full dashboard payload
    const allFormsData = await fetchAllForms(companyId);

    // Config for value calculations
    const configCompanyId = companyId || session.companyId;
    const configDoc = await db.doc(`companies/${configCompanyId}/config/dropdowns`).get();
    const weights: DatasetValueWeights = (configDoc.exists && configDoc.data()?.datasetValueWeights) || DEFAULT_WEIGHTS;
    const valuation: DatasetValuationConfig = (configDoc.exists && configDoc.data()?.datasetValuation) || DEFAULT_VALUATION;

    // Analytics computation (same as /api/analytics)
    const jobsByStage: Record<JobStage, number> = {
      auditPending: 0, workInProgress: 0, inspectionPending: 0, completed: 0, cancelled: 0,
    };
    jobs.forEach((j) => { jobsByStage[j.currentStage]++; });

    const totalPhotos = jobs.reduce((s, j) => s + j.photoCount, 0);
    const totalIssues = jobs.reduce((s, j) => s + j.issueCount, 0);
    const totalFixes = jobs.reduce((s, j) => s + j.fixCount, 0);

    let estimatedValue = 0;
    for (const job of jobs) {
      const jobForms = allFormsData.find((f) => f.jobId === job.id)?.forms || [];
      estimatedValue += estimateJobValue(job, jobForms, weights);
    }

    const revenueResult = calculateTotalRevenueValue(jobs, valuation);

    const categoryMap: Record<string, number> = {};
    allFormsData.forEach(({ forms }) => {
      forms.forEach((f) => {
        f.spots.forEach((s) => {
          s.issuePhotos.forEach((p) => {
            categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
          });
        });
      });
    });
    const issuesByCategory = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const rebateMap: Record<string, number> = { none: 0, calculated: 0, submitted: 0, accepted: 0, declined: 0, paid: 0 };
    jobs.forEach((j) => { rebateMap[j.rebateStatus]++; });
    const rebateBreakdown = Object.entries(rebateMap).map(([outcome, count]) => ({ outcome, count }));

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateMap: Record<string, number> = {};
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      dateMap[d.toISOString().split("T")[0]] = 0;
    }
    jobs.forEach((j) => {
      const key = new Date(j.createdAt).toISOString().split("T")[0];
      if (key in dateMap) dateMap[key]++;
    });
    const jobsOverTime = Object.entries(dateMap).map(([date, count]) => ({ date, count }));

    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const photoDateMap: Record<string, number> = {};
    for (let d = new Date(ninetyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      photoDateMap[d.toISOString().split("T")[0]] = 0;
    }
    jobs.forEach((j) => {
      const key = new Date(j.createdAt).toISOString().split("T")[0];
      if (key in photoDateMap) photoDateMap[key] += j.photoCount;
    });
    const photosTrend = Object.entries(photoDateMap).map(([date, count]) => ({ date, count }));

    const inspectorMap: Record<string, number> = {};
    allFormsData.forEach(({ forms }) => {
      forms.forEach((f) => {
        if (f.inspectorName) {
          inspectorMap[f.inspectorName] = (inspectorMap[f.inspectorName] || 0) + 1;
        }
      });
    });
    const topInspectors = Object.entries(inspectorMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const matTypeMap: Record<string, number> = {};
    allFormsData.forEach(({ forms }) => {
      forms.forEach((f) => {
        f.spots.forEach((s) => {
          s.materials.forEach((m) => {
            matTypeMap[m.type] = (matTypeMap[m.type] || 0) + 1;
          });
        });
      });
    });
    const materialsByType = Object.entries(matTypeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    let totalCompanies: number | undefined;
    let totalUsers: number | undefined;
    if (session.isAdmin) {
      const [companiesSnap, usersSnap] = await Promise.all([
        db.collection("companies").count().get(),
        db.collection("users").count().get(),
      ]);
      totalCompanies = companiesSnap.data().count;
      totalUsers = usersSnap.data().count;
    }

    const analytics: AnalyticsData = {
      totalJobs: jobs.length,
      totalPhotos,
      totalIssues,
      totalFixes,
      estimatedValue,
      revenueDatasetValue: revenueResult.totalValue,
      acceptedRevenue: revenueResult.totalRevenue,
      paidRevenue: 0,
      jobsByStage,
      issuesByCategory,
      rebateBreakdown,
      jobsOverTime,
      photosTrend,
      topInspectors,
      materialsByType,
      ...(totalCompanies != null && { totalCompanies }),
      ...(totalUsers != null && { totalUsers }),
    };

    // Recent jobs (first 5) and activity
    const recentJobs = jobs.slice(0, 5);
    const activityEvents = deriveActivityEvents(jobs, 30);

    return NextResponse.json({ analytics, recentJobs, allJobs: jobs, activityEvents });
  } catch (error) {
    console.error("Error in dashboard API:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
