"use client";

import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Lock } from "lucide-react";

const COOKIE_NAME = "site_auth";
const COOKIE_DAYS = 30;
const SITE_PASSWORD = "daniel";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setAuthed(getCookie(COOKIE_NAME) === "1");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      setCookie(COOKIE_NAME, "1", COOKIE_DAYS);
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  // Still checking cookie
  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="w-80">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E85A28] flex items-center justify-center">
                <Lock size={20} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-800">Horizon Energy South</h1>
              <p className="text-xs text-gray-400">Enter password to continue</p>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#FF6B35]"
              }`}
            />
            {error && <p className="text-xs text-red-500 -mt-2">Incorrect password</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E5532D] transition-colors"
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`h-screen overflow-y-auto transition-all duration-200 ${collapsed ? "pl-16" : "pl-64"}`}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
