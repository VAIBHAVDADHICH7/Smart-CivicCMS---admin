"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { 
  Camera, 
  Check, 
  X, 
  AlertCircle,
  ChevronDown
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
    { label: "Asphalt Level", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80" },
    { label: "Debris Cleared", url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80" },
    { label: "Wiring Repaired", url: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&q=80" },
  ];

  const handleSubmitProof = () => {
    if (!capturedPhoto) {
      setErrorMessage("Please capture completion photo.");
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Submit Work Completion</h3>
            <p className="text-[11px] text-slate-400">Must be within 30m of the hazard site</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Distance Status Banner */}
          <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-medium ${
            isWithinGeofence
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}>
            <span>{isWithinGeofence ? "✓ On-Site (Within 30m perimeter)" : "⚠️ Too far from complaint location"}</span>
            <span className="text-[11px]">{formatDistance(currentDistance)}</span>
          </div>

          {/* Discreet Simulator for Testing */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
            <button
              type="button"
              onClick={() => setShowSim(!showSim)}
              className="w-full px-3 py-1.5 text-[11px] text-slate-400 flex items-center justify-between hover:bg-slate-900"
            >
              <span>GPS Location Simulator</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showSim ? "rotate-180" : ""}`} />
            </button>
            {showSim && (
              <div className="p-2 pt-0 flex gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCrewLat(ticket.latitude + 0.00004);
                    setCrewLng(ticket.longitude + 0.00003);
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1 rounded text-[10px] font-medium border ${
                    isWithinGeofence ? "bg-emerald-600/30 border-emerald-500 text-emerald-200" : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  On-Site (5m away)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCrewLat(ticket.latitude + 0.002);
                    setCrewLng(ticket.longitude + 0.002);
                  }}
                  className={`flex-1 py-1 rounded text-[10px] font-medium border ${
                    !isWithinGeofence ? "bg-rose-600/30 border-rose-500 text-rose-200" : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  Off-Site (280m away)
                </button>
              </div>
            )}
          </div>

          {/* Reference Photo (Before) */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.image_url}
                alt="Before"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">Reported Problem:</span>
              <div className="text-xs font-semibold text-white truncate">{ticket.title}</div>
              <div className="text-[11px] text-slate-400 truncate">{ticket.address_text}</div>
            </div>
          </div>

          {/* Resolution Photo Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Completed Work Photo
            </label>

            {capturedPhoto ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhoto}
                  alt="Resolution"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCapturedPhoto(null)}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-xs text-white border border-slate-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center bg-slate-950/40 space-y-2">
                <Camera className="w-6 h-6 text-slate-500 mx-auto" />
                <div className="text-xs text-slate-400">Select completion photo</div>
                <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                  {SAMPLE_RESOLUTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(s.url);
                        setErrorMessage(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isWithinGeofence || !capturedPhoto}
            onClick={handleSubmitProof}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Submit for Sign-Off
          </button>
        </div>
      </div>
    </div>
  );
};
