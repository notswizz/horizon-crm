"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/shared/stage-badge";
import { RebateBadge } from "@/components/shared/rebate-badge";
import { PhotoLightbox, buildLightboxPhotos } from "@/components/shared/photo-lightbox";
import { formatDate, formatDateTime, formatCurrency, severityConfig, estimateJobValue, stageConfig } from "@/lib/utils";
import { Job, InspectionForm, JobStage, RebateOutcome, IssuePhoto } from "@/types";
import {
  Loader2, MapPin, User, Phone, Mail, Calendar, Camera, AlertTriangle,
  Wrench, Save, ChevronRight, Package, DollarSign, CheckCircle,
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

      {/* Hero card */}
      <div className="rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#E85A28] p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{job.address || "Untitled"}</h1>
            <p className="text-white/70 text-sm mt-1">{formatDate(job.createdAt)}</p>
          </div>
          <StageBadge stage={job.currentStage} />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
          {job.contactName && (
            <span className="flex items-center gap-1.5"><User size={14} /> {job.contactName}</span>
          )}
          {job.contactPhone && (
            <a href={`tel:${job.contactPhone}`} className="flex items-center gap-1.5 hover:text-white"><Phone size={14} /> {job.contactPhone}</a>
          )}
          {job.contactEmail && (
            <a href={`mailto:${job.contactEmail}`} className="flex items-center gap-1.5 hover:text-white"><Mail size={14} /> {job.contactEmail}</a>
          )}
        </div>

        {job.notes && <p className="text-sm text-white/70 mt-3">{job.notes}</p>}

        <div className="flex gap-4 mt-4 pt-4 border-t border-white/20 text-sm">
          <span className="flex items-center gap-1"><Camera size={14} /> {job.photoCount} photos</span>
          <span className="flex items-center gap-1"><AlertTriangle size={14} /> {job.issueCount} issues</span>
          <span className="flex items-center gap-1"><Wrench size={14} /> {job.fixCount} fixes</span>
        </div>
      </div>

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
                  const lbPhotos = buildLightboxPhotos(allAuditPhotos, [], "");
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
