"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { 
  Search, 
  Command, 
  MapPin, 
  ShieldCheck, 
  HardHat, 
  Landmark, 
  Zap, 
  FileText, 
  SlidersHorizontal, 
  Volume2, 
  VolumeX, 
  X, 
  ArrowRight, 
  Sparkles,
  Layers,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock
} from "lucide-react";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSimulation?: () => void;
  onOpenExport?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenSimulation,
  onOpenExport,
}) => {
  const router = useRouter();
  const { 
    complaints, 
    wards, 
    setRole, 
    runEscalationWorker, 
    resetToSeed 
  } = useCivicStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsAudioMuted(soundFx.getIsMuted());
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard listener for ⌘K / Ctrl+K and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        soundFx.playClick();
        if (isOpen) onClose();
        else {
          // Trigger open via custom event if not handled by parent
          window.dispatchEvent(new CustomEvent("open-command-palette"));
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Quick navigation items
  const staticActions = [
    {
      id: "nav-commissioner",
      title: "Municipal Commissioner Overview",
      description: "Citywide macro governance, contractor compliance, and ward velocity ranking",
      category: "Navigation",
      icon: Landmark,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
      action: () => {
        setRole("MUNICIPAL_COMMISSIONER");
        router.push("/commissioner");
        onClose();
      },
    },
    {
      id: "nav-supervisor",
      title: "Ward Supervisor Console",
      description: "Spatial GIS triage, dual-photo verification, and crew dispatching",
      category: "Navigation",
      icon: ShieldCheck,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      action: () => {
        setRole("WARD_SUPERVISOR");
        router.push("/supervisor");
        onClose();
      },
    },
    {
      id: "nav-crew",
      title: "Field Crew Work Orders",
      description: "Proximity-ordered task queue, GPS turn-by-turn routing, and proof submission",
      category: "Navigation",
      icon: HardHat,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      action: () => {
        setRole("FIELD_CREW");
        router.push("/crew");
        onClose();
      },
    },
    {
      id: "action-simulation",
      title: "Smart City Simulation & Live Test Lab",
      description: "Inject real-time citizen incidents, test 20m spatial dedup, and warp SLA deadlines",
      category: "Simulation & AI",
      icon: Sparkles,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      action: () => {
        onClose();
        if (onOpenSimulation) onOpenSimulation();
      },
    },
    {
      id: "action-escalation-sweep",
      title: "Run AI Escalation Sweep Engine",
      description: "Scan active incidents across all wards for 24h/48h SLA deadline breaches",
      category: "Operations",
      icon: Zap,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      action: () => {
        soundFx.playWarning();
        const res = runEscalationWorker();
        alert(res.summary);
        onClose();
      },
    },
    {
      id: "action-export-report",
      title: "Export Executive Governance Audit Report",
      description: "Generate print-ready governance brief (PDF) and contractor CSV audit trail",
      category: "Reporting",
      icon: FileText,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
      action: () => {
        onClose();
        if (onOpenExport) onOpenExport();
      },
    },
    {
      id: "action-toggle-sound",
      title: isAudioMuted ? "Unmute Sound Effects & Audio Haptics" : "Mute Sound Effects & Audio Haptics",
      description: isAudioMuted ? "Enable subtle Web Audio synth feedback" : "Silence micro-interaction audio cues",
      category: "Preferences",
      icon: isAudioMuted ? Volume2 : VolumeX,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
      action: () => {
        const next = soundFx.toggleMute();
        setIsAudioMuted(next);
      },
    },
    {
      id: "action-reset-demo",
      title: "Restore Benchmark Seed Dataset",
      description: "Reset complaints, ward polygons, and audit logs to pristine initial demo state",
      category: "Data",
      icon: RotateCcw,
      color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
      action: () => {
        if (confirm("Reset municipal database to initial benchmark seed data?")) {
          resetToSeed();
          soundFx.playSuccess();
          onClose();
        }
      },
    },
  ];

  // Filter dynamic tickets matching query
  const matchingTickets = complaints.filter((c) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.address_text.toLowerCase().includes(q) ||
      c.ward_id.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  // Filter static actions matching query
  const matchingActions = staticActions.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  const totalResultsCount = matchingActions.length + matchingTickets.length;

  // Handle arrow key navigation & Enter selection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      soundFx.playClick();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResultsCount));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      soundFx.playClick();
      setSelectedIndex((prev) => (prev - 1 + totalResultsCount) % Math.max(1, totalResultsCount));
    } else if (e.key === "Enter") {
      e.preventDefault();
      soundFx.playClick();
      if (selectedIndex < matchingActions.length) {
        matchingActions[selectedIndex]?.action();
      } else {
        const ticket = matchingTickets[selectedIndex - matchingActions.length];
        if (ticket) {
          router.push(`/supervisor?ticket=${ticket.id}`);
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl rounded-3xl border border-indigo-500/30 bg-[#0c1626]/95 backdrop-blur-2xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800/80">
          <Search className="w-5 h-5 text-indigo-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search complaints, wards, or quick actions..."
            className="w-full bg-transparent px-3.5 py-1 text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-400 font-mono">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Stream */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Dynamic Ticket Matches */}
          {matchingTickets.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>Matching Municipal Complaints ({matchingTickets.length})</span>
              </div>
              <div className="space-y-1">
                {matchingTickets.map((ticket, idx) => {
                  const itemIndex = matchingActions.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        soundFx.playClick();
                        router.push(`/supervisor?ticket=${ticket.id}`);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-indigo-950/70 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400/30"
                          : "bg-slate-950/40 border-slate-800/60 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CategoryBadge category={ticket.category} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{ticket.title}</div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            <span>{ticket.ward_id}</span>
                            <span>•</span>
                            <span>{ticket.address_text}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={ticket.status} size="sm" />
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "text-indigo-300 translate-x-0.5" : "text-slate-600"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions & Navigation */}
          {matchingActions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 flex items-center gap-1.5">
                <Command className="w-3 h-3 text-purple-400" />
                <span>Commands & Portals</span>
              </div>
              <div className="space-y-1">
                {matchingActions.map((action, idx) => {
                  const Icon = action.icon;
                  const isSelected = selectedIndex === idx;
                  return (
                    <div
                      key={action.id}
                      onClick={() => {
                        soundFx.playClick();
                        action.action();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-indigo-950/70 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400/30"
                          : "bg-slate-950/40 border-slate-800/60 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${action.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{action.title}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {action.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {action.description}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? "text-indigo-300 translate-x-0.5" : "text-slate-600"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalResultsCount === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching commands or municipal tickets found.
            </div>
          )}
        </div>

        {/* Footer Key Hints */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono">↓</kbd>
              <span className="text-[10px]">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono">↵</kbd>
              <span className="text-[10px]">Select</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            CivicPulse ⌘K
          </span>
        </div>
      </div>
    </div>
  );
};
