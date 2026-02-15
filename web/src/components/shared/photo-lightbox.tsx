"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { IssuePhoto, FixPhoto } from "@/types";
import { severityConfig, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LightboxPhoto {
  url: string;
  type: "issue" | "fix";
  category?: string;
  severity?: "critical" | "major" | "minor";
  notes?: string;
  resolutionNotes?: string;
  dateTaken?: Date;
  spotTitle?: string;
  linkedIssueCategory?: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];
  if (!photo) return null;

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  const next = () => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative flex max-h-[90vh] max-w-5xl w-full mx-4 bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className="relative flex-1 bg-gray-900 flex items-center justify-center min-h-[400px]">
          {photo.url ? (
            <img src={photo.url} alt="" className="max-h-[80vh] max-w-full object-contain" />
          ) : (
            <div className="text-gray-500 text-sm">No photo available</div>
          )}

          {photos.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2">
                <ChevronLeft size={20} />
              </button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2">
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
            {index + 1} / {photos.length}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 p-5 border-l overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">
              {photo.type === "issue" ? "Issue Photo" : "Fix Photo"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {photo.spotTitle && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Spot</p>
                <p className="text-sm font-medium">{photo.spotTitle}</p>
              </div>
            )}

            {photo.type === "issue" && photo.category && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Category</p>
                <p className="text-sm font-medium">{photo.category}</p>
              </div>
            )}

            {photo.type === "issue" && photo.severity && severityConfig[photo.severity] && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Severity</p>
                <Badge className={`${severityConfig[photo.severity].bg} ${severityConfig[photo.severity].color}`}>
                  {severityConfig[photo.severity].label}
                </Badge>
              </div>
            )}

            {photo.type === "fix" && photo.linkedIssueCategory && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Fixes Issue</p>
                <p className="text-sm font-medium">{photo.linkedIssueCategory}</p>
              </div>
            )}

            {photo.notes && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{photo.notes}</p>
              </div>
            )}

            {photo.resolutionNotes && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Resolution</p>
                <p className="text-sm text-gray-600">{photo.resolutionNotes}</p>
              </div>
            )}

            {photo.dateTaken && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Date</p>
                <p className="text-sm text-gray-500">{formatDateTime(photo.dateTaken)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to build lightbox photos from form data
export function buildLightboxPhotos(
  issuePhotos: IssuePhoto[],
  fixPhotos: FixPhoto[],
  spotTitle: string,
  allIssues?: IssuePhoto[]
): LightboxPhoto[] {
  const issues: LightboxPhoto[] = issuePhotos.map((p) => ({
    url: p.photoURL || "",
    type: "issue" as const,
    category: p.category,
    severity: p.severity,
    notes: p.notes,
    dateTaken: p.dateTaken,
    spotTitle,
  }));

  const fixes: LightboxPhoto[] = fixPhotos.map((p) => {
    const linkedIssue = allIssues?.find((i) => i.id === p.linkedAuditIssueId);
    return {
      url: p.photoURL || "",
      type: "fix" as const,
      resolutionNotes: p.resolutionNotes,
      dateTaken: p.dateTaken,
      spotTitle,
      linkedIssueCategory: linkedIssue?.category,
    };
  });

  return [...issues, ...fixes];
}
