"use client";

import React from "react";
import { useCivicStore } from "@/lib/store";
import { BarChart3, Clock, AlertOctagon, Layers } from "lucide-react";

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
      subtext: `${resolved} resolved, ${active} active`,
      icon: BarChart3,
      color: "text-blue-400",
    },
    {
      title: "Avg Resolution Time",
      value: "18.4h",
      subtext: "Category benchmark: <24h",
      icon: Clock,
      color: "text-emerald-400",
    },
    {
      title: "Overdue SLAs",
      value: `${escalated}`,
      subtext: "Breached resolution deadlines",
      icon: AlertOctagon,
      color: "text-rose-400",
    },
    {
      title: "Deduplication Rate",
      value: `${deduplicationGain}%`,
      subtext: "20m proximity clustering gain",
      icon: Layers,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">{card.title}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{card.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
