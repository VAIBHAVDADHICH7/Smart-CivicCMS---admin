"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCivicStore } from "@/lib/store";
import { UserRole } from "@/types/database";
import { HardHat, ShieldCheck, Landmark } from "lucide-react";

export const RoleSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentRole, setRole, currentProfile } = useCivicStore();

  const roles: {
    id: UserRole;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    color: string;
  }[] = [
    {
      id: "FIELD_CREW",
      label: "Field Crew",
      sublabel: "Turn-by-turn & 30m Proof",
      icon: HardHat,
      path: "/crew",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    },
    {
      id: "WARD_SUPERVISOR",
      label: "Ward Supervisor",
      sublabel: "GIS Triage & Dual Proof Gate",
      icon: ShieldCheck,
      path: "/supervisor",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      id: "MUNICIPAL_COMMISSIONER",
      label: "Commissioner",
      sublabel: "Macro Heatmap & SLA Penalties",
      icon: Landmark,
      path: "/commissioner",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
  ];

  const handleRoleSelect = (roleId: UserRole, targetPath: string) => {
    setRole(roleId);
    router.push(targetPath);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
      {roles.map((r) => {
        const Icon = r.icon;
        const isCurrentRole = currentRole === r.id;
        const isCurrentPath = pathname?.startsWith(r.path) ?? false;
        const isActive = isCurrentRole || isCurrentPath;

        return (
          <button
            key={r.id}
            onClick={() => handleRoleSelect(r.id, r.path)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/80"
            }`}
            title={`${r.label}: ${r.sublabel}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
};
