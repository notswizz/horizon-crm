"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/stage-badge";
import { formatCurrency, formatDate, stageConfig } from "@/lib/utils";
import { AnalyticsData, Job, JobStage } from "@/types";
import dynamic from "next/dynamic";
import {
  Briefcase,
  AlertTriangle,
  Wrench,
  DollarSign,
  Loader2,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Users,
  Package,
  TrendingUp,
  FileText,
  CheckCircle,
  Banknote,
  Building2,
  ChevronDown,
  MapPin,
  Clipboard,
  Search,
  XCircle,
  Activity,
} from "lucide-react";
import { type ActivityEvent } from "@/app/api/activity/route";

const JobMap = dynamic(() => import("@/components/shared/job-map"), { ssr: false });
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Label,
} from "recharts";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

// Semantic stage colors
const STAGE_COLORS: Record<string, string> = {
  "Audit Pending": "#9CA3AF",
  "Work In Progress": "#F59E0B",
  "Inspection Pending": "#FF6B35",
  Completed: "#10B981",
  Cancelled: "#EF4444",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  briefcase: Briefcase,
  "arrow-right": ArrowRight,
  "file-text": FileText,
  "check-circle": CheckCircle,
  banknote: Banknote,
  "x-circle": XCircle,
  clipboard: Clipboard,
  search: Search,
  "alert-triangle": AlertTriangle,
  wrench: Wrench,
};

interface CompanyOption {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === "admin";
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoDays, setPhotoDays] = useState<7 | 30 | 90>(30);
  const [mapStageFilter, setMapStageFilter] = useState<JobStage | "">("");
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("");

  // Admin company filter
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>(""); // "" = all

  function fetchDashboard(companyId?: string) {
    setLoading(true);
    const qs = companyId ? `?companyId=${companyId}` : "";
    Promise.all([
      fetch(`/api/analytics${qs}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/jobs?limit=5&sort=newest${companyId ? `&companyId=${companyId}` : ""}`).then((r) => r.ok ? r.json() : { jobs: [] }),
      fetch(`/api/jobs?limit=500${companyId ? `&companyId=${companyId}` : ""}`).then((r) => r.ok ? r.json() : { jobs: [] }),
      fetch(`/api/activity?limit=30${companyId ? `&companyId=${companyId}` : ""}`).then((r) => r.ok ? r.json() : { events: [] }),
    ]).then(([a, j, all, act]) => {
      setAnalytics(a);
      setRecentJobs(j.jobs || []);
      setAllJobs(all.jobs || []);
      setActivityEvents(act.events || []);
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchDashboard();
    if (isAdmin) {
      fetch("/api/admin/companies").then((r) => r.json()).then((data) => {
        setCompanies((data.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      });
    }
    // Poll activity feed every 15s
    const interval = setInterval(() => {
      const qs = selectedCompany ? `&companyId=${selectedCompany}` : "";
      fetch(`/api/activity?limit=30${qs}`).then((r) => r.ok ? r.json() : null).then((data) => {
        if (data?.events) setActivityEvents(data.events);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  function handleCompanyChange(companyId: string) {
    setSelectedCompany(companyId);
    fetchDashboard(companyId || undefined);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  if (!analytics) return null;

  const stageData = Object.entries(analytics.jobsByStage || {})
    .filter(([key]) => key in stageConfig)
    .map(([key, value]) => ({
      name: stageConfig[key as keyof typeof stageConfig].label,
      value,
    }));

  // Pipeline metrics from rebate data
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

  // Profit: (paid + accepted revenue) - project costs
  const revenueIn = totalPaid + approvedPending;
  const totalCosts = allJobs
    .filter((j) => j.rebate?.status === "paid" || j.rebate?.status === "accepted")
    .reduce((sum, j) => sum + (j.projectCosts?.total || 0), 0);
  const totalProfit = revenueIn - totalCosts;

  const hasPipelineData = totalPipeline > 0 || approvedPending > 0 || totalPaid > 0 || avgMargin > 0 || totalProfit !== 0;

  // Weekly aggregation for jobs over time
  const weeklyJobs = (analytics.jobsOverTime || []).reduce<{ date: string; count: number }[]>((acc, item) => {
    const d = new Date(item.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    const existing = acc.find((a) => a.date === key);
    if (existing) existing.count += item.count;
    else acc.push({ date: key, count: item.count });
    return acc;
  }, []);

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Admin: Company Filter */}
      {isAdmin && companies.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 size={15} />
            <span className="font-medium">Viewing:</span>
          </div>
          <div className="relative">
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] cursor-pointer"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Row 1: KPI Cards + Pipeline + Activity Feed */}
      {isAdmin ? (
        <>
          {/* Admin layout: full-width rows */}
          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-12 lg:col-span-4 overflow-hidden border-0 shadow-lg">
              <div className="grid grid-cols-2 h-full">
                <div className="p-5 bg-gradient-to-br from-[#FF6B35] via-[#FF8C61] to-[#E5532D] text-white">
                  <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Point-Based</span>
                  <p className="text-3xl font-extrabold leading-none tracking-tight mt-1">{formatCurrency(analytics.estimatedValue)}</p>
                  <p className="text-[11px] text-white/50 mt-2">
                    {formatCurrency(analytics.totalJobs > 0 ? analytics.estimatedValue / analytics.totalJobs : 0)}/avg
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#6D28D9] text-white">
                  <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Rebate-Based</span>
                  <p className="text-3xl font-extrabold leading-none tracking-tight mt-1">{formatCurrency(analytics.revenueDatasetValue)}</p>
                  <p className="text-[11px] text-white/50 mt-2">
                    {formatCurrency(analytics.totalJobs > 0 ? analytics.revenueDatasetValue / analytics.totalJobs : 0)}/avg
                  </p>
                </div>
              </div>
            </Card>
            <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Jobs</span>
                  <div className="p-2 rounded-lg bg-orange-50"><Briefcase className="h-4 w-4 text-[#FF6B35]" /></div>
                </div>
                <p className="text-3xl font-bold">{analytics.totalJobs}</p>
              </CardContent>
            </Card>
            <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Photos</span>
                  <div className="p-2 rounded-lg bg-blue-50"><Camera className="h-4 w-4 text-blue-500" /></div>
                </div>
                <p className="text-3xl font-bold">{analytics.totalPhotos.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Companies</span>
                  <div className="p-2 rounded-lg bg-violet-50"><Building2 className="h-4 w-4 text-violet-500" /></div>
                </div>
                <p className="text-3xl font-bold">{analytics.totalCompanies ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Users</span>
                  <div className="p-2 rounded-lg bg-indigo-50"><Users className="h-4 w-4 text-indigo-500" /></div>
                </div>
                <p className="text-3xl font-bold">{analytics.totalUsers ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin: Rebate Pipeline Row */}
          {hasPipelineData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md hover:scale-[1.02] transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pipeline</span>
                    <div className="p-1.5 rounded-lg bg-blue-50"><FileText className="h-3.5 w-3.5 text-blue-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPipeline)}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-gray-400">Submitted claims</p>
                    <p className="text-[10px] font-semibold text-gray-400">{submittedJobs.length} job{submittedJobs.length !== 1 ? "s" : ""}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md hover:scale-[1.02] transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Accepted</span>
                    <div className="p-1.5 rounded-lg bg-green-50"><CheckCircle className="h-3.5 w-3.5 text-green-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(approvedPending)}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-gray-400">Pending payment</p>
                    <p className="text-[10px] font-semibold text-gray-400">{acceptedJobs.length} job{acceptedJobs.length !== 1 ? "s" : ""}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md hover:scale-[1.02] transition-all border-2 border-yellow-400">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Paid</span>
                    <div className="p-1.5 rounded-lg bg-emerald-50"><Banknote className="h-3.5 w-3.5 text-emerald-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-gray-400">Total collected</p>
                    <p className="text-[10px] font-semibold text-gray-400">{paidJobs.length} job{paidJobs.length !== 1 ? "s" : ""}</p>
                  </div>
                </CardContent>
              </Card>
              <div className="relative rounded-xl p-[2px] bg-[length:300%_300%] hover:scale-[1.02] transition-all" style={{ background: "linear-gradient(135deg, #FF6B35, #F59E0B, #10B981, #3B82F6, #8B5CF6, #FF6B35)", backgroundSize: "300% 300%", animation: "gradient-spin 3s linear infinite" }}>
                <style>{`@keyframes gradient-spin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
                <div className="rounded-[10px] bg-white h-full p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Profit</span>
                    <div className={`p-1.5 rounded-lg ${totalProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                      <DollarSign className={`h-3.5 w-3.5 ${totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(totalProfit)}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-gray-400">Rebates − costs</p>
                    <p className={`text-sm font-bold ${avgMargin > 20 ? "text-green-600" : avgMargin > 10 ? "text-orange-600" : "text-red-600"}`}>
                      {avgMargin}% <span className="text-[10px] font-medium text-gray-400">margin</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Non-admin: KPI + Pipeline left */
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {appUser?.companyName && (
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 -mt-2">{appUser.companyName}</h1>
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
                    { label: "Profit", value: formatCurrency(totalProfit), count: null, color: totalProfit >= 0 ? "text-yellow-600" : "text-red-600", dot: totalProfit >= 0 ? "bg-yellow-500" : "bg-red-500", margin: avgMargin },
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
                      ? activityEvents.filter((e) =>
                          activityFilter === "rebate"
                            ? e.type.startsWith("rebate_")
                            : e.type === activityFilter
                        )
                      : activityEvents;
                    return filtered.length > 0 ? (
                      filtered.map((event) => {
                        const IconComponent = ACTIVITY_ICONS[event.icon] || Activity;
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
      )}

      {/* Recent Jobs + Map */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recent Jobs — left side */}
        <div className="col-span-12 lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Jobs</h3>
            <Link href="/jobs" className="text-xs text-[#FF6B35] font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="group block">
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-50 rounded-l-xl overflow-hidden">
                        {job.houseImageURL ? (
                          <img src={job.houseImageURL} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-6 w-6 text-gray-200" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 min-w-0">
                        <p className="text-sm font-semibold leading-snug group-hover:text-[#FF6B35] transition-colors truncate">
                          {job.streetAddress || "Untitled"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {job.photoCount} photo{job.photoCount !== 1 ? "s" : ""} &middot; {job.issueCount} issue{job.issueCount !== 1 ? "s" : ""}
                          {job.fixCount > 0 && <> &middot; {job.fixCount} fix{job.fixCount !== 1 ? "es" : ""}</>}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                          <span>{formatDate(job.createdAt)}</span>
                          <StageBadge stage={job.currentStage} size="sm" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Map — right side */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <MapPin size={14} className="text-[#FF6B35]" />
              Job Locations
            </h3>
            <div className="flex items-center gap-1.5">
              {([
                { value: "", label: "All", color: "#6B7280" },
                { value: "auditPending", label: "Audit", color: "#9CA3AF" },
                { value: "workInProgress", label: "WIP", color: "#F59E0B" },
                { value: "inspectionPending", label: "Inspection", color: "#FF6B35" },
                { value: "completed", label: "Done", color: "#10B981" },
              ] as const).map((s) => (
                <button
                  key={s.value}
                  onClick={() => setMapStageFilter(s.value)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
                  style={{
                    backgroundColor: mapStageFilter === s.value ? s.color : `${s.color}15`,
                    color: mapStageFilter === s.value ? "#fff" : s.color,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Card className="overflow-hidden">
            <JobMap
              jobs={mapStageFilter ? allJobs.filter((j) => j.currentStage === mapStageFilter) : allJobs}
              className="h-[340px]"
            />
          </Card>
        </div>
      </div>

      {/* Jobs Over Time + Stage Donut */}
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 lg:col-span-8">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-6">Jobs Over Time</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={weeklyJobs}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(d) => `Week of ${new Date(d as string).toLocaleDateString("en", { month: "short", day: "numeric" })}`}
                />
                <Area type="monotone" dataKey="count" stroke="#FF6B35" fill="url(#areaGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-6">Jobs by Stage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {stageData.map((entry) => (
                    <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || "#9CA3AF"} />
                  ))}
                  <Label
                    value={`${analytics.totalJobs}`}
                    position="center"
                    className="text-2xl font-bold"
                    fill="#111827"
                  />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
              {stageData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[s.name] || "#9CA3AF" }} />
                  <span className="text-gray-500">{s.name}</span>
                  <span className="font-bold text-gray-700">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Issues by Category + Photos Trend — 6+6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-6">Top Issues by Category</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={(analytics.issuesByCategory || []).slice(0, 8)} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32} label={{ position: "top", fontSize: 11, fill: "#6B7280", fontWeight: 600 }}>
                  {(analytics.issuesByCategory || []).slice(0, 8).map((entry, i) => (
                    <Cell key={entry.category} fill={i < 2 ? "#EF4444" : i < 5 ? "#FF6B35" : "#F59E0B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold">Photos Collected</h3>
              <div className="flex gap-1">
                {([7, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setPhotoDays(d)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      photoDays === d
                        ? "bg-blue-500 text-white"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={(analytics.photosTrend || []).slice(-photoDays)}>
                <defs>
                  <linearGradient id="photosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(d) => new Date(d as string).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="url(#photosGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Top Inspectors + Rebate Outcomes + Materials — 4+4+4 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold">Top Inspectors</h3>
            </div>
            {(analytics.topInspectors || []).length > 0 ? (
              <div className="space-y-2.5">
                {(analytics.topInspectors || []).slice(0, 5).map((inspector, i) => {
                  const max = (analytics.topInspectors || [])[0].count;
                  const pct = max > 0 ? (inspector.count / max) * 100 : 0;
                  return (
                    <div key={inspector.name} className="flex items-center gap-2.5">
                      <div className="w-5 text-[11px] font-bold text-gray-300 text-right">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{inspector.name}</span>
                          <span className="text-xs font-bold text-gray-700 ml-2">{inspector.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: i === 0
                                ? "linear-gradient(90deg, #FF6B35, #FF8C61)"
                                : i === 1
                                  ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                                  : "#E5E7EB",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-xs">No inspector data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Fix Rate</h3>
            {(() => {
              const fixRate = analytics.totalIssues > 0
                ? Math.round((analytics.totalFixes / analytics.totalIssues) * 100)
                : 0;
              const circumference = 2 * Math.PI * 62;
              const offset = circumference - (fixRate / 100) * circumference;
              const color = fixRate >= 80 ? "#10B981" : fixRate >= 50 ? "#F59E0B" : "#EF4444";
              return (
                <>
                  <div className="flex justify-center">
                    <div className="relative w-[160px] h-[160px]">
                      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                        <circle cx="70" cy="70" r="62" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                        <circle
                          cx="70" cy="70" r="62" fill="none"
                          stroke={color}
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold" style={{ color }}>{fixRate}%</span>
                        <span className="text-[10px] text-gray-400">resolved</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-500">{analytics.totalIssues}</p>
                      <p className="text-[10px] text-gray-400">Issues</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-500">{analytics.totalFixes}</p>
                      <p className="text-[10px] text-gray-400">Fixes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-400">{analytics.totalIssues - analytics.totalFixes}</p>
                      <p className="text-[10px] text-gray-400">Open</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold">Materials Used</h3>
            </div>
            {(analytics.materialsByType || []).length > 0 ? (
              <div className="space-y-2">
                {(analytics.materialsByType || []).map((mat) => (
                  <div
                    key={mat.type}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50"
                  >
                    <span className="text-xs font-medium capitalize text-gray-600 truncate">{mat.type}</span>
                    <span className="text-sm font-bold text-gray-800 ml-2">{mat.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-xs">No materials yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
