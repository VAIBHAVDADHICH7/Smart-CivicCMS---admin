"use client";

import React, { useEffect, useRef } from "react";
import { Complaint, Ward } from "@/types/database";

interface MacroHeatmapProps {
  complaints: Complaint[];
  wards: Ward[];
  onSelectWard?: (wardId: string) => void;
  className?: string;
}

export const MacroHeatmap: React.FC<MacroHeatmapProps> = ({
  complaints,
  wards,
  onSelectWard,
  className = "w-full h-full min-h-[480px]",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [26.8900, 75.7800], // Metro wide center
          zoom: 12,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 18,
          subdomains: "abcd",
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing layers if any
      map.eachLayer((layer: any) => {
        if (!layer._url) {
          map.removeLayer(layer);
        }
      });

      // Calculate ward metrics for heatmap intensity
      wards.forEach((ward) => {
        const wardComplaints = complaints.filter((c) => c.ward_id === ward.id);
        const openBacklog = wardComplaints.filter((c) =>
          ["PENDING", "ASSIGNED", "WORK_SUBMITTED", "ESCALATED"].includes(c.status)
        ).length;
        const escalatedCount = wardComplaints.filter((c) => c.status === "ESCALATED").length;

        // Density color grading: green (low) -> amber (medium) -> red (high/escalated)
        let fillColor = "#10b981"; // Emerald
        let fillOpacity = 0.25;

        if (escalatedCount > 0 || openBacklog >= 3) {
          fillColor = "#dc2626"; // Red Alert
          fillOpacity = 0.45;
        } else if (openBacklog >= 1) {
          fillColor = "#f59e0b"; // Warning Amber
          fillOpacity = 0.35;
        }

        if (ward.boundary && ward.boundary.length > 0) {
          const latLngs = ward.boundary[0].map(([lng, lat]) => [lat, lng]);

          const polygon = L.polygon(latLngs as any, {
            color: fillColor,
            weight: 2.5,
            fillColor,
            fillOpacity,
          }).addTo(map);

          // Heatmap hotspot pulse in center
          const pulseHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
              <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${fillColor}; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: ${fillColor}; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white;">
                ${openBacklog}
              </div>
            </div>
          `;

          const pulseIcon = L.divIcon({
            html: pulseHtml,
            className: "heatmap-pulse-marker",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          const centerMarker = L.marker(ward.center, { icon: pulseIcon }).addTo(map);

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 190px;">
              <div style="font-weight: 700; font-size: 13px;">${ward.name}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${ward.zone}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                <div style="background: #f1f5f9; padding: 4px 6px; border-radius: 4px;">
                  <div style="font-size: 10px; color: #64748b;">Open Backlog</div>
                  <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${openBacklog}</div>
                </div>
                <div style="background: #fef2f2; padding: 4px 6px; border-radius: 4px;">
                  <div style="font-size: 10px; color: #dc2626;">SLA Breached</div>
                  <div style="font-size: 14px; font-weight: 700; color: #dc2626;">${escalatedCount}</div>
                </div>
              </div>
              <div style="font-size: 11px; color: #334155; line-height: 1.3;">${ward.description || ""}</div>
            </div>
          `;

          polygon.bindPopup(popupContent);
          centerMarker.bindPopup(popupContent);

          polygon.on("click", () => {
            if (onSelectWard) onSelectWard(ward.id);
          });
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [complaints, wards, onSelectWard]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainerRef} className={className} />

      {/* Heatmap Overlay Key */}
      <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs text-slate-300 shadow-2xl max-w-xs">
        <div className="font-semibold text-white mb-2 flex items-center justify-between">
          <span>Complaint Density</span>
          <span className="text-[10px] text-blue-400">Heatmap</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-600" />
              <span>Critical Breach Zone</span>
            </span>
            <span className="text-slate-400">SLA &gt; 0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span>Active Backlog Zone</span>
            </span>
            <span className="text-slate-400">1-2 Tickets</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>Healthy Resolution Velocity</span>
            </span>
            <span className="text-slate-400">0 Backlog</span>
          </div>
        </div>
      </div>
    </div>
  );
};
