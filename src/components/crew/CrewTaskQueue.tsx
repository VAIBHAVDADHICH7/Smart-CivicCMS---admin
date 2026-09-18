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
  Clock 
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
    if (diff <= 0) return { label: "Overdue", isOverdue: true };
    const hours = Math.floor(diff / 3600000);
    return { label: `Due in ${hours}h`, isOverdue: false };
  };

  return (
    <div className="space-y-5">
      {/* Crew On-Duty Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">{currentProfile.full_name}</div>
          <div className="text-[11px] text-slate-400">{currentProfile.department || "Municipal Field Crew"}</div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span>Active on field</span>
        </div>
      </div>

      {/* Task Queue Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Assigned Tasks</h3>
          <p className="text-[11px] text-slate-400">Sorted closest to farthest from your location</p>
        </div>
        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {sortedAssignedTickets.length} Pending
        </span>
      </div>

      {/* Tasks List */}
      {sortedAssignedTickets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-medium text-white">All Tasks Completed</h4>
          <p className="text-xs text-slate-400">No active work orders pending your inspection.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={ticket.category} />
                    <span className="text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {formatDistance(distance)}
                    </span>
                  </div>

                  <span className={`text-[11px] font-medium ${sla.isOverdue ? "text-rose-400" : "text-slate-400"}`}>
                    {sla.label}
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ticket.image_url}
                      alt={ticket.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white leading-snug">{ticket.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{ticket.description}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                      <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span className="truncate">{ticket.address_text}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.latitude},${ticket.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>Navigate</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setSelectedTicketForProof(ticket)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Submit Proof</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submitted List */}
      {submittedTickets.length > 0 && (
        <div className="pt-3 space-y-2">
          <h4 className="text-xs font-semibold text-slate-400">
            Awaiting Supervisor Sign-Off ({submittedTickets.length})
          </h4>
          <div className="space-y-2">
            {submittedTickets.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-white truncate max-w-xs">{t.title}</span>
                <StatusBadge status={t.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proof Modal */}
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
