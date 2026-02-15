"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PhotoLightbox, buildLightboxPhotos } from "@/components/shared/photo-lightbox";
import { formatDate, formatCurrency, severityConfig, estimateJobValue, stageConfig } from "@/lib/utils";
import { Job, InspectionForm, JobStage, RebateOutcome, IssuePhoto, FixPhoto } from "@/types";
import {
  Loader2, MapPin, User, Phone, Mail, Camera, AlertTriangle,
  Save, ChevronRight, Package, CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [forms, setForms] = useState<InspectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editStage, setEditStage] = useState<JobStage>("auditPending");
  const [editRebateOutcome, setEditRebateOutcome] = useState<RebateOutcome>("pending");
  const [editRebateAmount, setEditRebateAmount] = useState("");
  const [lightboxPhotos, setLightboxPhotos] = useState<ReturnType<typeof buildLightboxPhotos> | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data.job);
        setForms(data.forms || []);
        setEditStage(data.job.currentStage);
        setEditRebateOutcome(data.job.rebateOutcome);
        setEditRebateAmount(data.job.rebateAmount > 0 ? String(data.job.rebateAmount) : "");
        setLoading(false);
      });
  }, [id]);

  const saveChanges = async () => {
    if (!job) return;
    setSaving(true);
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentStage: editStage,
        rebateOutcome: editRebateOutcome,
        rebateAmount: editRebateOutcome === "approved" ? parseFloat(editRebateAmount) || 0 : 0,
      }),
    });
    setJob({
      ...job,
      currentStage: editStage,
      rebateOutcome: editRebateOutcome,
      rebateAmount: editRebateOutcome === "approved" ? parseFloat(editRebateAmount) || 0 : 0,
    });
    setSaving(false);
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
  const datasetValue = estimateJobValue(job, forms);

  const openLightbox = (photos: ReturnType<typeof buildLightboxPhotos>, index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  };

  const stageCfg = stageConfig[job.currentStage];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/jobs" className="hover:text-[#FF6B35]">Jobs</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{job.address || "Untitled"}</span>
      </div>

      {/* Compact Hero Banner */}
      <div className="relative h-40 w-full rounded-xl overflow-hidden shadow-md">
        {job.houseImageURL ? (
          <img src={job.houseImageURL} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#E85A28] via-[#FF6B35] to-[#E85A28]">
            <div className="flex flex-col items-center justify-center h-full text-white/50">
              <Camera size={28} strokeWidth={1.5} />
              <span className="text-xs font-medium mt-1">No photo</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        <div className="absolute top-3 left-3">
          <span className="text-[11px] font-semibold text-white backdrop-blur-xl bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
            {formatDate(job.createdAt)}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span className={`text-[11px] font-semibold backdrop-blur-xl px-2.5 py-1 rounded-full border border-white/20 ${stageCfg ? "text-white bg-white/15" : "text-white bg-white/15"}`}>
            {stageCfg?.label || job.currentStage}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-20">
          <h1 className="text-xl font-bold text-white drop-shadow-lg leading-tight">{job.address || "Untitled"}</h1>
          {(job.city || job.state) && (
            <div className="flex items-center gap-1 mt-0.5 text-white/85">
              <MapPin size={11} />
              <span className="text-xs font-medium">{[job.city, job.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        {job.rebateOutcome !== "pending" && (
          <div className="absolute bottom-3 right-3">
            <span className={`text-[11px] font-bold text-white backdrop-blur-xl bg-white/15 px-2.5 py-1 rounded-full border ${job.rebateOutcome === "approved" ? "border-emerald-400" : "border-red-400"}`}>
              {job.rebateOutcome === "approved" && job.rebateAmount > 0
                ? `$${Math.round(job.rebateAmount).toLocaleString()}`
                : job.rebateOutcome === "approved" ? "Approved" : "Declined"}
            </span>
          </div>
        )}
      </div>

      {/* Contact + Metrics inline row */}
      <div className="flex items-center gap-4 flex-wrap">
        {(job.contactName || job.contactPhone || job.contactEmail) && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E85A28] flex items-center justify-center">
              <User size={11} className="text-white" />
            </div>
            {job.contactName && <span className="text-sm font-medium text-gray-700">{job.contactName}</span>}
            {job.contactPhone && (
              <a href={`tel:${job.contactPhone}`} className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                <Phone size={11} className="text-blue-500" />
              </a>
            )}
            {job.contactEmail && (
              <a href={`mailto:${job.contactEmail}`} className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                <Mail size={11} className="text-blue-500" />
              </a>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1" />
          </div>
        )}

        {[
          { value: job.spots.length, label: "Spots", color: "text-[#FF6B35]", bg: "bg-orange-50" },
          { value: job.photoCount, label: "Photos", color: "text-blue-500", bg: "bg-blue-50" },
          { value: job.issueCount, label: "Issues", color: "text-red-500", bg: "bg-red-50" },
          { value: job.fixCount, label: "Fixes", color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((m) => (
          <div key={m.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${m.bg}`}>
            <span className={`text-sm font-bold ${m.value > 0 ? m.color : "text-gray-300"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
            <span className="text-[11px] text-gray-500">{m.label}</span>
          </div>
        ))}

        {job.notes && (
          <>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <div className="flex items-center gap-1 min-w-0">
              <p className={`text-xs text-gray-400 ${notesExpanded ? "" : "truncate max-w-xs"}`}>{job.notes}</p>
              {job.notes.length > 60 && (
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="text-[10px] text-[#FF6B35] hover:text-[#E5532D] font-medium flex-shrink-0"
                >
                  {notesExpanded ? "less" : "more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Spots — inline chips, no card */}
          {job.spots.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin size={12} className="text-[#FF6B35]" /> Spots
              </h3>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {job.spots.map((spot) => (
                  <div key={spot.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md border text-xs flex-shrink-0">
                    <span className="font-medium whitespace-nowrap">{spot.title || "Untitled"}</span>
                    <Badge className="bg-orange-50 text-[#FF6B35] text-[9px] px-1 py-0 whitespace-nowrap">{spot.jobType}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit */}
          {audit && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-red-500" /> Audit
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {audit.inspectorName} · {formatDate(audit.date)}
                  </span>
                </div>
                {audit.notes && <p className="text-[11px] text-gray-400 mb-2">{audit.notes}</p>}

                {(() => {
                  const allAuditPhotos = audit.spots.flatMap((spot) =>
                    spot.issuePhotos.map((photo) => ({ ...photo, spotTitle: spot.title }))
                  );
                  const lbPhotos = buildLightboxPhotos(allAuditPhotos, [], "", undefined, allFixes);
                  return (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allAuditPhotos.map((photo, pi) => {
                        const hasFix = allFixes.some((fx) => fx.linkedAuditIssueId === photo.id);
                        return (
                        <button
                          key={photo.id}
                          onClick={() => openLightbox(lbPhotos, pi)}
                          className="group relative rounded-lg overflow-hidden border bg-gray-50 text-left flex-shrink-0 w-36"
                        >
                          {photo.photoURL ? (
                            <img src={photo.photoURL} alt="" className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-28 flex items-center justify-center text-gray-300">
                              <Camera size={20} />
                            </div>
                          )}
                          {/* Fixed indicator */}
                          <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${hasFix ? "bg-emerald-500" : "bg-white/80 border border-gray-200"}`}>
                            {hasFix ? (
                              <CheckCircle size={12} className="text-white" />
                            ) : (
                              <AlertTriangle size={10} className="text-gray-400" />
                            )}
                          </div>
                          <div className="p-1.5">
                            <p className="text-[11px] font-medium truncate">{photo.category}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {severityConfig[photo.severity] && (
                                <Badge className={`${severityConfig[photo.severity].bg} ${severityConfig[photo.severity].color} text-[9px]`}>
                                  {photo.severity}
                                </Badge>
                              )}
                              <span className={`text-[9px] font-medium ${hasFix ? "text-emerald-500" : "text-gray-400"}`}>
                                {hasFix ? "Fixed" : "Open"}
                              </span>
                            </div>
                            <p className="text-[9px] text-gray-400 truncate mt-0.5">{photo.spotTitle}</p>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Inspections */}
          {inspections.map((inspection) => (
            <Card key={inspection.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-emerald-500" /> Inspection
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {inspection.inspectorName} · {formatDate(inspection.date)}
                  </span>
                </div>
                {inspection.notes && <p className="text-[11px] text-gray-400 mb-2">{inspection.notes}</p>}

                {(() => {
                  const allFixPhotos = inspection.spots.flatMap((spot) =>
                    spot.fixPhotos.map((photo) => ({ ...photo, spotTitle: spot.title }))
                  );
                  const lbPhotos = buildLightboxPhotos([], allFixPhotos, "", allIssues);
                  return (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allFixPhotos.map((photo, pi) => {
                        const linkedIssue = allIssues.find((i) => i.id === photo.linkedAuditIssueId);
                        return (
                          <button
                            key={photo.id}
                            onClick={() => openLightbox(lbPhotos, pi)}
                            className="group relative rounded-lg overflow-hidden border bg-gray-50 text-left flex-shrink-0 w-36"
                          >
                            {photo.photoURL ? (
                              <img src={photo.photoURL} alt="" className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-28 flex items-center justify-center text-gray-300">
                                <Camera size={20} />
                              </div>
                            )}
                            <div className="p-1.5">
                              {linkedIssue ? (
                                <p className="text-[11px] font-medium truncate text-emerald-600">Fixes: {linkedIssue.category}</p>
                              ) : (
                                <p className="text-[11px] text-gray-400">Fix photo</p>
                              )}
                              {photo.resolutionNotes && (
                                <p className="text-[9px] text-gray-400 truncate mt-0.5">{photo.resolutionNotes}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right sidebar — combined card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Stage */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Stage</label>
                <Select value={editStage} onChange={(e) => setEditStage(e.target.value as JobStage)} className="text-sm">
                  {(Object.keys(stageConfig) as JobStage[]).map((s) => (
                    <option key={s} value={s}>{stageConfig[s].label}</option>
                  ))}
                </Select>
              </div>

              <hr className="border-gray-100" />

              {/* Rebate */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Rebate</label>
                <Select value={editRebateOutcome} onChange={(e) => setEditRebateOutcome(e.target.value as RebateOutcome)} className="text-sm">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </Select>
                {editRebateOutcome === "approved" && (
                  <div className="mt-2">
                    <label className="text-[11px] text-gray-400 mb-0.5 block">Amount ($)</label>
                    <Input type="number" value={editRebateAmount} onChange={(e) => setEditRebateAmount(e.target.value)} placeholder="0" className="text-sm" />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Dataset value */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Dataset Value</span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(datasetValue)}</span>
              </div>

              <Button onClick={saveChanges} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save size={14} className="mr-1.5" /> Save Changes</>}
              </Button>
            </CardContent>
          </Card>

          {/* Materials summary */}
          {allMaterials.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Package size={12} className="text-purple-500" /> Materials ({allMaterials.length})
                </h3>
                <div className="space-y-1">
                  {allMaterials.map((m) => (
                    <div key={m.id} className="text-[11px] flex justify-between">
                      <span>{m.name || "Unnamed"} <span className="text-gray-400">({m.type})</span></span>
                      {m.cost != null && m.cost > 0 && (
                        <span className="font-medium text-emerald-600">${m.cost.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                  {allMaterials.some((m) => m.cost != null && m.cost > 0) && (
                    <div className="pt-1.5 border-t flex justify-between text-[11px] font-semibold">
                      <span>Total</span>
                      <span className="text-emerald-600">
                        {formatCurrency(allMaterials.reduce((s, m) => s + (m.cost || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
