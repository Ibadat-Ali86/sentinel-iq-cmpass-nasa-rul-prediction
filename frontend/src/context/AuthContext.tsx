"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "operator" | "engineer" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  avatar?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// Demo credentials — swap with real JWT endpoint later
const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  "demo@sentineliq.com": {
    password: "demo1234",
    user: {
      id: "usr_001",
      name: "Alex Mitchell",
      email: "demo@sentineliq.com",
      role: "engineer",
      company: "AeroTech Industries",
    },
  },
  "admin@sentineliq.com": {
    password: "admin1234",
    user: {
      id: "usr_002",
      name: "Sarah Chen",
      email: "admin@sentineliq.com",
      role: "admin",
      company: "AeroTech Industries",
    },
  },
  "operator@sentineliq.com": {
    password: "operator1234",
    user: {
      id: "usr_003",
      name: "Marcus Johnson",
      email: "operator@sentineliq.com",
      role: "operator",
      company: "AeroTech Industries",
    },
  },
};

const AUTH_STORAGE_KEY = "sentineliq-auth";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      // Simulate network latency so the user can see the Orbital Loader they requested
      await new Promise((r) => setTimeout(r, 1500));

      const emailKey = email.toLowerCase().trim();
      const entry = DEMO_USERS[emailKey] || DEMO_USERS["demo@sentineliq.com"];

      const authUser = entry.user;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
