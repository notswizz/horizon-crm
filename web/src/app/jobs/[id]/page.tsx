"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PhotoLightbox, buildLightboxPhotos } from "@/components/shared/photo-lightbox";
import { formatDate, formatDateTime, formatCurrency, severityConfig, estimateJobValue, stageConfig } from "@/lib/utils";
import { Job, InspectionForm, JobStage, RebateOutcome, IssuePhoto, FixPhoto } from "@/types";
import {
  Loader2, MapPin, User, Phone, Mail, Camera, AlertTriangle,
  Wrench, Save, ChevronRight, Package, CheckCircle,
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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/jobs" className="hover:text-[#FF6B35]">Jobs</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{job.address || "Untitled"}</span>
      </div>

      {/* Hero Banner */}
      <div className="relative h-64 w-full rounded-b-2xl overflow-hidden shadow-lg">
        {job.houseImageURL ? (
          <img src={job.houseImageURL} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#E85A28] via-[#FF6B35] to-[#E85A28]">
            <div className="flex flex-col items-center justify-center h-full text-white/50">
              <Camera size={36} strokeWidth={1.5} />
              <span className="text-sm font-medium mt-2">No photo</span>
            </div>
          </div>
        )}
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        {/* Top-left: date */}
        <div className="absolute top-4 left-4">
          <span className="text-xs font-semibold text-white backdrop-blur-xl bg-white/15 px-3 py-1.5 rounded-full border border-white/20">
            {formatDate(job.createdAt)}
          </span>
        </div>

        {/* Top-right: stage */}
        <div className="absolute top-4 right-4">
          <span className="text-xs font-semibold text-white backdrop-blur-xl bg-white/15 px-3 py-1.5 rounded-full border border-white/20">
            {stageConfig[job.currentStage]?.label || job.currentStage}
          </span>
        </div>

        {/* Bottom-left: address */}
        <div className="absolute bottom-4 left-4 right-24">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">{job.address || "Untitled"}</h1>
          {(job.city || job.state) && (
            <div className="flex items-center gap-1 mt-1 text-white/85">
              <MapPin size={12} />
              <span className="text-sm font-medium">{[job.city, job.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        {/* Bottom-right: rebate chip */}
        {job.rebateOutcome !== "pending" && (
          <div className="absolute bottom-4 right-4">
            <span className={`text-xs font-bold text-white backdrop-blur-xl bg-white/15 px-3 py-1.5 rounded-full border ${job.rebateOutcome === "approved" ? "border-emerald-400" : "border-red-400"}`}>
              {job.rebateOutcome === "approved" && job.rebateAmount > 0
                ? `$${Math.round(job.rebateAmount).toLocaleString()}`
                : job.rebateOutcome === "approved" ? "Approved" : "Declined"}
            </span>
          </div>
        )}
      </div>

      {/* Contact Row */}
      {(job.contactName || job.contactPhone || job.contactEmail || job.notes) && (
        <Card>
          <CardContent className="p-4">
            {(job.contactName || job.contactPhone || job.contactEmail) && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E85A28] flex items-center justify-center">
                  <User size={13} className="text-white" />
                </div>
                {job.contactName && <span className="text-sm font-semibold">{job.contactName}</span>}
                <div className="ml-auto flex items-center gap-2">
                  {job.contactPhone && (
                    <a href={`tel:${job.contactPhone}`} className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                      <Phone size={14} className="text-blue-500" />
                    </a>
                  )}
                  {job.contactEmail && (
                    <a href={`mailto:${job.contactEmail}`} className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors">
                      <Mail size={14} className="text-blue-500" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {job.notes && (
              <>
                {(job.contactName || job.contactPhone || job.contactEmail) && <hr className="my-3" />}
                <p className="text-sm text-gray-500">{job.notes}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics Card */}
      <Card className="overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#FF6B35] via-[#3B82F6] via-50% via-[#EF4444] to-[#10B981]" />
        <CardContent className="p-0">
          <div className="grid grid-cols-4 divide-x py-4">
            {[
              { value: job.spots.length, label: "Spots", color: "text-[#FF6B35]" },
              { value: job.photoCount, label: "Photos", color: "text-blue-500" },
              { value: job.issueCount, label: "Issues", color: "text-red-500" },
              { value: job.fixCount, label: "Fixes", color: "text-emerald-500" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className={`text-2xl font-bold ${m.value > 0 ? m.color : "text-gray-200"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{m.value}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spots */}
          {job.spots.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-[#FF6B35]" /> Spots
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.spots.map((spot) => (
                    <div key={spot.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border text-sm">
                      <span className="font-medium">{spot.title || "Untitled"}</span>
                      <Badge className="bg-orange-50 text-[#FF6B35] text-[10px]">{spot.jobType}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit */}
          {audit && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" /> Audit
                </h3>
                <div className="text-xs text-gray-400 mb-4">
                  {audit.inspectorName} · {formatDate(audit.date)}
                  {audit.notes && <span className="ml-2">— {audit.notes}</span>}
                </div>

                {(() => {
                  const allAuditPhotos = audit.spots.flatMap((spot) =>
                    spot.issuePhotos.map((photo) => ({ ...photo, spotTitle: spot.title }))
                  );
                  const lbPhotos = buildLightboxPhotos(allAuditPhotos, [], "", undefined, allFixes);
                  return (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {allAuditPhotos.map((photo, pi) => (
                        <button
                          key={photo.id}
                          onClick={() => openLightbox(lbPhotos, pi)}
                          className="group relative rounded-lg overflow-hidden border bg-gray-50 text-left flex-shrink-0 w-44"
                        >
                          {photo.photoURL ? (
                            <img src={photo.photoURL} alt="" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center text-gray-300">
                              <Camera size={24} />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{photo.category}</p>
                            {severityConfig[photo.severity] && (
                              <Badge className={`${severityConfig[photo.severity].bg} ${severityConfig[photo.severity].color} text-[10px] mt-1`}>
                                {photo.severity}
                              </Badge>
                            )}
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{photo.spotTitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Inspections */}
          {inspections.map((inspection) => (
            <Card key={inspection.id}>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" /> Inspection
                </h3>
                <div className="text-xs text-gray-400 mb-4">
                  {inspection.inspectorName} · {formatDate(inspection.date)}
                  {inspection.notes && <span className="ml-2">— {inspection.notes}</span>}
                </div>

                {(() => {
                  const allFixPhotos = inspection.spots.flatMap((spot) =>
                    spot.fixPhotos.map((photo) => ({ ...photo, spotTitle: spot.title }))
                  );
                  const lbPhotos = buildLightboxPhotos([], allFixPhotos, "", allIssues);
                  return (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {allFixPhotos.map((photo, pi) => {
                        const linkedIssue = allIssues.find((i) => i.id === photo.linkedAuditIssueId);
                        return (
                          <button
                            key={photo.id}
                            onClick={() => openLightbox(lbPhotos, pi)}
                            className="group relative rounded-lg overflow-hidden border bg-gray-50 text-left flex-shrink-0 w-44"
                          >
                            {photo.photoURL ? (
                              <img src={photo.photoURL} alt="" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-32 flex items-center justify-center text-gray-300">
                                <Camera size={24} />
                              </div>
                            )}
                            <div className="p-2">
                              {linkedIssue ? (
                                <p className="text-xs font-medium truncate text-emerald-600">Fixes: {linkedIssue.category}</p>
                              ) : (
                                <p className="text-xs text-gray-400">Fix photo</p>
                              )}
                              {photo.resolutionNotes && (
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{photo.resolutionNotes}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Materials */}
                {inspection.spots.some((s) => s.materials.length > 0) && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Materials</p>
                    <div className="space-y-1">
                      {inspection.spots.flatMap((s) => s.materials).map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <Package size={12} className="text-purple-400" />
                            <span>{m.name || "Unnamed"}</span>
                            <span className="text-gray-400">{m.quantity}</span>
                          </div>
                          {m.cost != null && m.cost > 0 && (
                            <span className="font-medium text-emerald-600">${m.cost.toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Stage editor */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">Stage</h3>
              <Select value={editStage} onChange={(e) => setEditStage(e.target.value as JobStage)}>
                {(Object.keys(stageConfig) as JobStage[]).map((s) => (
                  <option key={s} value={s}>{stageConfig[s].label}</option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {/* Rebate editor */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">Rebate</h3>
              <Select value={editRebateOutcome} onChange={(e) => setEditRebateOutcome(e.target.value as RebateOutcome)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </Select>
              {editRebateOutcome === "approved" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount ($)</label>
                  <Input type="number" value={editRebateAmount} onChange={(e) => setEditRebateAmount(e.target.value)} placeholder="0" />
                </div>
              )}
              <Button onClick={saveChanges} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save size={14} className="mr-1.5" /> Save Changes</>}
              </Button>
            </CardContent>
          </Card>

          {/* Dataset value */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-2">Dataset Value</h3>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(datasetValue)}</p>
            </CardContent>
          </Card>

          {/* Materials summary */}
          {allMaterials.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package size={14} className="text-purple-500" /> Materials ({allMaterials.length})
                </h3>
                <div className="space-y-2">
                  {allMaterials.map((m) => (
                    <div key={m.id} className="text-xs flex justify-between">
                      <span>{m.name || "Unnamed"} <span className="text-gray-400">({m.type})</span></span>
                      {m.cost != null && m.cost > 0 && (
                        <span className="font-medium text-emerald-600">${m.cost.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                  {allMaterials.some((m) => m.cost != null && m.cost > 0) && (
                    <div className="pt-2 border-t flex justify-between text-xs font-semibold">
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
