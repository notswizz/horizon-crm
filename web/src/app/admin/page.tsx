"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  Shield,
  Loader2,
  ArrowRight,
  X,
  Search,
  Wrench,
  ChevronDown,
  ChevronRight,
  Users,
  Trash2,
  Pencil,
  Check,
  UserMinus,
  Globe,
} from "lucide-react";

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  joinCode: string;
  jobCount: number;
  photoCount: number;
  createdAt: string;
}

interface Member {
  uid: string;
  email: string;
  displayName: string;
  webAccess: boolean;
  role: string;
}

interface ExpandedData {
  members: Member[];
  loading: boolean;
}

export default function AdminPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");

  // Expanded company state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, ExpandedData>>({});
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Redirect non-admin
  if (appUser && appUser.role !== "admin") {
    router.push("/");
    return null;
  }

  const refreshCompanies = useCallback(async () => {
    const c = await fetch("/api/admin/companies").then((r) => r.json());
    setCompanies(c.companies || []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/companies").then((r) => r.json()).then((c) => {
      setCompanies(c.companies || []);
      setLoading(false);
    });
  }, []);

  const fetchCompanyDetails = async (companyId: string) => {
    setExpandedData((prev) => ({
      ...prev,
      [companyId]: { members: [], loading: true },
    }));
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`);
      const data = await res.json();
      setExpandedData((prev) => ({
        ...prev,
        [companyId]: { members: data.members || [], loading: false },
      }));
    } catch {
      setExpandedData((prev) => ({
        ...prev,
        [companyId]: { members: [], loading: false },
      }));
    }
  };

  const toggleExpand = (companyId: string) => {
    if (expandedId === companyId) {
      setExpandedId(null);
      setEditingName(null);
      setConfirmDelete(null);
    } else {
      setExpandedId(companyId);
      setEditingName(null);
      setConfirmDelete(null);
      fetchCompanyDetails(companyId);
    }
  };

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
      await refreshCompanies();
    } catch {
      setMigrateResult("Migration failed");
    }
    setMigrating(false);
  };

  const handleUpdateName = async (companyId: string) => {
    if (!editNameValue.trim()) return;
    await fetch(`/api/admin/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editNameValue.trim() }),
    });
    setEditingName(null);
    await refreshCompanies();
  };

  const handleDeleteCompany = async (companyId: string) => {
    await fetch(`/api/admin/companies/${companyId}`, { method: "DELETE" });
    setConfirmDelete(null);
    setExpandedId(null);
    await refreshCompanies();
  };

  const handleToggleWebAccess = async (companyId: string, uid: string, currentAccess: boolean) => {
    await fetch(`/api/admin/companies/${companyId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, action: "toggleAccess", webAccess: !currentAccess }),
    });
    await fetchCompanyDetails(companyId);
  };

  const handleRemoveMember = async (companyId: string, uid: string) => {
    await fetch(`/api/admin/companies/${companyId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, action: "remove" }),
    });
    await fetchCompanyDetails(companyId);
    await refreshCompanies();
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
      </div>

      {/* Companies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold">Companies</h3>
            <span className="text-xs text-gray-400">{companies.length} total</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] w-56"
            />
          </div>
        </div>

        {(() => {
          const filtered = companySearch
            ? companies.filter((c) => {
                const q = companySearch.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.joinCode.toLowerCase().includes(q);
              })
            : companies;
          return filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-sm text-gray-400 text-center">{companySearch ? "No matching companies" : "No companies yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filtered.map((company) => {
              const isExpanded = expandedId === company.id;
              const detail = expandedData[company.id];

              return (
                <Card key={company.id} className="overflow-hidden">
                  {/* Company Header Row */}
                  <button
                    onClick={() => toggleExpand(company.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm truncate">{company.name}</span>
                        <code className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-mono font-bold tracking-wider text-gray-500 shrink-0">
                          {company.joinCode}
                        </code>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{company.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-gray-500 shrink-0">
                      <div className="text-center">
                        <p className="font-bold text-sm text-gray-900">{company.jobCount}</p>
                        <p className="text-[10px] text-gray-400">Jobs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-gray-900">{company.photoCount}</p>
                        <p className="text-[10px] text-gray-400">Photos</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-xs text-gray-400">{formatDate(company.createdAt)}</p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50/50">
                      <div className="px-5 py-4 space-y-5">
                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleImpersonate(company.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-medium hover:bg-[#FF6B35]/20 transition-colors"
                          >
                            <ArrowRight size={13} />
                            View as Company
                          </button>
                          <button
                            onClick={() => handleMigrate(company.id)}
                            disabled={migrating}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            <Wrench size={13} />
                            Migrate Orphan Jobs
                          </button>
                          <button
                            onClick={() => {
                              setEditingName(company.id);
                              setEditNameValue(company.name);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                          >
                            <Pencil size={13} />
                            Rename
                          </button>
                          {confirmDelete === company.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-medium">Delete everything?</span>
                              <button
                                onClick={() => handleDeleteCompany(company.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                              >
                                <Trash2 size={12} />
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(company.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={13} />
                              Delete Company
                            </button>
                          )}
                        </div>

                        {/* Rename Inline */}
                        {editingName === company.id && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleUpdateName(company.id)}
                              className="flex-1 px-3 py-1.5 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateName(company.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#FF6B35] text-white text-xs font-medium hover:bg-[#E5532D] transition-colors"
                            >
                              <Check size={13} />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingName(null)}
                              className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Members Section */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Users size={14} className="text-gray-400" />
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</h4>
                          </div>

                          {detail?.loading ? (
                            <div className="flex items-center gap-2 py-4">
                              <Loader2 size={14} className="animate-spin text-gray-400" />
                              <span className="text-xs text-gray-400">Loading members...</span>
                            </div>
                          ) : !detail?.members.length ? (
                            <p className="text-xs text-gray-400 py-2">No members found</p>
                          ) : (
                            <div className="bg-white rounded-lg border divide-y">
                              {detail.members.map((member) => (
                                <div key={member.uid} className="px-4 py-3 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                    {(member.displayName || member.email).charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {member.displayName || "No name"}
                                      {member.role === "admin" && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FF6B35]/10 text-[#FF6B35]">
                                          ADMIN
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleToggleWebAccess(company.id, member.uid, member.webAccess)}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                        member.webAccess
                                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                      }`}
                                      title={member.webAccess ? "Web access enabled" : "Web access disabled"}
                                    >
                                      <Globe size={12} />
                                      {member.webAccess ? "Web On" : "Web Off"}
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMember(company.id, member.uid)}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                                      title="Remove member"
                                    >
                                      <UserMinus size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        );
        })()}

        {migrateResult && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
            {migrateResult}
          </div>
        )}
      </div>
    </div>
  );
}
