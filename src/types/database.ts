// CivicPulse AI / Smart Civic CMS - TypeScript Schema Definitions

export type UserRole = 
  | 'FIELD_CREW' 
  | 'WARD_SUPERVISOR' 
  | 'MUNICIPAL_COMMISSIONER';

export type ComplaintStatus = 
  | 'PENDING' 
  | 'ASSIGNED' 
  | 'WORK_SUBMITTED' 
  | 'RESOLVED' 
  | 'REOPENED' 
  | 'ESCALATED' 
  | 'REJECTED';

export type ComplaintCategory = 
  | 'POTHOLE' 
  | 'GARBAGE' 
  | 'STREETLIGHT' 
  | 'WATER_LEAK' 
  | 'OTHER';

export type AuditAction = 
  | 'CREATED'
  | 'UPVOTED'
  | 'LINKED_CHILD_TICKET'
  | 'ASSIGNED'
  | 'STATUS_CHANGE'
  | 'WORK_SUBMITTED'
  | 'RESOLVED'
  | 'DISPUTED_REOPEN'
  | 'ESCALATED';

export interface Ward {
  id: string;
  name: string;
  zone: string;
  boundary: [number, number][][];
  center: [number, number];
  description?: string;
}

export interface Profile {
  id: string;
  auth_user_id?: string;
  email?: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  ward_id?: string;
  is_active: boolean;
  avatar_url?: string;
  department?: string;
  employee_id?: string;
  active_tasks_count?: number;
  password?: string; // Pre-configured staff password
  last_login_at?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface SignUpData {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  ward_id?: string;
  department?: string;
}

export interface AuthSession {
  user: Profile;
  token: string;
  expiresAt: number;
}

export interface LinkedTicket {
  id: string;
  parent_ticket_id: string;
  citizen_id?: string;
  text_content?: string;
  audio_url?: string;
  ai_transcription?: string;
  image_url?: string;
  visual_fingerprint?: string;
  latitude: number;
  longitude: number;
  distance_from_master_meters: number;
  created_at: string;
}

export interface Complaint {
  id: string;
  citizen_id?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  
  // WGS 84 Coordinates
  latitude: number;
  longitude: number;
  address_text: string;
  ward_id: string;
  
  // Media & AI Processing
  image_url: string;
  audio_url?: string;
  ai_transcription?: string;
  ai_detected_category?: ComplaintCategory;
  ai_confidence_score?: number;
  visual_fingerprint?: string;
  
  // Deduplication & Linked Tickets
  upvotes_count: number;
  is_master?: boolean;
  linked_tickets?: LinkedTicket[];
  
  // Operations & SLA
  assigned_crew_id?: string;
  supervisor_id?: string;
  sla_deadline: string;
  assigned_at?: string;
  supervisor_sla_deadline?: string;
  
  // Escalation & Inactivity Triggers (Module 4)
  escalation_tier?: 0 | 1 | 2; // 0: Normal, 1: Ward Supervisor Tier 1, 2: Commissioner Tier 2
  escalated_at?: string;
  escalation_reason?: string;
  
  // Resolution Proof
  resolution_image_url?: string;
  resolution_latitude?: number;
  resolution_longitude?: number;
  resolution_distance_meters?: number;
  resolution_submitted_at?: string;
  supervisor_notes?: string;
  verified_at?: string;
  reopen_window_closes_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ComplaintAuditLog {
  id: string;
  complaint_id: string;
  actor_id?: string;
  actor_name?: string;
  action: AuditAction;
  from_status?: ComplaintStatus;
  to_status?: ComplaintStatus;
  remarks?: string;
  created_at: string;
}

export type NotificationType = 
  | 'TASK_ASSIGNED'
  | 'SLA_WARNING'
  | 'ESCALATED'
  | 'PROOF_SUBMITTED'
  | 'RESOLVED'
  | 'CITIZEN_REOPEN';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  complaint_id?: string;
  target_user_id?: string;
  target_role?: UserRole;
  is_read: boolean;
  created_at: string;
  link?: string;
}

