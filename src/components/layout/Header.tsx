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
  Landmark
} from "lucide-react";

export const Header: React.FC = () => {
  const router = useRouter();
  const { currentRole, setRole, currentProfile, wards, resetToSeed } = useCivicStore();
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
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand & Location */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-white">
                CivicPulse
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                City Services Portal
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-xs text-slate-300">
            <MapPin className="w-3 h-3 text-rose-400" />
            <span className="font-medium">{currentWard.name}</span>
          </div>
        </div>

        {/* Role Selector Controls */}
        <div className="flex items-center gap-2">
          {/* Desktop Segments */}
          <div className="hidden md:flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-white"
            >
              <ActiveIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeRole.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 border-b border-slate-800">
                  Switch role
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isActive = currentRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition-colors ${
                        isActive
                          ? "bg-blue-600/20 text-blue-300 font-semibold"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <div>
                        <div>{r.name}</div>
                        <div className="text-[10px] text-slate-500">{r.roleDesc}</div>
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
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
