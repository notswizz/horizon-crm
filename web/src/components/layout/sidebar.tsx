"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Camera,
  Download,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  LogOut,
} from "lucide-react";

const baseNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/photos", label: "Photos", icon: Camera },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/export", label: "Export", icon: Download },
  { href: "/admin", label: "Admin", icon: Shield },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  companyName: string;
  onLogout: () => void;
}

export function Sidebar({ collapsed, onToggle, isAdmin, companyName, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + Company Name */}
      <div className={cn("flex items-center border-b", collapsed ? "justify-center px-2 py-5" : "gap-3 px-6 py-5")}>
        <Image src="/logo.png" alt="RetrofitIQ" width={36} height={36} className="rounded-lg flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">{companyName || "RetrofitIQ"}</h1>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("flex-shrink-0", isActive ? "text-[#FF6B35]" : "text-gray-400")} size={18} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="mx-2 mb-2 flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        title={collapsed ? "Logout" : undefined}
        className={cn(
          "mx-2 mb-2 flex items-center rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors",
          collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
        )}
      >
        <LogOut size={16} />
        {!collapsed && "Logout"}
      </button>

      {/* Footer */}
      <div className={cn("border-t px-4 py-3", collapsed && "px-2 text-center")}>
        {collapsed ? (
          <p className="text-[10px] text-gray-400 font-medium">{companyName?.slice(0, 3) || "..."}</p>
        ) : (
          <>
            <p className="text-sm font-medium truncate">{isAdmin ? "Admin" : "User"}</p>
            <p className="text-[10px] text-gray-400 truncate">{companyName}</p>
          </>
        )}
      </div>
    </aside>
  );
}
