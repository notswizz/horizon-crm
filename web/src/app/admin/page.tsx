"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AnalyticsData } from "@/types";
import {
  Building2,
  Briefcase,
  Camera,
  Shield,
  Loader2,
  ArrowRight,
  X,
  Database,
  Download,
  Settings,
  Wrench,
} from "lucide-react";
import Link from "next/link";

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  joinCode: string;
  jobCount: number;
  photoCount: number;
  createdAt: string;
}

export default function AdminPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  // Redirect non-admin
  if (appUser && appUser.role !== "admin") {
    router.push("/");
    return null;
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/companies").then((r) => r.json()),
      fetch("/api/analytics").then((r) => r.json()),
    ]).then(([c, a]) => {
      setCompanies(c.companies || []);
      setAnalytics(a);
      setLoading(false);
    });
  }, []);

  const handleImpersonate = async (companyId: string) => {
    await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    setImpersonating(companyId);
    router.push("/");
    router.refresh();
  };

  const handleExitImpersonation = async () => {
    await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: null }),
    });
    setImpersonating(null);
    router.refresh();
  };

  const handleMigrate = async (companyId: string) => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch("/api/admin/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      setMigrateResult(`Migrated ${data.updated} jobs to this company`);
      // Refresh companies
      const c = await fetch("/api/admin/companies").then((r) => r.json());
      setCompanies(c.companies || []);
    } catch {
      setMigrateResult("Migration failed");
    }
    setMigrating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1200px]">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Impersonating: {companies.find((c) => c.id === impersonating)?.name || "Unknown"}
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-amber-200 text-amber-800 text-sm font-medium hover:bg-amber-300 transition-colors"
          >
            <X size={14} />
            Exit
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-[#FF6B35]" />
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        </div>
        <p className="text-sm text-gray-500">Platform overview and company management</p>
      </div>

      {/* Platform Stats */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="p-4 bg-gradient-to-br from-[#FF6B35] via-[#FF8C61] to-[#E5532D] text-white">
              <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Point-Based Value</span>
              <p className="text-2xl font-extrabold mt-1">{formatCurrency(analytics.estimatedValue)}</p>
            </div>
          </Card>
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="p-4 bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#6D28D9] text-white">
              <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Rebate-Based Value</span>
              <p className="text-2xl font-extrabold mt-1">{formatCurrency(analytics.revenueDatasetValue)}</p>
            </div>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Total Jobs</span>
                <Briefcase size={14} className="text-[#FF6B35]" />
              </div>
              <p className="text-2xl font-bold">{analytics.totalJobs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Total Photos</span>
                <Camera size={14} className="text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{analytics.totalPhotos.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link
          href="/export"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Download size={14} />
          Export Data
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Settings size={14} />
          Weights & Config
        </Link>
      </div>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold">Companies</h3>
            </div>
            <span className="text-xs text-gray-400">{companies.length} companies</span>
          </div>

          {companies.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No companies yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Company</th>
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Code</th>
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Email</th>
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Jobs</th>
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Photos</th>
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Joined</th>
                    <th className="pb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium">{company.name}</td>
                      <td className="py-3"><code className="px-2 py-0.5 rounded bg-gray-100 text-xs font-mono font-bold tracking-wider">{company.joinCode}</code></td>
                      <td className="py-3 text-gray-500">{company.email}</td>
                      <td className="py-3 text-right font-bold">{company.jobCount}</td>
                      <td className="py-3 text-right font-bold">{company.photoCount}</td>
                      <td className="py-3 text-gray-400">{formatDate(company.createdAt)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleImpersonate(company.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-medium hover:bg-[#FF6B35]/20 transition-colors"
                          >
                            View as
                            <ArrowRight size={12} />
                          </button>
                          <button
                            onClick={() => handleMigrate(company.id)}
                            disabled={migrating}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            <Wrench size={12} />
                            Migrate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {migrateResult && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
              {migrateResult}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
