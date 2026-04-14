"use client" 

import * as React from "react"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { validateEmail } from "@/lib/utils";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { SparklesText } from "./sparkles-text";
import { OrbitalLoader } from "./orbital-loader";

const SignIn1 = () => {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  React.useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);
 
  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setError("");
    setStatus("loading");

    const result = await login(email, password);
    if (result.success) {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 700);
    } else {
      setStatus("idle");
      setError(result.error ?? "Authentication failed.");
    }
  };
 
  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden w-full transition-colors duration-300">
      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl p-8 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] mb-6 shadow-lg shadow-[var(--accent-glow)]">
          <svg
              viewBox="0 0 78 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-auto text-white">
              <path d="M3 0H5V18H3V0ZM13 0H15V18H13V0ZM18 3V5H0V3H18ZM0 15V13H18V15H0Z" fill="currentColor" />
          </svg>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6 text-center">
          <SparklesText text="SentinelIQ" className="text-3xl" colors={{ first: "#06b6d4", second: "#3b82f6" }} />
        </h2>

        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Email"
              type="email"
              value={email}
              className="w-full px-5 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              className="w-full px-5 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            {error && (
              <div className="text-sm text-[var(--color-critical)] text-left flex items-center gap-1">
                <AlertCircle size={14}/> {error}
              </div>
            )}
          </div>
          <hr className="border-[var(--border-default)] my-2" />
          {status === "loading" || status === "success" ? (
            <div className="flex justify-center items-center py-4">
              <OrbitalLoader message={status === "loading" ? "Authenticating C-MAPSS Access..." : "Redirecting to Dashboard..."} className="w-10 h-10" />
            </div>
          ) : (
            <div>
              <button
                onClick={handleSignIn}
                disabled={status !== "idle"}
                className="w-full bg-[var(--color-primary)] text-white font-medium px-5 py-3 rounded-full flex justify-center items-center gap-2 shadow hover:bg-[var(--color-primary-hover)] transition disabled:opacity-70 mb-3 text-sm"
              >
                <ArrowRight size={16} />
                Sign in
              </button>
              
              <div className="w-full text-center mt-2 flex flex-col gap-1">
                <span className="text-xs text-[var(--text-tertiary)]">
                  Authorized engineers only.
                </span>
                <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-primary)] py-1 rounded inline-block mt-2">
                  demo@sentineliq.com / demo1234
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* User count and avatars */}
      <div className="relative z-10 mt-12 flex flex-col items-center text-center">
        <p className="text-[var(--text-tertiary)] text-sm mb-3">
          Join <span className="font-medium text-[var(--text-primary)]">thousands</span> of
          engineers relying on SentinelIQ.
        </p>
        <div className="flex -space-x-2">
          <img src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=64&h=64" alt="user" className="w-8 h-8 rounded-full border-2 border-[var(--surface-primary)] object-cover shadow-sm" />
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=64&h=64" alt="user" className="w-8 h-8 rounded-full border-2 border-[var(--surface-primary)] object-cover shadow-sm z-10" />
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64" alt="user" className="w-8 h-8 rounded-full border-2 border-[var(--surface-primary)] object-cover shadow-sm z-20" />
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64" alt="user" className="w-8 h-8 rounded-full border-2 border-[var(--surface-primary)] object-cover shadow-sm z-30" />
        </div>
      </div>
    </div>
  );
};
 
export { SignIn1 };
