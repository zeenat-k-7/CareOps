// ============================================================
// CareFlow — Core Domain Types
// ============================================================

export type Role = 'admin' | 'nurse' | 'doctor' | 'management';

export type PatientStatus =
  | 'active'
  | 'eligible'
  | 'discharge_approved'
  | 'discharged'
  | 'death_declared'
  | 'death_confirmed';

export type StaffRole = 'nurse' | 'doctor';

// ---- Staff ----

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  createdAt: string; // ISO timestamp
}

// ---- Demo Session ----

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  staffId?: string; // links to StaffMember for nurse/doctor
}

// ---- Temperature Reading ----

export interface TemperatureReading {
  id: string;
  patientId: string;
  value: number; // Celsius
  recordedAt: string; // ISO timestamp
  recordedBy: string; // user display name
  recordedByRole: Role;
  recordedByUserId: string;
  reason?: string; // mandatory for doctor-entered readings
  isAmendment: boolean;
  originalReadingId?: string; // set when this is an amendment
  amendedAt?: string;
  amendmentReason?: string;
}

// ---- Doctor Visit ----

export interface DoctorVisit {
  id: string;
  patientId: string;
  visitDate: string; // YYYY-MM-DD
  visitedAt: string; // ISO timestamp
  doctorId: string;
  doctorName: string;
  visitBeforeTemperature: boolean;
}

// ---- Treatment ----

export interface Treatment {
  id: string;
  patientId: string;
  description: string;
  addedAt: string; // ISO timestamp
  addedBy: string; // user display name
  addedByUserId: string;
  isCorrectionOf?: string; // references original treatment id
  correctionReason?: string;
}

// ---- Patient ----

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bedNumber: number;
  nurseId: string;
  nurseName: string;
  doctorId: string;
  doctorName: string;
  admittedAt: string; // ISO timestamp
  status: PatientStatus;

  // Discharge workflow
  dischargeEligibleAt?: string; // ISO timestamp when first became eligible
  dischargeApprovedAt?: string;
  dischargeApprovedBy?: string; // doctor user id
  dischargeApprovedByName?: string;
  dischargedAt?: string;
  dischargedBy?: string; // admin user id
  dischargedByName?: string;

  // Death workflow
  deathDeclaredAt?: string;
  deathDeclaredBy?: string; // doctor user id
  deathDeclaredByName?: string;
  deathNote?: string;
  deathConfirmedAt?: string;
  deathConfirmedBy?: string; // admin user id
  deathConfirmedByName?: string;

  // Derived / cached fields
  feverFreeStreak?: number;
  criticalFeverAlertSeen?: boolean; // set when doctor opens record after critical reading
}

// ---- Bed ----

export interface Bed {
  number: number; // 1..74
  patientId?: string;
  patientName?: string;
}

// ---- Audit Event ----

export type AuditAction =
  | 'PATIENT_CREATED'
  | 'PATIENT_ASSIGNMENT_CHANGED'
  | 'PATIENT_BED_CHANGED'
  | 'STAFF_CREATED'
  | 'STAFF_DEACTIVATED'
  | 'STAFF_ACTIVATED'
  | 'TEMPERATURE_RECORDED'
  | 'TEMPERATURE_AMENDED'
  | 'VISIT_COMPLETED'
  | 'TREATMENT_ADDED'
  | 'TREATMENT_CORRECTED'
  | 'DISCHARGE_APPROVED'
  | 'DISCHARGE_CANCELLED'
  | 'DISCHARGE_EXECUTED'
  | 'DEATH_DECLARED'
  | 'DEATH_WITHDRAWN'
  | 'DEATH_CONFIRMED';

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actingUserId: string;
  actingUserName: string;
  actingRole: Role;
  timestamp: string; // ISO timestamp
  patientId?: string;
  details: Record<string, unknown>;
}

// ---- App State ----

export interface AppState {
  patients: Patient[];
  staff: StaffMember[];
  beds: Bed[]; // always 74 entries
  temperatureReadings: TemperatureReading[];
  doctorVisits: DoctorVisit[];
  treatments: Treatment[];
  auditLog: AuditEvent[];
  seeded: boolean;
  lastReset?: string;
}

// ---- Notification ----

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  patientId?: string;
  createdAt: string;
  read: boolean;
}
