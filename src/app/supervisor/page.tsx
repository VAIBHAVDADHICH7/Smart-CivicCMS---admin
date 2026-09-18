"use client";

import React from "react";
import { SupervisorConsole } from "@/components/supervisor/SupervisorConsole";

export const dynamic = "force-dynamic";

export default function SupervisorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Ward Supervisor Operations
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Triage incoming complaints, assign crews, and verify side-by-side completion proofs
        </p>
      </div>

      <SupervisorConsole />
    </div>
  );
}
