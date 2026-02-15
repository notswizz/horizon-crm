"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/stage-badge";
import { RebateBadge } from "@/components/shared/rebate-badge";
import { formatCurrency, formatDate, stageConfig } from "@/lib/utils";
import { AnalyticsData, Job } from "@/types";
import {
  Briefcase,
  Camera,
  AlertTriangle,
  Wrench,
  DollarSign,
  Loader2,
  ArrowRight,
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
} from "recharts";

const STAGE_COLORS = ["#6366F1", "#F59E0B", "#8B5CF6", "#10B981", "#6B7280"];
const REBATE_COLORS = ["#FF6B35", "#10B981", "#EF4444"];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/jobs?limit=10").then((r) => r.json()),
    ]).then(([a, j]) => {
      setAnalytics(a);
      setRecentJobs(j.jobs || []);
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

  const metricCards = [
    { label: "Total Jobs", value: analytics.totalJobs, icon: Briefcase, color: "text-[#FF6B35]", bg: "bg-orange-50" },
    { label: "Photos", value: analytics.totalPhotos, icon: Camera, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Issues", value: analytics.totalIssues, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
    { label: "Fixes", value: analytics.totalFixes, icon: Wrench, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Dataset Value", value: formatCurrency(analytics.estimatedValue), icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  const stageData = Object.entries(analytics.jobsByStage)
    .filter(([key]) => key in stageConfig)
    .map(([key, value], i) => ({
      name: stageConfig[key as keyof typeof stageConfig].label,
      value,
      color: STAGE_COLORS[i % STAGE_COLORS.length],
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FF6B35] to-[#E85A28] bg-clip-text text-transparent">Horizon Energy South</h1>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{m.label}</span>
                <div className={`p-2 rounded-lg ${m.bg}`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs over time */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Jobs Over Time (30 days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={analytics.jobsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleDateString()} />
                <Area type="monotone" dataKey="count" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Jobs by stage pie */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Jobs by Stage</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stageData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {stageData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {stageData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[i] }} />
                    <span className="text-gray-600">{s.name}</span>
                  </div>
                  <span className="font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: Issues + Rebates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues by category */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Top Issues by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.issuesByCategory.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rebate breakdown */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Rebate Outcomes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={analytics.rebateBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="count" paddingAngle={3}>
                  {analytics.rebateBreakdown.map((_, i) => (
                    <Cell key={i} fill={REBATE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {analytics.rebateBreakdown.map((r, i) => (
                <div key={r.outcome} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REBATE_COLORS[i] }} />
                    <span className="capitalize">{r.outcome}</span>
                  </div>
                  <span className="font-semibold">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent jobs */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Jobs</h3>
            <Link href="/jobs" className="text-xs text-[#FF6B35] font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <p className="text-sm font-medium truncate group-hover:text-[#FF6B35] transition-colors">
                      {job.address || "Untitled"}
                    </p>
                    <p className="text-xs text-gray-400">{job.contactName} · {formatDate(job.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">
                      {job.photoCount} photos · {job.issueCount} issues
                    </p>
                  </div>
                  <StageBadge stage={job.currentStage} size="sm" />
                  <RebateBadge outcome={job.rebateOutcome} />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
