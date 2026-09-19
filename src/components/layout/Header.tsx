"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { 
  Building2, 
  MapPin, 
  ChevronDown, 
  Sparkles, 
  User, 
  LogOut, 
  LogIn, 
  BadgeCheck, 
  Clock, 
  Command, 
  Volume2, 
  VolumeX,
  Settings,
  KeyRound
} from "lucide-react";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { CommandPalette } from "@/components/common/CommandPalette";
import { SimulationCenterModal } from "@/components/common/SimulationCenterModal";
import { ExportReportModal } from "@/components/commissioner/ExportReportModal";

export const Header: React.FC = () => {
  const router = useRouter();
  const { currentProfile, isAuthenticated, wards, logout } = useCivicStore();
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setIsAudioMuted(soundFx.getIsMuted());

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    const handleCustomOpenPalette = () => setCommandPaletteOpen(true);
    window.addEventListener("open-command-palette", handleCustomOpenPalette);

    return () => {
      clearInterval(timer);
      window.removeEventListener("open-command-palette", handleCustomOpenPalette);
    };
  }, []);

  const currentWard = wards.find((w) => w.id === currentProfile?.ward_id) || wards[0];

  const handleLogout = () => {
    soundFx.playClick();
    logout();
    setUserMenuOpen(false);
    router.push("/login");
  };

  const handleToggleAudio = () => {
    const nextMuted = soundFx.toggleMute();
    setIsAudioMuted(nextMuted);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-[#070e1b]/95 backdrop-blur-xl text-slate-100 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.85)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Left Brand Identity */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              onClick={() => soundFx.playClick()}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 via-white to-slate-200 text-slate-900 flex items-center justify-center shadow-md ring-1 ring-white/20 group-hover:scale-[1.03] transition-all">
                <Building2 className="w-5 h-5 text-indigo-950" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    Jan Setu
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Bridge
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Bridging Complaints to Action
                </span>
              </div>
            </Link>

            {currentWard && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 shadow-inner">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-slate-100">{currentWard.name}</span>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Command Palette ⌘K Trigger Button */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setCommandPaletteOpen(true);
              }}
              title="Open Command Palette (⌘K / Ctrl+K)"
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-all shadow-inner group"
            >
              <Command className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-[11px] font-medium text-slate-400">Search</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Smart City Simulation Lab Trigger */}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setSimulationModalOpen(true);
              }}
              title="Open Smart City Simulation Lab"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 hover:text-sky-200 text-xs font-semibold transition-all shadow-inner"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span className="hidden lg:inline text-[11px]">Sim Lab</span>
            </button>

            {/* Sound Haptics Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleAudio}
              title={isAudioMuted ? "Unmute Audio Cues" : "Mute Audio Cues"}
              className={`p-2 rounded-xl border transition-all ${
                isAudioMuted
                  ? "bg-slate-900 text-slate-500 border-slate-800"
                  : "bg-teal-950/60 text-teal-300 border-teal-500/30 hover:border-teal-400"
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Live Telemetry Clock */}
            {currentTime && (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Account / Sign In & Sign Off Profile Icon Menu */}
            {isAuthenticated && currentProfile ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/30 shadow-md transition-all group"
                  title="Account Profile & Sign Off"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20">
                      {currentProfile.full_name?.charAt(0) || "U"}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${currentProfile.is_active ? "bg-emerald-400" : "bg-slate-500"}`} />
                  </div>

                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1">
                      <span>{currentProfile.full_name?.split(" ")[0]}</span>
                      <BadgeCheck className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="text-[9px] text-indigo-300 font-medium">
                      {currentProfile.role === "MUNICIPAL_COMMISSIONER" ? "Commissioner" :
                       currentProfile.role === "WARD_SUPERVISOR" ? "Supervisor" : "Field Crew"}
                    </div>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in">
                    {/* User Profile Header Details */}
                    <div className="px-4 py-2.5 border-b border-indigo-500/20">
                      <div className="font-bold text-xs text-white">{currentProfile.full_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{currentProfile.email || "staff@civicpulse.gov"}</div>
                      <div className="text-[10px] text-indigo-300 font-semibold mt-0.5 flex items-center justify-between">
                        <span>{currentProfile.role?.replace(/_/g, " ")}</span>
                        {currentProfile.employee_id && (
                          <span className="font-mono text-slate-400">ID: {currentProfile.employee_id}</span>
                        )}
                      </div>
                    </div>

                    {/* Menu Actions - Sign In & Sign Off */}
                    <div className="p-1.5 space-y-1">
                      <Link
                        href="/login"
                        onClick={() => {
                          soundFx.playClick();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors font-medium"
                      >
                        <LogIn className="w-4 h-4 text-indigo-400" />
                        <span>Sign In / Switch Account</span>
                      </Link>

                      <div className="border-t border-slate-800 my-1" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-rose-300 hover:bg-rose-500/10 transition-colors font-semibold"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Sign Off</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => soundFx.playClick()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all group"
                title="Sign In to Municipal Portal"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenSimulation={() => setSimulationModalOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
      />

      {/* Simulation Center Modal */}
      <SimulationCenterModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
      />

      {/* Executive Export Modal */}
      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </>
  );
};
