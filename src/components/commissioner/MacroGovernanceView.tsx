"use client";

import React, { useState } from "react";
import { useCivicStore } from "@/lib/store";
import { MacroHeatmap } from "../maps/MacroHeatmap";
import { 
  Trophy, 
  Clock, 
  MapPin,
  Sparkles
} from "lucide-react";

export const MacroGovernanceView: React.FC = () => {
  const { wards, complaints } = useCivicStore();
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);

  const wardLeaderboard = wards.map((ward) => {
    const wardTickets = complaints.filter((c) => c.ward_id === ward.id);
    const resolvedCount = wardTickets.filter((c) => c.status === "RESOLVED").length;
    const reopenedCount = wardTickets.filter((c) => c.status === "REOPENED").length;
    const escalatedCount = wardTickets.filter((c) => c.status === "ESCALATED").length;
    const openBacklog = wardTickets.filter((c) =>
      ["PENDING", "ASSIGNED", "WORK_SUBMITTED", "ESCALATED"].includes(c.status)
    ).length;

    const avgTurnaroundHours = ward.id === "WARD_14" ? 14.2 : ward.id === "WARD_15" ? 18.6 : 22.4;
    const disputeRate = wardTickets.length > 0
      ? Math.round((reopenedCount / Math.max(1, resolvedCount)) * 100)
      : 0;

    return {
      ward,
      total: wardTickets.length,
      openBacklog,
      resolvedCount,
      reopenedCount,
      escalatedCount,
      avgTurnaroundHours,
      disputeRate,
    };
  }).sort((a, b) => a.avgTurnaroundHours - b.avgTurnaroundHours);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Central Ward Density Heatmap */}
      <div className="lg:col-span-8 rounded-3xl p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl flex flex-col shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
          <span className="font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pink-400" />
            <span>Macro Citywide Incident Density Heatmap</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 font-semibold border border-indigo-500/30">
            {wards.length} Wards Monitored
          </span>
        </div>

        <div className="w-full h-[400px] lg:h-[480px] rounded-2xl overflow-hidden border border-indigo-500/20 shadow-inner">
          <MacroHeatmap
            complaints={complaints}
            wards={wards}
            onSelectWard={(wId) => setSelectedWardId(wId)}
          />
        </div>
      </div>

      {/* Ward Performance Leaderboard */}
      <div className="lg:col-span-4 rounded-3xl p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl flex flex-col space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Ward Efficiency Rank</span>
          </h3>
          <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
            Turnaround Speed
          </span>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
          {wardLeaderboard.map((item, index) => {
            const isSelected = selectedWardId === item.ward.id;

            return (
              <div
                key={item.ward.id}
                onClick={() => setSelectedWardId(item.ward.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 shadow-md ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border-purple-500 shadow-purple-950/50 ring-1 ring-purple-500/40"
                    : "bg-slate-950/70 border-slate-800 hover:border-indigo-500/40 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{item.ward.name}</span>
                  </div>

                  <span className="text-xs font-extrabold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                    {item.avgTurnaroundHours}h avg
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] font-semibold">Resolved</span>
                    <span className="font-bold text-emerald-400 text-xs">{item.resolvedCount}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] font-semibold">Backlog</span>
                    <span className="font-bold text-sky-400 text-xs">{item.openBacklog}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] font-semibold">Overdue</span>
                    <span className={`font-bold text-xs ${item.escalatedCount > 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {item.escalatedCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
