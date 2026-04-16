"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    
    // Define public routes that do not require auth
    const isPublicRoute = ["/", "/login", "/signup"].includes(pathname);

    // If user is not authenticated and trying to access a protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, pathname, mounted, router]);

  // Handle SSR mismatch prevention
  if (!mounted || isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-primary)" }}>
         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
           <Loader2 className="animate-spin" size={32} style={{ color: "var(--color-primary)" }} />
           <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Verifying Secure Access...</p>
         </div>
      </div>
    );
  }

  // If not authenticated and not on a public route, don't render children (helps prevent flash of content)
  const isPublicRoute = ["/", "/login", "/signup"].includes(pathname);
  if (!isAuthenticated && !isPublicRoute) {
    return null; 
  }

  return <>{children}</>;
}
