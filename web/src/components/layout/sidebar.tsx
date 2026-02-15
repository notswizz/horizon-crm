"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Camera,
  BarChart3,
  Download,
  Settings,
  Flame,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/photos", label: "Photos", icon: Camera },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/export", label: "Export", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B35]">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">Horizon Energy</h1>
          <p className="text-[10px] text-gray-400 font-medium">Admin Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5", isActive ? "text-[#FF6B35]" : "text-gray-400")} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <p className="text-sm font-medium">Admin</p>
        <p className="text-[10px] text-gray-400">Horizon Energy South</p>
      </div>
    </aside>
  );
}
