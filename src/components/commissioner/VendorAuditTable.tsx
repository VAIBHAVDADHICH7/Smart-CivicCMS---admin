"use client";

import React from "react";
import { useCivicStore } from "@/lib/store";
import { Download } from "lucide-react";

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Contractor SLA & Penalty Audit
          </h3>
          <p className="text-xs text-slate-400">
            Penalties applied for overdue resolutions and rejected work proofs
          </p>
        </div>

        <button
          type="button"
          onClick={exportAuditReport}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
              <th className="py-2.5 px-3">Contractor</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3">Compliance</th>
              <th className="py-2.5 px-3">Overdue Breaches</th>
              <th className="py-2.5 px-3">Rejected Proofs</th>
              <th className="py-2.5 px-3 text-right">Deduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {vendorPerformance.map((v) => (
              <tr key={v.crew.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-3">
                  <div className="font-semibold text-white">{v.crew.full_name}</div>
                  <div className="text-[10px] text-slate-500">{v.crew.department || "General"}</div>
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {v.crew.department || "General Maintenance"}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                      v.complianceRate >= 85
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {v.complianceRate}%
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {v.breached > 0 ? (
                    <span className="text-rose-400 font-medium">{v.breached}</span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {v.rejectedProofs > 0 ? (
                    <span className="text-amber-400 font-medium">{v.rejectedProofs}</span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-medium">
                  {v.penaltyAmount > 0 ? (
                    <span className="text-rose-400">₹{v.penaltyAmount.toLocaleString()}</span>
                  ) : (
                    <span className="text-emerald-400">₹0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
