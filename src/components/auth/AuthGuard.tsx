"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCivicStore } from "@/lib/store";
import { UserRole } from "@/types/database";
import { 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  LogIn, 
  UserCheck, 
  Sparkles,
  Building2
} from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentProfile, isAuthenticated, currentRole, loginAsPersona } = useCivicStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wide uppercase text-indigo-300 animate-pulse">
          Verifying Municipal IAM Credentials...
        </p>
      </div>
    );
  }

  // If not authenticated, prompt login
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/20">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            This municipal operations module is protected by Identity & Access Management (IAM). Please authenticate to proceed.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname ?? "/")}`}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-sm font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Your Account</span>
          </Link>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Return to Operations Overview
          </Link>
        </div>
      </div>
    );
  }

  // Role authorization check
  const isAuthorized = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(currentRole);

  if (!isAuthorized) {
    const roleLabels: Record<UserRole, string> = {
      MUNICIPAL_COMMISSIONER: "Municipal Commissioner",
      WARD_SUPERVISOR: "Ward Supervisor",
      FIELD_CREW: "Field Operations Crew",
    };

    const targetRoute = currentRole === "FIELD_CREW" 
      ? "/crew" 
      : currentRole === "WARD_SUPERVISOR" 
      ? "/supervisor" 
      : "/commissioner";

    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl border border-rose-500/30 bg-slate-900/90 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Access Restricted (403 Forbidden)
            </div>
            <h2 className="text-lg font-bold text-white">
              Unauthorized Role for this Module
            </h2>
            <p className="text-xs text-slate-300">
              This portal requires one of the following IAM roles:{" "}
              <span className="font-semibold text-rose-300">
                {allowedRoles.map((r) => roleLabels[r]).join(" or ")}
              </span>.
            </p>
          </div>
        </div>

        {/* Current Identity Details */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Current Authenticated Profile
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold">
                {currentProfile.full_name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-200">{currentProfile.full_name}</div>
                <div className="text-[11px] text-slate-400">{currentProfile.email || "Staff Account"}</div>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
              {roleLabels[currentRole]}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href={targetRoute}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold text-center transition-all"
          >
            Go to My Authorized Dashboard
          </Link>

          <Link
            href={`/login?redirect=${encodeURIComponent(pathname ?? "/")}`}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold text-center shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch / Re-authenticate</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
