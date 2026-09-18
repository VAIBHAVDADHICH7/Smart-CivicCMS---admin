"use client";

// CivicPulse AI - Unified Reactive State & Event Store
// Implements the Intake Webhook, Media Processing, Ward Lookup & Deduplication Pipeline

import { useState, useEffect } from "react";
import { 
  Complaint, 
  Ward, 
  Profile, 
  UserRole, 
  ComplaintCategory, 
  ComplaintAuditLog,
  LinkedTicket 
} from "@/types/database";
import { 
  INITIAL_WARDS, 
  INITIAL_PROFILES, 
  INITIAL_COMPLAINTS, 
  INITIAL_AUDIT_LOGS 
} from "./seedData";
import { 
  checkDuplicateComplaint, 
  resolveWardFromCoordinates, 
  validateResolutionProximity 
} from "./spatial";

const STORAGE_KEY_COMPLAINTS = "civicpulse_complaints_v2";
const STORAGE_KEY_AUDITS = "civicpulse_audits_v2";
const STORAGE_KEY_ROLE = "civicpulse_current_role";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

let globalComplaints: Complaint[] = [];
let globalAudits: ComplaintAuditLog[] = [];
let globalCurrentRole: UserRole = "WARD_SUPERVISOR";
let isInitialized = false;

function initStore() {
  if (isInitialized) return;
  if (typeof window === "undefined") {
    globalComplaints = INITIAL_COMPLAINTS;
    globalAudits = INITIAL_AUDIT_LOGS;
    globalCurrentRole = "WARD_SUPERVISOR";
    isInitialized = true;
    return;
  }

  try {
    const storedComplaints = localStorage.getItem(STORAGE_KEY_COMPLAINTS);
    const storedAudits = localStorage.getItem(STORAGE_KEY_AUDITS);
    const storedRole = localStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;

    globalComplaints = storedComplaints ? JSON.parse(storedComplaints) : INITIAL_COMPLAINTS;
    globalAudits = storedAudits ? JSON.parse(storedAudits) : INITIAL_AUDIT_LOGS;
    globalCurrentRole = (storedRole && storedRole !== ("CITIZEN" as any)) ? storedRole : "WARD_SUPERVISOR";
  } catch (e) {
    console.error("Failed to load state from localStorage:", e);
    globalComplaints = INITIAL_COMPLAINTS;
    globalAudits = INITIAL_AUDIT_LOGS;
  }

  isInitialized = true;
}

function saveStore() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(globalComplaints));
    localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(globalAudits));
    localStorage.setItem(STORAGE_KEY_ROLE, globalCurrentRole);
  } catch (e) {
    console.error("Failed to persist state:", e);
  }
}

export function useCivicStore() {
  initStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const currentProfile = INITIAL_PROFILES.find((p) => p.role === globalCurrentRole) || INITIAL_PROFILES[0];

  const setRole = (role: UserRole) => {
    globalCurrentRole = role;
    saveStore();
    notify();
  };

  const resetToSeed = () => {
    globalComplaints = [...INITIAL_COMPLAINTS];
    globalAudits = [...INITIAL_AUDIT_LOGS];
    saveStore();
    notify();
  };

  /**
   * Automation Pipeline:
   * Intake -> Media Check -> Transcribe/Vision -> Ward Lookup -> Dedup Check -> Branching
   * If True (Duplicate): Upvote Master Ticket + Insert Linked Child Ticket
   * If False (New): Insert Master Record + Generate Dispatch Order
   */
  const submitComplaint = (data: {
    title: string;
    description: string;
    category: ComplaintCategory;
    latitude: number;
    longitude: number;
    address_text: string;
    image_url: string;
    audio_url?: string;
    ai_transcription?: string;
    citizen_id?: string;
  }): {
    status: "SUCCESS";
    action: "CREATED" | "UPVOTED";
    ticket: Complaint;
    linkedChildTicket?: LinkedTicket;
    message: string;
    distanceMeters?: number;
  } => {
    // 1. Deduplication Check (20m radius)
    const dupCheck = checkDuplicateComplaint(data.latitude, data.longitude, globalComplaints, 20.0);

    if (dupCheck.isDuplicate && dupCheck.duplicateIncident) {
      // Branch: TRUE (Duplicate Found)
      const master = dupCheck.duplicateIncident;

      // Upvote Master Ticket
      master.upvotes_count += 1;
      master.updated_at = new Date().toISOString();

      // Insert Linked Ticket (Child Report)
      const childTicket: LinkedTicket = {
        id: "child-" + Date.now().toString().slice(-6),
        parent_ticket_id: master.id,
        citizen_id: data.citizen_id || currentProfile.id,
        text_content: data.description,
        audio_url: data.audio_url,
        ai_transcription: data.ai_transcription,
        image_url: data.image_url,
        latitude: data.latitude,
        longitude: data.longitude,
        distance_from_master_meters: dupCheck.distanceMeters || 0,
        created_at: new Date().toISOString(),
      };

      if (!master.linked_tickets) {
        master.linked_tickets = [];
      }
      master.linked_tickets.push(childTicket);

      const audit: ComplaintAuditLog = {
        id: "audit-" + Date.now(),
        complaint_id: master.id,
        actor_name: currentProfile.full_name,
        action: "LINKED_CHILD_TICKET",
        remarks: `Matched nearby report at ${dupCheck.distanceMeters}m. Master upvoted to ${master.upvotes_count} and linked child report #${childTicket.id} attached.`,
        created_at: new Date().toISOString(),
      };
      globalAudits.unshift(audit);

      saveStore();
      notify();

      return {
        status: "SUCCESS",
        action: "UPVOTED",
        ticket: master,
        linkedChildTicket: childTicket,
        message: `Already registered within ${dupCheck.distanceMeters}m. Your report has been linked to prioritize it.`,
        distanceMeters: dupCheck.distanceMeters,
      };
    }

    // Branch: FALSE (New Ticket)
    // Ward GIS Polygon Lookup (ST_Contains)
    const wardId = resolveWardFromCoordinates(data.latitude, data.longitude, INITIAL_WARDS);

    // SLA Calculation
    const slaHoursMap: Record<ComplaintCategory, number> = {
      GARBAGE: 24,
      WATER_LEAK: 24,
      POTHOLE: 48,
      STREETLIGHT: 72,
      OTHER: 48,
    };
    const slaHours = slaHoursMap[data.category] || 48;
    const slaDeadline = new Date(Date.now() + slaHours * 3600000).toISOString();

    const newMasterTicket: Complaint = {
      id: "ticket-" + Date.now().toString().slice(-6),
      citizen_id: data.citizen_id || currentProfile.id,
      title: data.title,
      description: data.description,
      category: data.category,
      status: "PENDING",
      latitude: data.latitude,
      longitude: data.longitude,
      address_text: data.address_text,
      ward_id: wardId,
      image_url: data.image_url,
      audio_url: data.audio_url,
      ai_transcription: data.ai_transcription,
      ai_detected_category: data.category,
      ai_confidence_score: 0.95,
      visual_fingerprint: `vfp_${Math.round(data.latitude * 1000)}_${Math.round(data.longitude * 1000)}`,
      upvotes_count: 1,
      is_master: true,
      linked_tickets: [],
      sla_deadline: slaDeadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    globalComplaints.unshift(newMasterTicket);

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: newMasterTicket.id,
      actor_name: currentProfile.full_name,
      action: "CREATED",
      to_status: "PENDING",
      remarks: `Master ticket ingested and auto-routed to ${wardId} maintenance queue.`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();

    return {
      status: "SUCCESS",
      action: "CREATED",
      ticket: newMasterTicket,
      message: "Complaint registered and auto-routed to ward maintenance queue.",
    };
  };

  const assignTicket = (
    complaintId: string,
    crewId: string,
    slaHours: number = 24
  ) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const crew = INITIAL_PROFILES.find((p) => p.id === crewId);
    ticket.status = "ASSIGNED";
    ticket.assigned_crew_id = crewId;
    ticket.supervisor_id = currentProfile.id;
    ticket.sla_deadline = new Date(Date.now() + slaHours * 3600000).toISOString();
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "ASSIGNED",
      from_status: "PENDING",
      to_status: "ASSIGNED",
      remarks: `Assigned to field contractor: ${crew?.full_name || crewId}. SLA target: ${slaHours}h.`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();
  };

  const submitResolutionProof = (
    complaintId: string,
    resolutionImg: string,
    resolutionLat: number,
    resolutionLng: number
  ): { success: boolean; distanceMeters: number; message: string } => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const geoValidation = validateResolutionProximity(
      ticket.latitude,
      ticket.longitude,
      resolutionLat,
      resolutionLng,
      30.0
    );

    if (!geoValidation.isValid) {
      return {
        success: false,
        distanceMeters: geoValidation.distanceMeters,
        message: geoValidation.message,
      };
    }

    ticket.status = "WORK_SUBMITTED";
    ticket.resolution_image_url = resolutionImg;
    ticket.resolution_latitude = resolutionLat;
    ticket.resolution_longitude = resolutionLng;
    ticket.resolution_distance_meters = geoValidation.distanceMeters;
    ticket.resolution_submitted_at = new Date().toISOString();
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "WORK_SUBMITTED",
      from_status: "ASSIGNED",
      to_status: "WORK_SUBMITTED",
      remarks: `Work proof submitted on site. GPS delta: ${geoValidation.distanceMeters}m (tolerance: ≤30m).`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();

    return {
      success: true,
      distanceMeters: geoValidation.distanceMeters,
      message: geoValidation.message,
    };
  };

  const approveResolution = (complaintId: string, notes?: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const now = new Date();
    ticket.status = "RESOLVED";
    ticket.supervisor_notes = notes || "Verified side-by-side photo evidence and GPS location.";
    ticket.verified_at = now.toISOString();
    ticket.reopen_window_closes_at = new Date(now.getTime() + 48 * 3600000).toISOString();
    ticket.updated_at = now.toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "RESOLVED",
      from_status: "WORK_SUBMITTED",
      to_status: "RESOLVED",
      remarks: notes || "Approved resolution after dual-proof review.",
      created_at: now.toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();
  };

  const rejectResolution = (complaintId: string, remarks: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.status = "ASSIGNED";
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "STATUS_CHANGE",
      from_status: "WORK_SUBMITTED",
      to_status: "ASSIGNED",
      remarks: `Resolution rejected by supervisor: ${remarks}`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();
  };

  const confirmResolution = (complaintId: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.reopen_window_closes_at = undefined;
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "STATUS_CHANGE",
      from_status: "RESOLVED",
      to_status: "RESOLVED",
      remarks: "Resolution verified complete. Ticket closed.",
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();
  };

  const reopenComplaint = (complaintId: string, reason: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.status = "REOPENED";
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "DISPUTED_REOPEN",
      from_status: "RESOLVED",
      to_status: "REOPENED",
      remarks: `Quality audit dispute: "${reason}"`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();
  };

  const upvoteComplaint = (complaintId: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) return;

    ticket.upvotes_count += 1;
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: "audit-" + Date.now(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "UPVOTED",
      remarks: `Manual upvote. Priority count: ${ticket.upvotes_count}`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    saveStore();
    notify();
  };

  return {
    complaints: globalComplaints,
    audits: globalAudits,
    wards: INITIAL_WARDS,
    profiles: INITIAL_PROFILES,
    currentRole: globalCurrentRole,
    currentProfile,
    setRole,
    resetToSeed,
    submitComplaint,
    assignTicket,
    submitResolutionProof,
    approveResolution,
    rejectResolution,
    confirmResolution,
    reopenComplaint,
    upvoteComplaint,
  };
}
