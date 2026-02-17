"use client";

import { useEffect, useRef, useState, useId } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { stageConfig } from "@/lib/utils";
import { Job } from "@/types";

// Fix default marker icon issue in Next.js/webpack
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STAGE_PIN_COLORS: Record<string, string> = {
  auditPending: "#9CA3AF",
  workInProgress: "#F59E0B",
  inspectionPending: "#FF6B35",
  completed: "#10B981",
  cancelled: "#EF4444",
};

function createColoredIcon(stage: string) {
  const color = STAGE_PIN_COLORS[stage] || "#FF6B35";
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
  });
}

function FitBounds({ jobs }: { jobs: Job[] }) {
  const map = useMap();

  useEffect(() => {
    const pts = jobs
      .filter((j) => j.latitude != null && j.longitude != null)
      .map((j) => [j.latitude!, j.longitude!] as [number, number]);

    if (pts.length === 0) return;

    if (pts.length === 1) {
      map.setView(pts[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
    }
  }, [jobs, map]);

  return null;
}

interface JobMapProps {
  jobs: Job[];
  className?: string;
}

export default function JobMap({ jobs, className = "" }: JobMapProps) {
  const [ready, setReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Delay mount by one tick so the container DOM node is fully available
  // and avoids the "Map container is being reused" error in strict mode
  useEffect(() => {
    setReady(true);
    return () => {
      setReady(false);
      // Force a new map instance on next mount to avoid container reuse
      setMapKey((k) => k + 1);
    };
  }, []);

  const mappableJobs = jobs.filter((j) => j.latitude != null && j.longitude != null);

  if (mappableJobs.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 text-sm ${className}`}>
        No job locations available
      </div>
    );
  }

  if (!ready) {
    return <div className={`bg-gray-50 rounded-xl ${className}`} />;
  }

  const center: [number, number] = [mappableJobs[0].latitude!, mappableJobs[0].longitude!];

  return (
    <div ref={containerRef} className={`rounded-xl overflow-hidden ${className}`}>
      <MapContainer
        key={`map-${mapKey}`}
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds jobs={mappableJobs} />
        {mappableJobs.map((job) => (
          <Marker
            key={job.id}
            position={[job.latitude!, job.longitude!]}
            icon={createColoredIcon(job.currentStage)}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-sm leading-tight">{job.streetAddress || "Untitled"}</p>
                {job.city && <p className="text-xs text-gray-500 mt-0.5">{job.city}{job.state ? `, ${job.state}` : ""}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: STAGE_PIN_COLORS[job.currentStage] || "#666",
                      backgroundColor: (STAGE_PIN_COLORS[job.currentStage] || "#666") + "18",
                    }}
                  >
                    {stageConfig[job.currentStage as keyof typeof stageConfig]?.label || job.currentStage}
                  </span>
                </div>
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-[11px] text-[#FF6B35] font-semibold hover:underline mt-2 inline-block"
                >
                  View Job →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
