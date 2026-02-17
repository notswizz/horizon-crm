"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, MapPin, Calendar, FileText, ArrowRight } from "lucide-react";
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
  linkedPhotoURL?: string;
  linkedSeverity?: "critical" | "major" | "minor";
  linkedCategory?: string;
  linkedNotes?: string;
  linkedDate?: Date;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [showLinked, setShowLinked] = useState(false);
  const photo = photos[index];

  const hasLinked = !!photo?.linkedPhotoURL;

  const prev = useCallback(() => { setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)); setShowLinked(false); }, [photos.length]);
  const next = useCallback(() => { setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)); setShowLinked(false); }, [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); if (hasLinked) setShowLinked((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next, hasLinked]);

  if (!photo) return null;

  // When showLinked is true, flip the view: show the linked photo as the main image
  const isFlipped = showLinked && hasLinked;
  const displayURL = isFlipped ? photo.linkedPhotoURL! : photo.url;
  const isIssue = isFlipped ? (photo.type !== "issue") : (photo.type === "issue");
  const displayType = isFlipped ? (photo.type === "issue" ? "fix" : "issue") : photo.type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
        <X size={20} />
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
          <span className="text-white/60 text-sm font-medium tabular-nums">
            <span className="text-white font-bold">{index + 1}</span> / {photos.length}
          </span>
        </div>
      )}

      {/* Photo type badge + linked toggle */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
          isIssue ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
        }`}>
          {isIssue ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
          {isIssue ? "Issue" : "Fix"}
        </div>
        {hasLinked && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowLinked((v) => !v); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              showLinked
                ? (photo.type === "issue"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30")
                : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
            }`}
          >
            <ArrowRight size={12} className={showLinked ? "rotate-180" : ""} />
            {showLinked
              ? `Back to ${photo.type === "issue" ? "Issue" : "Fix"}`
              : `View ${photo.type === "issue" ? "Fix" : "Issue"}`
            }
          </button>
        )}
      </div>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-110">
            <ChevronLeft size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-110">
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Main content */}
      <div className="relative flex max-h-[88vh] max-w-[1100px] w-full mx-16 rounded-2xl overflow-hidden shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
        {/* Image area */}
        <div className="relative flex-1 bg-gray-950 flex items-center justify-center min-h-[500px]">
          {displayURL ? (
            <img src={displayURL} alt="" className="max-h-[85vh] max-w-full object-contain select-none" draggable={false} />
          ) : (
            <div className="text-gray-600 text-sm font-medium">No photo available</div>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-4">
              <div className="flex justify-center gap-1.5 overflow-x-auto max-w-full">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      i === index ? "border-white shadow-lg shadow-white/20 scale-110" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {p.url ? (
                      <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details panel */}
        <div className="w-80 bg-gray-950 border-l border-white/10 flex flex-col">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isIssue ? "bg-red-500/20" : "bg-emerald-500/20"
              }`}>
                {isIssue ? <AlertTriangle size={14} className="text-red-400" /> : <CheckCircle size={14} className="text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isIssue ? (photo.category || "Issue") : (photo.linkedIssueCategory ? `Fix: ${photo.linkedIssueCategory}` : "Fix Photo")}
                </h3>
                {photo.spotTitle && (
                  <p className="text-[11px] text-white/40 font-medium mt-0.5">{photo.spotTitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Before & After comparison */}
            {photo.linkedPhotoURL && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2.5">Before & After</p>
                <div className="flex gap-2 items-center">
                  {/* Before (issue) thumbnail */}
                  {(() => {
                    const beforeURL = photo.type === "fix" ? photo.linkedPhotoURL : photo.url;
                    const isBeforeActive = displayURL === beforeURL;
                    return (
                      <button className="flex-1" onClick={() => setShowLinked(photo.type === "fix")}>
                        <div className={`relative rounded-xl overflow-hidden border-2 aspect-[4/3] transition-all ${isBeforeActive ? "border-red-400 shadow-lg shadow-red-500/20" : "border-white/10 opacity-60 hover:opacity-80"}`}>
                          <img src={beforeURL} alt="Before" loading="lazy" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-red-900/60 to-transparent" />
                          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-300 uppercase tracking-wider">Issue</span>
                        </div>
                      </button>
                    );
                  })()}
                  <ArrowRight size={14} className="text-white/20 flex-shrink-0" />
                  {/* After (fix) thumbnail */}
                  {(() => {
                    const afterURL = photo.type === "fix" ? photo.url : photo.linkedPhotoURL;
                    const isAfterActive = displayURL === afterURL;
                    return (
                      <button className="flex-1" onClick={() => setShowLinked(photo.type === "issue")}>
                        <div className={`relative rounded-xl overflow-hidden border-2 aspect-[4/3] transition-all ${isAfterActive ? "border-emerald-400 shadow-lg shadow-emerald-500/20" : "border-white/10 opacity-60 hover:opacity-80"}`}>
                          <img src={afterURL!} alt="After" loading="lazy" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 to-transparent" />
                          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">Fix</span>
                        </div>
                      </button>
                    );
                  })()}
                </div>
                {photo.type === "fix" && photo.linkedCategory && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {photo.linkedSeverity && severityConfig[photo.linkedSeverity] && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${severityConfig[photo.linkedSeverity].bg} ${severityConfig[photo.linkedSeverity].color}`}>
                        {severityConfig[photo.linkedSeverity].label}
                      </span>
                    )}
                    <span className="text-xs text-white/50">{photo.linkedCategory}</span>
                  </div>
                )}
              </div>
            )}

            {/* Severity */}
            {isIssue && photo.severity && severityConfig[photo.severity] && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Severity</p>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${severityConfig[photo.severity].bg} ${severityConfig[photo.severity].color}`}>
                  {severityConfig[photo.severity].label}
                </span>
              </div>
            )}

            {/* Category */}
            {isIssue && photo.category && !photo.linkedPhotoURL && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Category</p>
                <p className="text-sm font-medium text-white/80">{photo.category}</p>
              </div>
            )}

            {/* Fixes Issue */}
            {!isIssue && photo.linkedIssueCategory && !photo.linkedPhotoURL && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Fixes Issue</p>
                <p className="text-sm font-medium text-white/80">{photo.linkedIssueCategory}</p>
              </div>
            )}

            {/* Notes */}
            {photo.notes && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Notes</p>
                <p className="text-[13px] text-white/60 leading-relaxed">{photo.notes}</p>
              </div>
            )}

            {/* Resolution notes */}
            {photo.resolutionNotes && !(isIssue && photo.linkedPhotoURL) && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Resolution</p>
                <div className="px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[13px] text-emerald-300/80 leading-relaxed">{photo.resolutionNotes}</p>
                </div>
              </div>
            )}

            {/* Date */}
            {photo.dateTaken && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-white/30" />
                  <p className="text-[13px] text-white/50">{formatDateTime(photo.dateTaken)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Keyboard hint */}
          <div className="px-5 py-3 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center justify-center gap-4 text-[10px] text-white/20 font-medium flex-wrap">
              {photos.length > 1 && (
                <>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-mono">&larr;</kbd> Prev</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-mono">&rarr;</kbd> Next</span>
                </>
              )}
              {hasLinked && (
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-mono">&uarr;&darr;</kbd> Toggle</span>
              )}
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-mono">Esc</kbd> Close</span>
            </div>
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
  allIssues?: IssuePhoto[],
  allFixes?: FixPhoto[]
): LightboxPhoto[] {
  const fixPool = allFixes || fixPhotos;
  const issuePool = allIssues || issuePhotos;

  const issues: LightboxPhoto[] = issuePhotos.map((p) => {
    const linkedFix = fixPool.find((f) => f.linkedAuditIssueId === p.id);
    return {
      url: p.photoURL || "",
      type: "issue" as const,
      category: p.category,
      severity: p.severity,
      notes: p.notes,
      dateTaken: p.dateTaken,
      spotTitle,
      linkedPhotoURL: linkedFix?.photoURL || undefined,
      resolutionNotes: linkedFix?.resolutionNotes,
    };
  });

  const fixes: LightboxPhoto[] = fixPhotos.map((p) => {
    const linkedIssue = issuePool.find((i) => i.id === p.linkedAuditIssueId);
    return {
      url: p.photoURL || "",
      type: "fix" as const,
      resolutionNotes: p.resolutionNotes,
      dateTaken: p.dateTaken,
      spotTitle,
      linkedIssueCategory: linkedIssue?.category,
      linkedPhotoURL: linkedIssue?.photoURL || undefined,
      linkedSeverity: linkedIssue?.severity,
      linkedCategory: linkedIssue?.category,
      linkedNotes: linkedIssue?.notes,
      linkedDate: linkedIssue?.dateTaken,
    };
  });

  return [...issues, ...fixes];
}
