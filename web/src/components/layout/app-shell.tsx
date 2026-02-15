"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "./sidebar";
import { Loader2, ShieldX } from "lucide-react";

const NO_SHELL_PATHS = ["/login", "/onboarding"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, appUser, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect logic in useEffect to avoid setState-during-render
  useEffect(() => {
    if (loading || NO_SHELL_PATHS.includes(pathname)) return;

    if (!user) {
      router.push("/login");
    } else if (!appUser) {
      router.push("/onboarding");
    }
  }, [user, appUser, loading, pathname, router]);

  // No shell on login/onboarding
  if (NO_SHELL_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  // Waiting for redirect
  if (!user || !appUser) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  const isAdmin = appUser.role === "admin";

  // Block users without web access (platform admin always has access)
  if (!isAdmin && !appUser.webAccess) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <ShieldX className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Web Access Required</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your account doesn&apos;t have web dashboard access. Ask your company admin to enable it from Settings.
          </p>
          <button
            onClick={logout}
            className="mt-6 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        isAdmin={isAdmin}
        companyName={appUser.companyName}
        onLogout={logout}
      />
      <main className={`h-screen overflow-y-auto transition-all duration-200 ${collapsed ? "pl-16" : "pl-64"}`}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
