"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { Complaint, UserRole } from "@/types/database";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { 
  Trophy, 
  Clock, 
  MapPin,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Award,
  AlertTriangle,
  Building2,
  DollarSign,
  Star,
  Layers,
  Flame,
  CheckCircle2,
  Filter,
  Zap,
  HardHat,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  X,
  FileText,
  Download
} from "lucide-react";
import { DispatchModal } from "../supervisor/DispatchModal";
import { ManualOverrideModal } from "../supervisor/ManualOverrideModal";
import { ExportReportModal } from "./ExportReportModal";

const MacroHeatmap = dynamic(
  () => import("../maps/MacroHeatmap").then((m) => m.MacroHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[440px] flex items-center justify-center bg-slate-950/60 rounded-3xl text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2" />
        Loading Citywide GIS Heatmap...
      </div>
    ),
  }
);

export const MacroGovernanceView: React.FC = () => {
  const { wards, complaints, runEscalationWorker } = useCivicStore();
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"LEADERBOARD" | "ESCALATED_TICKETS" | "BREACH_ANALYTICS">("LEADERBOARD");
  const [escalationTierFilter, setEscalationTierFilter] = useState<"ALL" | "TIER_1" | "TIER_2">("ALL");
  const [selectedTicketForAction, setSelectedTicketForAction] = useState<Complaint | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sweepToast, setSweepToast] = useState<string | null>(null);

  const totalTickets = complaints.length;
  const totalResolved = complaints.filter((c) => c.status === "RESOLVED").length;
  const escalatedTickets = complaints.filter(
    (c) => c.status === "ESCALATED" || (c.escalation_tier && c.escalation_tier > 0)
  );
  const tier1Count = complaints.filter((c) => c.escalation_tier === 1).length;
  const tier2Count = complaints.filter((c) => c.escalation_tier === 2 || (c.status === "ESCALATED" && !c.escalation_tier)).length;
  const citySlaRate = totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100) : 92;

  const filteredEscalatedTickets = escalatedTickets.filter((c) => {
    if (selectedWardId && c.ward_id !== selectedWardId) return false;
    if (escalationTierFilter === "TIER_1") return c.escalation_tier === 1;
    if (escalationTierFilter === "TIER_2") return c.escalation_tier === 2 || (!c.escalation_tier && c.status === "ESCALATED");
    return true;
  });

  const handleRunEscalationSweep = () => {
    soundFx.playWarning();
    const res = runEscalationWorker();
    setSweepToast(res.summary);
    setTimeout(() => setSweepToast(null), 6000);
  };

  const wardLeaderboard = wards.map((ward) => {
    const wardTickets = complaints.filter((c) => c.ward_id === ward.id);
    const resolvedCount = wardTickets.filter((c) => c.status === "RESOLVED").length;
    const reopenedCount = wardTickets.filter((c) => c.status === "REOPENED").length;
    const escalatedCount = wardTickets.filter(
      (c) => c.status === "ESCALATED" || (c.escalation_tier && c.escalation_tier > 0)
    ).length;
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
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Executive Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-200 text-xs font-semibold backdrop-blur-md">
              <Building2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Municipal Commissioner Executive Oversight Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Macro Citywide Governance & <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">SLA Audit</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time multi-tier escalation oversight, ward delay metrics, contractor compliance penalty tracking, and PostGIS spatial incident clustering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRunEscalationSweep}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/40 ring-1 ring-white/20 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Trigger Escalation Sweep</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setExportModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center gap-2 shadow-inner transition-all"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Export Audit Report</span>
            </button>

            <span className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-inner">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{citySlaRate}% SLA Compliance</span>
            </span>
          </div>
        </div>

        {/* Sweep Toast */}
        {sweepToast && (
          <div className="p-3 rounded-2xl bg-purple-950/90 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between shadow-lg">
            <span>{sweepToast}</span>
            <button type="button" onClick={() => setSweepToast(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Executive KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Total City Backlog</div>
            <div className="text-2xl font-black text-white">{totalTickets - totalResolved}</div>
            <div className="text-[10px] text-indigo-400">Across {wards.length} Wards</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Multi-Tier Escalations</div>
            <div className="text-2xl font-black text-rose-400">{escalatedTickets.length}</div>
            <div className="text-[10px] text-rose-300">{tier1Count} Tier-1 • {tier2Count} Tier-2</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Contractor Penalty Pool</div>
            <div className="text-2xl font-black text-amber-400">₹4.2 Lakhs</div>
            <div className="text-[10px] text-amber-300">Recovered for SLA delays</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Top Velocity Ward</div>
            <div className="text-2xl font-black text-purple-400">Ward 14</div>
            <div className="text-[10px] text-purple-300">14.2h turnaround</div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner text-xs w-full sm:w-auto overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setActiveTab("LEADERBOARD");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "LEADERBOARD"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Citywide Ward Velocity Ranking</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setActiveTab("ESCALATED_TICKETS");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "ESCALATED_TICKETS"
              ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>Multi-Escalated Incident Desk ({escalatedTickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setActiveTab("BREACH_ANALYTICS");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "BREACH_ANALYTICS"
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>SLA Delay & Inaction Analytics</span>
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === "LEADERBOARD" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-3xl p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Ward Resolution Velocity Performance</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">Ranked by Avg Turnaround</span>
            </h3>

            <div className="space-y-3">
              {wardLeaderboard.map((item, idx) => (
                <div
                  key={item.ward.id}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedWardId(selectedWardId === item.ward.id ? null : item.ward.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    selectedWardId === item.ward.id
                      ? "bg-indigo-950/70 border-indigo-400 shadow-lg ring-1 ring-indigo-400/40"
                      : "bg-slate-950/60 border-slate-800 hover:border-indigo-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shadow-md ${
                        idx === 0
                          ? "bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950"
                          : idx === 1
                          ? "bg-gradient-to-tr from-slate-300 to-slate-400 text-slate-950"
                          : "bg-gradient-to-tr from-amber-700 to-orange-800 text-white"
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-sm">{item.ward.name}</div>
                        <div className="text-[11px] text-slate-400">{item.ward.zone} Zone • {item.ward.description || "Municipal Administrative Ward"}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">{item.avgTurnaroundHours}h avg</div>
                      <div className="text-[10px] text-slate-400">{item.resolvedCount} / {item.total} Fixed</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-slate-800/80">
                    <div className="p-2 bg-slate-900/80 rounded-xl">
                      <span className="text-slate-400 block text-[9px] uppercase">Active Backlog</span>
                      <span className="font-bold text-white">{item.openBacklog}</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl">
                      <span className="text-slate-400 block text-[9px] uppercase">Breaches</span>
                      <span className={`font-bold ${item.escalatedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {item.escalatedCount}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-xl">
                      <span className="text-slate-400 block text-[9px] uppercase">Dispute Rate</span>
                      <span className={`font-bold ${item.disputeRate > 0 ? "text-amber-400" : "text-slate-400"}`}>
                        {item.disputeRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 rounded-3xl p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl flex flex-col space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-400" />
                <span>Citywide Incident Density Heatmap</span>
              </span>
              <span className="text-xs text-indigo-300 font-mono">PostGIS Heat Dispersion</span>
            </h3>

            <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-indigo-500/20 shadow-inner">
              <MacroHeatmap
                complaints={selectedWardId ? complaints.filter((c) => c.ward_id === selectedWardId) : complaints}
                wards={wards}
                onSelectWard={(wardId) => setSelectedWardId(selectedWardId === wardId ? null : wardId)}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ESCALATED TICKETS */}
      {activeTab === "ESCALATED_TICKETS" && (
        <div className="rounded-3xl p-5 sm:p-6 border border-rose-500/30 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Multi-Tier Overdue Incidents Requiring Executive Sanction</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Complaints that have passed 24h/48h SLAs without supervisor or contractor resolution</p>
            </div>

            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              {(["ALL", "TIER_1", "TIER_2"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setEscalationTierFilter(tier);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    escalationTierFilter === tier
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tier === "ALL" ? "All Tiers" : tier === "TIER_1" ? "Tier 1 (Notice)" : "Tier 2 (Sanction)"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredEscalatedTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                No tickets currently under active escalation in selected view.
              </div>
            ) : (
              filteredEscalatedTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 via-slate-950 to-slate-900 border border-rose-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={t.category} />
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                        Tier {t.escalation_tier || 2} Escalation
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Ward {t.ward_id}</span>
                    </div>

                    <h4 className="text-xs font-bold text-white">{t.title}</h4>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{t.description}</p>
                    <div className="text-[10px] text-rose-300/90 font-mono">
                      Reason: {t.escalation_reason || "Passed 48-hour municipal resolution SLA window without field closure"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setSelectedTicketForAction(t);
                        setIsReassignModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
                    >
                      <HardHat className="w-3.5 h-3.5 text-amber-400" />
                      <span>Direct Reassign</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setSelectedTicketForAction(t);
                        setIsOverrideModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Override Status</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BREACH ANALYTICS */}
      {activeTab === "BREACH_ANALYTICS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Average Delay by Category</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>Potholes & Roads</span>
                <span className="font-mono text-amber-400 font-bold">+18.4h delay</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>Sanitation & Debris</span>
                <span className="font-mono text-emerald-400 font-bold">+8.2h delay</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>Streetlighting Outage</span>
                <span className="font-mono text-yellow-400 font-bold">+12.0h delay</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>Water Pipeline Burst</span>
                <span className="font-mono text-cyan-400 font-bold">+4.5h delay</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>Contractor SLA Penalties Levied</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>Jaipur Roadworks Ltd.</span>
                <span className="font-mono text-rose-400 font-bold">₹1,85,000</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>CleanCity Waste Pvt.</span>
                <span className="font-mono text-amber-400 font-bold">₹1,20,000</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950">
                <span>SparkTech Lighting</span>
                <span className="font-mono text-amber-400 font-bold">₹1,15,000</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Executive Sanction Guidelines</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Tier-2 escalated tickets that exceed 72 hours trigger automatic contractor blacklisting review and municipal performance bond forfeiture procedures.
            </p>
          </div>
        </div>
      )}

      {/* Direct Reassign Modal */}
      {selectedTicketForAction && isReassignModalOpen && (
        <DispatchModal
          isOpen={true}
          onClose={() => {
            setIsReassignModalOpen(false);
            setSelectedTicketForAction(null);
          }}
          ticket={selectedTicketForAction}
          isReassignment={true}
        />
      )}

      {/* Manual Override Modal */}
      {selectedTicketForAction && isOverrideModalOpen && (
        <ManualOverrideModal
          isOpen={true}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setSelectedTicketForAction(null);
          }}
          ticket={selectedTicketForAction}
        />
      )}

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
};
