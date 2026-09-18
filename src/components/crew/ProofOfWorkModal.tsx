"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { 
  Camera, 
  Check, 
  X, 
  AlertCircle,
  ChevronDown,
  MapPin,
  Sparkles
} from "lucide-react";
import { calculateGeodeticDistance, formatDistance } from "@/lib/spatial";

interface ProofOfWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Complaint;
}

export const ProofOfWorkModal: React.FC<ProofOfWorkModalProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const { submitResolutionProof } = useCivicStore();

  // Crew location state - default to ~5m away from ticket
  const [crewLat, setCrewLat] = useState<number>(ticket.latitude + 0.00004);
  const [crewLng, setCrewLng] = useState<number>(ticket.longitude + 0.00003);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSim, setShowSim] = useState(false);

  if (!isOpen) return null;

  const currentDistance = calculateGeodeticDistance(
    ticket.latitude,
    ticket.longitude,
    crewLat,
    crewLng
  );
  const isWithinGeofence = currentDistance <= 30.0;

  const SAMPLE_RESOLUTIONS = [
    { label: "Asphalt Repaired", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80" },
    { label: "Debris Removed", url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80" },
    { label: "Wiring Restored", url: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&q=80" },
  ];

  const handleSubmitProof = () => {
    if (!capturedPhoto) {
      setErrorMessage("Please capture or select completion photo.");
      return;
    }

    const result = submitResolutionProof(
      ticket.id,
      capturedPhoto,
      crewLat,
      crewLng
    );

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Upload On-Site Resolution Proof</h3>
              <p className="text-[11px] text-indigo-300/80">Enforces ≤30m geofence verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700 hover:border-pink-500/40 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Distance Status Banner */}
          <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between font-bold ${
            isWithinGeofence
              ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950"
              : "bg-rose-950/70 border-rose-500/40 text-rose-300"
          }`}>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isWithinGeofence ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              <span>{isWithinGeofence ? "On-Site Perimeter Validated" : "Too Far From Hazard"}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px]">
              GPS Delta: {formatDistance(currentDistance)}
            </span>
          </div>

          {/* Discreet Simulator for Testing */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
            <button
              type="button"
              onClick={() => setShowSim(!showSim)}
              className="w-full px-3.5 py-2 text-[11px] font-semibold text-slate-400 flex items-center justify-between hover:bg-slate-900 transition-colors"
            >
              <span>GPS Coordinates Tester</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSim ? "rotate-180" : ""}`} />
            </button>
            {showSim && (
              <div className="p-3 pt-0 flex gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCrewLat(ticket.latitude + 0.00004);
                    setCrewLng(ticket.longitude + 0.00003);
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    isWithinGeofence ? "bg-emerald-600/30 border-emerald-500 text-emerald-200" : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  Simulate On-Site (5m)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCrewLat(ticket.latitude + 0.002);
                    setCrewLng(ticket.longitude + 0.002);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    !isWithinGeofence ? "bg-rose-600/30 border-rose-500 text-rose-200" : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  Simulate Off-Site (280m)
                </button>
              </div>
            )}
          </div>

          {/* Reference Photo (Before) */}
          <div className="flex items-center gap-3.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.image_url}
                alt="Before"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-indigo-400 uppercase font-bold block">Incident Reference:</span>
              <div className="text-xs font-bold text-white truncate">{ticket.title}</div>
              <div className="text-[11px] text-slate-400 truncate">{ticket.address_text}</div>
            </div>
          </div>

          {/* Resolution Photo Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Select Completed Work Photo
            </label>

            {capturedPhoto ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-indigo-500/30 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhoto}
                  alt="Resolution"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCapturedPhoto(null)}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 text-xs text-white border border-slate-700 hover:border-pink-500/40 shadow-lg backdrop-blur-md"
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-5 text-center bg-slate-950/60 space-y-3">
                <Camera className="w-8 h-8 text-indigo-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-300">Choose simulated completion proof:</div>
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  {SAMPLE_RESOLUTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(s.url);
                        setErrorMessage(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-950/80 text-slate-200 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/40 text-xs font-semibold transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isWithinGeofence || !capturedPhoto}
            onClick={handleSubmitProof}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-500/30 ring-1 ring-white/20 transition-all"
          >
            Submit for Supervisor Sign-Off
          </button>
        </div>
      </div>
    </div>
  );
};
