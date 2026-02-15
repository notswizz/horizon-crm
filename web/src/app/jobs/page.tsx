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
import { Job, JobStage, RebateStatus } from "@/types";
import Image from "next/image";
import { Search, Loader2, Trash2, Download, ChevronLeft, ChevronRight, Plus, X, MapPin, User, Phone, Mail, FileText, Home } from "lucide-react";

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
  const [showNewJob, setShowNewJob] = useState(false);

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
        `"${j.address}","${j.contactName}",${j.currentStage},${j.rebateStatus},${j.photoCount},${j.issueCount},${j.fixCount},${new Date(j.createdAt).toISOString()}`
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
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
          <Button size="sm" onClick={() => setShowNewJob(true)} className="bg-[#FF6B35] hover:bg-[#E85A28] text-white">
            <Plus size={14} className="mr-1.5" /> New Job
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mt-6 flex-shrink-0">
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
              {(["none", "calculated", "submitted", "accepted", "declined", "paid"] as RebateStatus[]).map((r) => (
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
      <Card className="mt-4 flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b bg-gray-50/80 backdrop-blur">
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
                      <Link href={`/jobs/${job.id}`} className="flex items-center gap-3 group">
                        {job.houseImageURL ? (
                          <Image
                            src={job.houseImageURL}
                            alt="House"
                            width={36}
                            height={36}
                            className="rounded-full object-cover flex-shrink-0"
                            style={{ width: 36, height: 36 }}
                            unoptimized
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Home size={16} className="text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900 group-hover:text-[#FF6B35] transition-colors">
                          {job.address || "Untitled"}
                        </span>
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
                        <RebateBadge status={job.rebateStatus} />
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
          <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0">
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

      {/* New Job Modal */}
      {showNewJob && (
        <NewJobModal
          onClose={() => setShowNewJob(false)}
          onCreated={() => {
            setShowNewJob(false);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}

// ─── New Job Modal ──────────────────────────────────────────────────────────

function NewJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = form.streetAddress.trim().length > 0;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#FF6B35] to-[#E85A28]">
          <h2 className="text-lg font-bold text-white">New Job</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Address Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MapPin size={14} className="text-[#FF6B35]" />
              Address
            </div>
            <Input
              placeholder="Street address *"
              value={form.streetAddress}
              onChange={(e) => handleChange("streetAddress", e.target.value)}
              autoFocus
            />
            <Input
              placeholder="City"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
            />
            <div className="flex gap-3">
              <Input
                placeholder="State"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Zip Code"
                value={form.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User size={14} className="text-[#FF6B35]" />
              Contact Info
            </div>
            <Input
              placeholder="Contact name"
              value={form.contactName}
              onChange={(e) => handleChange("contactName", e.target.value)}
            />
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Phone number"
                  value={form.contactPhone}
                  onChange={(e) => handleChange("contactPhone", e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Email address"
                  value={form.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText size={14} className="text-[#FF6B35]" />
              Notes
            </div>
            <textarea
              placeholder="Additional notes about this job"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50/50 flex items-center justify-between">
          {!canSave && (
            <p className="text-xs text-gray-400">Enter a street address to create the job.</p>
          )}
          {canSave && <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSave || saving}
              onClick={handleSave}
              className="bg-[#FF6B35] hover:bg-[#E85A28] text-white min-w-[100px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Create Job"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
