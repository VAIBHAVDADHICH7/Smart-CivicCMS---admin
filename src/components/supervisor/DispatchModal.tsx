"use client";

import React, { useState } from "react";
import { Complaint, Profile } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { HardHat, Clock, Check, X, ShieldAlert, Sparkles, RefreshCw, UserCheck } from "lucide-react";

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Complaint;
  isReassignment?: boolean;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  ticket,
  isReassignment = false,
}) => {
  const { assignTicket, reassignTicket, profiles, complaints } = useCivicStore();

  const fieldCrews = profiles.filter((p) => p.role === "FIELD_CREW");
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    ticket.assigned_crew_id || fieldCrews[0]?.id || ""
  );
  const [slaHours, setSlaHours] = useState<number>(24);
  const [reassignReason, setReassignReason] = useState<string>(
    isReassignment ? "Expedited resolution due to contractor bottleneck" : ""
  );

  if (!isOpen) return null;

  const handleDispatchOrReassign = () => {
    if (!selectedCrewId) return;
    if (isReassignment || ticket.assigned_crew_id) {
      reassignTicket(ticket.id, selectedCrewId, reassignReason || "Supervisor operational reassignment");
    } else {
      assignTicket(ticket.id, selectedCrewId, slaHours);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
              {isReassignment ? <RefreshCw className="w-4.5 h-4.5" /> : <HardHat className="w-4.5 h-4.5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isReassignment ? "Reassign Field Contractor" : "Dispatch Field Contractor"}
              </h3>
              <p className="text-[11px] text-indigo-300/80">
                {isReassignment ? "Transfer work order & clear SLA bottlenecks" : "Task Allocation & Dynamic SLA Binding"}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700 hover:border-pink-500/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">Incident Work Order</span>
            <h4 className="text-xs font-bold text-white mt-1">{ticket.title}</h4>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{ticket.address_text}</p>
          </div>

          {/* Select Crew with Live Workload Counts */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Select Designated Contractor / Crew:
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {fieldCrews.map((crew) => {
                const isSelected = selectedCrewId === crew.id;
                const activeTasks = complaints.filter(
                  (c) => c.assigned_crew_id === crew.id && ["ASSIGNED", "WORK_SUBMITTED"].includes(c.status)
                ).length;

                return (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => setSelectedCrewId(crew.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border-purple-500 shadow-md shadow-purple-950/40 text-white ring-1 ring-purple-500/40"
                        : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-indigo-500/30"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{crew.full_name}</span>
                        {crew.id === ticket.assigned_crew_id && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">Current</span>
                        )}
                      </div>
                      <div className="text-[11px] text-indigo-300/70">{crew.department || "Field Rapid Response"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        activeTasks > 2
                          ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                          : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                      }`}>
                        {activeTasks} Active {activeTasks === 1 ? "Task" : "Tasks"}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reassignment Reason or SLA Duration */}
          {isReassignment || ticket.assigned_crew_id ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Reason for Reassignment:
              </label>
              <input
                type="text"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="e.g., Contractor delayed, emergency crew rebalance..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>SLA Target Timeframe</span>
                <span className="text-purple-300 font-extrabold">{slaHours} hours</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[12, 24, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setSlaHours(hours)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      slaHours === hours
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-purple-400 text-white shadow-md shadow-purple-500/30"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDispatchOrReassign}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 ring-1 ring-white/20 transition-all"
          >
            {isReassignment || ticket.assigned_crew_id ? "Confirm Reassignment" : "Confirm Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
};
