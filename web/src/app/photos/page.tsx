"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PhotoLightbox } from "@/components/shared/photo-lightbox";
import { severityConfig, formatDate } from "@/lib/utils";
import { Job, InspectionForm, IssuePhoto, FixPhoto, IssueSeverity } from "@/types";
import { Loader2, Camera } from "lucide-react";

interface PhotoItem {
  url: string;
  type: "issue" | "fix";
  category?: string;
  severity?: IssueSeverity;
  notes?: string;
  resolutionNotes?: string;
  dateTaken?: Date;
  spotTitle: string;
  jobAddress: string;
  jobId: string;
  linkedIssueCategory?: string;
  inspectorName: string;
  linkedPhotoURL?: string;
  linkedSeverity?: IssueSeverity;
  linkedCategory?: string;
  linkedNotes?: string;
  linkedDate?: Date;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [inspectorFilter, setInspectorFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const jobsRes = await fetch("/api/jobs?limit=500");
      const { jobs } = await jobsRes.json();
      const items: PhotoItem[] = [];

      for (const job of jobs as Job[]) {
        const formsRes = await fetch(`/api/forms/${job.id}`);
        const { forms } = await formsRes.json();

        const allIssues: IssuePhoto[] = [];
        (forms as InspectionForm[]).forEach((f) => {
          f.spots.forEach((s) => allIssues.push(...s.issuePhotos));
        });

        const allFixes: FixPhoto[] = [];
        (forms as InspectionForm[]).forEach((f) => {
          f.spots.forEach((s) => allFixes.push(...s.fixPhotos));
        });

        (forms as InspectionForm[]).forEach((f) => {
          f.spots.forEach((spot) => {
            spot.issuePhotos.forEach((p) => {
              if (p.photoURL) {
                const linkedFix = allFixes.find((fx) => fx.linkedAuditIssueId === p.id);
                items.push({
                  url: p.photoURL,
                  type: "issue",
                  category: p.category,
                  severity: p.severity,
                  notes: p.notes,
                  dateTaken: p.dateTaken,
                  spotTitle: spot.title,
                  jobAddress: job.address,
                  jobId: job.id,
                  inspectorName: f.inspectorName || "Unknown",
                  linkedPhotoURL: linkedFix?.photoURL || undefined,
                  resolutionNotes: linkedFix?.resolutionNotes,
                });
              }
            });
            spot.fixPhotos.forEach((p) => {
              if (p.photoURL) {
                const linked = allIssues.find((i) => i.id === p.linkedAuditIssueId);
                items.push({
                  url: p.photoURL,
                  type: "fix",
                  resolutionNotes: p.resolutionNotes,
                  dateTaken: p.dateTaken,
                  spotTitle: spot.title,
                  jobAddress: job.address,
                  jobId: job.id,
                  linkedIssueCategory: linked?.category,
                  inspectorName: f.inspectorName || "Unknown",
                  linkedPhotoURL: linked?.photoURL || undefined,
                  linkedSeverity: linked?.severity,
                  linkedCategory: linked?.category,
                  linkedNotes: linked?.notes,
                  linkedDate: linked?.dateTaken,
                });
              }
            });
          });
        });
      }

      setPhotos(items);
      setLoading(false);
    }
    load();
  }, []);

  // Derive unique inspector names and categories for filter dropdowns
  const inspectorNames = [...new Set(photos.map((p) => p.inspectorName))].sort();
  const categories = [...new Set(photos.map((p) => p.category || p.linkedIssueCategory).filter(Boolean) as string[])].sort();

  const filtered = photos.filter((p) => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (severityFilter && p.type === "issue" && p.severity !== severityFilter) return false;
    if (inspectorFilter && p.inspectorName !== inspectorFilter) return false;
    if (categoryFilter) {
      const photoCategory = p.category || p.linkedIssueCategory;
      if (photoCategory !== categoryFilter) return false;
    }
    return true;
  });

  const lightboxPhotos = filtered.map((p) => ({
    url: p.url,
    type: p.type,
    category: p.category,
    severity: p.severity,
    notes: p.notes,
    resolutionNotes: p.resolutionNotes,
    dateTaken: p.dateTaken,
    spotTitle: p.spotTitle,
    linkedIssueCategory: p.linkedIssueCategory,
    linkedPhotoURL: p.linkedPhotoURL,
    linkedSeverity: p.linkedSeverity,
    linkedCategory: p.linkedCategory,
    linkedNotes: p.linkedNotes,
    linkedDate: p.linkedDate,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Photos</h1>
        <p className="text-sm text-gray-500 mt-1">{photos.length} total photos across all jobs</p>
      </div>

      {/* Filters */}
      <Card className="mt-6 flex-shrink-0">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-36 text-xs h-8">
            <option value="">All Types</option>
            <option value="issue">Issues</option>
            <option value="fix">Fixes</option>
          </Select>
          <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-36 text-xs h-8">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </Select>
          <Select value={inspectorFilter} onChange={(e) => setInspectorFilter(e.target.value)} className="w-40 text-xs h-8">
            <option value="">All Inspectors</option>
            {inspectorNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-44 text-xs h-8">
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          <div className="ml-auto text-xs text-gray-400 self-center">{filtered.length} photos</div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </div>
      ) : (
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((photo, i) => (
              <button
                key={`${photo.url}-${i}`}
                onClick={() => setLightboxIndex(i)}
                className="group relative rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <img src={photo.url} alt="" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                <div className="p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    {photo.type === "issue" ? (
                      <Badge className="bg-red-50 text-red-600 text-[9px] px-1.5 py-0">Issue</Badge>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0">Fix</Badge>
                    )}
                    {photo.severity && severityConfig[photo.severity] && (
                      <Badge className={`${severityConfig[photo.severity].bg} ${severityConfig[photo.severity].color} text-[9px] px-1.5 py-0`}>
                        {photo.severity}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] font-medium truncate">{photo.category || photo.linkedIssueCategory || "Fix photo"}</p>
                  <p className="text-[10px] text-gray-400 truncate">{photo.jobAddress}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox photos={lightboxPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
