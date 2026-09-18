"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { calculateGeodeticDistance, formatDistance } from "@/lib/spatial";
import { CategoryBadge } from "../common/CategoryBadge";
import { StatusBadge } from "../common/StatusBadge";
import { ProofOfWorkModal } from "./ProofOfWorkModal";
import { 
  Navigation, 
  MapPin, 
  Camera, 
  CheckCircle, 
  Clock,
  Sparkles,
  Zap
} from "lucide-react";

export const CrewTaskQueue: React.FC = () => {
  const { complaints, currentProfile } = useCivicStore();
  const [selectedTicketForProof, setSelectedTicketForProof] = useState<Complaint | null>(null);

  // Field crew's simulated GPS position (Ward 14 depot)
  const [currentCrewLoc] = useState<{ lat: number; lng: number }>({
    lat: 26.9124,
    lng: 75.7891,
  });

  const assignedTickets = complaints.filter(
    (c) => c.status === "ASSIGNED" && (c.assigned_crew_id === currentProfile.id || !c.assigned_crew_id)
  );

  const submittedTickets = complaints.filter(
    (c) => c.status === "WORK_SUBMITTED" && c.assigned_crew_id === currentProfile.id
  );

  // Sort by geographic proximity (closest first)
  const sortedAssignedTickets = [...assignedTickets].sort((a, b) => {
    const distA = calculateGeodeticDistance(currentCrewLoc.lat, currentCrewLoc.lng, a.latitude, a.longitude);
    const distB = calculateGeodeticDistance(currentCrewLoc.lat, currentCrewLoc.lng, b.latitude, b.longitude);
    return distA - distB;
  });

  const formatSla = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    if (diff <= 0) return { label: "Overdue SLA", isOverdue: true };
    const hours = Math.floor(diff / 3600000);
    return { label: `Due in ${hours}h`, isOverdue: false };
  };

  return (
    <div className="space-y-6">
      {/* Crew On-Duty Profile Card with Gradient Mesh */}
      <div className="rounded-3xl p-5 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 backdrop-blur-xl shadow-xl flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow" />
            <span>{currentProfile.full_name}</span>
          </div>
          <div className="text-xs text-indigo-300/80">{currentProfile.department || "Municipal Field Contractor"}</div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-xs font-semibold text-indigo-200 shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-pink-400" />
          <span>Active GPS Depot</span>
        </div>
      </div>

      {/* Task Queue Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Assigned Field Orders</span>
          </h3>
          <p className="text-xs text-slate-400">Sorted by geodetic proximity from nearest to farthest</p>
        </div>
        <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40 shadow-sm">
          {sortedAssignedTickets.length} Assigned
        </span>
      </div>

      {/* Tasks List */}
      {sortedAssignedTickets.length === 0 ? (
        <div className="rounded-3xl p-12 border border-emerald-500/20 bg-slate-900/90 text-center space-y-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-white">All Field Tasks Cleared!</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">No pending work orders currently allocated to your route.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAssignedTickets.map((ticket) => {
            const distance = calculateGeodeticDistance(
              currentCrewLoc.lat,
              currentCrewLoc.lng,
              ticket.latitude,
              ticket.longitude
            );
            const sla = formatSla(ticket.sla_deadline);

            return (
              <div
                key={ticket.id}
                className="rounded-3xl p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl space-y-4 shadow-xl hover:border-purple-500/40 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={ticket.category} />
                    <span className="text-[11px] font-extrabold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30 shadow-sm">
                      {formatDistance(distance)} away
                    </span>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    sla.isOverdue 
                      ? "bg-rose-950/80 border-rose-500/40 text-rose-300 animate-pulse" 
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}>
                    {sla.label}
                  </span>
                </div>

                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ticket.image_url}
                      alt={ticket.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-sm font-bold text-white leading-snug">{ticket.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-1 text-xs text-indigo-300/80 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <span className="truncate">{ticket.address_text}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.latitude},${ticket.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    <span>GPS Directions</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setSelectedTicketForProof(ticket)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 ring-1 ring-white/20 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Upload Proof</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submitted Proofs List */}
      {submittedTickets.length > 0 && (
        <div className="pt-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Pending Supervisor Verification ({submittedTickets.length})
          </h4>
          <div className="space-y-2.5">
            {submittedTickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs shadow-md"
              >
                <span className="font-semibold text-white truncate max-w-xs">{t.title}</span>
                <StatusBadge status={t.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proof of Work Modal */}
      {selectedTicketForProof && (
        <ProofOfWorkModal
          isOpen={true}
          onClose={() => setSelectedTicketForProof(null)}
          ticket={selectedTicketForProof}
        />
      )}
    </div>
  );
};
