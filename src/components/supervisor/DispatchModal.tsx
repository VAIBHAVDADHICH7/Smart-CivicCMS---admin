"use client";

import React, { useState } from "react";
import { Complaint, Profile } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { HardHat, Clock, Check, X, ShieldAlert } from "lucide-react";

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Complaint;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const { assignTicket, profiles } = useCivicStore();

  // Available crews in the system
  const fieldCrews = profiles.filter((p) => p.role === "FIELD_CREW");
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    ticket.assigned_crew_id || fieldCrews[0]?.id || ""
  );
  const [slaHours, setSlaHours] = useState<number>(24);

  if (!isOpen) return null;

  const handleDispatch = () => {
    if (!selectedCrewId) return;
    assignTicket(ticket.id, selectedCrewId, slaHours);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <HardHat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Dispatch Field Crew</h3>
              <p className="text-[11px] text-slate-400">Task Allocation & SLA Binding</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Incident</span>
            <h4 className="text-xs font-bold text-white mt-0.5">{ticket.title}</h4>
            <p className="text-[11px] text-slate-400 truncate">{ticket.address_text}</p>
          </div>

          {/* Select Crew */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Assign to crew
            </label>
            <div className="space-y-2">
              {fieldCrews.map((crew) => {
                const isSelected = selectedCrewId === crew.id;
                return (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => setSelectedCrewId(crew.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{crew.full_name}</div>
                      <div className="text-[11px] text-slate-400">{crew.department || "Field Rapid Response"}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SLA Deadline Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Deadline</span>
              <span className="text-blue-400">{slaHours} hours</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[12, 24, 48, 72].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setSlaHours(hours)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    slaHours === hours
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedCrewId}
            onClick={handleDispatch}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
          >
            Confirm Dispatch
          </button>
        </div>
      </div>
    </div>
  );
};
