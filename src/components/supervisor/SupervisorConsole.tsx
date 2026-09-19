"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { DualProofViewer } from "./DualProofViewer";
import { DispatchModal } from "./DispatchModal";
import { ManualOverrideModal } from "./ManualOverrideModal";
import { SimulationCenterModal } from "../common/SimulationCenterModal";

const WardGisMap = dynamic(
  () => import("../maps/WardGisMap").then((m) => m.WardGisMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[440px] flex items-center justify-center bg-slate-950/60 rounded-3xl text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2" />
        Loading Ward GIS Interface...
      </div>
    ),
  }
);

import { 
  Search, 
  MapPin, 
  List, 
  HardHat, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  SlidersHorizontal, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Check, 
  X, 
  RefreshCw, 
  Zap, 
  ShieldAlert,
  Send
} from "lucide-react";

export const SupervisorConsole: React.FC = () => {
  const { complaints, wards, currentProfile, runEscalationWorker, profiles } = useCivicStore();
  const [selectedWardId, setSelectedWardId] = useState<string>(
    currentProfile.ward_id || wards[0]?.id || "WARD_14"
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<"MAP" | "LIST">("LIST");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [ticketForDualProof, setTicketForDualProof] = useState<Complaint | null>(null);
  const [ticketForDispatch, setTicketForDispatch] = useState<Complaint | null>(null);
  const [isReassignMode, setIsReassignMode] = useState<boolean>(false);
  const [ticketForOverride, setTicketForOverride] = useState<Complaint | null>(null);
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  const wardComplaints = complaints.filter((c) => {
    const matchesWard = selectedWardId === "ALL" || c.ward_id === selectedWardId;
    const matchesStatus = 
      statusFilter === "ALL" 
        ? true 
        : statusFilter === "STALLED" 
        ? c.status === "ESCALATED" || (c.status === "ASSIGNED" && new Date(c.sla_deadline) < new Date())
        : c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWard && matchesStatus && matchesSearch;
  });

  const selectedWard = wards.find((w) => w.id === selectedWardId) || wards[0];

  const formatSla = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    if (diff <= 0) return { label: "SLA Overdue", isOverdue: true };
    const hours = Math.floor(diff / 3600000);
    return { label: `Due in ${hours}h`, isOverdue: false };
  };

  const handleRunSweep = () => {
    soundFx.playWarning();
    const res = runEscalationWorker();
    setSweepResult(res.summary);
    setTimeout(() => setSweepResult(null), 6000);
  };

  const stalledCount = complaints.filter(
    (c) => c.status === "ESCALATED" || (c.status === "ASSIGNED" && new Date(c.sla_deadline) < new Date())
  ).length;

  return (
    <div className="space-y-5 animate-fade-in pb-8">
      {/* Top Ward Authority Header Banner */}
      <div className="rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ward Engineering Authority & Triage Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Ward Triage & <span className="text-slate-200">Contractor Dispatch</span>
          </h1>
          <p className="text-xs text-slate-400">
            Automated spatial cluster verification, dynamic work order dispatching, and contractor photographic sign-off
          </p>
        </div>

        {/* Action Controls: Sweep Escalation Engine & Ward Quick Switcher */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRunSweep}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 hover:scale-[1.02] transition-all flex items-center gap-1.5 ring-1 ring-white/20"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Run Escalation Sweep</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setSimulationModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900/80 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-inner"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Sim Lab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setSelectedWardId("ALL");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedWardId === "ALL"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/30 ring-1 ring-white/20"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All ({complaints.length})
          </button>
          {wards.map((w) => {
            const wardCount = complaints.filter((c) => c.ward_id === w.id).length;
            const isSelected = selectedWardId === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setSelectedWardId(w.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/30 ring-1 ring-white/20"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {w.name} ({wardCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sweep Result Banner */}
      {sweepResult && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
            <span className="font-semibold">{sweepResult}</span>
          </div>
          <button 
            type="button"
            onClick={() => setSweepResult(null)} 
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="rounded-3xl p-4 sm:p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shadow-inner text-xs w-full md:w-auto">
          {[
            { id: "ALL", label: "All Incidents" },
            { id: "PENDING", label: "Pending Triage" },
            { id: "ASSIGNED", label: "Assigned & Active" },
            { id: "WORK_SUBMITTED", label: "In Review (Proof)" },
            { id: "STALLED", label: `Stalled / Escalated (${stalledCount})` },
            { id: "RESOLVED", label: "Resolved" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                soundFx.playClick();
                setStatusFilter(st.id);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === st.id
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {st.id === "STALLED" && stalledCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              )}
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Mobile View Switcher */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports or landmarks..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-inner"
            />
          </div>

          <div className="flex md:hidden p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMobileTab("LIST");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold ${mobileTab === "LIST" ? "bg-purple-600 text-white" : "text-slate-400"}`}
            >
              List ({wardComplaints.length})
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMobileTab("MAP");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold ${mobileTab === "MAP" ? "bg-purple-600 text-white" : "text-slate-400"}`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Responsive Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Map View */}
        <div className={`md:col-span-7 rounded-3xl border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl p-3.5 flex-col shadow-xl ${
          mobileTab === "MAP" ? "flex" : "hidden md:flex"
        }`}>
          <div className="px-3 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 mb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span>Interactive Ward Dispatch Map</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 font-semibold border border-indigo-500/30 text-[11px]">
              {wardComplaints.length} Reports Located
            </span>
          </div>

          <div className="w-full h-[460px] md:h-[580px] rounded-2xl overflow-hidden border border-indigo-500/20 shadow-inner">
            <WardGisMap
              complaints={wardComplaints}
              wards={selectedWardId === "ALL" ? wards : [selectedWard]}
              selectedWardId={selectedWardId}
              selectedComplaintId={selectedComplaint?.id}
              onSelectComplaint={(c) => {
                soundFx.playClick();
                setSelectedComplaint(c);
                if (c.status === "WORK_SUBMITTED") {
                  setTicketForDualProof(c);
                }
              }}
              center={selectedWard.center}
              zoom={selectedWardId === "ALL" ? 12 : 14}
            />
          </div>
        </div>

        {/* List View */}
        <div className={`md:col-span-5 rounded-3xl border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl p-5 flex-col space-y-4 shadow-xl ${
          mobileTab === "LIST" ? "flex" : "hidden md:flex"
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Ward Triage Queue</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {wardComplaints.length} Active Tickets
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
            {wardComplaints.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                No reports matching filter.
              </div>
            ) : (
              wardComplaints.map((ticket) => {
                const isSelected = selectedComplaint?.id === ticket.id;
                const sla = formatSla(ticket.sla_deadline);
                const assignedCrew = profiles.find((p) => p.id === ticket.assigned_crew_id);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedComplaint(ticket);
                    }}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all space-y-2.5 shadow-md ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border-purple-500 shadow-purple-950/40 ring-1 ring-purple-500/40"
                        : ticket.status === "ESCALATED"
                        ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60"
                        : "bg-slate-950/70 border-slate-800/80 hover:border-indigo-500/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CategoryBadge category={ticket.category} />
                      <div className="flex items-center gap-1.5">
                        {ticket.escalation_tier && ticket.escalation_tier > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-400" />
                            <span>Tier {ticket.escalation_tier}</span>
                          </span>
                        )}
                        <StatusBadge status={ticket.status} size="sm" />
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{ticket.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{ticket.address_text}</p>

                    {/* Assigned Crew details if assigned */}
                    {assignedCrew && (
                      <div className="text-[11px] text-indigo-300/80 flex items-center justify-between pt-0.5">
                        <span>Contractor: <strong>{assignedCrew.full_name}</strong></span>
                        <span className="text-[10px] text-slate-400">Ward {ticket.ward_id}</span>
                      </div>
                    )}

                    {/* Escalation Reason Notice */}
                    {ticket.escalation_reason && (
                      <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[10px] text-rose-200">
                        {ticket.escalation_reason}
                      </div>
                    )}

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        sla.isOverdue || ticket.status === "ESCALATED"
                          ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}>
                        {sla.label}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Status Override / Admin Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundFx.playClick();
                            setTicketForOverride(ticket);
                          }}
                          title="Manual Status Override"
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {ticket.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFx.playClick();
                              setIsReassignMode(false);
                              setTicketForDispatch(ticket);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/30 flex items-center gap-1.5"
                          >
                            <HardHat className="w-3.5 h-3.5" />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {["ASSIGNED", "ESCALATED"].includes(ticket.status) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFx.playClick();
                              setIsReassignMode(true);
                              setTicketForDispatch(ticket);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-indigo-500/40 flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Reassign</span>
                          </button>
                        )}

                        {ticket.status === "WORK_SUBMITTED" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFx.playClick();
                              setTicketForDualProof(ticket);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/30 flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Review Proof</span>
                          </button>
                        )}

                        {ticket.status === "RESOLVED" && (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Signed off</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dual Proof Modal */}
      {ticketForDualProof && (
        <DualProofViewer
          isOpen={true}
          onClose={() => setTicketForDualProof(null)}
          ticket={ticketForDualProof}
        />
      )}

      {/* Dispatch / Reassignment Modal */}
      {ticketForDispatch && (
        <DispatchModal
          isOpen={true}
          onClose={() => setTicketForDispatch(null)}
          ticket={ticketForDispatch}
          isReassignment={isReassignMode}
        />
      )}

      {/* Manual Status Override Modal */}
      {ticketForOverride && (
        <ManualOverrideModal
          isOpen={true}
          onClose={() => setTicketForOverride(null)}
          ticket={ticketForOverride}
        />
      )}

      {/* Simulation Center Modal */}
      <SimulationCenterModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
      />
    </div>
  );
};
