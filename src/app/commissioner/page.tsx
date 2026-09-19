"use client";

import React from "react";
import { KpiMetricsStrip } from "@/components/commissioner/KpiMetricsStrip";
import { MacroGovernanceView } from "@/components/commissioner/MacroGovernanceView";
import { VendorAuditTable } from "@/components/commissioner/VendorAuditTable";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const dynamic = "force-dynamic";

export default function CommissionerPage() {
  return (
    <AuthGuard allowedRoles={["MUNICIPAL_COMMISSIONER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Municipal Commissioner Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            City-wide complaint density, ward resolution turnaround, and contractor compliance audits
          </p>
        </div>

        <KpiMetricsStrip />
        <MacroGovernanceView />
        <VendorAuditTable />
      </div>
    </AuthGuard>
  );
}
