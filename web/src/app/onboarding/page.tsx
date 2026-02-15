"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, Users, Loader2, Copy, Check } from "lucide-react";
import { useAuth } from "@/context/auth-context";

type Mode = "join" | "create";

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<Mode>("join");
  const [companyName, setCompanyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create company");
      }

      const data = await res.json();
      setCreatedCode(data.joinCode);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join company");
      }

      await refreshUser();
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Success screen after creating company — show the join code
  if (createdCode) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-96">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={20} className="text-green-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-800">Company Created</h1>
              <p className="text-xs text-gray-400 text-center">
                Share this code with your team so they can join your company.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 py-4">
              <span className="text-3xl font-mono font-bold tracking-[0.3em] text-gray-800">{createdCode}</span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
              </button>
            </div>

            <button
              onClick={async () => {
                await refreshUser();
                router.push("/");
              }}
              className="w-full py-2.5 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E5532D] transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-96">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <Image src="/logo.png" alt="RetrofitIQ" width={48} height={48} className="rounded-xl" />
            <h1 className="text-lg font-bold text-gray-800">Welcome to RetrofitIQ</h1>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => { setMode("join"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                mode === "join" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
              }`}
            >
              <Users size={14} />
              Join Company
            </button>
            <button
              onClick={() => { setMode("create"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                mode === "create" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
              }`}
            >
              <Building2 size={14} />
              Create Company
            </button>
          </div>

          {/* Join Form */}
          {mode === "join" && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Company Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="Enter 6-digit code"
                  autoFocus
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-colors focus:border-[#FF6B35] text-center font-mono text-lg tracking-[0.2em] uppercase"
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Ask your company admin for the join code.
              </p>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !joinCode.trim()}
                className="w-full py-2.5 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E5532D] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Joining..." : "Join Company"}
              </button>
            </form>
          )}

          {/* Create Form */}
          {mode === "create" && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setError(""); }}
                  placeholder="e.g. Horizon Energy South"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-colors focus:border-[#FF6B35]"
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                A join code will be generated for your team.
              </p>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="w-full py-2.5 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E5532D] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Creating..." : "Create Company"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
