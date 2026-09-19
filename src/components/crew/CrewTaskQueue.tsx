"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
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
  Zap,
  Radio,
  ShieldCheck,
  Compass,
  AlertTriangle,
  Flame,
  Layers,
  Bell,
  Volume2
} from "lucide-react";

export const CrewTaskQueue: React.FC = () => {
  const { complaints, currentProfile, notifications } = useCivicStore();
  const [selectedTicketForProof, setSelectedTicketForProof] = useState<Complaint | null>(null);

  // Field crew's simulated GPS position (Ward 14 depot)
  const [currentCrewLoc] = useState<{ lat: number; lng: number }>({
    lat: 26.9124,
    lng: 75.7891,
  });

  const assignedTickets = complaints.filter(
    (c) => (c.status === "ASSIGNED" || c.status === "ESCALATED") && 
           (c.assigned_crew_id === currentProfile.id || !c.assigned_crew_id)
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
    if (diff <= 0) return { label: "SLA Overdue (Escalation Warning)", isOverdue: true };
    const hours = Math.floor(diff / 3600000);
    return { label: `Due in ${hours}h`, isOverdue: false };
  };

  const unreadCrewNotifications = notifications.filter((n) => !n.is_read && n.target_role === "FIELD_CREW");

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Active Push Alert Banner if new orders assigned */}
      {unreadCrewNotifications.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-purple-950/70 to-slate-950 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="font-bold text-white">Push Alert:</span>
              <span className="ml-1 text-amber-200/90">{unreadCrewNotifications[0].title} — {unreadCrewNotifications[0].message}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase shrink-0 border border-amber-500/30">
            Action Required
          </span>
        </div>
      )}

      {/* Crew On-Duty Profile Card with Live Radar Telemetry */}
      <div className="rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/30 ring-1 ring-white/30">
              {currentProfile.full_name.charAt(0)}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{currentProfile.full_name}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                ON DUTY
              </span>
            </div>
            <div className="text-xs text-indigo-300/80">
              {currentProfile.department || "Roads & Civil Rapid Infrastructure"} • ID: {currentProfile.employee_id || "EMP-CRW-101"}
            </div>
          </div>
        </div>

        {/* Live GPS Proximity Radar Badge */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 text-indigo-200 shadow-inner">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-bold">GPS Geofence</div>
              <div className="font-mono text-emerald-300 text-[11px] font-bold">Active Radar (±3m)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 text-indigo-200 shadow-inner">
            <MapPin className="w-4 h-4 text-rose-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Ward</div>
              <div className="text-white text-[11px] font-bold">{currentProfile.ward_id || "Ward 14 (Civil Lines)"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Protocol Workflow Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/20 text-xs">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">1</span>
          <span className="text-slate-300 font-semibold">Proximity Routing</span>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">2</span>
          <span className="text-slate-300 font-semibold">≤30m GPS Validation</span>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">3</span>
          <span className="text-slate-300 font-semibold">Live Camera Proof</span>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">4</span>
          <span className="text-slate-300 font-semibold">Supervisor Audit</span>
        </div>
      </div>

      {/* Task Queue Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Assigned Field Work Orders</span>
          </h3>
          <p className="text-xs text-slate-400">Dynamically sorted by geodetic proximity from your active location</p>
        </div>
        <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40 shadow-sm">
          {sortedAssignedTickets.length} Assigned Orders
        </span>
      </div>

      {/* Tasks List */}
      {sortedAssignedTickets.length === 0 ? (
        <div className="rounded-3xl p-12 border border-emerald-500/20 bg-slate-900/90 text-center space-y-3 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-white">All Field Orders Cleared!</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No pending work orders currently allocated to your route. Stand by for live supervisor dispatch alerts.
          </p>
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
                className={`rounded-3xl p-5 sm:p-6 border backdrop-blur-xl space-y-4 shadow-xl transition-all ${
                  ticket.status === "ESCALATED"
                    ? "bg-rose-950/30 border-rose-500/40"
                    : "bg-slate-900/90 border-indigo-500/20 hover:border-purple-500/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={ticket.category} />
                    {ticket.status === "ESCALATED" && (
                      <span className="text-[11px] font-extrabold text-rose-300 bg-rose-950/90 px-2.5 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>Escalated SLA Breach</span>
                      </span>
                    )}
                    <span className="text-[11px] font-extrabold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30 shadow-sm flex items-center gap-1">
                      <Compass className="w-3 h-3 text-cyan-400" />
                      <span>{formatDistance(distance)} away</span>
                    </span>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    sla.isOverdue || ticket.status === "ESCALATED"
                      ? "bg-rose-950/80 border-rose-500/40 text-rose-300 animate-pulse" 
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}>
                    {sla.label}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-28 h-28 rounded-2xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 shadow-inner group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ticket.image_url}
                      alt={ticket.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] text-white font-mono">
                      #{ticket.id.slice(0, 6)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h4 className="text-sm font-bold text-white leading-snug">{ticket.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-300 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{ticket.address_text}</span>
                    </div>

                    {ticket.escalation_reason && (
                      <div className="text-[10px] text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-500/30">
                        {ticket.escalation_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.latitude},${ticket.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => soundFx.playClick()}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    <span>Open GPS Navigation</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playAction();
                      setSelectedTicketForProof(ticket);
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 ring-1 ring-white/20 transition-all hover:scale-[1.02]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Proof of Work</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submitted Proofs List */}
      {submittedTickets.length > 0 && (
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pending Supervisor Verification ({submittedTickets.length})</span>
            </h4>
            <span className="text-[11px] text-amber-300">Under Review</span>
          </div>

          <div className="space-y-2.5">
            {submittedTickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs shadow-md"
              >
                <div className="space-y-0.5 truncate max-w-sm">
                  <div className="font-semibold text-white truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{t.address_text}</div>
                </div>
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
