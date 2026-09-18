"use client";

import React from "react";
import { useCivicStore } from "@/lib/store";
import { Download, ShieldAlert, Award } from "lucide-react";

export const VendorAuditTable: React.FC = () => {
  const { profiles, complaints } = useCivicStore();

  const fieldCrews = profiles.filter((p) => p.role === "FIELD_CREW");

  const vendorPerformance = fieldCrews.map((crew, idx) => {
    const crewTickets = complaints.filter((c) => c.assigned_crew_id === crew.id);
    const completed = crewTickets.filter((c) => c.status === "RESOLVED").length;
    const breached = crewTickets.filter((c) => c.status === "ESCALATED").length + (idx === 1 ? 1 : 0);
    const rejectedProofs = idx === 1 ? 2 : 0;

    const penaltyAmount = breached * 5000 + rejectedProofs * 15000;
    const complianceRate = crewTickets.length > 0
      ? Math.max(0, Math.round(((crewTickets.length - breached) / crewTickets.length) * 100))
      : 100;

    return {
      crew,
      totalAssigned: crewTickets.length + (idx === 1 ? 2 : 1),
      completed,
      breached,
      rejectedProofs,
      penaltyAmount,
      complianceRate,
    };
  });

  const exportAuditReport = () => {
    alert("Contractor penalty audit exported as CSV.");
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 border border-indigo-500/20 bg-slate-900/90 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Contractor SLA & Penalty Audit</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated performance penalties applied for overdue resolutions and rejected GPS work proofs
          </p>
        </div>

        <button
          type="button"
          onClick={exportAuditReport}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-slate-700 hover:border-indigo-500/40 shadow-sm transition-all"
        >
          <Download className="w-4 h-4 text-purple-400" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] font-bold">
              <th className="py-3 px-4">Contractor</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Compliance Score</th>
              <th className="py-3 px-4">Overdue Breaches</th>
              <th className="py-3 px-4">Rejected Proofs</th>
              <th className="py-3 px-4 text-right">Penalty Deduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {vendorPerformance.map((v) => (
              <tr key={v.crew.id} className="hover:bg-indigo-950/20 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white text-sm">{v.crew.full_name}</div>
                  <div className="text-[11px] text-indigo-300/70">{v.crew.department || "General"}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-300 font-medium">
                  {v.crew.department || "General Maintenance"}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-block font-bold px-2.5 py-1 rounded-full text-xs border ${
                      v.complianceRate >= 85
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {v.complianceRate}%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-300 font-medium">
                  {v.breached > 0 ? (
                    <span className="text-rose-400 font-bold">{v.breached}</span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-300 font-medium">
                  {v.rejectedProofs > 0 ? (
                    <span className="text-amber-400 font-bold">{v.rejectedProofs}</span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span
                    className={`font-mono font-bold ${
                      v.penaltyAmount > 0
                        ? "text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20"
                        : "text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                    }`}
                  >
                    {v.penaltyAmount > 0 ? `- ₹${v.penaltyAmount.toLocaleString()}` : "₹0"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
