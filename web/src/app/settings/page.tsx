"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownConfig, IssueCategoryConfig, DatasetValueWeights, DatasetValuationConfig } from "@/types";
import { DEFAULT_WEIGHTS, DEFAULT_VALUATION } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  Loader2,
  Plus,
  X,
  Save,
  Briefcase,
  AlertTriangle,
  Package,
  Check,
  ChevronDown,
  Database,
  DollarSign,
  Info,
  Users,
  Pencil,
  Copy,
  KeyRound,
  Mail,
  Monitor,
  ToggleLeft,
  ToggleRight,
  Settings,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === "admin";
  const [config, setConfig] = useState<DropdownConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ uid: string; email: string; displayName: string; webAccess: boolean; isSelf: boolean }[]>([]);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/analytics").then((r) => r.ok ? r.json() : { topInspectors: [] }),
      fetch("/api/team").then((r) => r.ok ? r.json() : { members: [] }),
    ]).then(([cfg, analytics, team]) => {
      const saved: string[] = cfg.inspectorNames || [];
      const discovered: string[] = (analytics.topInspectors || []).map((i: { name: string }) => i.name);
      const merged = Array.from(new Set([...saved, ...discovered]));
      cfg.inspectorNames = merged;
      setConfig(cfg);
      setTeamMembers(team.members || []);
      setLoading(false);
    });
  }, []);

  async function toggleWebAccess(uid: string, webAccess: boolean) {
    setTogglingUid(uid);
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, webAccess }),
    });
    if (res.ok) {
      setTeamMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, webAccess } : m))
      );
    }
    setTogglingUid(null);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateList(key: "jobTypes" | "materialTypes" | "inspectorNames", values: string[]) {
    if (!config) return;
    setConfig({ ...config, [key]: values });
    setDirty(true);
  }

  function updateCategories(categories: IssueCategoryConfig[]) {
    if (!config) return;
    setConfig({ ...config, issueCategories: categories });
    setDirty(true);
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header with Account + Join Code */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B35]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#E5532D] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              saved
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : dirty
                  ? "bg-[#FF6B35] text-white hover:bg-[#E5532D] shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                  : "bg-white/10 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
          </button>
        </div>

        {/* Account + Join Code inline */}
        <div className="relative flex items-center gap-4 mt-5 pt-5 border-t border-white/10">
          {/* Signed-in email */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.07] backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Signed in as</p>
              <p className="text-sm font-bold truncate text-white">{appUser?.email}</p>
            </div>
          </div>

          {/* Join Code */}
          {appUser?.joinCode && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.07] backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#E5532D] flex items-center justify-center">
                <KeyRound className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Join Code</p>
                <p className="text-sm font-extrabold font-mono tracking-[0.2em] text-white">{appUser.joinCode}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(appUser.joinCode!);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-300 ${
                  codeCopied
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                }`}
              >
                {codeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {codeCopied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Team Web Access — compact inline */}
      {teamMembers.length > 0 && (
        <div className="rounded-xl bg-gray-50/80 border border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-3.5 w-3.5 text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Web Dashboard Access</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <div
                key={member.uid}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0">
                  {(member.displayName || member.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {member.displayName || member.email}
                    {member.isSelf && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-bold">You</span>
                    )}
                  </p>
                  {member.displayName && (
                    <p className="text-[10px] text-gray-400 truncate">{member.email}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleWebAccess(member.uid, !member.webAccess)}
                  disabled={member.isSelf || togglingUid === member.uid}
                  className="flex-shrink-0 disabled:opacity-30 transition-transform hover:scale-110 ml-auto"
                  title={member.isSelf ? "Cannot revoke your own access" : (member.webAccess ? "Revoke web access" : "Grant web access")}
                >
                  {togglingUid === member.uid ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                  ) : member.webAccess ? (
                    <ToggleRight className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top row: Job Types + Material Types stacked | Issue Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="flex flex-col gap-6">
          <SimpleList
            title="Job Types"
            description=""
            icon={<Briefcase className="h-4 w-4 text-white" />}
            iconBg="from-[#FF6B35] to-[#E5532D]"
            accentColor="#FF6B35"
            chipBg="bg-orange-50"
            chipText="text-[#FF6B35]"
            chipHover="hover:bg-orange-100"
            items={config.jobTypes}
            onChange={(v) => updateList("jobTypes", v)}
            placeholder="e.g. Window Replacement"
            className="flex-1 min-h-0"
          />

          <SimpleList
            title="Material Types"
            description=""
            icon={<Package className="h-4 w-4 text-white" />}
            iconBg="from-blue-500 to-blue-600"
            accentColor="#3B82F6"
            chipBg="bg-blue-50"
            chipText="text-blue-600"
            chipHover="hover:bg-blue-100"
            items={config.materialTypes}
            onChange={(v) => updateList("materialTypes", v)}
            placeholder="e.g. Spray Foam"
            className="flex-1 min-h-0"
          />
        </div>

        <IssueCategoryList
          categories={config.issueCategories}
          jobTypes={config.jobTypes}
          onChange={updateCategories}
        />
      </div>

      {/* Bottom row: Combined Value Formulas + Inspector Names (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CombinedValueEditor
            weights={config.datasetValueWeights || DEFAULT_WEIGHTS}
            valuation={config.datasetValuation || DEFAULT_VALUATION}
            onWeightsChange={(w) => {
              setConfig({ ...config, datasetValueWeights: w });
              setDirty(true);
            }}
            onValuationChange={(v) => {
              setConfig({ ...config, datasetValuation: v });
              setDirty(true);
            }}
          />

          <InspectorNameList
            names={config.inspectorNames || []}
            onChange={(v) => updateList("inspectorNames", v)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Simple Editable List (Job Types, Materials) ─────────────────────

function SimpleList({
  title,
  description,
  icon,
  iconBg,
  accentColor,
  chipBg,
  chipText,
  chipHover,
  items,
  onChange,
  placeholder,
  className,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  chipBg: string;
  chipText: string;
  chipHover: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const trimmed = newValue.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setNewValue("");
    setAdding(false);
  }

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col ${className || ""}`}>
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${iconBg}`} />
      <div className="p-6 flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-sm`}>
              {icon}
            </div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 ring-1 ring-gray-100">{items.length} items</span>
        </div>
        {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}

        <div className="flex flex-wrap gap-2 overflow-y-auto flex-1 min-h-0 content-start">
          {items.map((item, i) => (
            <div
              key={item}
              className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg ${chipBg} ${chipHover} transition-all duration-200 ring-1 ring-transparent hover:ring-gray-200`}
            >
              <span className={`text-sm font-medium ${chipText}`}>{item}</span>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="p-0.5 rounded-md hover:bg-white/80 text-gray-300 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  if (e.key === "Escape") { setAdding(false); setNewValue(""); }
                }}
                onBlur={() => { if (!newValue.trim()) { setAdding(false); setNewValue(""); } }}
                placeholder={placeholder}
                className="text-sm px-3 py-1.5 rounded-lg border-2 bg-white outline-none w-48 transition-colors"
                style={{ borderColor: accentColor }}
              />
              <button
                onClick={handleAdd}
                disabled={!newValue.trim()}
                className="p-1.5 rounded-lg text-white hover:opacity-90 disabled:opacity-30 transition-all"
                style={{ background: accentColor }}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Issue Categories with Job Type Links ────────────────────────────

function IssueCategoryList({
  categories,
  jobTypes,
  onChange,
}: {
  categories: IssueCategoryConfig[];
  jobTypes: string[];
  onChange: (categories: IssueCategoryConfig[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newJobTypes, setNewJobTypes] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || categories.some((c) => c.name === trimmed)) return;
    onChange([...categories, { name: trimmed, jobTypes: newJobTypes }]);
    setNewName("");
    setNewJobTypes([]);
    setAdding(false);
  }

  function handleRemove(index: number) {
    onChange(categories.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function toggleJobType(catIndex: number, jt: string) {
    const cat = categories[catIndex];
    const updated = cat.jobTypes.includes(jt)
      ? cat.jobTypes.filter((t) => t !== jt)
      : [...cat.jobTypes, jt];
    const newCats = [...categories];
    newCats[catIndex] = { ...cat, jobTypes: updated };
    onChange(newCats);
  }

  function toggleNewJobType(jt: string) {
    setNewJobTypes((prev) =>
      prev.includes(jt) ? prev.filter((t) => t !== jt) : [...prev, jt]
    );
  }

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 to-orange-500" />
      <div className="p-6 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Issue Categories</h3>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 ring-1 ring-gray-100">{categories.length} items</span>
        </div>

        <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-1 flex-1 min-h-0">
          {categories.map((cat, i) => (
            <div key={cat.name} className="group">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-50/80 transition-all duration-200">
                <button
                  onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <ChevronDown
                    className={`h-3 w-3 text-gray-300 flex-shrink-0 transition-transform duration-200 ${
                      editingIndex === i ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">{cat.name}</span>
                  <span className="flex-1" />
                  {cat.jobTypes.length === 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium flex-shrink-0">
                      All types
                    </span>
                  ) : (
                    <div className="flex gap-1 flex-shrink-0">
                      {cat.jobTypes.map((jt) => (
                        <span
                          key={jt}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-[#FF6B35] font-semibold ring-1 ring-orange-100"
                        >
                          {jt}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => handleRemove(i)}
                  className="p-1 rounded-md hover:bg-gray-200 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {editingIndex === i && (
                <div className="ml-7 mt-1 mb-2 p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Applies to job types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {jobTypes.map((jt) => {
                      const active = cat.jobTypes.includes(jt);
                      return (
                        <button
                          key={jt}
                          onClick={() => toggleJobType(i, jt)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all duration-200 ${
                            active
                              ? "bg-[#FF6B35] text-white shadow-sm shadow-orange-200"
                              : "bg-white border border-gray-200 text-gray-500 hover:border-[#FF6B35] hover:text-[#FF6B35]"
                          }`}
                        >
                          {jt}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {cat.jobTypes.length === 0
                      ? "No types selected — appears for all job types"
                      : `Appears for ${cat.jobTypes.length} type${cat.jobTypes.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sticky add category footer */}
        <div className="sticky bottom-0 pt-3 mt-3 border-t border-gray-100 bg-white flex-shrink-0">
          {adding ? (
            <div className="p-4 rounded-xl border-2 border-[#FF6B35]/20 bg-orange-50/30">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  if (e.key === "Escape") { setAdding(false); setNewName(""); setNewJobTypes([]); }
                }}
                placeholder="Category name, e.g. Missing Insulation"
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none w-full mb-3 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 transition-all"
              />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Applies to job types</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {jobTypes.map((jt) => {
                  const active = newJobTypes.includes(jt);
                  return (
                    <button
                      key={jt}
                      onClick={() => toggleNewJobType(jt)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all duration-200 ${
                        active
                          ? "bg-[#FF6B35] text-white shadow-sm shadow-orange-200"
                          : "bg-white border border-gray-200 text-gray-500 hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      }`}
                    >
                      {jt}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E5532D] disabled:opacity-30 transition-all shadow-sm shadow-orange-200"
                >
                  <Check className="h-3.5 w-3.5" />
                  Add Category
                </button>
                <button
                  onClick={() => { setAdding(false); setNewName(""); setNewJobTypes([]); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all duration-200 w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Combined Value Editor ────────────────────────────────────────────

function CombinedValueEditor({
  weights,
  valuation,
  onWeightsChange,
  onValuationChange,
}: {
  weights: DatasetValueWeights;
  valuation: DatasetValuationConfig;
  onWeightsChange: (weights: DatasetValueWeights) => void;
  onValuationChange: (config: DatasetValuationConfig) => void;
}) {
  function update(key: keyof DatasetValueWeights, value: number) {
    onWeightsChange({ ...weights, [key]: value });
  }

  const points: { key: keyof DatasetValueWeights; label: string }[] = [
    { key: "basePoints", label: "Base" },
    { key: "photoPoints", label: "Photo" },
    { key: "issuePoints", label: "Issue" },
  ];

  const multipliers: { key: keyof DatasetValueWeights; label: string; step: number }[] = [
    { key: "rebateMultiplier", label: "Rebate", step: 0.1 },
    { key: "pairMultiplier", label: "Pair", step: 0.1 },
    { key: "materialMultiplier", label: "Material", step: 0.1 },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#FF6B35] to-amber-500" />
      <div className="p-6 space-y-5">
        {/* Point-based section */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B35] to-amber-500 flex items-center justify-center shadow-sm">
              <Database className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Point-Based Value</h3>
          </div>

          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Points</label>
          <div className="grid grid-cols-3 gap-2 mt-1.5 mb-4">
            {points.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 mb-1">{f.label}</label>
                <input
                  type="number"
                  value={weights[f.key]}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 transition-all"
                />
              </div>
            ))}
          </div>

          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Multipliers</label>
          <div className="grid grid-cols-3 gap-2 mt-1.5 mb-4">
            {multipliers.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 mb-1">{f.label}</label>
                <input
                  type="number"
                  value={weights[f.key]}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  step={f.step}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 transition-all"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-[10px] text-gray-500">Pair Threshold</label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  value={weights.pairThreshold}
                  onChange={(e) => update("pairThreshold", Number(e.target.value))}
                  className="w-16 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 transition-all"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <button
              onClick={() => onWeightsChange({ ...DEFAULT_WEIGHTS })}
              className="text-[11px] font-medium text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Revenue-based section */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Revenue-Based Value</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                % of Rebate Revenue
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={valuation.basePercent}
                  onChange={(e) => onValuationChange({ basePercent: Number(e.target.value) })}
                  min={0}
                  max={100}
                  step={0.5}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 transition-all"
                />
                <span className="text-xs text-gray-400">%</span>
                <span className="text-[10px] text-gray-400 ml-1">5-15% typical</span>
              </div>
            </div>
            <button
              onClick={() => onValuationChange({ basePercent: 10 })}
              className="text-[11px] font-medium text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inspector Name List with Rename ─────────────────────────────────

function InspectorNameList({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null) inputRef.current?.focus();
  }, [editingIndex]);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  function startEdit(i: number) {
    setEditingIndex(i);
    setEditValue(names[i]);
  }

  async function commitRename(i: number) {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === names[i]) {
      setEditingIndex(null);
      return;
    }

    setRenaming(true);
    try {
      const res = await fetch("/api/inspectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: names[i], newName: trimmed }),
      });
      if (res.ok) {
        const updated = [...names];
        updated[i] = trimmed;
        onChange(updated);
      }
    } finally {
      setRenaming(false);
      setEditingIndex(null);
    }
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || names.includes(trimmed)) return;
    onChange([...names, trimmed]);
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Inspector Names</h3>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 ring-1 ring-gray-100">{names.length} inspectors</span>
        </div>

        <div className="space-y-1">
          {names.map((name, i) => (
            <div key={`${name}-${i}`} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50/80 transition-all duration-200">
              {editingIndex === i ? (
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(i);
                      if (e.key === "Escape") setEditingIndex(null);
                    }}
                    disabled={renaming}
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg border-2 border-indigo-400 bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <button
                    onClick={() => commitRename(i)}
                    disabled={renaming}
                    className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-all"
                  >
                    {renaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-[10px] font-bold text-indigo-500 flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-700">{name}</span>
                  <button
                    onClick={() => startEdit(i)}
                    className="p-1.5 rounded-md hover:bg-gray-200 text-gray-300 hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onChange(names.filter((_, j) => j !== i))}
                    className="p-1.5 rounded-md hover:bg-gray-200 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3">
          {adding ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={addRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  if (e.key === "Escape") { setAdding(false); setNewName(""); }
                }}
                onBlur={() => { if (!newName.trim()) { setAdding(false); setNewName(""); } }}
                placeholder="e.g. Mike Rivera"
                className="text-sm px-3 py-2 rounded-lg border-2 border-indigo-300 bg-white outline-none flex-1 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-30 transition-all"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all duration-200 w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Inspector
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
