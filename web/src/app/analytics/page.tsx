"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, stageConfig } from "@/lib/utils";
import { AnalyticsData } from "@/types";
import { Loader2 } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid, LineChart, Line, Legend,
} from "recharts";

const STAGE_COLORS = ["#6366F1", "#F59E0B", "#8B5CF6", "#10B981", "#6B7280"];
const CATEGORY_COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  const stageData = Object.entries(data.jobsByStage)
    .filter(([key]) => key in stageConfig)
    .map(([key, value], i) => ({
      name: stageConfig[key as keyof typeof stageConfig].label,
      value,
      color: STAGE_COLORS[i % STAGE_COLORS.length],
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Insights across all jobs and inspections</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Jobs", value: data.totalJobs },
          { label: "Photos", value: data.totalPhotos },
          { label: "Issues", value: data.totalIssues },
          { label: "Dataset Value", value: formatCurrency(data.estimatedValue) },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{m.label}</p>
              <p className="text-2xl font-bold mt-1">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by stage */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Jobs by Stage</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stageData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {stageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issues by category */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Issues by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.issuesByCategory.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={140} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.issuesByCategory.slice(0, 10).map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Photos trend */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Photos Collected (30 days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.photosTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top inspectors */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Top Inspectors</h3>
            {data.topInspectors.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topInspectors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-12">No inspector data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Jobs over time */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Jobs Created Over Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.jobsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#FF6B35" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top issues table */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">Top Issues</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-400">
                  <th className="text-left pb-2 font-medium text-xs">Category</th>
                  <th className="text-right pb-2 font-medium text-xs">Count</th>
                  <th className="text-right pb-2 font-medium text-xs">%</th>
                </tr>
              </thead>
              <tbody>
                {data.issuesByCategory.slice(0, 10).map((row) => (
                  <tr key={row.category} className="border-b last:border-0">
                    <td className="py-2 text-xs">{row.category}</td>
                    <td className="py-2 text-right text-xs font-medium">{row.count}</td>
                    <td className="py-2 text-right text-xs text-gray-400">
                      {data.totalIssues > 0 ? ((row.count / data.totalIssues) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Materials table */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">Materials Used</h3>
            {data.materialsByType.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-400">
                    <th className="text-left pb-2 font-medium text-xs">Type</th>
                    <th className="text-right pb-2 font-medium text-xs">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.materialsByType.map((row) => (
                    <tr key={row.type} className="border-b last:border-0">
                      <td className="py-2 text-xs capitalize">{row.type}</td>
                      <td className="py-2 text-right text-xs font-medium">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No material data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
