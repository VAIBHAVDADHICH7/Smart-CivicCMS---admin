"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { 
  CheckCircle2, 
  X, 
  MapPin, 
  XCircle, 
  AlertTriangle 
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
    "Verified photographic evidence and GPS location. Work meets standards."
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Work Verification</h3>
            <p className="text-[11px] text-slate-400">
              Assigned to: {assignedCrew?.full_name || "Field Crew"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CategoryBadge category={ticket.category} />
              <StatusBadge status={ticket.status} size="sm" />
            </div>
            <span className="text-[11px] text-slate-400">
              Reported: {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Side-by-Side Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Before */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-rose-400">Before</span>
              </div>

              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.image_url}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-xs text-slate-300 p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="font-medium text-white">{ticket.title}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{ticket.address_text}</span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-emerald-400">After</span>
                {ticket.resolution_distance_meters !== undefined && (
                  <span className="text-emerald-400 text-[10px]">
                    Verified on-site: {ticket.resolution_distance_meters}m
                  </span>
                )}
              </div>

              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                {ticket.resolution_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ticket.resolution_image_url}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                    No resolution photo
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-300 p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">Submitted by Contractor</div>
                <div className="text-[11px] text-slate-400">
                  {ticket.resolution_submitted_at
                    ? new Date(ticket.resolution_submitted_at).toLocaleTimeString()
                    : "Recently"}
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Notes Form */}
          {rejecting ? (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-2">
              <label className="text-xs font-semibold text-rose-300 block">
                Reason for Rejection:
              </label>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="E.g. Asphalt not leveled, debris still on sidewalk..."
                className="w-full p-2 bg-slate-950 border border-rose-500/40 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!rejectionNotes.trim()}
                  onClick={handleReject}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
                >
                  Confirm Rejection
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium block">
                Approval Remarks:
              </label>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRejecting(!rejecting)}
            className="px-3 py-2 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 text-xs font-medium"
          >
            Reject Work
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
            >
              Approve & Mark Fixed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
