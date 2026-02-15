"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/stage-badge";
import { formatCurrency, formatDate, stageConfig } from "@/lib/utils";
import { AnalyticsData, Job, JobStage } from "@/types";
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
} from "lucide-react";
import Link from "next/link";
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

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoDays, setPhotoDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/jobs?limit=5&sort=newest").then((r) => r.json()),
      fetch("/api/jobs?limit=500").then((r) => r.json()),
    ]).then(([a, j, all]) => {
      setAnalytics(a);
      setRecentJobs(j.jobs || []);
      setAllJobs(all.jobs || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  if (!analytics) return null;

  const stageData = Object.entries(analytics.jobsByStage)
    .filter(([key]) => key in stageConfig)
    .map(([key, value]) => ({
      name: stageConfig[key as keyof typeof stageConfig].label,
      value,
    }));

  // Pipeline metrics from rebate data
  const totalPipeline = allJobs
    .filter((j) => j.rebate?.status === "submitted")
    .reduce((sum, j) => sum + (j.rebate?.claimedAmount || j.rebate?.estimatedRebate || 0), 0);

  const approvedPending = allJobs
    .filter((j) => j.rebate?.status === "accepted")
    .reduce((sum, j) => sum + (j.rebate?.approvedAmount || 0), 0);

  const totalPaid = allJobs
    .filter((j) => j.rebate?.status === "paid")
    .reduce((sum, j) => sum + (j.rebate?.paidAmount || 0), 0);

  const jobsWithMargin = allJobs.filter((j) => j.profitMargin != null && j.profitMargin !== 0);
  const avgMargin = jobsWithMargin.length > 0
    ? Math.round(jobsWithMargin.reduce((sum, j) => sum + j.profitMargin!, 0) / jobsWithMargin.length * 10) / 10
    : 0;

  const hasPipelineData = totalPipeline > 0 || approvedPending > 0 || totalPaid > 0 || avgMargin > 0;

  // Weekly aggregation for jobs over time
  const weeklyJobs = analytics.jobsOverTime.reduce<{ date: string; count: number }[]>((acc, item) => {
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
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-12 gap-4">
        {/* Hero: Dataset Values — split card */}
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
              <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Revenue-Based</span>
              <p className="text-3xl font-extrabold leading-none tracking-tight mt-1">{formatCurrency(analytics.revenueDatasetValue)}</p>
              <p className="text-[11px] text-white/50 mt-2">
                {formatCurrency(analytics.totalJobs > 0 ? analytics.revenueDatasetValue / analytics.totalJobs : 0)}/avg
              </p>
            </div>
          </div>
        </Card>

        {/* Jobs — 2 cols */}
        <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Jobs</span>
              <div className="p-2 rounded-lg bg-orange-50">
                <Briefcase className="h-4 w-4 text-[#FF6B35]" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalJobs}</p>
          </CardContent>
        </Card>

        {/* Photos — 2 cols */}
        <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Photos</span>
              <div className="p-2 rounded-lg bg-blue-50">
                <Camera className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalPhotos.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Issues — 2 cols */}
        <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Issues</span>
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalIssues}</p>
          </CardContent>
        </Card>

        {/* Fixes — 2 cols */}
        <Card className="col-span-6 lg:col-span-2 hover:shadow-md hover:scale-[1.02] transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Fixes</span>
              <div className="p-2 rounded-lg bg-emerald-50">
                <Wrench className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-3xl font-bold">{analytics.totalFixes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rebate Pipeline Row */}
      {hasPipelineData && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="hover:shadow-md hover:scale-[1.02] transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pipeline</span>
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPipeline)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Submitted claims</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:scale-[1.02] transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Accepted</span>
                <div className="p-1.5 rounded-lg bg-green-50">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(approvedPending)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Pending payment</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:scale-[1.02] transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Paid</span>
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 border border-yellow-400 rounded-md px-2 py-0.5 inline-block">{formatCurrency(totalPaid)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total collected</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md hover:scale-[1.02] transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Avg Margin</span>
                <div className="p-1.5 rounded-lg bg-orange-50">
                  <TrendingUp className="h-3.5 w-3.5 text-[#FF6B35]" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${avgMargin > 20 ? "text-green-600" : avgMargin > 10 ? "text-orange-600" : "text-red-600"}`}>
                {avgMargin}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{jobsWithMargin.length} jobs with data</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Jobs — full width */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Recent Jobs</h3>
          <Link href="/jobs" className="text-xs text-[#FF6B35] font-semibold hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {recentJobs.slice(0, 5).map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="group">
              <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-xl overflow-hidden">
                  {job.houseImageURL ? (
                    <img src={job.houseImageURL} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-200" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold leading-snug group-hover:text-[#FF6B35] transition-colors mb-2">
                    {job.streetAddress || "Untitled"}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    {job.photoCount} photo{job.photoCount !== 1 ? "s" : ""} &middot; {job.issueCount} issue{job.issueCount !== 1 ? "s" : ""}
                    {job.fixCount > 0 && <> &middot; {job.fixCount} fix{job.fixCount !== 1 ? "es" : ""}</>}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{formatDate(job.createdAt)}</span>
                    <StageBadge stage={job.currentStage} size="sm" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Row 2: Jobs Over Time + Stage Donut — 8+4 */}
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
              <BarChart data={analytics.issuesByCategory.slice(0, 8)} margin={{ bottom: 40 }}>
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
                  {analytics.issuesByCategory.slice(0, 8).map((entry, i) => (
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
              <AreaChart data={analytics.photosTrend.slice(-photoDays)}>
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
            {analytics.topInspectors.length > 0 ? (
              <div className="space-y-2.5">
                {analytics.topInspectors.slice(0, 5).map((inspector, i) => {
                  const max = analytics.topInspectors[0].count;
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
            {analytics.materialsByType.length > 0 ? (
              <div className="space-y-2">
                {analytics.materialsByType.map((mat) => (
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
