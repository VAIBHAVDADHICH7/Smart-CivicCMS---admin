"use client";

import React, { useState } from "react";
import { Complaint, ComplaintStatus } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { SlidersHorizontal, AlertTriangle, CheckCircle, Flame, ShieldAlert, X } from "lucide-react";

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Complaint;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const { manualOverrideStatus, currentProfile } = useCivicStore();
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>(
    ticket.status === "ESCALATED" ? "ASSIGNED" : "ESCALATED"
  );
  const [remarks, setRemarks] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyOverride = () => {
    if (!remarks.trim()) {
      setErrorMessage("Please specify administrative justification remarks for the audit trail.");
      return;
    }
    manualOverrideStatus(ticket.id, targetStatus, remarks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Administrative Status Override</h3>
              <p className="text-[11px] text-indigo-300/80">Executive Authority & Immutable Audit Jump</p>
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

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">Target Complaint</span>
            <h4 className="text-xs font-bold text-white mt-1">{ticket.title}</h4>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Current Status: <strong className="text-slate-200">{ticket.status}</strong></span>
              <span>Ward: <strong className="text-slate-200">{ticket.ward_id}</strong></span>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Select Override Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { status: "ESCALATED" as ComplaintStatus, label: "Escalate to Tier 2", icon: Flame, color: "border-rose-500/40 text-rose-300" },
                { status: "ASSIGNED" as ComplaintStatus, label: "Reset to Assigned", icon: SlidersHorizontal, color: "border-amber-500/40 text-amber-300" },
                { status: "RESOLVED" as ComplaintStatus, label: "Force Resolve", icon: CheckCircle, color: "border-emerald-500/40 text-emerald-300" },
                { status: "REOPENED" as ComplaintStatus, label: "Mark Reopened", icon: ShieldAlert, color: "border-purple-500/40 text-purple-300" },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = targetStatus === opt.status;
                return (
                  <button
                    key={opt.status}
                    type="button"
                    onClick={() => {
                      setTargetStatus(opt.status);
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? "bg-slate-800 border-indigo-400 text-white ring-1 ring-indigo-400 shadow-md"
                        : `bg-slate-950/70 border-slate-800 ${opt.color} hover:bg-slate-900`
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Reason / Administrative Justification:
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="Provide reason for this manual override for the permanent audit trail..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/20 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-300 bg-rose-950/80 p-3 rounded-xl border border-rose-500/30 font-medium">
              {errorMessage}
            </p>
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
            onClick={handleApplyOverride}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/30 ring-1 ring-white/20 transition-all"
          >
            Apply Status Override
          </button>
        </div>
      </div>
    </div>
  );
};
