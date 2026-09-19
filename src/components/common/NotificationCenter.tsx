"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCivicStore } from "@/lib/store";
import { NotificationItem, NotificationType } from "@/types/database";
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  HardHat, 
  ShieldAlert, 
  ShieldCheck, 
  Camera, 
  Clock, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ExternalLink,
  Flame,
  Radio
} from "lucide-react";

// Web Audio API Chime Synthesizer
function playNotificationChime(type?: NotificationType) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Smooth dual tone chime
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (type === "ESCALATED") {
      // Urgent tone
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
      osc2.frequency.setValueAtTime(440.00, now);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
    } else {
      // Pleasant chime
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      osc2.frequency.setValueAtTime(261.63, now); // C4
    }

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {
    // Audio context may be restricted by browser policy before first interaction
  }
}

export const NotificationCenter: React.FC = () => {
  const { notifications, unreadNotificationCount, markNotificationAsRead, clearNotifications, currentProfile } = useCivicStore();
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(unreadNotificationCount);

  // Trigger sound when unread count increases
  useEffect(() => {
    if (unreadNotificationCount > prevCountRef.current && soundEnabled) {
      playNotificationChime();
    }
    prevCountRef.current = unreadNotificationCount;
  }, [unreadNotificationCount, soundEnabled]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <HardHat className="w-4 h-4 text-amber-400" />;
      case "ESCALATED":
        return <Flame className="w-4 h-4 text-rose-400 animate-pulse" />;
      case "PROOF_SUBMITTED":
        return <Camera className="w-4 h-4 text-cyan-400" />;
      case "SLA_WARNING":
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case "RESOLVED":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "CITIZEN_REOPEN":
        return <ShieldAlert className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notification alerts"
        className="relative p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-md group"
      >
        <Bell className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
        
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/50 border-2 border-slate-900 animate-pulse">
            {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">Live Push & SLA Dispatch</span>
              {unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                  {unreadNotificationCount} New
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sound toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute alert chime" : "Enable alert chime"}
                className={`p-1.5 rounded-xl border text-xs transition-colors ${
                  soundEnabled
                    ? "bg-slate-800 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  title="Clear all"
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active Status Strip */}
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Real-Time Web Push Engine Active</span>
            </span>
            <span className="text-indigo-300 text-[10px] font-mono">
              {currentProfile.role.replace("_", " ")}
            </span>
          </div>

          {/* Notification Items List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 pr-0.5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto stroke-1" />
                <p className="text-xs font-semibold text-slate-400">No active notification alerts</p>
                <p className="text-[11px] text-slate-500">Newly assigned tasks and SLA breach warnings will appear here in real-time.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markNotificationAsRead(item.id)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    !item.is_read
                      ? "bg-indigo-950/30 hover:bg-indigo-950/50"
                      : "hover:bg-slate-800/40 opacity-80"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5 shadow-sm">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatTimeAgo(item.created_at)}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold pt-0.5"
                      >
                        <span>View Work Order</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2 shadow-sm shadow-rose-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                playNotificationChime();
              }}
              className="text-[10px] text-slate-400 hover:text-indigo-300 font-semibold"
            >
              Simulate Device Notification Sound Chime
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
