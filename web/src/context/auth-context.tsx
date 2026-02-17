"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthChange, signOut as firebaseSignOut } from "@/lib/firebase-client";
import { AppUser } from "@/types";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.uid && !data.error) {
          setAppUser({
            uid: data.uid,
            email: data.email || "",
            companyId: data.companyId || "",
            companyName: data.companyName || "",
            role: data.role || "user",
            joinCode: data.joinCode || "",
            webAccess: data.webAccess ?? false,
          });
          return;
        }
      }
    } catch {}
    setAppUser(null);
  }, []);

  useEffect(() => {
    // Check for existing server session on mount
    refreshUser().then(() => setLoading(false));

    // Listen for Firebase Auth state — only used for tracking user object + sign-out
    const unsub = onAuthChange((u) => {
      setUser(u);
      if (!u) {
        setAppUser(null);
        setLoading(false);
      }
    });
    return unsub;
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    await firebaseSignOut();
    setUser(null);
    setAppUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
