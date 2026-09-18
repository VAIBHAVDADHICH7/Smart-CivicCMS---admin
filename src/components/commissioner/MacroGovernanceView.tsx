"use client";

import React, { useState } from "react";
import { useCivicStore } from "@/lib/store";
import { MacroHeatmap } from "../maps/MacroHeatmap";
import { 
  Trophy, 
  Clock, 
  MapPin 
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Central Ward Density Heatmap */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col shadow-sm">
        <div className="px-2 py-1.5 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Ward Incident Density Heatmap</span>
          </span>
          <span>{wards.length} Wards Monitored</span>
        </div>

        <div className="w-full h-[400px] lg:h-[460px] rounded-xl overflow-hidden mt-1">
          <MacroHeatmap
            complaints={complaints}
            wards={wards}
            onSelectWard={(wId) => setSelectedWardId(wId)}
          />
        </div>
      </div>

      {/* Ward Performance Leaderboard */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Ward Performance</span>
          </h3>
          <span className="text-[10px] text-slate-500">By response time</span>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[440px] pr-1">
          {wardLeaderboard.map((item, index) => {
            const isSelected = selectedWardId === item.ward.id;

            return (
              <div
                key={item.ward.id}
                onClick={() => setSelectedWardId(item.ward.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors space-y-1.5 ${
                  isSelected
                    ? "bg-slate-800 border-blue-500"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-white">{item.ward.name}</span>
                  </div>

                  <span className="text-xs font-medium text-emerald-400">
                    {item.avgTurnaroundHours}h
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1">
                  <div className="bg-slate-900 p-1 rounded">
                    <span className="text-slate-500 block">Backlog</span>
                    <span className="font-semibold text-white">{item.openBacklog}</span>
                  </div>
                  <div className="bg-slate-900 p-1 rounded">
                    <span className="text-slate-500 block">Disputes</span>
                    <span className="font-semibold text-white">{item.disputeRate}%</span>
                  </div>
                  <div className="bg-slate-900 p-1 rounded">
                    <span className="text-slate-500 block">Overdue</span>
                    <span className={`font-semibold ${item.escalatedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
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
