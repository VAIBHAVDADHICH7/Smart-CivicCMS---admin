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
  CheckCircle2 
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
    <div className="space-y-4">
      {/* Ward Selection & Filter Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Ward Select */}
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All City Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex gap-1 overflow-x-auto">
            {["ALL", "PENDING", "ASSIGNED", "WORK_SUBMITTED", "RESOLVED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "All" : st === "WORK_SUBMITTED" ? "Completed" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Mobile View Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Mobile Tab Toggle */}
          <div className="flex md:hidden p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("LIST")}
              className={`px-2.5 py-1 rounded-md ${mobileTab === "LIST" ? "bg-blue-600 text-white font-medium" : "text-slate-400"}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("MAP")}
              className={`px-2.5 py-1 rounded-md ${mobileTab === "MAP" ? "bg-blue-600 text-white font-medium" : "text-slate-400"}`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Responsive Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Map View (Visible on Desktop OR when Mobile Map Tab is active) */}
        <div className={`md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex-col ${
          mobileTab === "MAP" ? "flex" : "hidden md:flex"
        }`}>
          <div className="px-2 py-1.5 flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Ward Map</span>
            </span>
            <span>{wardComplaints.length} reports</span>
          </div>

          <div className="w-full h-[450px] md:h-[540px] rounded-xl overflow-hidden">
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

        {/* List View (Visible on Desktop OR when Mobile List Tab is active) */}
        <div className={`md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-col space-y-3 ${
          mobileTab === "LIST" ? "flex" : "hidden md:flex"
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300">
              Reports
            </h3>
            <span className="text-xs text-slate-400">
              {wardComplaints.length} Total
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1">
            {wardComplaints.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No reports matching filter.
              </div>
            ) : (
              wardComplaints.map((ticket) => {
                const isSelected = selectedComplaint?.id === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedComplaint(ticket)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-colors space-y-2 ${
                      isSelected
                        ? "bg-slate-800 border-blue-500 shadow-sm"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CategoryBadge category={ticket.category} />
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>

                    <h4 className="text-xs font-medium text-white">{ticket.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{ticket.address_text}</p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>

                      {ticket.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTicketForDispatch(ticket);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1"
                        >
                          <HardHat className="w-3 h-3" />
                          <span>Assign</span>
                        </button>
                      )}

                      {ticket.status === "WORK_SUBMITTED" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTicketForDualProof(ticket);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Review Proof</span>
                        </button>
                      )}

                      {ticket.status === "RESOLVED" && (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
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
