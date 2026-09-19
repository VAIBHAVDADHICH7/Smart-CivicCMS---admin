"use client";

import React, { useState, useRef } from "react";
import { Complaint } from "@/types/database";
import { useCivicStore } from "@/lib/store";
import { 
  Camera, 
  Check, 
  X, 
  AlertCircle, 
  MapPin, 
  Sparkles, 
  Radio, 
  Navigation,
  Send,
  ShieldCheck,
  Video,
  UploadCloud
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crew location state - simulated on-site hardware GPS reading
  const [crewLat, setCrewLat] = useState<number>(ticket.latitude + 0.00004);
  const [crewLng, setCrewLng] = useState<number>(ticket.longitude + 0.00003);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  if (!isOpen) return null;

  const currentDistance = calculateGeodeticDistance(
    ticket.latitude,
    ticket.longitude,
    crewLat,
    crewLng
  );
  const isWithinGeofence = currentDistance <= 30.0;

  const SAMPLE_RESOLUTIONS = [
    { label: "Asphalt Resurfaced", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80" },
    { label: "Spill Cleared", url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80" },
    { label: "Luminaire Restored", url: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&q=80" },
  ];

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
          setErrorMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = () => {
    if (!capturedPhoto) {
      setErrorMessage("Please capture live completion photo from device camera.");
      return;
    }

    setIsSubmitting(true);
    const result = submitResolutionProof(
      ticket.id,
      capturedPhoto,
      crewLat,
      crewLng
    );

    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden Camera-Only File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          className="hidden"
        />

        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live On-Site Proof of Resolution</h3>
              <p className="text-[11px] text-indigo-300/80">Camera capture with ≤30m geofence validation</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700 hover:border-pink-500/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Distance Status Banner */}
          <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between font-bold shadow-md ${
            isWithinGeofence
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}>
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isWithinGeofence ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              <span>{isWithinGeofence ? "Perimeter Validated (Within 30m)" : "Distance Exceeded (>30m)"}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono">
              GPS Delta: {formatDistance(currentDistance)}
            </span>
          </div>

          {/* Live Device Hardware Telemetry Strip */}
          <div className="p-3 bg-slate-950/80 border border-indigo-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-200">Hardware GPS Fix:</span>
              <span className="text-emerald-400 font-mono font-bold">Locked (±1.8m)</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {crewLat.toFixed(5)}, {crewLng.toFixed(5)}
            </div>
          </div>

          {/* Incident Reference & Citizen Webhook Notice */}
          <div className="flex items-center gap-3.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
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

          {/* Photo Capture Interface */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Camera Capture</span>
              </label>
              <span className="text-[10px] text-amber-400/90 font-medium">Gallery uploads restricted</span>
            </div>

            {capturedPhoto ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-emerald-500/40 shadow-inner group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhoto}
                  alt="Resolution Proof"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                  <span className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Proof Attached</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="px-3 py-1 rounded-xl bg-slate-900/90 text-xs text-white border border-slate-700 hover:border-pink-500/40 shadow-lg backdrop-blur-md font-semibold"
                  >
                    Retake Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Live Camera Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-indigo-500/40 hover:border-cyan-400 rounded-2xl text-center bg-slate-950/60 hover:bg-slate-950 transition-all flex flex-col items-center justify-center gap-2 group shadow-inner"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Tap to Open Device Live Camera</div>
                    <div className="text-[11px] text-slate-400">Captures timestamped photo with embedded GPS metadata</div>
                  </div>
                </button>

                {/* Quick Simulation Samples */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 text-center">
                    Or select simulated live repair proof:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_RESOLUTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCapturedPhoto(s.url);
                          setErrorMessage(null);
                        }}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-indigo-950/80 text-slate-200 border border-slate-800 hover:border-indigo-500/40 text-[11px] font-semibold transition-all text-center"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Citizen Outbound Webhook Notice Banner */}
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 flex items-start gap-2.5">
            <Send className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-200">Outbound Webhook Pipeline:</span>
              <span className="ml-1 text-slate-400">
                Submitting will dispatch a live webhook alert to the Citizen Portal, opening the 48-hour citizen audit window before AI auto-completion fires.
              </span>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-300 bg-rose-950/80 p-3 rounded-xl border border-rose-500/30 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
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
            disabled={!isWithinGeofence || !capturedPhoto || isSubmitting}
            onClick={handleSubmitProof}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-500/30 ring-1 ring-white/20 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Submit for Supervisor Sign-Off</span>
          </button>
        </div>
      </div>
    </div>
  );
};
