"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, estimateJobValue, DEFAULT_WEIGHTS, calculateJobRevenueValue, DEFAULT_VALUATION } from "@/lib/utils";
import { Job, InspectionForm, DatasetValueWeights, DatasetValuationConfig } from "@/types";
import { Download, Loader2, FileJson, FileSpreadsheet, Shield, Briefcase, Camera, AlertTriangle, Wrench, DollarSign, Filter } from "lucide-react";

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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minPhotos, setMinPhotos] = useState(0);
  const [minIssues, setMinIssues] = useState(0);
  const [hasFormsOnly, setHasFormsOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [formsMap, setFormsMap] = useState<Record<string, InspectionForm[]>>({});
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<DatasetValueWeights>(DEFAULT_WEIGHTS);
  const [valuation, setValuation] = useState<DatasetValuationConfig>(DEFAULT_VALUATION);

  useEffect(() => {
    async function load() {
      const [jobsRes, configRes] = await Promise.all([
        fetch("/api/jobs?limit=1000"),
        fetch("/api/config"),
      ]);
      const { jobs: allJobs } = await jobsRes.json();
      const cfg = await configRes.json();
      if (cfg.datasetValueWeights) setWeights(cfg.datasetValueWeights);
      if (cfg.datasetValuation) setValuation(cfg.datasetValuation);
      setJobs(allJobs || []);

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

  const filteredJobs = jobs.filter((j) => {
    if (rebateFilters.length > 0 && !rebateFilters.includes(j.rebateStatus)) return false;
    if (stageFilters.length > 0 && !stageFilters.includes(j.currentStage)) return false;
    if (dateFrom && new Date(j.createdAt).getTime() < new Date(dateFrom).getTime()) return false;
    if (dateTo && new Date(j.createdAt).getTime() >= new Date(dateTo).getTime() + 86400000) return false;
    if (minPhotos > 0 && j.photoCount < minPhotos) return false;
    if (minIssues > 0 && j.issueCount < minIssues) return false;
    if (hasFormsOnly && !(formsMap[j.id]?.length > 0)) return false;
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
        body: JSON.stringify({ format, anonymize, rebateFilters, stageFilters, dateFrom, dateTo, minPhotos, minIssues, hasFormsOnly }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `horizon_export_${Date.now()}.${format === "csv" ? "csv" : "jsonl"}`;
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Created After</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Created Before</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Min Photos</label>
                  <input
                    type="number"
                    min={0}
                    value={minPhotos}
                    onChange={(e) => setMinPhotos(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Min Issues</label>
                  <input
                    type="number"
                    min={0}
                    value={minIssues}
                    onChange={(e) => setMinIssues(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={hasFormsOnly} onChange={(e) => setHasFormsOnly(e.target.checked)} className="rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]" />
                <div>
                  <p className="text-sm font-medium">Has inspection forms only</p>
                  <p className="text-[10px] text-gray-400">Exclude jobs with no audit or inspection data</p>
                </div>
              </label>
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
