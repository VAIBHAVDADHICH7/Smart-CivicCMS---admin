"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { WardGisMap } from "../maps/WardGisMap";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { DualProofViewer } from "./DualProofViewer";
import { DispatchModal } from "./DispatchModal";
import { 
  Search, 
  MapPin, 
  List, 
  HardHat, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";

export const SupervisorConsole: React.FC = () => {
  const { complaints, wards, currentProfile } = useCivicStore();
  const [selectedWardId, setSelectedWardId] = useState<string>(
    currentProfile.ward_id || wards[0]?.id || "WARD_14"
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<"MAP" | "LIST">("LIST");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [ticketForDualProof, setTicketForDualProof] = useState<Complaint | null>(null);
  const [ticketForDispatch, setTicketForDispatch] = useState<Complaint | null>(null);

  const wardComplaints = complaints.filter((c) => {
    const matchesWard = selectedWardId === "ALL" || c.ward_id === selectedWardId;
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWard && matchesStatus && matchesSearch;
  });

  const selectedWard = wards.find((w) => w.id === selectedWardId) || wards[0];

  return (
    <div className="space-y-5">
      {/* Ward Selection & Filter Control Strip with Frosted Glass & Glowing Borders */}
      <div className="rounded-3xl p-4 sm:p-5 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Ward Select */}
          <div className="relative">
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="px-3.5 py-2 bg-slate-950 border border-indigo-500/30 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-inner"
            >
              <option value="ALL">All Municipal Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs with Eye-Catching Gradient */}
          <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shadow-inner text-xs">
            {["ALL", "PENDING", "ASSIGNED", "WORK_SUBMITTED", "RESOLVED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "All" : st === "WORK_SUBMITTED" ? "Completed" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Mobile View Switcher */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports or areas..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-inner"
            />
          </div>

          {/* Mobile Tab Toggle */}
          <div className="flex md:hidden p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("LIST")}
              className={`px-2.5 py-1 rounded-lg font-bold ${mobileTab === "LIST" ? "bg-purple-600 text-white" : "text-slate-400"}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("MAP")}
              className={`px-2.5 py-1 rounded-lg font-bold ${mobileTab === "MAP" ? "bg-purple-600 text-white" : "text-slate-400"}`}
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
            <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 font-semibold border border-indigo-500/30 text-[11px]">
              {wardComplaints.length} Reports Located
            </span>
          </div>

          <div className="w-full h-[460px] md:h-[560px] rounded-2xl overflow-hidden border border-indigo-500/20 shadow-inner">
            <WardGisMap
              complaints={wardComplaints}
              wards={selectedWardId === "ALL" ? wards : [selectedWard]}
              selectedWardId={selectedWardId}
              selectedComplaintId={selectedComplaint?.id}
              onSelectComplaint={(c) => {
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
              {wardComplaints.length} Total
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
            {wardComplaints.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No reports matching filter.
              </div>
            ) : (
              wardComplaints.map((ticket) => {
                const isSelected = selectedComplaint?.id === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedComplaint(ticket)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all space-y-2.5 shadow-md ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-purple-500 shadow-purple-950/40 ring-1 ring-purple-500/40"
                        : "bg-slate-950/70 border-slate-800/80 hover:border-indigo-500/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CategoryBadge category={ticket.category} />
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug">{ticket.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{ticket.address_text}</p>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>

                      {ticket.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTicketForDispatch(ticket);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/30 flex items-center gap-1.5"
                        >
                          <HardHat className="w-3.5 h-3.5" />
                          <span>Dispatch Crew</span>
                        </button>
                      )}

                      {ticket.status === "WORK_SUBMITTED" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
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

      {/* Dispatch Modal */}
      {ticketForDispatch && (
        <DispatchModal
          isOpen={true}
          onClose={() => setTicketForDispatch(null)}
          ticket={ticketForDispatch}
        />
      )}
    </div>
  );
};
