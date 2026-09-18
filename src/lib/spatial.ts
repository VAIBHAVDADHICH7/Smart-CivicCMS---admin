// CivicPulse AI - Geospatial Computation & Deduplication Engine
// Mirroring PostGIS geodetic geography standards (EPSG:4326 / WGS 84)

import { Complaint, Ward } from "@/types/database";

/**
 * Calculates geodetic distance in meters between two coordinates using the Haversine formula
 * Prevents cartographic projection distortion on metric radius evaluations.
 */
export function calculateGeodeticDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * Evaluates whether a coordinate (lat, lng) falls inside a GeoJSON polygon ring.
 * Uses ray-casting algorithm, replicating PostGIS ST_Contains(boundary, point).
 */
export function pointInPolygon(
  point: [number, number], // [lat, lng]
  polygonRing: [number, number][] // array of [lng, lat]
): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
    const xi = polygonRing[i][0];
    const yi = polygonRing[i][1];
    const xj = polygonRing[j][0];
    const yj = polygonRing[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Resolves the matching ward ID for a given coordinate.
 * Matches PostGIS trigger trg_auto_assign_ward.
 */
export function resolveWardFromCoordinates(
  lat: number,
  lng: number,
  wards: Ward[]
): string {
  for (const ward of wards) {
    // Check main boundary polygon
    if (ward.boundary && ward.boundary.length > 0) {
      if (pointInPolygon([lat, lng], ward.boundary[0])) {
        return ward.id;
      }
    }
  }

  // Fallback: assign to geographically nearest ward center if slightly outside polygon
  let nearestWard = wards[0]?.id || "UNASSIGNED_ZONE";
  let minDistance = Infinity;

  for (const ward of wards) {
    const dist = calculateGeodeticDistance(lat, lng, ward.center[0], ward.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestWard = ward.id;
    }
  }

  return nearestWard;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateIncident?: Complaint;
  distanceMeters?: number;
}

/**
 * Proximity Deduplication Engine (20-Meter Radius Check)
 * Replicates PostgreSQL check_duplicate_complaint(new_lat, new_lng, 20.0)
 */
export function checkDuplicateComplaint(
  newLat: number,
  newLng: number,
  activeComplaints: Complaint[],
  radiusMeters: number = 20.0
): DuplicateCheckResult {
  // Only check open incidents
  const openComplaints = activeComplaints.filter((c) =>
    ["PENDING", "ASSIGNED", "WORK_SUBMITTED"].includes(c.status)
  );

  let closestMatch: Complaint | undefined;
  let minDistance = Infinity;

  for (const complaint of openComplaints) {
    const distance = calculateGeodeticDistance(
      newLat,
      newLng,
      complaint.latitude,
      complaint.longitude
    );

    if (distance <= radiusMeters && distance < minDistance) {
      minDistance = distance;
      closestMatch = complaint;
    }
  }

  if (closestMatch) {
    return {
      isDuplicate: true,
      duplicateIncident: closestMatch,
      distanceMeters: minDistance,
    };
  }

  return { isDuplicate: false };
}

/**
 * Resolution Proximity Guard (30-Meter Radius Adherence Threshold)
 * Replicates TRD Section 2.4: ST_Distance(c.location, c.resolution_location) <= 30.0m
 */
export function validateResolutionProximity(
  complaintLat: number,
  complaintLng: number,
  resolutionLat: number,
  resolutionLng: number,
  toleranceMeters: number = 30.0
): { isValid: boolean; distanceMeters: number; message: string } {
  const distance = calculateGeodeticDistance(
    complaintLat,
    complaintLng,
    resolutionLat,
    resolutionLng
  );

  const isValid = distance <= toleranceMeters;

  return {
    isValid,
    distanceMeters: distance,
    message: isValid
      ? `On-site verified: GPS delta is ${distance}m (within ${toleranceMeters}m perimeter).`
      : `Geofence breach: Resolution point is ${distance}m away (max allowed: ${toleranceMeters}m). You must be on-site to submit proof.`,
  };
}

/**
 * Human-readable distance formatter
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
