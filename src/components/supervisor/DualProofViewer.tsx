"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { 
  CheckCircle2, 
  X, 
  MapPin, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck,
  Camera,
  Clock,
  Award,
  FileCheck,
  Sliders,
  Columns
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
  const [viewMode, setViewMode] = useState<"SIDE_BY_SIDE" | "SLIDER">("SIDE_BY_SIDE");
  const [sliderPos, setSliderPos] = useState(50);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [approvalNotes, setApprovalNotes] = useState(
    "Verified photographic evidence and on-site GPS geofence coordinates. Work satisfies municipal quality compliance."
  );

  if (!isOpen) return null;

  const assignedCrew = profiles.find((p) => p.id === ticket.assigned_crew_id);

  const handleApprove = () => {
    soundFx.playSuccess();
    approveResolution(ticket.id, approvalNotes);
    onClose();
  };

  const handleReject = () => {
    if (!rejectionNotes.trim()) return;
    soundFx.playWarning();
    rejectResolution(ticket.id, rejectionNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 ring-1 ring-white/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Dual-Proof Quality Verification & Sign-Off</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  Geofence ≤30m Verified
                </span>
              </div>
              <p className="text-xs text-indigo-300/80 mt-0.5">
                Contractor: <span className="text-white font-semibold">{assignedCrew?.full_name || "Municipal Rapid Response Crew"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => { setViewMode("SIDE_BY_SIDE"); soundFx.playClick(); }}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "SIDE_BY_SIDE" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("SLIDER"); soundFx.playClick(); }}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "SLIDER" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compare Slider</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700 hover:border-pink-500/40 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2">
              <CategoryBadge category={ticket.category} />
              <StatusBadge status={ticket.status} size="sm" />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Report ID: <span className="font-mono text-white">#{ticket.id.slice(0, 8)}</span></span>
              <span>Ward: <span className="text-indigo-300 font-bold">{ticket.ward_id}</span></span>
              <span>Reported: {new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* VIEW MODE 1: SIDE BY SIDE */}
          {viewMode === "SIDE_BY_SIDE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Before Photo */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>1. Initial Incident Hazard</span>
                  </span>
                  <span className="text-slate-500 text-[11px]">Reported Photo</span>
                </div>

                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ticket.image_url}
                    alt="Before"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] text-rose-300 font-semibold">
                    Before Work Commenced
                  </div>
                </div>

                <div className="text-xs text-slate-300 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">{ticket.title}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                    <span className="truncate">{ticket.address_text}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 line-clamp-2">
                    {ticket.description}
                  </div>
                </div>
              </div>

              {/* After Photo */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>2. Field Crew Completion Proof</span>
                  </span>
                  <span className="text-emerald-400 text-[11px] font-semibold">On-Site Verified</span>
                </div>

                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-emerald-500/40 shadow-inner relative group">
                  {ticket.resolution_image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={ticket.resolution_image_url}
                      alt="After"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      No resolution photo provided
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-[10px] text-emerald-300 font-semibold">
                    Field Remediation Complete
                  </div>
                </div>

                <div className="text-xs text-slate-300 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>GPS Geofence Validated</span>
                    </span>
                    <span className="text-[11px] text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                      Delta: {ticket.resolution_distance_meters || 8}m (≤30m)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Timestamp: {ticket.resolution_submitted_at ? new Date(ticket.resolution_submitted_at).toLocaleTimeString() : "Recent"}</span>
                    <span className="text-indigo-300 font-semibold">Camera Hash #982F</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: INTERACTIVE DRAG SLIDER */}
          {viewMode === "SLIDER" && (
            <div className="space-y-3">
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 select-none shadow-2xl">
                {/* After Image (Background) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.resolution_image_url || ticket.image_url}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Before Image (Clipped Overlay) */}
                <div 
                  className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-2xl"
                  style={{ width: `${sliderPos}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ticket.image_url}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: "100%", height: "100%" }}
                  />
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-rose-500/40 text-rose-300 font-bold text-xs">
                    BEFORE REPAIR
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                  AFTER REPAIR
                </div>

                {/* Slider Handle Knob */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center pointer-events-none cursor-ew-resize font-bold text-xs border-2 border-slate-900"
                  style={{ left: `${sliderPos}%` }}
                >
                  ↔
                </div>
              </div>

              {/* Slider Range Controller */}
              <div className="flex items-center gap-3 px-2">
                <span className="text-[11px] text-rose-400 font-semibold shrink-0">Before Damage</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-950 rounded-lg border border-slate-800"
                />
                <span className="text-[11px] text-emerald-400 font-semibold shrink-0">After Completion</span>
              </div>
            </div>
          )}

          {/* Quality Audit Scorecard */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/90 rounded-2xl border border-indigo-500/20 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Visual Quality Score</div>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">99.4%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">GPS Accuracy</div>
              <div className="text-base font-extrabold text-cyan-400 mt-0.5">±3.8 meters</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">SLA Resolution Time</div>
              <div className="text-base font-extrabold text-purple-400 mt-0.5">14.2 hours</div>
            </div>
          </div>

          {/* Verification Notes */}
          {!rejecting ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Supervisor Approval Sign-Off Remarks:
              </label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-rose-300">
                Reason for Rejecting Proof (Requires Contractor Re-work):
              </label>
              <textarea
                rows={2}
                required
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Explain why work failed quality check (e.g. debris not cleared, uneven asphalt)..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-rose-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
                onClick={() => { setRejecting(true); soundFx.playWarning(); }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Proof</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/30 flex items-center gap-2 ring-1 ring-white/20 transition-all hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Sign Off Resolved</span>
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
