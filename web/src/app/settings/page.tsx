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
      // Merge discovered inspector names into config list
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure dropdown options used across the app
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saved
              ? "bg-emerald-500 text-white"
              : dirty
                ? "bg-[#FF6B35] text-white hover:bg-[#E5532D] shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
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

      {/* Account + Join Code row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signed-in email */}
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Mail className="h-4 w-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-sm font-semibold truncate">{appUser?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Join Code */}
        {appUser?.joinCode && (
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <KeyRound className="h-4 w-4 text-[#FF6B35]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Company Join Code</p>
                  <p className="text-lg font-bold font-mono tracking-widest">{appUser.joinCode}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(appUser.joinCode!);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  codeCopied
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {codeCopied ? "Copied" : "Copy"}
              </button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Web Access */}
      {teamMembers.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold">Web Dashboard Access</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Control which team members can access the web dashboard. Workers without access can still use the iOS app.
            </p>
            <div className="space-y-1">
              {teamMembers.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.displayName || member.email}
                      {member.isSelf && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-semibold">You</span>
                      )}
                    </p>
                    {member.displayName && (
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleWebAccess(member.uid, !member.webAccess)}
                    disabled={member.isSelf || togglingUid === member.uid}
                    className="flex-shrink-0 disabled:opacity-40"
                    title={member.isSelf ? "Cannot revoke your own access" : (member.webAccess ? "Revoke web access" : "Grant web access")}
                  >
                    {togglingUid === member.uid ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                    ) : member.webAccess ? (
                      <ToggleRight className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-300" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top row: Job Types + Material Types stacked | Issue Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="flex flex-col gap-6">
          <SimpleList
            title="Job Types"
            description="Types of work that can be assigned to a job"
            icon={<Briefcase className="h-4 w-4 text-[#FF6B35]" />}
            items={config.jobTypes}
            onChange={(v) => updateList("jobTypes", v)}
            placeholder="e.g. Window Replacement"
            className="flex-1 min-h-0"
          />

          <SimpleList
            title="Material Types"
            description="Types of materials used in fixes"
            icon={<Package className="h-4 w-4 text-blue-500" />}
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
  items,
  onChange,
  placeholder,
  className,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
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
    <Card className={`flex flex-col ${className || ""}`}>
      <CardContent className="p-6 flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <span className="text-xs text-gray-400">{items.length} items</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">{description}</p>

        <div className="flex flex-wrap gap-2 overflow-y-auto flex-1 min-h-0 content-start">
          {items.map((item, i) => (
            <div
              key={item}
              className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm text-gray-700">{item}</span>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-300 hover:text-red-500 transition-colors"
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
                className="text-sm px-3 py-1.5 rounded-lg border border-[#FF6B35] bg-white outline-none w-48"
              />
              <button
                onClick={handleAdd}
                disabled={!newValue.trim()}
                className="p-1.5 rounded-lg bg-[#FF6B35] text-white hover:bg-[#E5532D] disabled:opacity-30 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      </CardContent>
    </Card>
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
    <Card className="flex flex-col">
      <CardContent className="p-6 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">Issue Categories</h3>
          </div>
          <span className="text-xs text-gray-400">{categories.length} items</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Categories inspectors choose when documenting issues. Link to job types or leave empty for all.
        </p>

        <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-1 flex-1 min-h-0">
          {categories.map((cat, i) => (
            <div key={cat.name} className="group">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                  className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                >
                  <ChevronDown
                    className={`h-3 w-3 text-gray-300 flex-shrink-0 transition-transform ${
                      editingIndex === i ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
                  <span className="flex-1" />
                  {cat.jobTypes.length === 0 ? (
                    <span className="text-[9px] px-1 py-px rounded bg-gray-100 text-gray-400 flex-shrink-0">
                      All
                    </span>
                  ) : (
                    <div className="flex gap-0.5 flex-shrink-0">
                      {cat.jobTypes.map((jt) => (
                        <span
                          key={jt}
                          className="text-[9px] px-1 py-px rounded bg-orange-50 text-[#FF6B35] font-medium"
                        >
                          {jt}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => handleRemove(i)}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {editingIndex === i && (
                <div className="ml-6 mt-0.5 mb-1 p-2 rounded-md bg-gray-50">
                  <p className="text-[10px] text-gray-500 mb-1.5">Applies to job types:</p>
                  <div className="flex flex-wrap gap-1">
                    {jobTypes.map((jt) => {
                      const active = cat.jobTypes.includes(jt);
                      return (
                        <button
                          key={jt}
                          onClick={() => toggleJobType(i, jt)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                            active
                              ? "bg-[#FF6B35] text-white"
                              : "bg-white border border-gray-200 text-gray-500 hover:border-[#FF6B35] hover:text-[#FF6B35]"
                          }`}
                        >
                          {jt}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1.5">
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
        <div className="sticky bottom-0 pt-3 mt-3 border-t bg-white flex-shrink-0">
          {adding ? (
            <div className="p-3 rounded-lg border border-[#FF6B35] bg-orange-50/30">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  if (e.key === "Escape") { setAdding(false); setNewName(""); setNewJobTypes([]); }
                }}
                placeholder="Category name, e.g. Missing Insulation"
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none w-full mb-3"
              />
              <p className="text-xs text-gray-500 mb-2">Applies to job types:</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {jobTypes.map((jt) => {
                  const active = newJobTypes.includes(jt);
                  return (
                    <button
                      key={jt}
                      onClick={() => toggleNewJobType(jt)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        active
                          ? "bg-[#FF6B35] text-white"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E5532D] disabled:opacity-30 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Add Category
                </button>
                <button
                  onClick={() => { setAdding(false); setNewName(""); setNewJobTypes([]); }}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </button>
          )}
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Point-based section */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-[#FF6B35]" />
            <h3 className="text-sm font-semibold">Point-Based Value</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            (base + photos &times; pts + issues &times; pts) &times; multipliers
          </p>

          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Points</label>
          <div className="grid grid-cols-3 gap-2 mt-1.5 mb-3">
            {points.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 mb-0.5">{f.label}</label>
                <input
                  type="number"
                  value={weights[f.key]}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
                />
              </div>
            ))}
          </div>

          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Multipliers</label>
          <div className="grid grid-cols-3 gap-2 mt-1.5 mb-3">
            {multipliers.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-gray-500 mb-0.5">{f.label}</label>
                <input
                  type="number"
                  value={weights[f.key]}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  step={f.step}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
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
                  className="w-16 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <button
              onClick={() => onWeightsChange({ ...DEFAULT_WEIGHTS })}
              className="text-[11px] text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Revenue-based section */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold">Revenue-Based Value</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Rebate Revenue &times; Base %
          </p>

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
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right font-mono focus:outline-none focus:border-[#FF6B35] transition-colors"
                />
                <span className="text-xs text-gray-400">%</span>
                <span className="text-[10px] text-gray-400 ml-1">5-15% typical</span>
              </div>
            </div>
            <button
              onClick={() => onValuationChange({ basePercent: 10 })}
              className="text-[11px] text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold">Inspector Names</h3>
          </div>
          <span className="text-xs text-gray-400">{names.length} inspectors</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Click the pencil to rename — updates all existing forms in Firestore and iOS.
        </p>

        <div className="space-y-1">
          {names.map((name, i) => (
            <div key={`${name}-${i}`} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
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
                    className="flex-1 text-sm px-2 py-1 rounded border border-[#FF6B35] bg-white outline-none"
                  />
                  <button
                    onClick={() => commitRename(i)}
                    disabled={renaming}
                    className="p-1 rounded bg-[#FF6B35] text-white hover:bg-[#E5532D] disabled:opacity-50"
                  >
                    {renaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700">{name}</span>
                  <button
                    onClick={() => startEdit(i)}
                    className="p-1 rounded hover:bg-gray-200 text-gray-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onChange(names.filter((_, j) => j !== i))}
                    className="p-1 rounded hover:bg-gray-200 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                className="text-sm px-3 py-1.5 rounded-lg border border-[#FF6B35] bg-white outline-none flex-1"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="p-1.5 rounded-lg bg-[#FF6B35] text-white hover:bg-[#E5532D] disabled:opacity-30 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Inspector
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
