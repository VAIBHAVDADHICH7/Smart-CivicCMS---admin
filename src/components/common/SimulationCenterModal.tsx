"use client";

import React, { useState } from "react";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { ComplaintCategory } from "@/types/database";
import { 
  Sparkles, 
  X, 
  Zap, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  RotateCcw, 
  Send, 
  Bot,
  Flame,
  ArrowRight,
  TrendingUp,
  Cpu,
  DatabaseZap,
  RefreshCw,
  CircleCheck,
  CircleX
} from "lucide-react";

interface SimulationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulationCenterModal: React.FC<SimulationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    complaints, 
    wards, 
    submitComplaint, 
    runEscalationWorker, 
    resetToSeed 
  } = useCivicStore();

  const [activeTab, setActiveTab] = useState<"INJECT" | "TIME_WARP" | "AI_COPILOT" | "DB_SYNC">("INJECT");
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCategory, setCustomCategory] = useState<ComplaintCategory>("POTHOLE");
  const [customWard, setCustomWard] = useState<string>("WARD_14");
  const [customLat, setCustomLat] = useState<number>(26.9124);
  const [customLng, setCustomLng] = useState<number>(75.7873);
  const [customImage, setCustomImage] = useState<string>("https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80");
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [escalationFeedback, setEscalationFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);

  const presets = [
    {
      title: "Deep Pothole on Civil Lines Main Road (Duplicate Test)",
      description: "Severe 15cm asphalt crater causing vehicular deceleration near Governor Circle.",
      category: "POTHOLE" as ComplaintCategory,
      wardId: "WARD_14",
      lat: 26.9124, // Within 20m of existing ticket 1 to test spatial dedup
      lng: 75.7873,
      image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
      aiSeverity: "CRITICAL (Score: 0.94)",
      slaTarget: "12 Hours",
      testNote: "Will trigger 20m spatial deduplication engine and upvote existing ticket!",
    },
    {
      title: "Municipal Water Main Rupture with Road Flooding",
      description: "High-pressure ductile iron pipe joint leaking heavily, submerging sidewalk.",
      category: "WATER_LEAK" as ComplaintCategory,
      wardId: "WARD_15",
      lat: 26.8521,
      lng: 75.7725,
      image: "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80",
      aiSeverity: "HIGH (Score: 0.88)",
      slaTarget: "8 Hours",
      testNote: "Dispatches emergency Jal Board hydraulic repair crew.",
    },
    {
      title: "Illegal Solid Waste Dumping along Market Perimeter",
      description: "Overfilled municipal skip with non-segregated commercial debris on road berm.",
      category: "GARBAGE" as ComplaintCategory,
      wardId: "WARD_16",
      lat: 26.9248,
      lng: 75.8275,
      image: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop&q=80",
      aiSeverity: "MEDIUM (Score: 0.72)",
      slaTarget: "24 Hours",
      testNote: "Routes compactor truck via Ward 16 sanitation route.",
    },
    {
      title: "Dark Streetlight Cluster on Residential Ring",
      description: "3 consecutive 120W LED fixtures dark at evening hours. Junction box sparking.",
      category: "STREETLIGHT" as ComplaintCategory,
      wardId: "WARD_14",
      lat: 26.9082,
      lng: 75.7915,
      image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
      aiSeverity: "HIGH (Score: 0.81)",
      slaTarget: "18 Hours",
      testNote: "Requires electrician bucket-truck deployment.",
    },
  ];

  const handleApplyPreset = (idx: number) => {
    setSelectedPreset(idx);
    const p = presets[idx];
    setCustomTitle(p.title);
    setCustomDesc(p.description);
    setCustomCategory(p.category);
    setCustomWard(p.wardId);
    setCustomLat(p.lat);
    setCustomLng(p.lng);
    setCustomImage(p.image);
    setSubmissionFeedback(null);
  };

  const handleInjectIncident = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    soundFx.playAction();

    const title = customTitle || presets[selectedPreset].title;
    const desc = customDesc || presets[selectedPreset].description;
    const category = customCategory;
    const lat = customLat;
    const lng = customLng;
    const image = customImage;

    const res = submitComplaint({
      title,
      description: desc,
      category,
      latitude: lat,
      longitude: lng,
      image_url: image,
      address_text: `${title} (${customWard})`,
    });

    setIsProcessing(false);

    if (res.action === "UPVOTED") {
      soundFx.playSuccess();
      setSubmissionFeedback(
        `⚡ 20m Spatial Deduplication Triggered! Found existing complaint #${res.ticket.id.slice(0, 8)} (${res.distanceMeters}m away). Upvote count incremented to ${res.ticket.upvotes_count}.`
      );
    } else {
      soundFx.playSuccess();
      setSubmissionFeedback(
        `✅ New Ticket Created (#${res.ticket.id.slice(0, 8)}). AI Classified as ${res.ticket.category} in ${res.ticket.ward_id}. Auto-assigned SLA deadline: ${new Date(res.ticket.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
      );
    }
  };

  const handleRunTimeWarp = () => {
    soundFx.playWarning();
    const res = runEscalationWorker();
    setEscalationFeedback(res.summary);
  };

  const handleRunSync = async () => {
    setSyncStatus("running");
    setSyncResult(null);
    soundFx.playAction();
    try {
      const res = await fetch("/api/sync/import-complaints", { method: "POST" });
      const json = await res.json();
      setSyncResult(json);
      setSyncStatus(res.ok ? "done" : "error");
      if (res.ok) soundFx.playSuccess();
      else soundFx.playWarning();
    } catch (err: unknown) {
      setSyncResult({ error: err instanceof Error ? err.message : "Network error" });
      setSyncStatus("error");
      soundFx.playWarning();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-3xl rounded-3xl border border-sky-500/30 bg-[#0c1726]/95 backdrop-blur-2xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Smart City Live Incident Simulator & Test Lab
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-bold">
                  v2.0 Copilot
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate real-time citizen grievance intake, test 20m spatial deduplication, and trigger SLA escalations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-3 border-b border-slate-800/80 bg-slate-950/20 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab("INJECT"); soundFx.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "INJECT"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>1. Inject Citizen Incident</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("TIME_WARP"); soundFx.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "TIME_WARP"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>2. SLA Escalation Time Warp</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("AI_COPILOT"); soundFx.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "AI_COPILOT"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>3. AI Triage Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("DB_SYNC"); soundFx.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "DB_SYNC"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <DatabaseZap className="w-3.5 h-3.5" />
            <span>4. Source DB Sync</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: INJECT INCIDENT */}
          {activeTab === "INJECT" && (
            <div className="space-y-5">
              {/* Presets Grid */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Select Test Scenario Template</span>
                  <span className="text-[10px] text-sky-400 font-normal">Click a template to auto-populate</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {presets.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplyPreset(idx)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1 ${
                        selectedPreset === idx
                          ? "bg-sky-950/50 border-sky-400 shadow-md ring-1 ring-sky-400/40"
                          : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="truncate">{p.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0 ml-1">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{p.description}</p>
                      <div className="text-[10px] text-amber-300/90 font-mono pt-0.5">
                        ⚡ {p.testNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submission Feedback Banner */}
              {submissionFeedback && (
                <div className="p-4 rounded-2xl bg-sky-950/70 border border-sky-400/50 text-sky-200 text-xs flex items-start gap-3 shadow-lg animate-fade-in">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{submissionFeedback}</div>
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleInjectIncident} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Incident Title
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle || presets[selectedPreset].title}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Civic Category
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as ComplaintCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="POTHOLE">Roads & Asphalt Potholes</option>
                      <option value="GARBAGE">Sanitation & Solid Waste</option>
                      <option value="STREETLIGHT">Streetlighting & Smart Poles</option>
                      <option value="WATER_LEAK">Water Supply & Pipeline Leakage</option>
                      <option value="OTHER">Public Safety & Hazardous Drainage</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Incident Description
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={customDesc || presets[selectedPreset].description}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Target Ward
                    </label>
                    <select
                      value={customWard}
                      onChange={(e) => setCustomWard(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={customLat}
                      onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={customLng}
                      onChange={(e) => setCustomLng(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Simulated Incident into Pipeline</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: TIME WARP */}
          {activeTab === "TIME_WARP" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Automated SLA Breach & Escalation Engine</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Trigger the background automated escalation worker. Any unfulfilled work order exceeding its 24h/48h SLA deadline will be promoted to Tier 1 (Supervisor Notice) or Tier 2 (Commissioner Sanction & Contractor Penalty).
                </p>
              </div>

              {escalationFeedback && (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-3 shadow-lg animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-mono">{escalationFeedback}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Tier 1 Escalation Rule</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Triggers when work order is pending triage or repair past 24 hours. Auto-notifies Ward Supervisor.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Tier 2 Commissioner Sanction</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Triggers after 48 hours without closure. Levies ₹2,500/day contractor SLA penalty.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleRunTimeWarp}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-rose-950/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Execute SLA Escalation Sweep Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset municipal database to initial benchmark seed data?")) {
                      resetToSeed();
                      soundFx.playSuccess();
                      setEscalationFeedback("Benchmark seed dataset restored successfully.");
                    }
                  }}
                  className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AI COPILOT */}
          {activeTab === "AI_COPILOT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <Cpu className="w-5 h-5 text-sky-400 mx-auto" />
                  <div className="text-base font-extrabold text-white">99.4%</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Classification Precision</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <MapPin className="w-5 h-5 text-emerald-400 mx-auto" />
                  <div className="text-base font-extrabold text-emerald-400">20.0 Meters</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">PostGIS Dedup Radius</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <Clock className="w-5 h-5 text-purple-400 mx-auto" />
                  <div className="text-base font-extrabold text-purple-400">18.4 Hours</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg City Turnaround</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>Autonomous Municipal Triage Rules</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <span>1. Potholes & Arterial Roads</span>
                    <span className="font-mono font-bold text-amber-400">SLA: 24h • Priority: High</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <span>2. Streetlight Outages</span>
                    <span className="font-mono font-bold text-yellow-400">SLA: 36h • Priority: Medium</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <span>3. Waste Accumulation</span>
                    <span className="font-mono font-bold text-emerald-400">SLA: 24h • Priority: High</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <span>4. Water Pipeline Leakage</span>
                    <span className="font-mono font-bold text-cyan-400">SLA: 12h • Priority: Critical</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOURCE DB SYNC */}
          {activeTab === "DB_SYNC" && (
            <div className="space-y-5">
              {/* Info card */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <DatabaseZap className="w-4 h-4 text-amber-400" />
                  <span>External Complaint Feed Ingestion</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Pulls all complaints from your source Supabase database and upserts them into this project&apos;s database.
                  Safe to re-run — duplicate records are automatically skipped via ID-based conflict resolution.
                </p>
                <div className="font-mono text-[11px] bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800 space-y-0.5">
                  <div className="text-slate-400">Source <span className="text-amber-300">sganafwxemitcilryxgc.supabase.co</span></div>
                  <div className="text-slate-400">Destination <span className="text-sky-300">yceqxowlpllgszolebrm.supabase.co</span></div>
                </div>
              </div>

              {/* Result banner */}
              {syncResult && (
                <div className={`p-4 rounded-2xl border text-xs animate-fade-in space-y-3 ${
                  syncStatus === "done"
                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                    : "bg-rose-950/50 border-rose-500/40 text-rose-200"
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm text-white">
                    {syncStatus === "done"
                      ? <CircleCheck className="w-4 h-4 text-emerald-400" />
                      : <CircleX className="w-4 h-4 text-rose-400" />
                    }
                    <span>{syncStatus === "done" ? "Sync Complete" : "Sync Failed"}</span>
                  </div>
                  {syncStatus === "done" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                        <div className="text-lg font-extrabold text-white">{String(syncResult.total_fetched ?? 0)}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Fetched</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center">
                        <div className="text-lg font-extrabold text-emerald-300">{String(syncResult.imported ?? 0)}</div>
                        <div className="text-[10px] text-emerald-400 uppercase font-semibold">Imported</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                        <div className="text-lg font-extrabold text-slate-300">{String(syncResult.skipped ?? 0)}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Skipped</div>
                      </div>
                    </div>
                  )}
                  {Boolean(syncResult.source_table) && (
                    <div className="font-mono text-[11px] text-slate-400">
                      Source table: <span className="text-amber-300">{String(syncResult.source_table)}</span>
                    </div>
                  )}
                  {Boolean(syncResult.error) && (
                    <div className="font-mono text-[11px] text-rose-300">{String(syncResult.error)}</div>
                  )}
                  {Array.isArray(syncResult.errors) && (syncResult.errors as string[]).length > 0 && (
                    <div className="font-mono text-[11px] text-rose-300">{(syncResult.errors as string[]).join(" | ")}</div>
                  )}
                </div>
              )}

              {/* Trigger button */}
              <button
                type="button"
                onClick={handleRunSync}
                disabled={syncStatus === "running"}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2"
              >
                {syncStatus === "running" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing from Source Database...</span>
                  </>
                ) : (
                  <>
                    <DatabaseZap className="w-4 h-4" />
                    <span>Run Source DB Complaint Sync Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
