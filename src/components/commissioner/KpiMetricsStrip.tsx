"use client";

import React from "react";
import { useCivicStore } from "@/lib/store";
import { BarChart3, Clock, AlertOctagon, Layers, Sparkles } from "lucide-react";

export const KpiMetricsStrip: React.FC = () => {
  const { complaints } = useCivicStore();

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === "RESOLVED").length;
  const active = total - resolved;
  const escalated = complaints.filter((c) => c.status === "ESCALATED").length;

  const totalUpvotes = complaints.reduce((sum, c) => sum + c.upvotes_count, 0);
  const deduplicationGain = totalUpvotes > total 
    ? Math.round(((totalUpvotes - total) / totalUpvotes) * 100)
    : 32;

  const cards = [
    {
      title: "City Grievances",
      value: `${total}`,
      subtext: `${resolved} resolved, ${active} in progress`,
      icon: BarChart3,
      gradient: "from-indigo-950/40 via-slate-900 to-slate-950",
      border: "border-indigo-500/30 hover:border-indigo-400/50",
      iconBg: "bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white shadow-indigo-500/30",
    },
    {
      title: "Avg Resolution Time",
      value: "18.4h",
      subtext: "Benchmark SLA: <24h",
      icon: Clock,
      gradient: "from-emerald-950/40 via-slate-900 to-slate-950",
      border: "border-emerald-500/30 hover:border-emerald-400/50",
      iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/30",
    },
    {
      title: "Overdue Breaches",
      value: `${escalated}`,
      subtext: "Penalties applied to vendors",
      icon: AlertOctagon,
      gradient: "from-rose-950/40 via-slate-900 to-slate-950",
      border: "border-rose-500/30 hover:border-rose-400/50",
      iconBg: "bg-gradient-to-tr from-rose-600 to-red-400 text-white shadow-rose-500/30",
    },
    {
      title: "Deduplication Gain",
      value: `${deduplicationGain}%`,
      subtext: "20m proximity clustering gain",
      icon: Layers,
      gradient: "from-purple-950/40 via-slate-900 to-slate-950",
      border: "border-purple-500/30 hover:border-purple-400/50",
      iconBg: "bg-gradient-to-tr from-purple-600 to-pink-400 text-white shadow-purple-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`rounded-3xl p-5 border bg-gradient-to-b ${card.gradient} ${card.border} shadow-xl backdrop-blur-xl space-y-3 transition-all hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold">{card.title}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{card.value}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{card.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
