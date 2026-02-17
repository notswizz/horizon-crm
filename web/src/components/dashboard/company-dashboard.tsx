"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Briefcase,
  AlertTriangle,
  Wrench,
  Camera,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { DashboardProps, formatTimeAgo, ActivityEvent } from "./types";
import { SharedSections } from "./shared-sections";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  briefcase: Briefcase,
  "alert-triangle": AlertTriangle,
  wrench: Wrench,
};

function getActivityIcon(iconName: string) {
  return ACTIVITY_ICONS[iconName] || Activity;
}

interface CompanyDashboardProps extends DashboardProps {
  companyName?: string;
}

export function CompanyDashboard({
  analytics,
  allJobs,
  recentJobs,
  activityEvents,
  activityFilter,
  setActivityFilter,
  photoDays,
  setPhotoDays,
  mapStageFilter,
  setMapStageFilter,
  companyName,
}: CompanyDashboardProps) {
  // Pipeline metrics
  const submittedJobs = allJobs.filter((j) => j.rebate?.status === "submitted");
  const totalPipeline = submittedJobs.reduce((sum, j) => sum + (j.rebate?.claimedAmount || j.rebate?.estimatedRebate || 0), 0);

  const acceptedJobs = allJobs.filter((j) => j.rebate?.status === "accepted");
  const approvedPending = acceptedJobs.reduce((sum, j) => sum + (j.rebate?.approvedAmount || 0), 0);

  const paidJobs = allJobs.filter((j) => j.rebate?.status === "paid");
  const totalPaid = paidJobs.reduce((sum, j) => sum + (j.rebate?.paidAmount || 0), 0);

  const jobsWithMargin = allJobs.filter((j) => j.profitMargin != null && j.profitMargin !== 0);
  const avgMargin = jobsWithMargin.length > 0
    ? Math.round(jobsWithMargin.reduce((sum, j) => sum + j.profitMargin!, 0) / jobsWithMargin.length * 10) / 10
    : 0;

  const revenueIn = totalPaid + approvedPending;
  const totalCosts = allJobs
    .filter((j) => j.rebate?.status === "paid" || j.rebate?.status === "accepted")
    .reduce((sum, j) => sum + (j.projectCosts?.total || 0), 0);
  const totalProfit = revenueIn - totalCosts;

  const hasPipelineData = totalPipeline > 0 || approvedPending > 0 || totalPaid > 0 || avgMargin > 0 || totalProfit !== 0;

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div className="grid grid-cols-12 gap-4">
        {/* Left: KPI + Pipeline */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {companyName && (
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 -mt-2">{companyName}</h1>
          )}
          {/* Metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Jobs", value: analytics.totalJobs, icon: Briefcase, color: "#FF6B35", bg: "bg-orange-50", sub: `${analytics.totalJobs > 0 ? Math.round((analytics.totalJobs - (analytics.jobsByStage?.completed || 0)) / Math.max(analytics.totalJobs, 1) * 100) : 0}% active` },
              { label: "Photos", value: analytics.totalPhotos, icon: Camera, color: "#3B82F6", bg: "bg-blue-50", sub: `${analytics.totalJobs > 0 ? Math.round(analytics.totalPhotos / analytics.totalJobs) : 0} per job` },
              { label: "Issues", value: analytics.totalIssues, icon: AlertTriangle, color: "#EF4444", bg: "bg-red-50", sub: `${analytics.totalFixes > 0 && analytics.totalIssues > 0 ? Math.round(analytics.totalFixes / analytics.totalIssues * 100) : 0}% resolved` },
              { label: "Fixes", value: analytics.totalFixes, icon: Wrench, color: "#10B981", bg: "bg-emerald-50", sub: `${Math.max(analytics.totalIssues - analytics.totalFixes, 0)} pending` },
            ].map((stat) => (
              <div key={stat.label} className="group relative overflow-hidden rounded-xl bg-white border border-gray-100 p-4 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-xl" style={{ background: stat.color }} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1 tracking-tight">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{stat.sub}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Pipeline */}
          {hasPipelineData && (
            <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-gray-50">
                <div className="h-2 w-2 rounded-full" style={{ background: "linear-gradient(135deg, #3B82F6, #F97316, #EAB308, #22C55E)" }} />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Revenue Pipeline</span>
              </div>
              {/* Progress bar */}
              <div className="flex h-1.5 mx-4 mt-2 rounded-full overflow-hidden bg-gray-100">
                {(() => {
                  const profitAbs = Math.max(totalProfit, 0);
                  const total = totalPipeline + approvedPending + totalPaid + profitAbs;
                  if (total <= 0) return null;
                  return (
                    <>
                      <div className="transition-all duration-500" style={{ width: `${(totalPipeline / total) * 100}%`, backgroundColor: "#F97316" }} />
                      <div className="transition-all duration-500" style={{ width: `${(approvedPending / total) * 100}%`, backgroundColor: "#3B82F6" }} />
                      <div className="transition-all duration-500" style={{ width: `${(totalPaid / total) * 100}%`, backgroundColor: "#22C55E" }} />
                      <div className="transition-all duration-500" style={{ width: `${(profitAbs / total) * 100}%`, backgroundColor: "#EAB308" }} />
                    </>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-gray-50 p-2">
                {[
                  { label: "Submitted", value: formatCurrency(totalPipeline), count: submittedJobs.length, color: "text-orange-600", dot: "bg-orange-500" },
                  { label: "Accepted", value: formatCurrency(approvedPending), count: acceptedJobs.length, color: "text-blue-600", dot: "bg-blue-500" },
                  { label: "Paid", value: formatCurrency(totalPaid), count: paidJobs.length, color: "text-green-600", dot: "bg-green-500" },
                  { label: "Profit", value: formatCurrency(totalProfit), count: null as number | null, color: totalProfit >= 0 ? "text-yellow-600" : "text-red-600", dot: totalProfit >= 0 ? "bg-yellow-500" : "bg-red-500", margin: avgMargin },
                ].map((stage) => (
                  <div key={stage.label} className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{stage.label}</span>
                    </div>
                    <p className={`text-xl font-extrabold tracking-tight ${stage.color}`}>{stage.value}</p>
                    {stage.count !== null ? (
                      <p className="text-[10px] text-gray-400 mt-0.5">{stage.count} job{stage.count !== 1 ? "s" : ""}</p>
                    ) : (
                      <p className={`text-[11px] font-bold mt-0.5 ${avgMargin > 20 ? "text-green-500" : avgMargin > 10 ? "text-yellow-500" : "text-red-500"}`}>
                        {avgMargin}% margin
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity Feed */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardContent className="p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-[#FF6B35]" />
                <h3 className="text-sm font-semibold">Activity Feed</h3>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {([
                  { value: "job_created", label: "Jobs", color: "#FF6B35" },
                  { value: "issue_found", label: "Issues", color: "#EF4444" },
                  { value: "fix_applied", label: "Fixes", color: "#10B981" },
                  { value: "rebate", label: "Rebates", color: "#3B82F6" },
                  { value: "stage_change", label: "Stages", color: "#F59E0B" },
                ] as const).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setActivityFilter(activityFilter === f.value ? "" : f.value)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
                    style={{
                      backgroundColor: activityFilter === f.value ? f.color : `${f.color}15`,
                      color: activityFilter === f.value ? "#fff" : f.color,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = activityFilter
                    ? activityEvents.filter((e: ActivityEvent) =>
                        activityFilter === "rebate"
                          ? e.type.startsWith("rebate_")
                          : e.type === activityFilter
                      )
                    : activityEvents;
                  return filtered.length > 0 ? (
                    filtered.map((event: ActivityEvent) => {
                      const IconComponent = getActivityIcon(event.icon);
                      const timeAgo = formatTimeAgo(new Date(event.date));
                      return (
                        <Link
                          key={event.id}
                          href={`/jobs/${event.jobId}`}
                          className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="p-1.5 rounded-md mt-0.5 flex-shrink-0" style={{ backgroundColor: `${event.color}15` }}>
                            <IconComponent size={12} className="flex-shrink-0" style={{ color: event.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 leading-tight group-hover:text-[#FF6B35] transition-colors">{event.title}</p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{event.subtitle}</p>
                          </div>
                          <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5 whitespace-nowrap">{timeAgo}</span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                      <Activity className="h-8 w-8 mb-2" />
                      <p className="text-xs">{activityFilter ? "No matching activity" : "No activity yet"}</p>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SharedSections
        analytics={analytics}
        allJobs={allJobs}
        recentJobs={recentJobs}
        activityEvents={activityEvents}
        activityFilter={activityFilter}
        setActivityFilter={setActivityFilter}
        photoDays={photoDays}
        setPhotoDays={setPhotoDays}
        mapStageFilter={mapStageFilter}
        setMapStageFilter={setMapStageFilter}
      />
    </div>
  );
}
