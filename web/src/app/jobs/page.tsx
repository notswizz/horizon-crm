"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StageBadge } from "@/components/shared/stage-badge";
import { RebateBadge } from "@/components/shared/rebate-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Job, JobStage, RebateOutcome } from "@/types";
import { Search, Loader2, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [rebateFilter, setRebateFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stageFilter) params.set("stage", stageFilter);
    if (rebateFilter) params.set("rebate", rebateFilter);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", "50");

    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data.jobs || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, stageFilter, rebateFilter, sort, page]);

  useEffect(() => {
    const timer = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === jobs.length) setSelected(new Set());
    else setSelected(new Set(jobs.map((j) => j.id)));
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} job(s)? This cannot be undone.`)) return;
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/jobs/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    fetchJobs();
  };

  const exportCSV = () => {
    const headers = "Address,Contact,Stage,Rebate,Photos,Issues,Fixes,Created\n";
    const rows = jobs
      .filter((j) => selected.size === 0 || selected.has(j.id))
      .map((j) =>
        `"${j.address}","${j.contactName}",${j.currentStage},${j.rebateOutcome},${j.photoCount},${j.issueCount},${j.fixCount},${new Date(j.createdAt).toISOString()}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobs_export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total jobs</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download size={14} className="mr-1.5" /> Export {selected.size}
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 size={14} className="mr-1.5" /> Delete {selected.size}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by address or contact..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }} className="w-48">
              <option value="">All Stages</option>
              {(["auditPending", "workInProgress", "inspectionPending", "completed", "cancelled"] as JobStage[]).map((s) => (
                <option key={s} value={s}>{s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
            <Select value={rebateFilter} onChange={(e) => { setRebateFilter(e.target.value); setPage(1); }} className="w-40">
              <option value="">All Rebates</option>
              {(["pending", "approved", "declined"] as RebateOutcome[]).map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-40">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="address">Address A–Z</option>
              <option value="issues">Most Issues</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="p-3 text-left w-10">
                  <input type="checkbox" checked={selected.size === jobs.length && jobs.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="p-3 text-left font-medium text-gray-500">Address</th>
                <th className="p-3 text-left font-medium text-gray-500">Contact</th>
                <th className="p-3 text-left font-medium text-gray-500">Stage</th>
                <th className="p-3 text-center font-medium text-gray-500">Photos</th>
                <th className="p-3 text-center font-medium text-gray-500">Issues</th>
                <th className="p-3 text-center font-medium text-gray-500">Fixes</th>
                <th className="p-3 text-left font-medium text-gray-500">Rebate</th>
                <th className="p-3 text-left font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#FF6B35] mx-auto" />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-400">No jobs found</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-gray-50/50 transition-colors">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)} className="rounded" />
                    </td>
                    <td className="p-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-[#FF6B35] transition-colors">
                        {job.address || "Untitled"}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-500">{job.contactName || "—"}</td>
                    <td className="p-3"><StageBadge stage={job.currentStage} size="sm" /></td>
                    <td className="p-3 text-center text-gray-500">{job.photoCount}</td>
                    <td className="p-3 text-center">
                      {job.issueCount > 0 ? (
                        <span className="text-red-600 font-medium">{job.issueCount}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {job.fixCount > 0 ? (
                        <span className="text-emerald-600 font-medium">{job.fixCount}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <RebateBadge outcome={job.rebateOutcome} />
                        {job.rebateAmount > 0 && (
                          <span className="text-xs font-semibold text-emerald-600">{formatCurrency(job.rebateAmount)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{formatDate(job.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
