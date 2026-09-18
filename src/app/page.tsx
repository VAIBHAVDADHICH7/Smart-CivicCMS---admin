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
  HelpCircle
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
    barColor: string;
  }[] = [
    {
      category: "POTHOLE",
      label: "Roads & Potholes",
      icon: AlertTriangle,
      color: "text-amber-400",
      barColor: "bg-amber-500",
    },
    {
      category: "GARBAGE",
      label: "Sanitation & Waste",
      icon: Trash2,
      color: "text-emerald-400",
      barColor: "bg-emerald-500",
    },
    {
      category: "STREETLIGHT",
      label: "Streetlights & Power",
      icon: Lightbulb,
      color: "text-yellow-400",
      barColor: "bg-yellow-500",
    },
    {
      category: "WATER_LEAK",
      label: "Water Supply & Leaks",
      icon: Droplets,
      color: "text-cyan-400",
      barColor: "bg-cyan-500",
    },
    {
      category: "OTHER",
      label: "Public Safety & Other",
      icon: HelpCircle,
      color: "text-purple-400",
      barColor: "bg-purple-500",
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
    <div className="space-y-6">
      {/* Live Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              Live Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live System</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time redressal metrics, complaint removal tracking, and ward infrastructure status.
          </p>
        </div>

        {/* Quick Staff Portal Jump Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <span className="text-[11px] text-slate-500 px-2 hidden lg:inline">Quick Jump:</span>
          <Link
            href="/crew"
            onClick={() => setRole("FIELD_CREW")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <HardHat className="w-3.5 h-3.5 text-amber-400" />
            <span>Field Crew</span>
          </Link>
          <Link
            href="/supervisor"
            onClick={() => setRole("WARD_SUPERVISOR")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Ward Authority</span>
          </Link>
          <Link
            href="/commissioner"
            onClick={() => setRole("MUNICIPAL_COMMISSIONER")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-purple-400" />
            <span>Commissioner</span>
          </Link>
        </div>
      </div>

      {/* Primary Live KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Complaints Removed / Resolved */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-300">Resolved & Fixed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {resolvedComplaints}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
              {resolutionRate}% resolved
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Active Repair Backlog */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-300">Under Repair</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {inProgressComplaints}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Crews deployed
            </div>
          </div>
          <div className="text-[10px] text-sky-400/80">Active field work</div>
        </div>

        {/* Metric 3: Pending Triage */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-300">Pending Triage</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {pendingComplaints}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Awaiting dispatch
            </div>
          </div>
          <div className="text-[10px] text-amber-400/80">In ward inbox</div>
        </div>

        {/* Metric 4: Overdue Breaches */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-300">Overdue SLA</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {escalatedComplaints}
            </div>
            <div className="text-[11px] text-rose-400 font-medium mt-0.5">
              {escalatedComplaints === 0 ? "Zero breaches" : "Requires escalation"}
            </div>
          </div>
          <div className="text-[10px] text-slate-500">Contract penalty risk</div>
        </div>

        {/* Metric 5: Average Resolution Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-300">Avg Turnaround</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              18.4h
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Target: &lt;24h
            </div>
          </div>
          <div className="text-[10px] text-emerald-400/80">Within SLA target</div>
        </div>

        {/* Metric 6: Deduplication Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-300">Dedup Gain</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {dedupGainPercent}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {duplicateSavedCount} merged
            </div>
          </div>
          <div className="text-[10px] text-purple-400/80">20m proximity saved</div>
        </div>
      </div>

      {/* Middle Section: Category Breakdown & Ward Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Category Breakdown (6 cols on lg) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Department Redressal Rate</h2>
              <p className="text-xs text-slate-400">Resolution progress by civic hazard category</p>
            </div>
            <span className="text-xs text-slate-400">{totalComplaints} Total Reports</span>
          </div>

          <div className="space-y-3">
            {categoryStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span className="font-medium text-slate-200">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="text-emerald-400 font-medium">{item.resolved} Fixed</span>
                      <span>/</span>
                      <span>{item.total} Total</span>
                      <span className="font-medium text-white ml-1">{item.pct}%</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ward Leaderboard (6 cols on lg) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Ward Redressal Performance</h2>
              <p className="text-xs text-slate-400">Response speed and resolution rate across administrative wards</p>
            </div>
            <span className="text-xs text-slate-400">{wards.length} Wards Active</span>
          </div>

          <div className="space-y-2.5">
            {wardStats.map((w, idx) => (
              <div
                key={w.ward.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white">{w.ward.name}</span>
                    <span className="text-[10px] text-slate-500">({w.ward.zone})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      Avg: <span className="text-emerald-400 font-medium">{w.avgHours}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[11px]">
                      {w.rate}% Fixed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1 border-t border-slate-800/60">
                  <div className="bg-slate-900/80 p-1.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Resolved</span>
                    <span className="font-semibold text-emerald-400">{w.resolved}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Active</span>
                    <span className="font-semibold text-sky-400">{w.active}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Overdue</span>
                    <span className={`font-semibold ${w.overdue > 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {w.overdue}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live GIS Map & Transparency Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>Live Geographic Complaint Map</span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive municipal ward boundaries and geocoded incident pins
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
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
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === tab.id
                      ? "bg-blue-600 text-white font-medium shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile View Toggle */}
            <div className="flex sm:hidden p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setMapTab("MAP")}
                className={`px-2 py-1 rounded ${mapTab === "MAP" ? "bg-blue-600 text-white font-medium" : "text-slate-400"}`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapTab("LIST")}
                className={`px-2 py-1 rounded ${mapTab === "LIST" ? "bg-blue-600 text-white font-medium" : "text-slate-400"}`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Map / List View Container */}
        {mapTab === "MAP" ? (
          <div className="w-full h-[400px] sm:h-[450px] rounded-xl overflow-hidden border border-slate-800">
            <WardGisMap complaints={filteredComplaints} wards={wards} />
          </div>
        ) : (
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {filteredComplaints.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No complaints found matching filter.
              </div>
            ) : (
              filteredComplaints.map((c) => (
                <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={c.category} />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                  <div className="font-medium text-white">{c.title}</div>
                  <div className="text-slate-400 text-[11px] truncate">{c.address_text}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Live System Activity Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Live Municipal Operations Stream
            </h3>
            <p className="text-xs text-slate-400">
              Recent supervisor dispatches, field crew completions, and resolution sign-offs
            </p>
          </div>
          <span className="text-xs text-slate-500">{audits.length} events logged</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {audits.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{a.actor_name || "System"}</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{a.remarks}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
