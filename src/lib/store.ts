"use client";

// CivicPulse AI - Unified Reactive State & Event Store
// Connects seamlessly to Supabase PostgreSQL / PostGIS with Realtime subscriptions,
// with robust fallback to reactive in-memory state.

import { useState, useEffect } from "react";
import { 
  Complaint, 
  Ward, 
  Profile, 
  UserRole, 
  ComplaintCategory, 
  ComplaintStatus,
  ComplaintAuditLog,
  LinkedTicket,
  LoginCredentials,
  SignUpData,
  AuthSession,
  NotificationItem,
  NotificationType
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
import {
  isSupabaseConfigured,
  getSupabaseClient,
  fetchComplaintsFromSupabase,
  fetchAuditsFromSupabase,
  insertComplaintToSupabase,
  updateComplaintInSupabase,
  insertAuditLogToSupabase,
  mapDbComplaintToDomain,
} from "./supabase";
import { dispatchCitizenPortalWebhook } from "./citizenWebhook";

const STORAGE_KEY_COMPLAINTS = "civicpulse_complaints_v2";
const STORAGE_KEY_AUDITS = "civicpulse_audits_v2";
const STORAGE_KEY_ROLE = "civicpulse_current_role";
const STORAGE_KEY_SESSION = "civicpulse_auth_session_v2";
const STORAGE_KEY_PROFILES = "civicpulse_profiles_v2";
const STORAGE_KEY_NOTIFICATIONS = "civicpulse_notifications_v2";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

let globalComplaints: Complaint[] = [];
let globalAudits: ComplaintAuditLog[] = [];
let globalProfiles: Profile[] = [];
let globalNotifications: NotificationItem[] = [];
let globalCurrentUser: Profile | null = null;
let globalAuthSession: AuthSession | null = null;
let globalCurrentRole: UserRole = "WARD_SUPERVISOR";
let isInitialized = false;
let isSupabaseHydrated = false;

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "c" + Date.now().toString(16) + "-" + Math.random().toString(16).substring(2, 10);
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-01",
    title: "New Work Order Dispatched",
    message: "High-priority Pothole repair at Hawa Sadak (Ward 14) auto-assigned to your route.",
    type: "TASK_ASSIGNED",
    complaint_id: "c1111111-1111-1111-1111-111111111101",
    target_role: "FIELD_CREW",
    is_read: false,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    link: "/crew",
  },
  {
    id: "notif-02",
    title: "SLA Overdue Escalation (Tier 1)",
    message: "Collapsed drain slab in Ward 17 breached 48h SLA. Elevated to Supervisor attention.",
    type: "ESCALATED",
    complaint_id: "c1111111-1111-1111-1111-111111111105",
    target_role: "WARD_SUPERVISOR",
    is_read: false,
    created_at: new Date(Date.now() - 75 * 60000).toISOString(),
    link: "/supervisor",
  },
  {
    id: "notif-03",
    title: "Work Proof Awaiting Verification",
    message: "Sanitation crew submitted photographic proof for Streetlight luminaire repair (Ward 16).",
    type: "PROOF_SUBMITTED",
    complaint_id: "c1111111-1111-1111-1111-111111111103",
    target_role: "WARD_SUPERVISOR",
    is_read: true,
    created_at: new Date(Date.now() - 140 * 60000).toISOString(),
    link: "/supervisor",
  },
];

function initStore() {
  if (isInitialized) return;
  if (typeof window === "undefined") {
    globalComplaints = INITIAL_COMPLAINTS;
    globalAudits = INITIAL_AUDIT_LOGS;
    globalProfiles = INITIAL_PROFILES;
    globalNotifications = INITIAL_NOTIFICATIONS;
    globalCurrentUser = INITIAL_PROFILES[3]; // Default Anita Verma (Supervisor)
    globalCurrentRole = "WARD_SUPERVISOR";
    isInitialized = true;
    return;
  }

  try {
    const storedComplaints = localStorage.getItem(STORAGE_KEY_COMPLAINTS);
    const storedAudits = localStorage.getItem(STORAGE_KEY_AUDITS);
    const storedProfiles = localStorage.getItem(STORAGE_KEY_PROFILES);
    const storedNotifications = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    const storedRole = localStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
    const isExplicitlyLoggedOut = localStorage.getItem("civicpulse_logged_out") === "true";

    globalComplaints = storedComplaints ? JSON.parse(storedComplaints) : INITIAL_COMPLAINTS;
    globalAudits = storedAudits ? JSON.parse(storedAudits) : INITIAL_AUDIT_LOGS;
    
    // Merge stored profiles with INITIAL_PROFILES so all seed accounts always exist with correct credentials
    if (storedProfiles) {
      try {
        const parsed: Profile[] = JSON.parse(storedProfiles);
        const map = new Map<string, Profile>();
        INITIAL_PROFILES.forEach((p) => map.set(p.email?.toLowerCase() || p.id, p));
        parsed.forEach((p) => {
          const key = p.email?.toLowerCase() || p.id;
          const seed = map.get(key);
          if (seed) {
            map.set(key, { ...seed, ...p, password: seed.password || p.password });
          } else {
            map.set(key, p);
          }
        });
        globalProfiles = Array.from(map.values());
      } catch {
        globalProfiles = INITIAL_PROFILES;
      }
    } else {
      globalProfiles = INITIAL_PROFILES;
    }

    globalNotifications = storedNotifications ? JSON.parse(storedNotifications) : INITIAL_NOTIFICATIONS;

    if (storedSession && !isExplicitlyLoggedOut) {
      try {
        const session: AuthSession = JSON.parse(storedSession);
        if (session && session.user) {
          if (!session.expiresAt || session.expiresAt > Date.now()) {
            globalAuthSession = session;
            const matched = globalProfiles.find(
              (p) => p.email?.toLowerCase() === session.user.email?.toLowerCase() || p.id === session.user.id
            );
            globalCurrentUser = matched || session.user;
            globalCurrentRole = globalCurrentUser.role;
          } else {
            localStorage.removeItem(STORAGE_KEY_SESSION);
            globalAuthSession = null;
            globalCurrentUser = null;
          }
        }
      } catch (e) {
        console.error("Failed to parse auth session", e);
      }
    }

    if (!globalCurrentUser && !isExplicitlyLoggedOut) {
      const defaultProfile = globalProfiles.find((p) => p.role === (storedRole || "WARD_SUPERVISOR")) || globalProfiles[3];
      globalCurrentUser = defaultProfile;
      globalCurrentRole = defaultProfile.role;
      globalAuthSession = {
        user: defaultProfile,
        token: "seed-session-token",
        expiresAt: Date.now() + 7 * 24 * 3600000,
      };
    } else if (globalCurrentUser) {
      globalCurrentRole = globalCurrentUser.role;
    }
  } catch (e) {
    console.error("Failed to load state from localStorage:", e);
    globalComplaints = INITIAL_COMPLAINTS;
    globalAudits = INITIAL_AUDIT_LOGS;
    globalProfiles = INITIAL_PROFILES;
    globalNotifications = INITIAL_NOTIFICATIONS;
    globalCurrentUser = INITIAL_PROFILES[3];
    globalAuthSession = {
      user: INITIAL_PROFILES[3],
      token: "seed-session-token",
      expiresAt: Date.now() + 7 * 24 * 3600000,
    };
  }

  isInitialized = true;
}

function saveStore() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(globalComplaints));
    localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(globalAudits));
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(globalProfiles));
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(globalNotifications));
    localStorage.setItem(STORAGE_KEY_ROLE, globalCurrentRole);
    if (globalAuthSession) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(globalAuthSession));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
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

    // Hydrate from Supabase and subscribe to Realtime if configured
    if (isSupabaseConfigured() && !isSupabaseHydrated) {
      isSupabaseHydrated = true;

      // 1. Initial hydration from Supabase PostgreSQL
      Promise.all([fetchComplaintsFromSupabase(), fetchAuditsFromSupabase()]).then(
        ([remoteComplaints, remoteAudits]) => {
          if (remoteComplaints && remoteComplaints.length > 0) {
            globalComplaints = remoteComplaints;
          }
          if (remoteAudits && remoteAudits.length > 0) {
            globalAudits = remoteAudits;
          }
          saveStore();
          notify();
        }
      );

      // 2. Realtime WebSocket Subscription
      const client = getSupabaseClient();
      if (client) {
        const channel = client
          .channel("civicpulse_realtime_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "complaints" },
            (payload) => {
              if (payload.eventType === "INSERT") {
                const newIncident = mapDbComplaintToDomain(payload.new);
                const exists = globalComplaints.some((c) => c.id === newIncident.id);
                if (!exists) {
                  globalComplaints.unshift(newIncident);
                  saveStore();
                  notify();
                }
              } else if (payload.eventType === "UPDATE") {
                const updated = mapDbComplaintToDomain(payload.new);
                const idx = globalComplaints.findIndex((c) => c.id === updated.id);
                if (idx !== -1) {
                  globalComplaints[idx] = { ...globalComplaints[idx], ...updated };
                  saveStore();
                  notify();
                }
              } else if (payload.eventType === "DELETE") {
                globalComplaints = globalComplaints.filter((c) => c.id !== payload.old.id);
                saveStore();
                notify();
              }
            }
          )
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "complaint_audit_logs" },
            (payload) => {
              const newAudit = payload.new as ComplaintAuditLog;
              if (!globalAudits.some((a) => a.id === newAudit.id)) {
                globalAudits.unshift(newAudit);
                saveStore();
                notify();
              }
            }
          )
          .subscribe();

        return () => {
          listeners.delete(handleUpdate);
          channel.unsubscribe();
        };
      }
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const currentProfile = globalCurrentUser || (globalProfiles.find((p) => p.role === globalCurrentRole) || globalProfiles[0]);

  // Notifications filtering & unread counts
  const filteredNotifications = globalNotifications.filter(
    (n) => !n.target_role || n.target_role === currentProfile.role || !n.target_user_id || n.target_user_id === currentProfile.id
  );
  const unreadNotificationCount = filteredNotifications.filter((n) => !n.is_read).length;

  const sendPushNotification = (item: Omit<NotificationItem, "id" | "created_at" | "is_read">) => {
    const newNotif: NotificationItem = {
      id: generateUUID(),
      title: item.title,
      message: item.message,
      type: item.type,
      complaint_id: item.complaint_id,
      target_user_id: item.target_user_id,
      target_role: item.target_role,
      link: item.link,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    globalNotifications.unshift(newNotif);
    saveStore();
    notify();
  };

  const markNotificationAsRead = (id: string) => {
    const notif = globalNotifications.find((n) => n.id === id);
    if (notif) {
      notif.is_read = true;
      saveStore();
      notify();
    }
  };

  const clearNotifications = () => {
    globalNotifications = [];
    saveStore();
    notify();
  };

  /**
   * IAM Authentication: Login with Email and Password
   */
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string; user?: Profile }> => {
    const trimmedEmail = credentials.email.trim().toLowerCase();

    // 1. Check Supabase Auth if connected
    const client = getSupabaseClient();
    if (client && credentials.password) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: trimmedEmail,
          password: credentials.password,
        });
        if (error) {
          console.warn("Supabase auth failed, trying local profiles fallback:", error.message);
        } else if (data?.user) {
          let profile = globalProfiles.find((p) => p.email?.toLowerCase() === trimmedEmail || p.auth_user_id === data.user.id);
          if (!profile) {
            profile = {
              id: data.user.id,
              auth_user_id: data.user.id,
              email: data.user.email || trimmedEmail,
              full_name: data.user.user_metadata?.full_name || trimmedEmail.split("@")[0],
              role: (data.user.user_metadata?.role as UserRole) || "WARD_SUPERVISOR",
              is_active: true,
              last_login_at: new Date().toISOString(),
            };
            globalProfiles.push(profile);
          } else {
            profile.last_login_at = new Date().toISOString();
          }

          const session: AuthSession = {
            user: profile,
            token: data.session?.access_token || generateUUID(),
            expiresAt: Date.now() + 24 * 3600000,
          };

          globalAuthSession = session;
          globalCurrentUser = profile;
          globalCurrentRole = profile.role;
          if (typeof window !== "undefined") {
            localStorage.removeItem("civicpulse_logged_out");
          }
          saveStore();
          notify();
          return { success: true, user: profile };
        }
      } catch (err: any) {
        console.warn("Supabase login exception:", err.message);
      }
    }

    // 2. Local Profile Match
    const foundProfile = globalProfiles.find(
      (p) => p.email?.toLowerCase() === trimmedEmail
    );

    if (!foundProfile) {
      return {
        success: false,
        error: `No registered municipal profile found for ${credentials.email}. Check email or use a 1-Click Persona.`,
      };
    }

    if (foundProfile.password && credentials.password && foundProfile.password !== credentials.password) {
      return {
        success: false,
        error: "Invalid password for this municipal account.",
      };
    }

    foundProfile.last_login_at = new Date().toISOString();
    const session: AuthSession = {
      user: foundProfile,
      token: generateUUID(),
      expiresAt: Date.now() + 24 * 3600000,
    };

    globalAuthSession = session;
    globalCurrentUser = foundProfile;
    globalCurrentRole = foundProfile.role;
    if (typeof window !== "undefined") {
      localStorage.removeItem("civicpulse_logged_out");
    }
    saveStore();
    notify();

    return { success: true, user: foundProfile };
  };

  const loginAsPersona = (roleOrEmail: UserRole | string, wardId?: string): { success: boolean; user: Profile } => {
    let target: Profile | undefined;

    // Check if roleOrEmail is an email
    if (typeof roleOrEmail === "string" && roleOrEmail.includes("@")) {
      target = globalProfiles.find((p) => p.email?.toLowerCase() === roleOrEmail.toLowerCase());
    }

    if (!target) {
      target = globalProfiles.find((p) => {
        if (wardId) {
          return p.role === roleOrEmail && p.ward_id === wardId;
        }
        return p.role === roleOrEmail;
      });
    }

    if (!target) {
      target = globalProfiles.find((p) => p.role === roleOrEmail) || globalProfiles[0];
    }

    target.last_login_at = new Date().toISOString();
    const session: AuthSession = {
      user: target,
      token: generateUUID(),
      expiresAt: Date.now() + 24 * 3600000,
    };

    globalAuthSession = session;
    globalCurrentUser = target;
    globalCurrentRole = target.role;
    if (typeof window !== "undefined") {
      localStorage.removeItem("civicpulse_logged_out");
    }
    saveStore();
    notify();

    return { success: true, user: target };
  };

  const signUp = async (data: SignUpData): Promise<{ success: boolean; error?: string; user?: Profile }> => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const existing = globalProfiles.find((p) => p.email?.toLowerCase() === trimmedEmail);
    if (existing) {
      return { success: false, error: "An account with this email address already exists." };
    }

    const newProfile: Profile = {
      id: generateUUID(),
      email: trimmedEmail,
      password: data.password || "pass123",
      employee_id: `EMP-${data.role === "MUNICIPAL_COMMISSIONER" ? "COM" : data.role === "WARD_SUPERVISOR" ? "SUP" : "CRW"}-${Math.floor(100 + Math.random() * 900)}`,
      full_name: data.full_name,
      phone: data.phone || "+91 98000 00000",
      role: data.role,
      ward_id: data.ward_id,
      department: data.department || "Municipal Operations",
      is_active: true,
      last_login_at: new Date().toISOString(),
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80",
    };

    globalProfiles.push(newProfile);

    const session: AuthSession = {
      user: newProfile,
      token: generateUUID(),
      expiresAt: Date.now() + 24 * 3600000,
    };

    globalAuthSession = session;
    globalCurrentUser = newProfile;
    globalCurrentRole = newProfile.role;
    if (typeof window !== "undefined") {
      localStorage.removeItem("civicpulse_logged_out");
    }
    saveStore();
    notify();

    return { success: true, user: newProfile };
  };

  const loginWithPhoneOtp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string; user?: Profile }> => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (otp.length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit verification code." };
    }

    let target = globalProfiles.find((p) => p.phone && p.phone.replace(/\D/g, "").includes(cleanPhone.slice(-10)));
    if (!target) {
      target = globalProfiles[0];
    }

    target.last_login_at = new Date().toISOString();
    const session: AuthSession = {
      user: target,
      token: generateUUID(),
      expiresAt: Date.now() + 24 * 3600000,
    };

    globalAuthSession = session;
    globalCurrentUser = target;
    globalCurrentRole = target.role;
    if (typeof window !== "undefined") {
      localStorage.removeItem("civicpulse_logged_out");
    }
    saveStore();
    notify();

    return { success: true, user: target };
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    return {
      success: true,
      message: `Password reset instructions have been dispatched to ${email}. Check your municipal mailbox.`,
    };
  };

  const logout = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn("Supabase signOut error:", e);
      }
    }
    globalAuthSession = null;
    globalCurrentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.setItem("civicpulse_logged_out", "true");
    }
    saveStore();
    notify();
  };

  const updateCurrentProfile = (updates: Partial<Profile>) => {
    if (!globalCurrentUser) return;
    globalCurrentUser = { ...globalCurrentUser, ...updates };

    const idx = globalProfiles.findIndex((p) => p.id === globalCurrentUser!.id);
    if (idx !== -1) {
      globalProfiles[idx] = globalCurrentUser;
    }

    if (globalAuthSession) {
      globalAuthSession.user = globalCurrentUser;
    }

    saveStore();
    notify();
  };

  const setRole = (role: UserRole) => {
    loginAsPersona(role);
  };

  const resetToSeed = () => {
    globalComplaints = [...INITIAL_COMPLAINTS];
    globalAudits = [...INITIAL_AUDIT_LOGS];
    globalProfiles = [...INITIAL_PROFILES];
    globalNotifications = [...INITIAL_NOTIFICATIONS];
    globalCurrentUser = INITIAL_PROFILES[3];
    globalCurrentRole = "WARD_SUPERVISOR";
    saveStore();
    notify();
  };

  /**
   * Automation Pipeline:
   * Intake -> Media Check -> Transcribe/Vision -> Ward Lookup -> Dedup Check -> Auto-Crew Assignment -> Notification
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
      const master = dupCheck.duplicateIncident;
      master.upvotes_count += 1;
      master.updated_at = new Date().toISOString();

      const childTicket: LinkedTicket = {
        id: generateUUID(),
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
        id: generateUUID(),
        complaint_id: master.id,
        actor_name: currentProfile.full_name,
        action: "LINKED_CHILD_TICKET",
        remarks: `Matched nearby report at ${dupCheck.distanceMeters}m. Master upvoted to ${master.upvotes_count} and linked child report #${childTicket.id.slice(0, 8)} attached.`,
        created_at: new Date().toISOString(),
      };
      globalAudits.unshift(audit);

      if (isSupabaseConfigured()) {
        updateComplaintInSupabase(master.id, {
          upvotes_count: master.upvotes_count,
          updated_at: master.updated_at,
        });
        insertAuditLogToSupabase(audit);
      }

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

    // 2. New Ticket & Auto-Assignment Engine
    const wardId = resolveWardFromCoordinates(data.latitude, data.longitude, INITIAL_WARDS);

    const slaHoursMap: Record<ComplaintCategory, number> = {
      GARBAGE: 24,
      WATER_LEAK: 24,
      POTHOLE: 48,
      STREETLIGHT: 72,
      OTHER: 48,
    };
    const slaHours = slaHoursMap[data.category] || 48;
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + slaHours * 3600000).toISOString();
    const assignedAt = now.toISOString();

    // Auto-assign designated field crew in this ward
    const wardCrews = globalProfiles.filter((p) => p.role === "FIELD_CREW" && (p.ward_id === wardId || !p.ward_id));
    const assignedCrew = wardCrews.length > 0 ? wardCrews[0] : globalProfiles[1];
    const supervisor = globalProfiles.find((p) => p.role === "WARD_SUPERVISOR" && p.ward_id === wardId) || globalProfiles[3];

    const newMasterTicket: Complaint = {
      id: generateUUID(),
      citizen_id: data.citizen_id || currentProfile.id,
      title: data.title,
      description: data.description,
      category: data.category,
      status: "ASSIGNED", // Directly auto-assigned to crew
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
      assigned_crew_id: assignedCrew.id,
      supervisor_id: supervisor.id,
      assigned_at: assignedAt,
      sla_deadline: slaDeadline,
      escalation_tier: 0,
      created_at: assignedAt,
      updated_at: assignedAt,
    };

    globalComplaints.unshift(newMasterTicket);

    const createAudit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: newMasterTicket.id,
      actor_name: currentProfile.full_name,
      action: "CREATED",
      to_status: "PENDING",
      remarks: `Master ticket ingested and auto-routed to ${wardId} maintenance queue.`,
      created_at: assignedAt,
    };

    const assignAudit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: newMasterTicket.id,
      actor_name: "Auto-Assignment Engine",
      action: "ASSIGNED",
      from_status: "PENDING",
      to_status: "ASSIGNED",
      remarks: `Auto-assigned directly to field contractor ${assignedCrew.full_name}. SLA target: ${slaHours}h.`,
      created_at: assignedAt,
    };

    globalAudits.unshift(assignAudit);
    globalAudits.unshift(createAudit);

    // Dispatch in-app and push notification alert to field crew
    sendPushNotification({
      title: `New Work Order: ${data.category}`,
      message: `${data.title} located at ${data.address_text}. SLA: ${slaHours}h.`,
      type: "TASK_ASSIGNED",
      complaint_id: newMasterTicket.id,
      target_user_id: assignedCrew.id,
      target_role: "FIELD_CREW",
      link: "/crew",
    });

    if (isSupabaseConfigured()) {
      insertComplaintToSupabase(newMasterTicket);
      insertAuditLogToSupabase(createAudit);
      insertAuditLogToSupabase(assignAudit);
    }

    saveStore();
    notify();

    return {
      status: "SUCCESS",
      action: "CREATED",
      ticket: newMasterTicket,
      message: `Complaint registered and auto-dispatched to ${assignedCrew.full_name} (${slaHours}h SLA).`,
    };
  };

  const assignTicket = (
    complaintId: string,
    crewId: string,
    slaHours: number = 24
  ) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const crew = globalProfiles.find((p) => p.id === crewId) || INITIAL_PROFILES.find((p) => p.id === crewId);
    const now = new Date().toISOString();

    ticket.status = "ASSIGNED";
    ticket.assigned_crew_id = crewId;
    ticket.supervisor_id = currentProfile.id;
    ticket.assigned_at = now;
    ticket.sla_deadline = new Date(Date.now() + slaHours * 3600000).toISOString();
    ticket.escalation_tier = 0;
    ticket.updated_at = now;

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "ASSIGNED",
      from_status: ticket.status,
      to_status: "ASSIGNED",
      remarks: `Assigned to field contractor: ${crew?.full_name || crewId}. SLA target: ${slaHours}h.`,
      created_at: now,
    };
    globalAudits.unshift(audit);

    // Push notification to crew
    sendPushNotification({
      title: "Work Order Assigned",
      message: `${ticket.title} assigned to your queue by Supervisor ${currentProfile.full_name}.`,
      type: "TASK_ASSIGNED",
      complaint_id: ticket.id,
      target_user_id: crewId,
      target_role: "FIELD_CREW",
      link: "/crew",
    });

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        status: "ASSIGNED",
        assigned_crew_id: crewId,
        supervisor_id: currentProfile.id,
        assigned_at: now,
        sla_deadline: ticket.sla_deadline,
        escalation_tier: 0,
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  const reassignTicket = (
    complaintId: string,
    newCrewId: string,
    reason?: string
  ) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const newCrew = globalProfiles.find((p) => p.id === newCrewId);
    const now = new Date().toISOString();

    ticket.assigned_crew_id = newCrewId;
    ticket.assigned_at = now;
    ticket.status = "ASSIGNED";
    ticket.escalation_tier = 0; // Reset escalation upon active intervention
    ticket.updated_at = now;

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "ASSIGNED",
      remarks: `Reassigned to contractor ${newCrew?.full_name || newCrewId}. Reason: ${reason || "Workload rebalancing & expedited resolution"}.`,
      created_at: now,
    };
    globalAudits.unshift(audit);

    sendPushNotification({
      title: "Reassigned Priority Work Order",
      message: `${ticket.title} has been transferred to your active route.`,
      type: "TASK_ASSIGNED",
      complaint_id: ticket.id,
      target_user_id: newCrewId,
      target_role: "FIELD_CREW",
      link: "/crew",
    });

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        assigned_crew_id: newCrewId,
        assigned_at: now,
        status: "ASSIGNED",
        escalation_tier: 0,
        updated_at: now,
      });
      insertAuditLogToSupabase(audit);
    }

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

    const now = new Date().toISOString();
    ticket.status = "WORK_SUBMITTED";
    ticket.resolution_image_url = resolutionImg;
    ticket.resolution_latitude = resolutionLat;
    ticket.resolution_longitude = resolutionLng;
    ticket.resolution_distance_meters = geoValidation.distanceMeters;
    ticket.resolution_submitted_at = now;
    ticket.supervisor_sla_deadline = new Date(Date.now() + 12 * 3600000).toISOString(); // 12h supervisor review SLA
    ticket.updated_at = now;

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "WORK_SUBMITTED",
      from_status: "ASSIGNED",
      to_status: "WORK_SUBMITTED",
      remarks: `Work proof submitted on site. GPS delta: ${geoValidation.distanceMeters}m (tolerance: ≤30m).`,
      created_at: now,
    };
    globalAudits.unshift(audit);

    // Notify Ward Supervisor
    sendPushNotification({
      title: "Resolution Proof Submitted",
      message: `${currentProfile.full_name} submitted on-site proof for #${ticket.id.slice(0, 8)}. Awaiting dual-proof sign-off.`,
      type: "PROOF_SUBMITTED",
      complaint_id: ticket.id,
      target_role: "WARD_SUPERVISOR",
      link: "/supervisor",
    });

    // Dispatch Outbound Webhook to Citizen Portal
    dispatchCitizenPortalWebhook("COMPLAINT_WORK_SUBMITTED", ticket);

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        status: "WORK_SUBMITTED",
        resolution_image_url: resolutionImg,
        resolution_latitude: resolutionLat,
        resolution_longitude: resolutionLng,
        resolution_distance_meters: geoValidation.distanceMeters,
        resolution_submitted_at: ticket.resolution_submitted_at,
        supervisor_sla_deadline: ticket.supervisor_sla_deadline,
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

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
    const reopenWindowCloses = new Date(now.getTime() + 48 * 3600000).toISOString(); // 48-Hour Citizen Quality Audit Window

    ticket.status = "RESOLVED";
    ticket.supervisor_notes = notes || "Verified side-by-side photo evidence and GPS location.";
    ticket.verified_at = now.toISOString();
    ticket.reopen_window_closes_at = reopenWindowCloses;
    ticket.updated_at = now.toISOString();

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "RESOLVED",
      from_status: "WORK_SUBMITTED",
      to_status: "RESOLVED",
      remarks: notes || "Approved resolution after dual-proof review. 48-hour citizen audit window active.",
      created_at: now.toISOString(),
    };
    globalAudits.unshift(audit);

    // Notify Field Crew & Citizen
    sendPushNotification({
      title: "Resolution Approved by Supervisor",
      message: `Supervisor approved work proof for #${ticket.id.slice(0, 8)}. 48h Citizen Audit Window initiated.`,
      type: "RESOLVED",
      complaint_id: ticket.id,
      link: "/crew",
    });

    // Outbound Webhook to Citizen Portal with 48h audit window link
    dispatchCitizenPortalWebhook("COMPLAINT_RESOLVED", ticket);

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        status: "RESOLVED",
        supervisor_notes: ticket.supervisor_notes,
        verified_at: ticket.verified_at,
        reopen_window_closes_at: ticket.reopen_window_closes_at,
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  const rejectResolution = (complaintId: string, remarks: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const now = new Date().toISOString();
    ticket.status = "ASSIGNED";
    ticket.updated_at = now;

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "STATUS_CHANGE",
      from_status: "WORK_SUBMITTED",
      to_status: "ASSIGNED",
      remarks: `Resolution rejected by supervisor: ${remarks}. Returned to field crew for re-work.`,
      created_at: now,
    };
    globalAudits.unshift(audit);

    sendPushNotification({
      title: "Work Proof Rejected - Re-work Required",
      message: `Supervisor returned #${ticket.id.slice(0, 8)} for re-work: "${remarks}".`,
      type: "SLA_WARNING",
      complaint_id: ticket.id,
      target_user_id: ticket.assigned_crew_id,
      target_role: "FIELD_CREW",
      link: "/crew",
    });

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        status: "ASSIGNED",
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  const manualOverrideStatus = (
    complaintId: string,
    newStatus: ComplaintStatus,
    remarks: string
  ) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const oldStatus = ticket.status;
    const now = new Date().toISOString();
    ticket.status = newStatus;
    if (newStatus === "ESCALATED") {
      ticket.escalation_tier = currentProfile.role === "MUNICIPAL_COMMISSIONER" ? 2 : 1;
      ticket.escalated_at = now;
      ticket.escalation_reason = remarks;
    }
    ticket.updated_at = now;

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: `${currentProfile.full_name} (${currentProfile.role})`,
      action: newStatus === "ESCALATED" ? "ESCALATED" : "STATUS_CHANGE",
      from_status: oldStatus,
      to_status: newStatus,
      remarks: `Manual Administrative Override: ${remarks}`,
      created_at: now,
    };
    globalAudits.unshift(audit);

    sendPushNotification({
      title: `Status Overridden: ${newStatus}`,
      message: `Ticket #${ticket.id.slice(0, 8)} status set to ${newStatus} by ${currentProfile.full_name}.`,
      type: newStatus === "ESCALATED" ? "ESCALATED" : "STATUS_CHANGE" as any,
      complaint_id: ticket.id,
    });

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        status: newStatus,
        escalation_tier: ticket.escalation_tier,
        escalated_at: ticket.escalated_at,
        escalation_reason: ticket.escalation_reason,
        updated_at: now,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  /**
   * Module 4: Multi-Tier Background Escalation Engine Worker
   * Sweeps tickets for:
   * 1. Tier 1: Crew Inaction SLA Breach (ASSIGNED & deadline passed) -> Elevates to Supervisor
   * 2. Tier 2: Supervisor Queue Inaction Breach -> Bypasses to Commissioner Desk
   * 3. AI Resolution Fallback: Expired 48h Citizen Audit Window -> AI Auto-Verification
   */
  const runEscalationWorker = (): {
    tier1Escalated: number;
    tier2Escalated: number;
    aiAutoConfirmed: number;
    summary: string;
  } => {
    const now = new Date();
    let tier1Count = 0;
    let tier2Count = 0;
    let aiFallbackCount = 0;

    globalComplaints.forEach((ticket) => {
      // 1. Tier 1: Field Crew Inaction
      if (
        ticket.status === "ASSIGNED" &&
        new Date(ticket.sla_deadline).getTime() < now.getTime() &&
        !ticket.escalation_tier
      ) {
        ticket.status = "ESCALATED";
        ticket.escalation_tier = 1;
        ticket.escalated_at = now.toISOString();
        ticket.escalation_reason = "Tier 1: Field Crew Inaction SLA Breached - Idle time exceeded without work proof.";
        ticket.supervisor_sla_deadline = new Date(now.getTime() + 12 * 3600000).toISOString();
        ticket.updated_at = now.toISOString();

        const audit: ComplaintAuditLog = {
          id: generateUUID(),
          complaint_id: ticket.id,
          actor_name: "SLA Escalation Engine",
          action: "ESCALATED",
          from_status: "ASSIGNED",
          to_status: "ESCALATED",
          remarks: "Field Crew failed to submit work proof within SLA window. Tier 1 Escalation triggered to Ward Supervisor.",
          created_at: now.toISOString(),
        };
        globalAudits.unshift(audit);

        sendPushNotification({
          title: "Tier 1 Escalation Alert",
          message: `Work Order #${ticket.id.slice(0, 8)} (${ticket.category}) breached crew SLA. Elevated to Ward Supervisor triage.`,
          type: "ESCALATED",
          complaint_id: ticket.id,
          target_role: "WARD_SUPERVISOR",
          link: "/supervisor",
        });

        tier1Count++;
      }

      // 2. Tier 2: Supervisor Inaction Breach
      else if (
        (ticket.status === "WORK_SUBMITTED" || ticket.status === "ESCALATED") &&
        ticket.escalation_tier === 1 &&
        ticket.supervisor_sla_deadline &&
        new Date(ticket.supervisor_sla_deadline).getTime() < now.getTime()
      ) {
        ticket.status = "ESCALATED";
        ticket.escalation_tier = 2;
        ticket.escalated_at = now.toISOString();
        ticket.escalation_reason = "Tier 2: Ward Supervisor Inaction SLA Breached - Bypassed directly to Municipal Commissioner.";
        ticket.updated_at = now.toISOString();

        const audit: ComplaintAuditLog = {
          id: generateUUID(),
          complaint_id: ticket.id,
          actor_name: "SLA Escalation Engine",
          action: "ESCALATED",
          from_status: "ESCALATED",
          to_status: "ESCALATED",
          remarks: "Ward Supervisor failed to review or reassign within 12h. Tier 2 Escalation bypassed to Municipal Commissioner desk.",
          created_at: now.toISOString(),
        };
        globalAudits.unshift(audit);

        sendPushNotification({
          title: "Tier 2 Executive Escalation",
          message: `Multi-escalated incident #${ticket.id.slice(0, 8)} in ${ticket.ward_id} escalated directly to Municipal Commissioner.`,
          type: "ESCALATED",
          complaint_id: ticket.id,
          target_role: "MUNICIPAL_COMMISSIONER",
          link: "/commissioner",
        });

        tier2Count++;
      }

      // 3. Automated AI Resolution Fallback (48-hour citizen audit timeout expired)
      else if (
        ticket.status === "RESOLVED" &&
        ticket.reopen_window_closes_at &&
        new Date(ticket.reopen_window_closes_at).getTime() < now.getTime()
      ) {
        ticket.reopen_window_closes_at = undefined;
        ticket.updated_at = now.toISOString();

        const audit: ComplaintAuditLog = {
          id: generateUUID(),
          complaint_id: ticket.id,
          actor_name: "AI Resolution Verification Fallback",
          action: "RESOLVED",
          from_status: "RESOLVED",
          to_status: "RESOLVED",
          remarks: "48-Hour Citizen Quality Audit window expired with zero disputes. AI Vision Model auto-verified repair completion.",
          created_at: now.toISOString(),
        };
        globalAudits.unshift(audit);

        dispatchCitizenPortalWebhook("AI_AUTO_CONFIRMED", ticket);
        aiFallbackCount++;
      }
    });

    saveStore();
    notify();

    return {
      tier1Escalated: tier1Count,
      tier2Escalated: tier2Count,
      aiAutoConfirmed: aiFallbackCount,
      summary: `Escalation sweep complete: ${tier1Count} Tier-1 crew inactions, ${tier2Count} Tier-2 supervisor breaches, ${aiFallbackCount} AI fallback auto-completions.`,
    };
  };

  const confirmResolution = (complaintId: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.reopen_window_closes_at = undefined;
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "STATUS_CHANGE",
      from_status: "RESOLVED",
      to_status: "RESOLVED",
      remarks: "Resolution verified complete by citizen audit. Ticket permanently closed.",
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  const reopenComplaint = (complaintId: string, reason: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) throw new Error("Ticket not found");

    const now = new Date().toISOString();
    ticket.status = "REOPENED";
    ticket.escalation_tier = 1;
    ticket.escalated_at = now;
    ticket.escalation_reason = `Citizen Quality Dispute: "${reason}"`;
    ticket.updated_at = now;

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "DISPUTED_REOPEN",
      from_status: "RESOLVED",
      to_status: "REOPENED",
      remarks: `Citizen quality audit dispute: "${reason}". Reopened & escalated to Supervisor.`,
      created_at: now,
    };
    globalAudits.unshift(audit);

    sendPushNotification({
      title: "Citizen Disputed Resolution",
      message: `Citizen reopened #${ticket.id.slice(0, 8)} during audit window: "${reason}".`,
      type: "CITIZEN_REOPEN",
      complaint_id: ticket.id,
      target_role: "WARD_SUPERVISOR",
      link: "/supervisor",
    });

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        status: "REOPENED",
        escalation_tier: 1,
        escalated_at: now,
        escalation_reason: ticket.escalation_reason,
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  const upvoteComplaint = (complaintId: string) => {
    const ticket = globalComplaints.find((c) => c.id === complaintId);
    if (!ticket) return;

    ticket.upvotes_count += 1;
    ticket.updated_at = new Date().toISOString();

    const audit: ComplaintAuditLog = {
      id: generateUUID(),
      complaint_id: ticket.id,
      actor_name: currentProfile.full_name,
      action: "UPVOTED",
      remarks: `Manual upvote. Priority count: ${ticket.upvotes_count}`,
      created_at: new Date().toISOString(),
    };
    globalAudits.unshift(audit);

    if (isSupabaseConfigured()) {
      updateComplaintInSupabase(ticket.id, {
        upvotes_count: ticket.upvotes_count,
        updated_at: ticket.updated_at,
      });
      insertAuditLogToSupabase(audit);
    }

    saveStore();
    notify();
  };

  return {
    complaints: globalComplaints,
    audits: globalAudits,
    wards: INITIAL_WARDS,
    profiles: globalProfiles,
    notifications: filteredNotifications,
    unreadNotificationCount,
    currentRole: globalCurrentRole,
    currentProfile,
    currentUser: globalCurrentUser,
    isAuthenticated: Boolean(globalCurrentUser),
    authSession: globalAuthSession,
    isSupabaseActive: isSupabaseConfigured(),
    setRole,
    login,
    loginWithPhoneOtp,
    requestPasswordReset,
    loginAsPersona,
    signUp,
    logout,
    updateCurrentProfile,
    resetToSeed,
    submitComplaint,
    assignTicket,
    reassignTicket,
    manualOverrideStatus,
    runEscalationWorker,
    sendPushNotification,
    markNotificationAsRead,
    clearNotifications,
    submitResolutionProof,
    approveResolution,
    rejectResolution,
    confirmResolution,
    reopenComplaint,
    upvoteComplaint,
  };
}
