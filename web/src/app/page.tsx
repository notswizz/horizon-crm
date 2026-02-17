"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { CompanyDashboard } from "@/components/dashboard/company-dashboard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardData, CompanyOption, ActivityEvent } from "@/components/dashboard/types";
import { AnalyticsData, Job, JobStage } from "@/types";

export default function DashboardPage() {
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === "admin";

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [photoDays, setPhotoDays] = useState<7 | 30 | 90>(30);
  const [mapStageFilter, setMapStageFilter] = useState<JobStage | "">("");
  const [activityFilter, setActivityFilter] = useState("");

  // Admin-only
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  const fetchDashboard = useCallback((companyId?: string) => {
    setLoading(true);
    const qs = companyId ? `?companyId=${companyId}` : "";
    fetch(`/api/dashboard${qs}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: DashboardData | null) => {
        if (data) {
          setAnalytics(data.analytics);
          setRecentJobs(data.recentJobs);
          setAllJobs(data.allJobs);
          setActivityEvents(data.activityEvents);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchDashboard();
    if (isAdmin) {
      fetch("/api/admin/companies").then((r) => r.json()).then((data) => {
        setCompanies((data.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      });
    }
  }, [isAdmin, fetchDashboard]);

  // Activity polling at 30s using activityOnly with since param
  useEffect(() => {
    const interval = setInterval(() => {
      const lastEventDate = activityEvents.length > 0
        ? activityEvents.reduce((latest, e) => e.date > latest ? e.date : latest, activityEvents[0].date)
        : "";
      const params = new URLSearchParams();
      if (selectedCompany) params.set("companyId", selectedCompany);
      params.set("activityOnly", "true");
      if (lastEventDate) params.set("since", lastEventDate);
      fetch(`/api/dashboard?${params.toString()}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.activityEvents && data.activityEvents.length > 0) {
            setActivityEvents((prev) => {
              const existingIds = new Set(prev.map((e: ActivityEvent) => e.id));
              const newEvents = data.activityEvents.filter((e: ActivityEvent) => !existingIds.has(e.id));
              const merged = [...newEvents, ...prev];
              merged.sort((a: ActivityEvent, b: ActivityEvent) => new Date(b.date).getTime() - new Date(a.date).getTime());
              return merged.slice(0, 50);
            });
          }
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedCompany, activityEvents]);

  function handleCompanyChange(companyId: string) {
    setSelectedCompany(companyId);
    fetchDashboard(companyId || undefined);
  }

  if (loading) {
    return <DashboardSkeleton isAdmin={!!isAdmin} />;
  }

  if (!analytics) return null;

  const sharedProps = {
    analytics,
    allJobs,
    recentJobs,
    activityEvents,
    activityFilter,
    setActivityFilter,
    photoDays,
    setPhotoDays,
    mapStageFilter,
    setMapStageFilter: setMapStageFilter as (s: string) => void,
  };

  return isAdmin ? (
    <AdminDashboard
      {...sharedProps}
      companies={companies}
      selectedCompany={selectedCompany}
      onCompanyChange={handleCompanyChange}
    />
  ) : (
    <CompanyDashboard
      {...sharedProps}
      companyName={appUser?.companyName}
    />
  );
}
