"use client";

import React, { useEffect, useRef } from "react";
import { Complaint, Ward, ComplaintStatus } from "@/types/database";

interface WardGisMapProps {
  complaints: Complaint[];
  wards: Ward[];
  selectedWardId?: string;
  selectedComplaintId?: string;
  onSelectComplaint?: (complaint: Complaint) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
}

export const WardGisMap: React.FC<WardGisMapProps> = ({
  complaints,
  wards,
  selectedWardId,
  selectedComplaintId,
  onSelectComplaint,
  onMapClick,
  className = "w-full h-full min-h-[400px]",
  center = [26.9124, 75.7891], // Jaipur Metro Reference Center
  zoom = 13,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const polygonsLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet only on client
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix Leaflet's default icon paths if needed
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom,
          zoomControl: true,
          attributionControl: false,
        });

        // High contrast dark/carto tile layer or standard OpenStreetMap
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd",
        }).addTo(map);

        if (onMapClick) {
          map.on("click", (e: any) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
        polygonsLayerRef.current = L.layerGroup().addTo(map);
      }

      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;
      const polygonsLayer = polygonsLayerRef.current;

      markersLayer.clearLayers();
      polygonsLayer.clearLayers();

      // 1. Render Ward Polygon Boundaries
      wards.forEach((ward) => {
        const isSelected = selectedWardId === ward.id;
        if (ward.boundary && ward.boundary.length > 0) {
          // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
          const latLngs = ward.boundary[0].map(([lng, lat]) => [lat, lng]);

          const polygon = L.polygon(latLngs as any, {
            color: isSelected ? "#2563eb" : "#475569",
            weight: isSelected ? 3 : 1.5,
            fillColor: isSelected ? "#3b82f6" : "#64748b",
            fillOpacity: isSelected ? 0.2 : 0.08,
            dashArray: isSelected ? undefined : "4, 4",
          }).addTo(polygonsLayer);

          polygon.bindTooltip(`<b>${ward.name}</b><br/><span style="font-size:10px; color:#64748b">${ward.zone}</span>`, {
            permanent: false,
            direction: "center",
            className: "leaflet-tooltip-civic",
          });
        }
      });

      // 2. Render Incident Pins
      const statusColorMap: Record<ComplaintStatus, { hex: string; bg: string }> = {
        PENDING: { hex: "#f43f5e", bg: "rgba(244, 63, 94, 0.2)" },
        ASSIGNED: { hex: "#0284c7", bg: "rgba(2, 132, 199, 0.2)" },
        WORK_SUBMITTED: { hex: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)" },
        RESOLVED: { hex: "#10b981", bg: "rgba(16, 185, 129, 0.2)" },
        ESCALATED: { hex: "#dc2626", bg: "rgba(220, 38, 38, 0.25)" },
        REOPENED: { hex: "#8b5cf6", bg: "rgba(139, 92, 246, 0.2)" },
        REJECTED: { hex: "#64748b", bg: "rgba(100, 116, 139, 0.2)" },
      };

      complaints.forEach((c) => {
        const isSelected = selectedComplaintId === c.id;
        const color = statusColorMap[c.status] || statusColorMap.PENDING;

        // Custom HTML marker
        const pinHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${color.bg}; animation: ${c.status === "ESCALATED" ? "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" : "none"};"></div>
            <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: ${color.hex}; border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; transform: ${isSelected ? "scale(1.3)" : "scale(1)"}; transition: transform 0.2s ease;">
              <span style="color: #ffffff; font-size: 10px; font-weight: bold;">${c.upvotes_count}</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: pinHtml,
          className: "custom-civic-pin",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([c.latitude, c.longitude], { icon: customIcon }).addTo(markersLayer);

        const popupContent = document.createElement("div");
        popupContent.style.cssText = "font-family: sans-serif; font-size: 12px; min-width: 180px;";
        popupContent.innerHTML = `
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${c.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${c.address_text || "No address"}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: ${color.hex}20; color: ${color.hex};">${c.status}</span>
            <span style="font-size: 11px; color: #2563eb; font-weight: 600;">▲ ${c.upvotes_count} upvotes</span>
          </div>
          <button id="popup-btn-${c.id}" style="width: 100%; padding: 4px 8px; background: #0f172a; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Inspect Incident
          </button>
        `;

        marker.bindPopup(popupContent);

        marker.on("popupopen", () => {
          const btn = document.getElementById(`popup-btn-${c.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectComplaint) onSelectComplaint(c);
            };
          }
        });

        if (isSelected) {
          marker.openPopup();
        }
      });
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [complaints, wards, selectedWardId, selectedComplaintId, onSelectComplaint, onMapClick, center, zoom]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-inner">
      <div ref={mapContainerRef} className={className} />
      
      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-300 shadow-lg flex flex-wrap items-center gap-3">
        <span className="font-semibold text-white">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Assigned</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Work Submitted</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" /> Escalated</span>
      </div>
    </div>
  );
};
