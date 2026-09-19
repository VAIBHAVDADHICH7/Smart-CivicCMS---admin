"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  TrendingUp, 
  Layers, 
  Activity, 
  MapPin, 
  HardHat, 
  ShieldCheck, 
  Landmark, 
  AlertTriangle,
  Trash2,
  Lightbulb,
  Droplets,
  HelpCircle,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Search,
  ThumbsUp,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Check,
  Flame,
  Radio,
  Eye,
  Command,
  SlidersHorizontal,
  FileText
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { ComplaintCategory, Complaint } from "@/types/database";
import { SimulationCenterModal } from "@/components/common/SimulationCenterModal";
import { ExportReportModal } from "@/components/commissioner/ExportReportModal";

const WardGisMap = dynamic(
  () => import("@/components/maps/WardGisMap").then((m) => m.WardGisMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[440px] flex items-center justify-center bg-slate-950/60 rounded-3xl text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2" />
        Loading Live Incident GIS Map...
      </div>
    ),
  }
);

export default function HomePage() {
  const { complaints, wards, audits, setRole, upvoteComplaint } = useCivicStore();
  const [mapTab, setMapTab] = useState<"MAP" | "LIST">("MAP");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectingTicket, setInspectingTicket] = useState<Complaint | null>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Core Aggregations
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter((c) => c.status === "RESOLVED").length;
  const inProgressComplaints = complaints.filter((c) => ["ASSIGNED", "WORK_SUBMITTED"].includes(c.status)).length;
  const pendingComplaints = complaints.filter((c) => c.status === "PENDING").length;
  const escalatedComplaints = complaints.filter((c) => c.status === "ESCALATED").length;

  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;
  const totalUpvotes = complaints.reduce((sum, c) => sum + c.upvotes_count, 0);
  const duplicateSavedCount = Math.max(0, totalUpvotes - totalComplaints);
  const dedupGainPercent = totalUpvotes > 0 ? Math.round((duplicateSavedCount / totalUpvotes) * 100) : 32;

  // Category breakdown definition
  const categoriesList: {
    category: ComplaintCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    barGradient: string;
    bgGradient: string;
  }[] = [
    {
      category: "POTHOLE",
      label: "Roads & Potholes",
      icon: AlertTriangle,
      color: "text-amber-400",
      barGradient: "bg-gradient-to-r from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/10 to-orange-500/5",
    },
    {
      category: "GARBAGE",
      label: "Sanitation & Waste",
      icon: Trash2,
      color: "text-emerald-400",
      barGradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/5",
    },
    {
      category: "STREETLIGHT",
      label: "Streetlights & Power",
      icon: Lightbulb,
      color: "text-yellow-400",
      barGradient: "bg-gradient-to-r from-yellow-400 to-amber-500",
      bgGradient: "from-yellow-500/10 to-amber-500/5",
    },
    {
      category: "WATER_LEAK",
      label: "Water Supply & Leaks",
      icon: Droplets,
      color: "text-cyan-400",
      barGradient: "bg-gradient-to-r from-cyan-400 to-blue-500",
      bgGradient: "from-cyan-500/10 to-blue-500/5",
    },
    {
      category: "OTHER",
      label: "Public Safety & Hazards",
      icon: HelpCircle,
      color: "text-purple-400",
      barGradient: "bg-gradient-to-r from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/5",
    },
  ];

  const categoryStats = categoriesList.map((item) => {
    const total = complaints.filter((c) => c.category === item.category).length;
    const resolved = complaints.filter((c) => c.category === item.category && c.status === "RESOLVED").length;
    const active = complaints.filter((c) => c.category === item.category && c.status !== "RESOLVED").length;
    const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return {
      ...item,
      total,
      resolved,
      active,
      pct,
    };
  });

  // Ward performance stats
  const wardStats = wards.map((w) => {
    const wardTickets = complaints.filter((c) => c.ward_id === w.id);
    const resolved = wardTickets.filter((c) => c.status === "RESOLVED").length;
    const active = wardTickets.filter((c) => c.status !== "RESOLVED").length;
    const overdue = wardTickets.filter((c) => c.status === "ESCALATED").length;
    const rate = wardTickets.length > 0 ? Math.round((resolved / wardTickets.length) * 100) : 0;
    const avgHours = w.id === "WARD_14" ? "14.2h" : w.id === "WARD_15" ? "18.6h" : "22.4h";

    return {
      ward: w,
      total: wardTickets.length,
      resolved,
      active,
      overdue,
      rate,
      avgHours,
    };
  });

  // Filter complaints for map/list
  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = (
      statusFilter === "ALL" ||
      (statusFilter === "RESOLVED" && c.status === "RESOLVED") ||
      (statusFilter === "ACTIVE" && ["ASSIGNED", "WORK_SUBMITTED"].includes(c.status)) ||
      (statusFilter === "PENDING" && c.status === "PENDING") ||
      (statusFilter === "ESCALATED" && c.status === "ESCALATED")
    );

    const matchesCategory = categoryFilter === "ALL" || c.category === categoryFilter;

    const matchesSearch =
      searchQuery.trim() === "" ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playSuccess();
    upvoteComplaint(id);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Hero Section - Dedicated to Municipal Operations & Command Center */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#0a1626] via-[#07111e] to-[#050c16] p-6 sm:p-8 md:p-10 shadow-[0_26px_60px_-32px_rgba(2,6,23,0.9)]">
        <div className="absolute inset-y-0 right-0 w-96 bg-gradient-to-l from-sky-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-sky-400/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping-slow" />
              <span>Municipal Operations Command Center • PostGIS Spatial Engine</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Civic operations command for <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-200 to-cyan-300">rapid service delivery</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Central operational intelligence platform for real-time citizen grievance intake, spatial deduplication, contractor SLA dispatching, and quality verification.
            </p>

            {/* Live Status Telemetry Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/30 text-emerald-300 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow" />
                <span>20m Spatial Clustering Active</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-indigo-500/30 text-indigo-300 shadow-inner">
                <Shield className="w-3 h-3" />
                <span>30m Geofence Dual-Proof</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-purple-500/30 text-purple-300 shadow-inner">
                <Clock className="w-3 h-3" />
                <span>&lt;24h Target SLA</span>
              </span>
            </div>

            {/* Quick Interactive Tool Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setSimulationModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Launch Simulation Lab</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setExportModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-inner"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export Governance Brief</span>
              </button>
            </div>
          </div>

          {/* Quick Management Access Gateways */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <Link
              href="/supervisor"
              onClick={() => {
                soundFx.playClick();
                setRole("WARD_SUPERVISOR");
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-200 text-slate-950 font-extrabold text-sm shadow-xl transition-all hover:scale-[1.02]"
            >
              <ShieldCheck className="w-5 h-5 text-indigo-950" />
              <span>Ward Authority Console</span>
            </Link>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/crew"
                onClick={() => {
                  soundFx.playClick();
                  setRole("FIELD_CREW");
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-slate-700 bg-slate-900/90 text-center transition-all group hover:border-amber-500/40 hover:bg-slate-800/90 shadow-md"
              >
                <HardHat className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-100">Field Orders</span>
              </Link>

              <Link
                href="/commissioner"
                onClick={() => {
                  soundFx.playClick();
                  setRole("MUNICIPAL_COMMISSIONER");
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-slate-700 bg-slate-900/90 text-center transition-all group hover:border-purple-500/40 hover:bg-slate-800/90 shadow-md"
              >
                <Landmark className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-100">Commissioner</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Live KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Resolved */}
        <div className="relative overflow-hidden rounded-2xl p-4 border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 shadow-lg shadow-emerald-950/20 space-y-2 group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Fixed & Verified</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {resolvedComplaints}
            </div>
            <div className="text-[11px] font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
              <span>{resolutionRate}% resolved</span>
              <span className="text-[9px] text-emerald-400/80 font-normal">(+12% wk)</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 2: In Progress */}
        <div className="relative overflow-hidden rounded-2xl p-4 border border-sky-500/30 bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 shadow-lg shadow-sky-950/20 space-y-2 group hover:border-sky-400/50 transition-all">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Under Repair</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {inProgressComplaints}
            </div>
            <div className="text-[11px] font-medium text-sky-300 mt-0.5">
              Crews deployed
            </div>
          </div>
          <div className="text-[10px] text-sky-400/80 font-medium">GPS tracked routes</div>
        </div>

        {/* Metric 3: Pending Triage */}
        <div className="relative overflow-hidden rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 shadow-lg shadow-amber-950/20 space-y-2 group hover:border-amber-400/50 transition-all">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Pending Triage</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {pendingComplaints}
            </div>
            <div className="text-[11px] font-medium text-amber-300 mt-0.5">
              Awaiting dispatch
            </div>
          </div>
          <div className="text-[10px] text-amber-400/80 font-medium">Avg triage &lt;15m</div>
        </div>

        {/* Metric 4: Overdue SLA */}
        <div className="relative overflow-hidden rounded-2xl p-4 border border-rose-500/30 bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 shadow-lg shadow-rose-950/20 space-y-2 group hover:border-rose-400/50 transition-all">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Overdue SLA</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-400 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {escalatedComplaints}
            </div>
            <div className="text-[11px] font-bold text-rose-300 mt-0.5">
              {escalatedComplaints === 0 ? "Zero breaches" : "Needs escalation"}
            </div>
          </div>
          <div className="text-[10px] text-rose-400/80 font-medium">Contractor penalty risk</div>
        </div>

        {/* Metric 5: Average Turnaround */}
        <div className="relative overflow-hidden rounded-2xl p-4 border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 shadow-lg shadow-indigo-950/20 space-y-2 group hover:border-indigo-400/50 transition-all">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Avg Turnaround</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-400 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              18.4h
            </div>
            <div className="text-[11px] font-medium text-indigo-300 mt-0.5">
              Target: &lt;24h
            </div>
          </div>
          <div className="text-[10px] text-indigo-400/80 font-medium">Fast SLA compliance</div>
        </div>

        {/* Metric 6: Dedup Gain */}
        <div className="relative overflow-hidden rounded-2xl p-4 border border-purple-500/30 bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 shadow-lg shadow-purple-950/20 space-y-2 group hover:border-purple-400/50 transition-all">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Dedup Gain</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-400 text-white flex items-center justify-center shadow-md shadow-purple-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {dedupGainPercent}%
            </div>
            <div className="text-[11px] font-medium text-purple-300 mt-0.5">
              {duplicateSavedCount} merged
            </div>
          </div>
          <div className="text-[10px] text-purple-400/80 font-medium">20m radius saved</div>
        </div>
      </div>

      {/* Middle Section: Department Redressal Rate & Ward Performance Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Category Breakdown */}
        <div className="lg:col-span-6 rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Department Redressal Rate</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Resolution progress by civic hazard category (Click to filter)</p>
            </div>
            {categoryFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setCategoryFilter("ALL");
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-3">
            {categoryStats.map((item) => {
              const Icon = item.icon;
              const isSelected = categoryFilter === item.category;

              return (
                <div
                  key={item.category}
                  onClick={() => {
                    soundFx.playClick();
                    setCategoryFilter(isSelected ? "ALL" : item.category);
                  }}
                  className={`space-y-1.5 p-2.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-950/60 border-indigo-400 shadow-md ring-1 ring-indigo-400/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-indigo-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-xl bg-slate-900 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-200">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <span className="text-emerald-400 font-bold">{item.resolved} Fixed</span>
                      <span>/</span>
                      <span>{item.total} Total</span>
                      <span className="font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.pct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60 shadow-inner">
                    <div
                      className={`h-full ${item.barGradient} rounded-full transition-all duration-700 shadow-sm`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ward Performance Leaderboard */}
        <div className="lg:col-span-6 rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Ward Redressal Performance</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Response speed and resolution velocity across administrative wards</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              {wards.length} Wards Monitored
            </span>
          </div>

          <div className="space-y-3">
            {wardStats.map((w, idx) => (
              <div
                key={w.ward.id}
                className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl space-y-2.5 text-xs transition-all shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white text-sm">{w.ward.name}</span>
                      <span className="text-[11px] text-indigo-300/70 ml-1.5">({w.ward.zone})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400 text-[11px]">
                      Avg: <span className="text-emerald-400 font-bold">{w.avgHours}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
                      {w.rate}% Fixed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Resolved</span>
                    <span className="font-bold text-emerald-400 text-xs">{w.resolved}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active</span>
                    <span className="font-bold text-sky-400 text-xs">{w.active}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Overdue</span>
                    <span className={`font-bold text-xs ${w.overdue > 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {w.overdue}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Geographic Map & Management Incident Filter */}
      <div className="rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-pink-400" />
              <span>Live Geographic Incident Oversight Map</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive municipal ward boundaries, GIS spatial routing, and geocoded incident pins
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket or landmark..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs shadow-inner">
              {[
                { id: "ALL", label: "All" },
                { id: "RESOLVED", label: "Fixed" },
                { id: "ACTIVE", label: "Active" },
                { id: "PENDING", label: "Pending" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setStatusFilter(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    statusFilter === tab.id
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile View Switcher */}
            <div className="flex sm:hidden p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setMapTab("MAP");
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold ${mapTab === "MAP" ? "bg-purple-600 text-white" : "text-slate-400"}`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setMapTab("LIST");
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold ${mapTab === "LIST" ? "bg-purple-600 text-white" : "text-slate-400"}`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Map / List View Container with Inspection Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className={inspectingTicket ? "lg:col-span-8" : "lg:col-span-12"}>
            {mapTab === "MAP" ? (
              <div className="w-full h-[440px] sm:h-[500px] rounded-2xl overflow-hidden border border-indigo-500/20 shadow-inner">
                <WardGisMap
                  complaints={filteredComplaints}
                  wards={wards}
                  selectedComplaintId={inspectingTicket?.id}
                  onSelectComplaint={(ticket) => {
                    soundFx.playClick();
                    setInspectingTicket(ticket);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredComplaints.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                    No incidents found matching filter.
                  </div>
                ) : (
                  filteredComplaints.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        soundFx.playClick();
                        setInspectingTicket(c);
                      }}
                      className={`p-4 bg-slate-950/80 border rounded-2xl space-y-2 text-xs cursor-pointer transition-all shadow-md ${
                        inspectingTicket?.id === c.id
                          ? "border-purple-500 bg-indigo-950/40 ring-1 ring-purple-500/40"
                          : "border-slate-800/90 hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <CategoryBadge category={c.category} />
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <div className="font-bold text-white text-sm">{c.title}</div>
                      <div className="text-slate-400 text-xs truncate">{c.address_text}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Inspection Drawer (when a ticket is selected on map or list) */}
          {inspectingTicket && (
            <div className="lg:col-span-4 p-5 rounded-2xl border border-purple-500/40 bg-slate-950/95 backdrop-blur-2xl shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={inspectingTicket.category} />
                  <StatusBadge status={inspectingTicket.status} size="sm" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setInspectingTicket(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Preview */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inspectingTicket.image_url}
                  alt={inspectingTicket.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-[10px] text-white font-mono">
                  Ward: {inspectingTicket.ward_id}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm leading-snug">{inspectingTicket.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{inspectingTicket.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-indigo-300 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{inspectingTicket.address_text}</span>
                </div>
              </div>

              {/* Lifecycle Milestones Stepper */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-2">
                <div className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                  Municipal Lifecycle
                </div>
                <div className="grid grid-cols-4 gap-1 text-center font-semibold">
                  <div className="p-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Reported
                  </div>
                  <div className={`p-1 rounded border ${["ASSIGNED", "WORK_SUBMITTED", "RESOLVED"].includes(inspectingTicket.status) ? "bg-indigo-950 text-indigo-300 border-indigo-500/30" : "bg-slate-950 text-slate-600 border-slate-800"}`}>
                    Assigned
                  </div>
                  <div className={`p-1 rounded border ${["WORK_SUBMITTED", "RESOLVED"].includes(inspectingTicket.status) ? "bg-amber-950 text-amber-300 border-amber-500/30" : "bg-slate-950 text-slate-600 border-slate-800"}`}>
                    In Repair
                  </div>
                  <div className={`p-1 rounded border ${inspectingTicket.status === "RESOLVED" ? "bg-emerald-950 text-emerald-300 border-emerald-500/30" : "bg-slate-950 text-slate-600 border-slate-800"}`}>
                    Verified
                  </div>
                </div>
              </div>

              {/* Upvote & Action Buttons */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleUpvote(inspectingTicket.id, e)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-pink-400" />
                  <span>Upvote ({inspectingTicket.upvotes_count})</span>
                </button>

                <Link
                  href="/supervisor"
                  onClick={() => {
                    soundFx.playClick();
                    setRole("WARD_SUPERVISOR");
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>Triage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live System Activity Feed */}
      <div className="rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Municipal Operations Stream</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time audit log of supervisor dispatches, field crew completions, and resolution sign-offs
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            {audits.length} Events Logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {audits.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 text-xs space-y-2 hover:border-indigo-500/40 transition-all shadow-md"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400" />
                  <span>{a.actor_name || "System Automated"}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium font-mono">
                  {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{a.remarks}</p>
            </div>
          ))}
        </div>
      </div>

      <SimulationCenterModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
      />

      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
