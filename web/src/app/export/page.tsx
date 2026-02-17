"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, estimateJobValue, DEFAULT_WEIGHTS, calculateJobRevenueValue, DEFAULT_VALUATION } from "@/lib/utils";
import { Job, InspectionForm, DatasetValueWeights, DatasetValuationConfig } from "@/types";
import { Download, Loader2, FileJson, FileSpreadsheet, Shield, Briefcase, Camera, AlertTriangle, Wrench, DollarSign, Filter, Building2 } from "lucide-react";


export default function ExportPage() {
  const { appUser } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  if (appUser && appUser.role !== "admin") {
    router.push("/");
    return null;
  }
  const [format, setFormat] = useState("jsonl");
  const [anonymize, setAnonymize] = useState(false);
  const [rebateFilters, setRebateFilters] = useState<string[]>([]);
  const [stageFilters, setStageFilters] = useState<string[]>([]);
  const [companyFilters, setCompanyFilters] = useState<string[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [exporting, setExporting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [formsMap, setFormsMap] = useState<Record<string, InspectionForm[]>>({});
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<DatasetValueWeights>(DEFAULT_WEIGHTS);
  const [valuation, setValuation] = useState<DatasetValuationConfig>(DEFAULT_VALUATION);

  useEffect(() => {
    async function load() {
      const [jobsRes, configRes, companiesRes] = await Promise.all([
        fetch("/api/jobs?limit=1000"),
        fetch("/api/config"),
        fetch("/api/admin/companies"),
      ]);
      const { jobs: allJobs } = await jobsRes.json();
      const cfg = await configRes.json();
      const companiesData = await companiesRes.json();
      if (cfg.datasetValueWeights) setWeights(cfg.datasetValueWeights);
      if (cfg.datasetValuation) setValuation(cfg.datasetValuation);
      setJobs(allJobs || []);
      setCompanies(companiesData.companies || []);

      const fMap: Record<string, InspectionForm[]> = {};
      for (const job of allJobs as Job[]) {
        const formsRes = await fetch(`/api/forms/${job.id}`);
        const { forms } = await formsRes.json();
        fMap[job.id] = forms || [];
      }
      setFormsMap(fMap);
      setLoading(false);
    }
    load();
  }, []);

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  // Company breakdown stats — percentages are dynamic based on selection
  const companyBreakdown = (() => {
    const counts = companies.map((c) => {
      const companyJobs = jobs.filter((j) => j.companyId === c.id);
      return {
        id: c.id,
        name: c.name,
        jobCount: companyJobs.length,
        photoCount: companyJobs.reduce((s, j) => s + j.photoCount, 0),
      };
    });
    // Percentages based on photos, relative to selected companies
    const selectedIds = companyFilters.length > 0 ? companyFilters : companies.map((c) => c.id);
    const selectedPhotos = counts.filter((c) => selectedIds.includes(c.id)).reduce((s, c) => s + c.photoCount, 0);
    return counts
      .map((c) => ({ ...c, pct: selectedPhotos > 0 ? (c.photoCount / selectedPhotos) * 100 : 0 }))
      .sort((a, b) => b.photoCount - a.photoCount);
  })();

  const filteredJobs = jobs.filter((j) => {
    if (companyFilters.length > 0 && !companyFilters.includes(j.companyId || "")) return false;
    if (rebateFilters.length > 0 && !rebateFilters.includes(j.rebateStatus)) return false;
    if (stageFilters.length > 0 && !stageFilters.includes(j.currentStage)) return false;
    return true;
  });

  const stats = {
    jobs: filteredJobs.length,
    photos: filteredJobs.reduce((s, j) => s + j.photoCount, 0),
    issues: filteredJobs.reduce((s, j) => s + j.issueCount, 0),
    fixes: filteredJobs.reduce((s, j) => s + j.fixCount, 0),
    value: filteredJobs.reduce((s, j) => s + estimateJobValue(j, formsMap[j.id] || [], weights), 0),
    revenueValue: filteredJobs.reduce((s, j) => s + calculateJobRevenueValue(j, valuation), 0),
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, anonymize, rebateFilters, stageFilters, companyFilters }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `retrofitiq_export_${Date.now()}.${format === "csv" ? "csv" : "jsonl"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-sm text-gray-500 mt-1">Export training data for AI model development</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        {/* Config */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat("jsonl")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                    format === "jsonl" ? "border-[#FF6B35] bg-orange-50" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <FileJson size={20} className={format === "jsonl" ? "text-[#FF6B35]" : "text-gray-400"} />
                  <div className="text-left">
                    <p className="text-sm font-semibold">JSONL</p>
                    <p className="text-[10px] text-gray-400">Full structure, AI training</p>
                  </div>
                </button>
                <button
                  onClick={() => setFormat("csv")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                    format === "csv" ? "border-[#FF6B35] bg-orange-50" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <FileSpreadsheet size={20} className={format === "csv" ? "text-[#FF6B35]" : "text-gray-400"} />
                  <div className="text-left">
                    <p className="text-sm font-semibold">CSV</p>
                    <p className="text-[10px] text-gray-400">Flat table, spreadsheets</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Filters grid */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-gray-400" />
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</label>
              </div>
              {/* Company filter with breakdown */}
              {companies.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={13} className="text-gray-400" />
                    <label className="text-[11px] text-gray-500">Company</label>
                    {companyFilters.length > 0 && (
                      <button onClick={() => setCompanyFilters([])} className="text-[10px] text-[#FF6B35] hover:underline ml-auto">Clear</button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {companyBreakdown.map((c) => {
                      const isSelected = companyFilters.includes(c.id);
                      const dimmed = companyFilters.length > 0 && !isSelected;
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleFilter(companyFilters, c.id, setCompanyFilters)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected ? "bg-[#FF6B35]/10 border border-[#FF6B35]/30" : "bg-gray-50 border border-transparent hover:bg-gray-100"
                          } ${dimmed ? "opacity-40" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35] pointer-events-none"
                          />
                          <span className="text-xs font-medium truncate flex-1">{c.name}</span>
                          <span className="text-[10px] text-gray-400 tabular-nums">{c.photoCount} photos</span>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isSelected || companyFilters.length === 0 ? "bg-[#FF6B35]" : "bg-gray-300"}`}
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold tabular-nums w-10 text-right ${isSelected ? "text-[#FF6B35]" : "text-gray-500"}`}>{c.pct.toFixed(1)}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] text-gray-500 mb-1.5 block">Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["auditPending", "Audit Pending"],
                    ["workInProgress", "Work In Progress"],
                    ["inspectionPending", "Inspection Pending"],
                    ["completed", "Completed"],
                    ["cancelled", "Cancelled"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => toggleFilter(stageFilters, val, setStageFilters)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        stageFilters.includes(val)
                          ? "bg-[#FF6B35] text-white"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-500 mb-1.5 block">Rebate Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["calculated", "Calculated"],
                    ["submitted", "Submitted"],
                    ["accepted", "Accepted"],
                    ["declined", "Declined"],
                    ["paid", "Paid"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => toggleFilter(rebateFilters, val, setRebateFilters)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        rebateFilters.includes(val)
                          ? "bg-[#FF6B35] text-white"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} className="rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]" />
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Anonymize PII</p>
                    <p className="text-[10px] text-gray-400">Removes address, name, phone, and email</p>
                  </div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Summary sidebar + export button */}
        <div className="w-48 space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Summary</h3>
              <div className="space-y-4">
                {[
                  { icon: Briefcase, label: "Jobs", value: stats.jobs, color: "text-[#FF6B35]" },
                  { icon: Camera, label: "Photos", value: stats.photos, color: "text-blue-500" },
                  { icon: AlertTriangle, label: "Issues", value: stats.issues, color: "text-red-500" },
                  { icon: Wrench, label: "Fixes", value: stats.fixes, color: "text-emerald-500" },
                  { icon: DollarSign, label: "Pts Value", value: formatCurrency(stats.value), color: "text-[#FF6B35]" },
                  { icon: DollarSign, label: "Rebate Val", value: formatCurrency(stats.revenueValue), color: "text-purple-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <s.icon size={16} className={s.color} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight">{s.value}</p>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="relative w-full h-36 rounded-xl p-[2px] bg-[length:300%_300%] animate-[gradient-spin_3s_linear_infinite] disabled:opacity-30" style={{ background: "linear-gradient(135deg, #FF6B35, #F59E0B, #10B981, #3B82F6, #8B5CF6, #FF6B35)", backgroundSize: "300% 300%", animation: "gradient-spin 3s linear infinite" }}>
            <style>{`@keyframes gradient-spin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
          <button
            onClick={handleExport}
            disabled={exporting || stats.jobs === 0}
            className="w-full h-full rounded-[10px] bg-[#FF6B35] hover:bg-[#E5532D] text-white flex flex-col items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Download size={22} />
            )}
            <span className="text-2xl font-bold leading-none">{stats.jobs}</span>
            <span className="text-xs font-semibold">
              {exporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
            </span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
