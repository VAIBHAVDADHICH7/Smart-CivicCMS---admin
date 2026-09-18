"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCivicStore } from "@/lib/store";
import { WardGisMap } from "@/components/maps/WardGisMap";
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
  ArrowRight
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { ComplaintCategory } from "@/types/database";

export default function HomePage() {
  const { complaints, wards, audits, setRole } = useCivicStore();
  const [mapTab, setMapTab] = useState<"MAP" | "LIST">("MAP");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  // Category breakdown calculation
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
      label: "Public Safety & Other",
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
    if (statusFilter === "ALL") return true;
    if (statusFilter === "RESOLVED") return c.status === "RESOLVED";
    if (statusFilter === "ACTIVE") return ["ASSIGNED", "WORK_SUBMITTED"].includes(c.status);
    if (statusFilter === "PENDING") return c.status === "PENDING";
    if (statusFilter === "ESCALATED") return c.status === "ESCALATED";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Hero Section - Dedicated to Municipal Management & Oversight */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 md:p-10 border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl shadow-indigo-950/50">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-200 text-xs font-semibold backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Municipal Administrative Control Center</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Complaint Management <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-400">& Governance Suite</span>
            </h1>
            
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Unified command center for ward-level incident triage, automated contractor work order dispatch, GPS dual-photo verification, and SLA compliance tracking.
            </p>
          </div>

          {/* Quick Management Access Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/supervisor"
              onClick={() => setRole("WARD_SUPERVISOR")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-500/30 ring-1 ring-white/30 hover:scale-105 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Ward Authority Console</span>
            </Link>

            <Link
              href="/crew"
              onClick={() => setRole("FIELD_CREW")}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm backdrop-blur-md transition-all"
            >
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Field Work Orders</span>
            </Link>

            <Link
              href="/commissioner"
              onClick={() => setRole("MUNICIPAL_COMMISSIONER")}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm backdrop-blur-md transition-all"
            >
              <Landmark className="w-4 h-4 text-purple-400" />
              <span>Commissioner Overview</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Live KPI Cards with Distinct Gradient Accents */}
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
            <div className="text-[11px] font-bold text-emerald-300 mt-0.5">
              {resolutionRate}% resolved
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
          <div className="text-[10px] text-sky-400/80 font-medium">Active field work</div>
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
          <div className="text-[10px] text-amber-400/80 font-medium">In ward inbox</div>
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
          <div className="text-[10px] text-rose-400/80 font-medium">Penalty risk</div>
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
          <div className="text-[10px] text-purple-400/80 font-medium">20m proximity saved</div>
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
              <p className="text-xs text-slate-400 mt-0.5">Resolution progress by civic hazard category</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
              {totalComplaints} Managed Incidents
            </span>
          </div>

          <div className="space-y-4">
            {categoryStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.category} className="space-y-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-slate-900 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-200">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <span className="text-emerald-400 font-bold">{item.resolved} Fixed</span>
                      <span>/</span>
                      <span>{item.total} Total</span>
                      <span className="font-extrabold text-white px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                        {item.pct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60 shadow-inner">
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
              <p className="text-xs text-slate-400 mt-0.5">Response speed and resolution across administrative wards</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              {wards.length} Wards Active
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-pink-400" />
              <span>Live Geographic Incident Oversight Map</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive municipal ward boundaries, GIS spatial routing, and geocoded incident pins
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
                  onClick={() => setStatusFilter(tab.id)}
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
                onClick={() => setMapTab("MAP")}
                className={`px-2.5 py-1 rounded-lg font-semibold ${mapTab === "MAP" ? "bg-purple-600 text-white" : "text-slate-400"}`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapTab("LIST")}
                className={`px-2.5 py-1 rounded-lg font-semibold ${mapTab === "LIST" ? "bg-purple-600 text-white" : "text-slate-400"}`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Map / List View Container */}
        {mapTab === "MAP" ? (
          <div className="w-full h-[420px] sm:h-[480px] rounded-2xl overflow-hidden border border-indigo-500/20 shadow-inner">
            <WardGisMap complaints={filteredComplaints} wards={wards} />
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredComplaints.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No incidents found matching filter.
              </div>
            ) : (
              filteredComplaints.map((c) => (
                <div key={c.id} className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-2 text-xs hover:border-purple-500/40 transition-all shadow-md">
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

      {/* Live System Activity Feed with Glowing Stream Cards */}
      <div className="rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Municipal Operations Stream</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Recent supervisor dispatches, field crew completions, and resolution sign-offs
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
                <span className="text-[10px] text-slate-500 font-medium">
                  {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{a.remarks}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
