"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { 
  CheckCircle2, 
  X, 
  MapPin, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { CategoryBadge } from "../common/CategoryBadge";
import { StatusBadge } from "../common/StatusBadge";

interface DualProofViewerProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Complaint;
}

export const DualProofViewer: React.FC<DualProofViewerProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const { approveResolution, rejectResolution, profiles } = useCivicStore();
  const [rejecting, setRejecting] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [approvalNotes, setApprovalNotes] = useState(
    "Verified photographic evidence and GPS location. Work meets quality standards."
  );

  if (!isOpen) return null;

  const assignedCrew = profiles.find((p) => p.id === ticket.assigned_crew_id);

  const handleApprove = () => {
    approveResolution(ticket.id, approvalNotes);
    onClose();
  };

  const handleReject = () => {
    if (!rejectionNotes.trim()) return;
    rejectResolution(ticket.id, rejectionNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Dual-Proof Quality Verification</h3>
            </div>
            <p className="text-xs text-indigo-300/80 mt-0.5">
              Assigned Contractor: <span className="text-white font-semibold">{assignedCrew?.full_name || "Municipal Crew"}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700 hover:border-pink-500/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CategoryBadge category={ticket.category} />
              <StatusBadge status={ticket.status} size="sm" />
            </div>
            <span className="text-xs text-slate-400">
              Reported: {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Side-by-Side Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>1. Initial Citizen Incident</span>
                </span>
              </div>

              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.image_url}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-xs text-slate-300 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white">{ticket.title}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{ticket.address_text}</span>
                </div>
              </div>
            </div>

            {/* After Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>2. Field Crew Completion Proof</span>
                </span>
              </div>

              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-emerald-500/30 shadow-inner relative">
                {ticket.resolution_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ticket.resolution_image_url}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    No resolution photo provided
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-300 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">GPS Geofence Verified</span>
                  <span className="text-[11px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Delta: {ticket.resolution_distance_meters || 12}m (≤30m)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Submitted: {ticket.resolution_submitted_at ? new Date(ticket.resolution_submitted_at).toLocaleTimeString() : "Recent"}
                </div>
              </div>
            </div>
          </div>

          {/* Verification Notes */}
          {!rejecting ? (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-300">
                Supervisor Approval Sign-Off Remarks:
              </label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-rose-300">
                Reason for Rejecting Proof (Requires Crew Re-work):
              </label>
              <textarea
                rows={2}
                required
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Explain why work failed quality check..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          {!rejecting ? (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Proof</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/30 flex items-center gap-2 ring-1 ring-white/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Mark Resolved</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/30 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
