"use client";

import React from "react";
import { CrewTaskQueue } from "@/components/crew/CrewTaskQueue";

export const dynamic = "force-dynamic";

export default function CrewPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Field Crew Work Orders
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Priority repair tasks sorted by distance to your current location
        </p>
      </div>

      <CrewTaskQueue />
    </div>
  );
}
