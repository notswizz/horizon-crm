"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoLightbox, buildLightboxPhotos } from "@/components/shared/photo-lightbox";
import { formatDate, formatCurrency, severityConfig, estimateJobValue, stageConfig, DEFAULT_WEIGHTS, calculateJobRevenueValue, DEFAULT_VALUATION } from "@/lib/utils";
import { Job, InspectionForm, JobStage, IssuePhoto, FixPhoto, DatasetValueWeights, DatasetValuationConfig, TimeEntry } from "@/types";
import {
  Loader2, MapPin, User, Phone, Mail, Camera, AlertTriangle,
  ChevronRight, Package, CheckCircle, Database, DollarSign, Clock,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { RebateCalculator } from "@/components/rebate/rebate-calculator";
import { RebatePipeline } from "@/components/rebate/rebate-pipeline";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === "admin";
  const [job, setJob] = useState<Job | null>(null);
  const [forms, setForms] = useState<InspectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editStage, setEditStage] = useState<JobStage>("auditPending");
  const [lightboxPhotos, setLightboxPhotos] = useState<ReturnType<typeof buildLightboxPhotos> | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [weights, setWeights] = useState<DatasetValueWeights>(DEFAULT_WEIGHTS);
  const [valuation, setValuation] = useState<DatasetValuationConfig>(DEFAULT_VALUATION);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data.job);
        setForms(data.forms || []);
        setTimeEntries(data.timeEntries || []);
        setEditStage(data.job.currentStage);
        setLoading(false);
      });
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.datasetValueWeights) setWeights(cfg.datasetValueWeights);
        if (cfg.datasetValuation) setValuation(cfg.datasetValuation);
      });
  }, [id]);

  const saveStage = async (stage: JobStage) => {
    if (!job) return;
    const prevStage = editStage;
    const prevJob = job;
    setEditStage(stage);
    setJob({ ...job, currentStage: stage });
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: stage }),
      });
      if (!res.ok) throw new Error("Failed to save stage");
    } catch {
      setEditStage(prevStage);
      setJob(prevJob);
    }
  };

  const handleRebateUpdate = async (updates: Partial<Job>) => {
    if (!job) return;
    const prevJob = job;
    setJob({ ...job, ...updates });
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to save rebate");
    } catch {
      setJob(prevJob);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  if (!job) return <p className="text-gray-400">Job not found</p>;

  const audit = forms.find((f) => f.formType === "audit");
  const inspections = forms.filter((f) => f.formType === "inspection");
  const allIssues: IssuePhoto[] = forms.flatMap((f) => f.spots.flatMap((s) => s.issuePhotos));
  const allFixes: FixPhoto[] = forms.flatMap((f) => f.spots.flatMap((s) => s.fixPhotos));
  const allMaterials = forms.flatMap((f) => f.spots.flatMap((s) => s.materials));
  const datasetValue = estimateJobValue(job, forms, weights);
  const revenueValue = calculateJobRevenueValue(job, valuation);

  const openLightbox = (photos: ReturnType<typeof buildLightboxPhotos>, index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  };

  const stageCfg = stageConfig[job.currentStage];

  return (
    <div className="space-y-5 max-w-[1100px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/jobs" className="hover:text-[#FF6B35] transition-colors">Jobs</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium truncate">{job.address || "Untitled"}</span>
      </div>

      {/* Hero Banner */}
      <div className="relative h-44 w-full rounded-2xl overflow-hidden shadow-lg">
        {job.houseImageURL ? (
          <img src={job.houseImageURL} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#E85A28] via-[#FF6B35] to-[#FF8C61]">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <Camera size={32} strokeWidth={1.5} />
              <span className="text-xs font-medium mt-1.5">No photo</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

        <div className="absolute top-3.5 left-4">
          <span className="text-[11px] font-semibold text-white backdrop-blur-xl bg-white/15 px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
            {formatDate(job.createdAt)}
          </span>
        </div>

        <div className="absolute top-3.5 right-4">
          <span className="text-[11px] font-bold backdrop-blur-xl px-3 py-1.5 rounded-full border text-white bg-white/15 border-white/20 shadow-sm">
            {stageCfg?.label || job.currentStage}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-24">
          <h1 className="text-2xl font-extrabold text-white drop-shadow-lg leading-tight tracking-tight">{job.address || "Untitled"}</h1>
          {(job.city || job.state) && (
            <div className="flex items-center gap-1.5 mt-1 text-white/80">
              <MapPin size={12} />
              <span className="text-[13px] font-medium">{[job.city, job.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        {job.rebateStatus !== "none" && job.rebateStatus !== "calculated" && (
          <div className="absolute bottom-4 right-4">
            <span className={`text-[11px] font-bold text-white backdrop-blur-xl bg-black/30 px-3 py-1.5 rounded-full border shadow-sm ${job.rebateStatus === "declined" ? "border-red-400/50" : "border-emerald-400/50"}`}>
              {job.rebateStatus === "paid" && job.rebateAmount > 0
                ? `$${Math.round(job.rebateAmount).toLocaleString()} Paid`
                : job.rebateStatus === "accepted" && job.rebateAmount > 0
                  ? `$${Math.round(job.rebateAmount).toLocaleString()}`
                  : job.rebateStatus === "declined" ? "Declined"
                    : job.rebateStatus.charAt(0).toUpperCase() + job.rebateStatus.slice(1)}
            </span>
          </div>
        )}
      </div>

      {/* Contact + Metrics Bar */}
      <div className="flex items-center gap-3 flex-wrap px-1">
        {(job.contactName || job.contactPhone || job.contactEmail) && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#E5532D] flex items-center justify-center shadow-sm shadow-orange-200/50">
              <User size={13} className="text-white" />
            </div>
            {job.contactName && <span className="text-sm font-semibold text-gray-800">{job.contactName}</span>}
            {job.contactPhone && (
              <a href={`tel:${job.contactPhone}`} className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                <Phone size={12} className="text-blue-500" />
              </a>
            )}
            {job.contactEmail && (
              <a href={`mailto:${job.contactEmail}`} className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                <Mail size={12} className="text-blue-500" />
              </a>
            )}
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
          </div>
        )}

        {[
          { value: job.spots.length, label: "Spots", color: "#FF6B35", bg: "bg-orange-50" },
          { value: job.photoCount, label: "Photos", color: "#3B82F6", bg: "bg-blue-50" },
          { value: job.issueCount, label: "Issues", color: "#EF4444", bg: "bg-red-50" },
          { value: job.fixCount, label: "Fixes", color: "#10B981", bg: "bg-emerald-50" },
        ].map((m) => (
          <div key={m.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${m.bg} border border-transparent`}>
            <span className="text-sm font-extrabold tabular-nums" style={{ color: m.value > 0 ? m.color : "#D1D5DB" }}>{m.value}</span>
            <span className="text-[11px] font-medium text-gray-500">{m.label}</span>
          </div>
        ))}

        {isAdmin && (datasetValue > 0 || revenueValue > 0) && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            {datasetValue > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50">
                <Database size={12} className="text-gray-400" />
                <span className="text-[11px] font-medium text-gray-500">{formatCurrency(datasetValue)}</span>
                <span className="text-[9px] text-gray-400">pts</span>
              </div>
            )}
            {revenueValue > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50">
                <DollarSign size={12} className="text-orange-400" />
                <span className="text-[11px] text-orange-600 font-semibold">{formatCurrency(revenueValue)}</span>
                <span className="text-[9px] text-orange-400">rev</span>
              </div>
            )}
          </>
        )}

        {job.notes && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <div className="flex items-center gap-1.5 min-w-0">
              <p className={`text-xs text-gray-400 ${notesExpanded ? "" : "truncate max-w-xs"}`}>{job.notes}</p>
              {job.notes.length > 60 && (
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="text-[10px] text-[#FF6B35] hover:text-[#E5532D] font-semibold flex-shrink-0"
                >
                  {notesExpanded ? "less" : "more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Spots */}
          {job.spots.length > 0 && (
            <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 p-4">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#FF6B35] to-[#FF8C61]" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF6B35] to-[#E5532D] flex items-center justify-center">
                  <MapPin size={12} className="text-white" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Spots</h3>
                <span className="text-[10px] text-gray-400 font-medium">{job.spots.length}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {job.spots.map((spot) => (
                  <div key={spot.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-xs flex-shrink-0 hover:border-gray-200 transition-colors">
                    <span className="font-semibold text-gray-800 whitespace-nowrap">{spot.title || "Untitled"}</span>
                    <span className="text-[10px] font-semibold text-[#FF6B35] bg-orange-50 px-1.5 py-0.5 rounded whitespace-nowrap">{spot.jobType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit */}
          {audit && (
            <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 to-orange-400" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                      <AlertTriangle size={12} className="text-white" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Audit</h3>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {audit.inspectorName} &middot; {formatDate(audit.date)}
                  </span>
                </div>
                {audit.notes && <p className="text-[12px] text-gray-500 mb-3 leading-relaxed">{audit.notes}</p>}

                {(() => {
                  const allAuditPhotos = audit.spots.flatMap((spot) =>
                    spot.issuePhotos.map((photo) => ({ ...photo, spotTitle: spot.title }))
                  );
                  const lbPhotos = buildLightboxPhotos(allAuditPhotos, [], "", undefined, allFixes);
                  return (
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {allAuditPhotos.map((photo, pi) => {
                        const hasFix = allFixes.some((fx) => fx.linkedAuditIssueId === photo.id);
                        return (
                        <button
                          key={photo.id}
                          onClick={() => openLightbox(lbPhotos, pi)}
                          className="group relative rounded-xl overflow-hidden border border-gray-100 bg-white text-left flex-shrink-0 w-[155px] shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                        >
                          {photo.photoURL ? (
                            <img src={photo.photoURL} alt="" loading="lazy" className="w-full h-[110px] object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-[110px] flex items-center justify-center bg-gray-50 text-gray-300">
                              <Camera size={20} />
                            </div>
                          )}
                          <div className={`absolute top-2 right-2 w-5.5 h-5.5 rounded-full flex items-center justify-center shadow-sm ${hasFix ? "bg-emerald-500" : "bg-white/90 border border-gray-200"}`}>
                            {hasFix ? (
                              <CheckCircle size={12} className="text-white" />
                            ) : (
                              <AlertTriangle size={10} className="text-gray-400" />
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-[12px] font-semibold text-gray-800 truncate">{photo.category}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {severityConfig[photo.severity] && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${severityConfig[photo.severity].bg} ${severityConfig[photo.severity].color}`}>
                                  {photo.severity}
                                </span>
                              )}
                              <span className={`text-[9px] font-semibold ${hasFix ? "text-emerald-500" : "text-gray-400"}`}>
                                {hasFix ? "Fixed" : "Open"}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate mt-1">{photo.spotTitle}</p>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Inspections */}
          {inspections.map((inspection) => (
            <div key={inspection.id} className="relative overflow-hidden rounded-xl bg-white border border-gray-100">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Inspection</h3>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {inspection.inspectorName} &middot; {formatDate(inspection.date)}
                  </span>
                </div>
                {inspection.notes && <p className="text-[12px] text-gray-500 mb-3 leading-relaxed">{inspection.notes}</p>}

                {(() => {
                  const allFixPhotos = inspection.spots.flatMap((spot) =>
                    spot.fixPhotos.map((photo) => ({ ...photo, spotTitle: spot.title }))
                  );
                  const lbPhotos = buildLightboxPhotos([], allFixPhotos, "", allIssues);
                  return (
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {allFixPhotos.map((photo, pi) => {
                        const linkedIssue = allIssues.find((i) => i.id === photo.linkedAuditIssueId);
                        return (
                          <button
                            key={photo.id}
                            onClick={() => openLightbox(lbPhotos, pi)}
                            className="group relative rounded-xl overflow-hidden border border-gray-100 bg-white text-left flex-shrink-0 w-[155px] shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                          >
                            {photo.photoURL ? (
                              <img src={photo.photoURL} alt="" loading="lazy" className="w-full h-[110px] object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-[110px] flex items-center justify-center bg-gray-50 text-gray-300">
                                <Camera size={20} />
                              </div>
                            )}
                            <div className="p-2.5">
                              {linkedIssue ? (
                                <p className="text-[12px] font-semibold truncate text-emerald-600">Fixes: {linkedIssue.category}</p>
                              ) : (
                                <p className="text-[12px] text-gray-400">Fix photo</p>
                              )}
                              {photo.resolutionNotes && (
                                <p className="text-[10px] text-gray-400 truncate mt-1">{photo.resolutionNotes}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* Time Log */}
          {timeEntries.length > 0 && (
            <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#FF6B35] to-amber-400" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF6B35] to-[#E5532D] flex items-center justify-center">
                      <Clock size={12} className="text-white" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Time Log</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 tabular-nums">
                      {(timeEntries.reduce((s, e) => s + (e.totalSeconds || 0), 0) / 3600).toFixed(1)} hrs
                    </span>
                    <span className="text-[10px] text-gray-400">&middot; {timeEntries.length} visit{timeEntries.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[185px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-100 text-left text-[11px] text-gray-400 uppercase tracking-wider">
                        <th className="pb-2.5 font-semibold">Worker</th>
                        <th className="pb-2.5 font-semibold">Date</th>
                        <th className="pb-2.5 font-semibold">Clock In</th>
                        <th className="pb-2.5 font-semibold">Clock Out</th>
                        <th className="pb-2.5 font-semibold text-right">Duration</th>
                        <th className="pb-2.5 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((entry) => {
                        const secs = entry.totalSeconds || 0;
                        const h = Math.floor(secs / 3600);
                        const m = Math.floor((secs % 3600) / 60);
                        return (
                          <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 font-semibold text-gray-800">{entry.workerName || "Unknown"}</td>
                            <td className="py-2.5 text-gray-500">
                              {entry.clockInTime ? new Date(entry.clockInTime).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}
                            </td>
                            <td className="py-2.5 text-gray-500">
                              {entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }) : "—"}
                            </td>
                            <td className="py-2.5 text-gray-500">
                              {entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }) : "—"}
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-gray-800 tabular-nums">
                              {entry.totalSeconds ? `${h}h ${m}m` : "—"}
                            </td>
                            <td className="py-2.5 pl-2">
                              {entry.isAutoStopped && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Auto</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Stage selector */}
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-orange-400" />
            <div className="p-1.5">
              <select
                value={editStage}
                onChange={(e) => saveStage(e.target.value as JobStage)}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-bold border-0 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 ${stageConfig[editStage].bg} ${stageConfig[editStage].color}`}
              >
                {(Object.keys(stageConfig) as JobStage[]).map((s) => (
                  <option key={s} value={s}>{stageConfig[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rebate Calculator */}
          <RebateCalculator job={job} onUpdate={handleRebateUpdate} />

          {/* Rebate Pipeline */}
          {job.rebate && job.rebate.estimatedRebate > 0 && (
            <RebatePipeline job={job} onUpdate={handleRebateUpdate} />
          )}

          {/* Materials */}
          {allMaterials.length > 0 && (
            <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-violet-400" />
              <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Package size={12} className="text-white" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Materials</h3>
                  <span className="text-[10px] text-gray-400 font-medium">{allMaterials.length}</span>
                </div>
                {allMaterials.some((m) => m.cost != null && m.cost > 0) && (
                  <span className="text-[12px] font-bold text-emerald-600">
                    {formatCurrency(allMaterials.reduce((s, m) => s + (m.cost || 0), 0))}
                  </span>
                )}
              </div>
              <div className="overflow-y-auto max-h-[280px] px-4 pb-3">
                <div className="space-y-1">
                  {allMaterials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{m.name || "Unnamed"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{m.type}{m.quantity ? ` · ${m.quantity}` : ""}</p>
                      </div>
                      {m.cost != null && m.cost > 0 && (
                        <span className="text-[13px] font-bold text-emerald-600 flex-shrink-0 ml-2">${m.cost.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhotos && (
        <PhotoLightbox photos={lightboxPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxPhotos(null)} />
      )}
    </div>
  );
}
