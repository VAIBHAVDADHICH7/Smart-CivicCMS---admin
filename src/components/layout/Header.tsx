"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCivicStore } from "@/lib/store";
import { UserRole } from "@/types/database";
import { 
  Building2, 
  MapPin, 
  ChevronDown, 
  RotateCcw,
  HardHat,
  ShieldCheck,
  Landmark,
  Sparkles
} from "lucide-react";

export const Header: React.FC = () => {
  const router = useRouter();
  const { currentRole, setRole, currentProfile, wards, resetToSeed, isSupabaseActive } = useCivicStore();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const currentWard = wards.find((w) => w.id === currentProfile.ward_id) || wards[0];

  const roles: {
    id: UserRole;
    name: string;
    roleDesc: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "FIELD_CREW", name: "Field Worker", roleDesc: "Repairs & Proof", path: "/crew", icon: HardHat },
    { id: "WARD_SUPERVISOR", name: "Ward Authority", roleDesc: "Dispatch & Audit", path: "/supervisor", icon: ShieldCheck },
    { id: "MUNICIPAL_COMMISSIONER", name: "Commissioner", roleDesc: "City Governance", path: "/commissioner", icon: Landmark },
  ];

  const activeRole = roles.find((r) => r.id === currentRole) || roles[0];
  const ActiveIcon = activeRole.icon;

  const handleSelectRole = (r: typeof roles[0]) => {
    setRole(r.id);
    setRoleMenuOpen(false);
    router.push(r.path);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-indigo-500/20 text-slate-100 shadow-lg shadow-indigo-950/40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand & Location */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/40 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-purple-100 to-pink-200">
                  CivicPulse
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-300 border border-indigo-400/30">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Municipal Governance & Redressal
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-indigo-500/30 text-xs text-slate-300 shadow-inner">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-slate-200">{currentWard.name}</span>
          </div>
        </div>

        {/* Role Selector Controls */}
        <div className="flex items-center gap-2.5">
          {/* Supabase Connection Status Badge */}
          <div 
            title={isSupabaseActive ? "Connected to live Supabase PostgreSQL" : "Using local reactive state. Add Supabase keys in .env.local to activate cloud database."}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
              isSupabaseActive 
                ? "bg-emerald-950/80 border-emerald-400/40 text-emerald-300 shadow-sm shadow-emerald-950" 
                : "bg-indigo-950/40 border-indigo-500/20 text-indigo-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? "bg-emerald-400 animate-ping-slow shadow-lg shadow-emerald-400" : "bg-indigo-400"}`} />
            <span>{isSupabaseActive ? "Supabase Live" : "Local Engine"}</span>
          </div>

          {/* Desktop Segments with vibrant gradient pills */}
          <div className="hidden md:flex items-center p-1 bg-slate-900/90 border border-indigo-500/20 rounded-xl text-xs shadow-inner">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all font-semibold ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30 ring-1 ring-white/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Role Dropdown */}
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs font-semibold text-white shadow-sm"
            >
              <ActiveIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>{activeRole.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 border-b border-slate-800">
                  Select Authority View
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isActive = currentRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 text-xs transition-colors ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-purple-200 font-bold border-l-2 border-purple-400"
                          : "text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-purple-300" : "text-slate-400"}`} />
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-[10px] text-slate-400">{r.roleDesc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Demo Reset Button */}
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset demo data to initial state?")) {
                resetToSeed();
              }
            }}
            title="Reset demo data"
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-pink-300 border border-indigo-500/20 hover:border-pink-500/40 shadow-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
