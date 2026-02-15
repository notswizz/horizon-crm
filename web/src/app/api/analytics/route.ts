import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { fetchAllJobs, fetchAllForms } from "@/lib/firestore-helpers";
import { estimateJobValue, DEFAULT_WEIGHTS, calculateTotalRevenueValue, DEFAULT_VALUATION } from "@/lib/utils";
import { AnalyticsData, JobStage, DatasetValueWeights, DatasetValuationConfig } from "@/types";
import { getAuthSession } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = session.isAdmin ? undefined : session.companyId;
    const jobs = await fetchAllJobs(companyId);
    const allFormsData = await fetchAllForms(companyId);

    const configDoc = await db.doc("config/dropdowns").get();
    const weights: DatasetValueWeights = (configDoc.exists && configDoc.data()?.datasetValueWeights) || DEFAULT_WEIGHTS;
    const valuation: DatasetValuationConfig = (configDoc.exists && configDoc.data()?.datasetValuation) || DEFAULT_VALUATION;

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

    const data: AnalyticsData = {
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
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error computing analytics:", error);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
