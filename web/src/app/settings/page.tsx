"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownConfig, IssueCategoryConfig } from "@/types";
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
} from "lucide-react";

export default function SettingsPage() {
  const [config, setConfig] = useState<DropdownConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setLoading(false);
      });
  }, []);

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

  function updateList(key: "jobTypes" | "materialTypes", values: string[]) {
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
    <div className="space-y-6 max-w-3xl">
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

      <SimpleList
        title="Job Types"
        description="Types of work that can be assigned to a job"
        icon={<Briefcase className="h-4 w-4 text-[#FF6B35]" />}
        items={config.jobTypes}
        onChange={(v) => updateList("jobTypes", v)}
        placeholder="e.g. Window Replacement"
      />

      <IssueCategoryList
        categories={config.issueCategories}
        jobTypes={config.jobTypes}
        onChange={updateCategories}
      />

      <SimpleList
        title="Material Types"
        description="Types of materials used in fixes"
        icon={<Package className="h-4 w-4 text-blue-500" />}
        items={config.materialTypes}
        onChange={(v) => updateList("materialTypes", v)}
        placeholder="e.g. Spray Foam"
      />
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
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <span className="text-xs text-gray-400">{items.length} items</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">{description}</p>

        <div className="flex flex-wrap gap-2">
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
    <Card>
      <CardContent className="p-6">
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

        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {categories.map((cat, i) => (
            <div key={cat.name} className="group">
              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <button
                  onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-300 flex-shrink-0 transition-transform ${
                      editingIndex === i ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">{cat.name}</span>
                  {cat.jobTypes.length === 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">
                      All types
                    </span>
                  ) : (
                    <div className="flex gap-1 flex-shrink-0">
                      {cat.jobTypes.map((jt) => (
                        <span
                          key={jt}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-[#FF6B35] font-medium"
                        >
                          {jt}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => handleRemove(i)}
                  className="p-1 rounded hover:bg-gray-200 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {editingIndex === i && (
                <div className="ml-8 mt-1 mb-2 p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">Applies to job types:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {jobTypes.map((jt) => {
                      const active = cat.jobTypes.includes(jt);
                      return (
                        <button
                          key={jt}
                          onClick={() => toggleJobType(i, jt)}
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
                  <p className="text-[10px] text-gray-400 mt-2">
                    {cat.jobTypes.length === 0
                      ? "No types selected — this category appears for all job types"
                      : `Appears for ${cat.jobTypes.length} job type${cat.jobTypes.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Add new category */}
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
