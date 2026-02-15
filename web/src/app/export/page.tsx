"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, estimateJobValue, DEFAULT_WEIGHTS, calculateJobRevenueValue, DEFAULT_VALUATION } from "@/lib/utils";
import { Job, InspectionForm, DatasetValueWeights, DatasetValuationConfig } from "@/types";
import { Download, Loader2, FileJson, FileSpreadsheet, Shield, Briefcase, Camera, AlertTriangle, Wrench, DollarSign } from "lucide-react";

export default function ExportPage() {
  const [format, setFormat] = useState("jsonl");
  const [anonymize, setAnonymize] = useState(false);
  const [rebateFilter, setRebateFilter] = useState("all");
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

  const filteredJobs = rebateFilter === "all" ? jobs : jobs.filter((j) => j.rebateStatus === rebateFilter);

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
        body: JSON.stringify({ format, anonymize, rebateFilter }),
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-sm text-gray-500 mt-1">Export training data for AI model development</p>
      </div>

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

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Rebate Filter</label>
            <Select value={rebateFilter} onChange={(e) => setRebateFilter(e.target.value)}>
              <option value="all">All Jobs</option>
              <option value="accepted">Accepted Only</option>
              <option value="declined">Declined Only</option>
              <option value="paid">Paid Only</option>
              <option value="submitted">Submitted Only</option>
              <option value="calculated">Calculated Only</option>
            </Select>
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

      {/* Preview */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4">Export Summary</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[
              { icon: Briefcase, label: "Jobs", value: stats.jobs, color: "text-[#FF6B35]" },
              { icon: Camera, label: "Photos", value: stats.photos, color: "text-blue-500" },
              { icon: AlertTriangle, label: "Issues", value: stats.issues, color: "text-red-500" },
              { icon: Wrench, label: "Fixes", value: stats.fixes, color: "text-emerald-500" },
              { icon: DollarSign, label: "Pts Value", value: formatCurrency(stats.value), color: "text-purple-500" },
              { icon: DollarSign, label: "Rev Value", value: formatCurrency(stats.revenueValue), color: "text-orange-500" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export button */}
      <Button onClick={handleExport} disabled={exporting || stats.jobs === 0} className="w-full h-12 text-base">
        {exporting ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Download size={18} className="mr-2" />
        )}
        {exporting ? "Exporting..." : `Export ${stats.jobs} Jobs as ${format.toUpperCase()}`}
      </Button>
    </div>
  );
}
