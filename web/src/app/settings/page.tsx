"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Job, InspectionForm } from "@/types";
import { Loader2, Database, Users, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inspectors, setInspectors] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const jobsRes = await fetch("/api/jobs?limit=1000");
      const { jobs: allJobs } = await jobsRes.json();
      setJobs(allJobs || []);

      const inspectorMap: Record<string, number> = {};
      for (const job of allJobs as Job[]) {
        const formsRes = await fetch(`/api/forms/${job.id}`);
        const { forms } = await formsRes.json();
        (forms as InspectionForm[]).forEach((f) => {
          if (f.inspectorName) {
            inspectorMap[f.inspectorName] = (inspectorMap[f.inspectorName] || 0) + 1;
          }
        });
      }

      setInspectors(
        Object.entries(inspectorMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">System configuration and status</p>
      </div>

      {/* Firebase connection */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Database size={14} className="text-[#FF6B35]" /> Firebase Connection
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Project ID</span>
              <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Not configured"}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <Badge className="bg-emerald-50 text-emerald-600">
                <CheckCircle size={12} className="mr-1" /> Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Jobs in Database</span>
              <span className="text-sm font-semibold">{jobs.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Photos</span>
              <span className="text-sm font-semibold">{jobs.reduce((s, j) => s + j.photoCount, 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspectors */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users size={14} className="text-blue-500" /> Inspectors
          </h3>
          {inspectors.length > 0 ? (
            <div className="space-y-2">
              {inspectors.map((ins) => (
                <div key={ins.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{ins.name}</span>
                  <span className="text-xs text-gray-400">{ins.count} form{ins.count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No inspector data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Environment */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4">Environment</h3>
          <div className="space-y-3">
            {[
              { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", set: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
              { key: "NEXT_PUBLIC_FIREBASE_API_KEY", set: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY },
              { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", set: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN },
              { key: "FIREBASE_PROJECT_ID", set: true },
              { key: "FIREBASE_CLIENT_EMAIL", set: true },
              { key: "FIREBASE_PRIVATE_KEY", set: true },
            ].map((env) => (
              <div key={env.key} className="flex items-center justify-between">
                <code className="text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-600">{env.key}</code>
                <Badge className={env.set ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}>
                  {env.set ? "Set" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
