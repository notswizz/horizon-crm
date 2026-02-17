"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Briefcase,
  Camera,
  Users,
  Building2,
  ChevronDown,
  FileText,
  CheckCircle,
  Banknote,
  DollarSign,
} from "lucide-react";
import { DashboardProps, CompanyOption } from "./types";
import { SharedSections } from "./shared-sections";

interface AdminDashboardProps extends DashboardProps {
  companies: CompanyOption[];
  selectedCompany: string;
  onCompanyChange: (companyId: string) => void;
}

export function AdminDashboard({
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
  companies,
  selectedCompany,
  onCompanyChange,
}: AdminDashboardProps) {
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
      {/* Company Filter */}
      {companies.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 size={15} />
            <span className="font-medium">Viewing:</span>
          </div>
          <div className="relative">
            <select
              value={selectedCompany}
              onChange={(e) => onCompanyChange(e.target.value)}
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

      {/* Hero + KPI Cards */}
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

      {/* Rebate Pipeline Row */}
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
                <p className="text-[10px] text-gray-400">Rebates - costs</p>
                <p className={`text-sm font-bold ${avgMargin > 20 ? "text-green-600" : avgMargin > 10 ? "text-orange-600" : "text-red-600"}`}>
                  {avgMargin}% <span className="text-[10px] font-medium text-gray-400">margin</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
