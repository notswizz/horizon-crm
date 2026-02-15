"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="pl-64 h-screen overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
