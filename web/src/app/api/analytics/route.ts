import { NextResponse } from "next/server";
import { fetchAllJobs, fetchAllForms } from "@/lib/firestore-helpers";
import { estimateJobValue } from "@/lib/utils";
import { AnalyticsData, JobStage } from "@/types";

export async function GET() {
  try {
    const jobs = await fetchAllJobs();
    const allFormsData = await fetchAllForms();

    // Jobs by stage
    const jobsByStage: Record<JobStage, number> = {
      auditPending: 0, workInProgress: 0, inspectionPending: 0, completed: 0, cancelled: 0,
    };
    jobs.forEach((j) => { jobsByStage[j.currentStage]++; });

    // Totals
    const totalPhotos = jobs.reduce((s, j) => s + j.photoCount, 0);
    const totalIssues = jobs.reduce((s, j) => s + j.issueCount, 0);
    const totalFixes = jobs.reduce((s, j) => s + j.fixCount, 0);

    // Estimated value with full multipliers
    let estimatedValue = 0;
    for (const job of jobs) {
      const jobForms = allFormsData.find((f) => f.jobId === job.id)?.forms || [];
      estimatedValue += estimateJobValue(job, jobForms);
    }

    // Issues by category
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

    // Rebate breakdown
    const rebateMap: Record<string, number> = { pending: 0, approved: 0, declined: 0 };
    jobs.forEach((j) => { rebateMap[j.rebateOutcome]++; });
    const rebateBreakdown = Object.entries(rebateMap).map(([outcome, count]) => ({ outcome, count }));

    // Jobs over time (last 30 days)
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

    // Photos trend
    const photoDateMap: Record<string, number> = { ...dateMap };
    Object.keys(photoDateMap).forEach((k) => (photoDateMap[k] = 0));
    jobs.forEach((j) => {
      const key = new Date(j.createdAt).toISOString().split("T")[0];
      if (key in photoDateMap) photoDateMap[key] += j.photoCount;
    });
    const photosTrend = Object.entries(photoDateMap).map(([date, count]) => ({ date, count }));

    // Top inspectors
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

    // Materials by type
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

    const data: AnalyticsData = {
      totalJobs: jobs.length,
      totalPhotos,
      totalIssues,
      totalFixes,
      estimatedValue,
      jobsByStage,
      issuesByCategory,
      rebateBreakdown,
      jobsOverTime,
      photosTrend,
      topInspectors,
      materialsByType,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error computing analytics:", error);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
