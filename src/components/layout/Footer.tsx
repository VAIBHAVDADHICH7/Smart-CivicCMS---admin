"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Shield, 
  HardHat, 
  Landmark, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  Radio, 
  ExternalLink,
  Sparkles,
  Layers,
  Heart,
  Command,
  FileText,
  Lock
} from "lucide-react";
import { useCivicStore } from "@/lib/store";
import { soundFx } from "@/lib/soundEffects";
import { ExportReportModal } from "@/components/commissioner/ExportReportModal";
import { SimulationCenterModal } from "@/components/common/SimulationCenterModal";

export const Footer: React.FC = () => {
  const { complaints, wards, isSupabaseActive } = useCivicStore();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  const totalResolved = complaints.filter((c) => c.status === "RESOLVED").length;

  const handleOpenPalette = () => {
    soundFx.playClick();
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <>
      <footer className="mt-16 border-t border-slate-700/60 bg-[#060c16] text-slate-300 text-xs">
        {/* Top Telemetry & Status Ticker */}
        <div className="border-b border-indigo-500/10 bg-slate-950/90 backdrop-blur-xl py-3 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[11px]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping-slow" />
                <span>Municipal GovNet Online</span>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-400 hidden sm:inline">
                Spatial Engine: <span className="text-sky-300 font-mono">20m PostGIS Active</span>
              </span>
              <span className="text-slate-600 hidden md:inline">•</span>
              <span className="text-slate-400 hidden md:inline">
                Database: <span className="text-purple-300 font-semibold">{isSupabaseActive ? "PostgreSQL Realtime" : "Local Sync Engine"}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>{complaints.length} Total Incidents</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">{totalResolved} Fixed</span>
              <span className="text-slate-600">|</span>
              <span>{wards.length} Admin Wards</span>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand & Mission Statement */}
            <div className="lg:col-span-2 space-y-4">
              <Link 
                href="/" 
                onClick={() => soundFx.playClick()}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shadow-sm ring-1 ring-slate-200 group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5 text-indigo-950" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-white">
                      CivicPulse
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      GovNet
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Enterprise Municipal Operations & Governance Platform
                  </span>
                </div>
              </Link>

              <p className="text-xs text-slate-400 leading-relaxed pr-4">
                Defense-grade civic redressal platform engineered for municipal administrative oversight, 
                geospatial complaint deduplication, automated contractor SLA dispatching, and GPS-verified photo proof of work.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>ISO 27001 Certified</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>256-Bit GovNet Security</span>
                </span>
              </div>
            </div>

            {/* Operational Portals */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Portals & Consoles</span>
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link 
                    href="/supervisor" 
                    onClick={() => soundFx.playClick()}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ward Authority Console</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/crew" 
                    onClick={() => soundFx.playClick()}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <HardHat className="w-3.5 h-3.5 text-amber-400" />
                    <span>Field Operations Queue</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/commissioner" 
                    onClick={() => soundFx.playClick()}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Landmark className="w-3.5 h-3.5 text-purple-400" />
                    <span>Commissioner Oversight</span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setSimulationModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-1.5 text-left"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Smart City Test Lab</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Civic Services & Categories */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Civic Departments
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-400 hover:text-slate-200">Roads & Asphalt Potholes</li>
                <li className="text-slate-400 hover:text-slate-200">Sanitation & Solid Waste</li>
                <li className="text-slate-400 hover:text-slate-200">Streetlighting & Smart Poles</li>
                <li className="text-slate-400 hover:text-slate-200">Water Supply & Leakage</li>
                <li className="text-slate-400 hover:text-slate-200">Public Safety & Drainage</li>
              </ul>
            </div>

            {/* Quick Actions & Shortcut */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Executive Tools
              </h4>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={handleOpenPalette}
                  className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-xs font-semibold text-slate-200 flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Command className="w-3.5 h-3.5 text-purple-400" />
                    <span>Command Palette</span>
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono text-slate-400">
                    ⌘K
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setExportModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Export Governance Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Security Signature */}
          <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
            <div>
              © {new Date().getFullYear()} Municipal Corporation • Quality & Governance Operations. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Security Clearance Level 3</span>
              <span>•</span>
              <span>PostGIS Spatial GIS</span>
              <span>•</span>
              <span className="text-slate-400 font-mono">v2.0.0-Enterprise</span>
            </div>
          </div>
        </div>
      </footer>

      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      <SimulationCenterModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
      />
    </>
  );
};
