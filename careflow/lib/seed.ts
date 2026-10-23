// ============================================================
// CareFlow — Initial Seed Data
// All dates are relative to 2026-10-23 (current date)
// ============================================================

import type { AppState, Patient, StaffMember, TemperatureReading, DoctorVisit, Treatment, AuditEvent, Bed } from '@/types';
import { generateId, toDateString } from './utils';

// Helper: date N days ago at a given time
function daysAgoAt(n: number, hour = 8, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateStrDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

const TODAY = toDateString(new Date());

// ---- STAFF ----

export const DEMO_STAFF: StaffMember[] = [
  { id: 'STF-NURSE-001', name: 'Priya Nair', phone: '9876543210', role: 'nurse', active: true, createdAt: daysAgoAt(60) },
  { id: 'STF-NURSE-002', name: 'Divya Menon', phone: '9876543211', role: 'nurse', active: true, createdAt: daysAgoAt(60) },
  { id: 'STF-NURSE-003', name: 'Rekha Pillai', phone: '9876543212', role: 'nurse', active: true, createdAt: daysAgoAt(60) },
  { id: 'STF-DOC-001', name: 'Dr. Arjun Mehta', phone: '9876501111', role: 'doctor', active: true, createdAt: daysAgoAt(60) },
  { id: 'STF-DOC-002', name: 'Dr. Sneha Iyer', phone: '9876501112', role: 'doctor', active: true, createdAt: daysAgoAt(60) },
  { id: 'STF-DOC-003', name: 'Dr. Kiran Rao', phone: '9876501113', role: 'doctor', active: true, createdAt: daysAgoAt(60) },
];

// ---- PATIENTS ----

export const DEMO_PATIENTS: Patient[] = [
  // P001 — Normal temp, fever-free streak of 3 → ELIGIBLE for discharge
  {
    id: 'PAT-001',
    name: 'Ananya Krishnan',
    dateOfBirth: '1985-03-15',
    phone: '9000000001',
    emergencyContactName: 'Ravi Krishnan',
    emergencyContactPhone: '9000000002',
    bedNumber: 1,
    nurseId: 'STF-NURSE-001',
    nurseName: 'Priya Nair',
    doctorId: 'STF-DOC-001',
    doctorName: 'Dr. Arjun Mehta',
    admittedAt: daysAgoAt(10),
    status: 'eligible',
    dischargeEligibleAt: daysAgoAt(1, 0),
    feverFreeStreak: 3,
  },

  // P002 — Approved discharge awaiting admin execution
  {
    id: 'PAT-002',
    name: 'Mohan Pillai',
    dateOfBirth: '1950-07-22',
    phone: '9000000003',
    emergencyContactName: 'Sita Pillai',
    emergencyContactPhone: '9000000004',
    bedNumber: 2,
    nurseId: 'STF-NURSE-001',
    nurseName: 'Priya Nair',
    doctorId: 'STF-DOC-001',
    doctorName: 'Dr. Arjun Mehta',
    admittedAt: daysAgoAt(12),
    status: 'discharge_approved',
    dischargeEligibleAt: daysAgoAt(2, 0),
    dischargeApprovedAt: daysAgoAt(1, 9),
    dischargeApprovedBy: 'USR-DOC-001',
    dischargeApprovedByName: 'Dr. Arjun Mehta',
    feverFreeStreak: 4,
  },

  // P003 — Fever patient (38.2)
  {
    id: 'PAT-003',
    name: 'Fatima Shaikh',
    dateOfBirth: '1972-11-30',
    phone: '9000000005',
    emergencyContactName: 'Ahmed Shaikh',
    emergencyContactPhone: '9000000006',
    bedNumber: 3,
    nurseId: 'STF-NURSE-001',
    nurseName: 'Priya Nair',
    doctorId: 'STF-DOC-001',
    doctorName: 'Dr. Arjun Mehta',
    admittedAt: daysAgoAt(7),
    status: 'active',
    feverFreeStreak: 0,
  },

  // P004 — Critical fever (39.8)
  {
    id: 'PAT-004',
    name: 'Rajesh Gupta',
    dateOfBirth: '1968-01-05',
    phone: '9000000007',
    emergencyContactName: 'Meena Gupta',
    emergencyContactPhone: '9000000008',
    bedNumber: 4,
    nurseId: 'STF-NURSE-002',
    nurseName: 'Divya Menon',
    doctorId: 'STF-DOC-002',
    doctorName: 'Dr. Sneha Iyer',
    admittedAt: daysAgoAt(5),
    status: 'active',
    feverFreeStreak: 0,
    criticalFeverAlertSeen: false,
  },

  // P005 — Awaiting today's temperature (no reading today)
  {
    id: 'PAT-005',
    name: 'Lakshmi Devi',
    dateOfBirth: '1990-06-18',
    phone: '9000000009',
    emergencyContactName: 'Suresh Devi',
    emergencyContactPhone: '9000000010',
    bedNumber: 5,
    nurseId: 'STF-NURSE-002',
    nurseName: 'Divya Menon',
    doctorId: 'STF-DOC-002',
    doctorName: 'Dr. Sneha Iyer',
    admittedAt: daysAgoAt(4),
    status: 'active',
    feverFreeStreak: 0,
  },

  // P006 — Awaiting doctor visit (has temp, no visit today)
  {
    id: 'PAT-006',
    name: 'Sameer Khan',
    dateOfBirth: '1995-09-25',
    phone: '9000000011',
    emergencyContactName: 'Zara Khan',
    emergencyContactPhone: '9000000012',
    bedNumber: 6,
    nurseId: 'STF-NURSE-003',
    nurseName: 'Rekha Pillai',
    doctorId: 'STF-DOC-003',
    doctorName: 'Dr. Kiran Rao',
    admittedAt: daysAgoAt(6),
    status: 'active',
    feverFreeStreak: 2,
  },

  // P007 — Patient with duplicate readings (has 2 readings today)
  {
    id: 'PAT-007',
    name: 'Geeta Sharma',
    dateOfBirth: '1963-04-12',
    phone: '9000000013',
    emergencyContactName: 'Anil Sharma',
    emergencyContactPhone: '9000000014',
    bedNumber: 7,
    nurseId: 'STF-NURSE-001',
    nurseName: 'Priya Nair',
    doctorId: 'STF-DOC-001',
    doctorName: 'Dr. Arjun Mehta',
    admittedAt: daysAgoAt(8),
    status: 'active',
    feverFreeStreak: 0,
  },

  // P008 — Death declared, awaiting confirmation
  {
    id: 'PAT-008',
    name: 'Vijay Nair',
    dateOfBirth: '1942-12-01',
    phone: '9000000015',
    emergencyContactName: 'Kamala Nair',
    emergencyContactPhone: '9000000016',
    bedNumber: 8,
    nurseId: 'STF-NURSE-002',
    nurseName: 'Divya Menon',
    doctorId: 'STF-DOC-002',
    doctorName: 'Dr. Sneha Iyer',
    admittedAt: daysAgoAt(9),
    status: 'death_declared',
    deathDeclaredAt: todayAt(6, 30),
    deathDeclaredBy: 'USR-DOC-002',
    deathDeclaredByName: 'Dr. Sneha Iyer',
    deathNote: 'Patient presented with multi-organ failure. Resuscitation attempted without success.',
    feverFreeStreak: 0,
  },

  // P009 — Active with normal temp and 1 fever-free day (building streak)
  {
    id: 'PAT-009',
    name: 'Sunita Verma',
    dateOfBirth: '1978-08-20',
    phone: '9000000017',
    emergencyContactName: 'Rakesh Verma',
    emergencyContactPhone: '9000000018',
    bedNumber: 9,
    nurseId: 'STF-NURSE-003',
    nurseName: 'Rekha Pillai',
    doctorId: 'STF-DOC-003',
    doctorName: 'Dr. Kiran Rao',
    admittedAt: daysAgoAt(5),
    status: 'active',
    feverFreeStreak: 1,
  },

  // P010 — Treatment history patient
  {
    id: 'PAT-010',
    name: 'Arun Pillai',
    dateOfBirth: '1988-02-14',
    phone: '9000000019',
    emergencyContactName: 'Nisha Pillai',
    emergencyContactPhone: '9000000020',
    bedNumber: 10,
    nurseId: 'STF-NURSE-002',
    nurseName: 'Divya Menon',
    doctorId: 'STF-DOC-001',
    doctorName: 'Dr. Arjun Mehta',
    admittedAt: daysAgoAt(6),
    status: 'active',
    feverFreeStreak: 1,
  },

  // P011 — Discharged patient (for management metrics)
  {
    id: 'PAT-011',
    name: 'Meera Chandran',
    dateOfBirth: '1955-05-10',
    phone: '9000000021',
    emergencyContactName: 'Kumar Chandran',
    emergencyContactPhone: '9000000022',
    bedNumber: 11,
    nurseId: 'STF-NURSE-003',
    nurseName: 'Rekha Pillai',
    doctorId: 'STF-DOC-002',
    doctorName: 'Dr. Sneha Iyer',
    admittedAt: daysAgoAt(15),
    status: 'discharged',
    dischargeEligibleAt: daysAgoAt(4, 0),
    dischargeApprovedAt: daysAgoAt(3, 10),
    dischargeApprovedBy: 'USR-DOC-002',
    dischargeApprovedByName: 'Dr. Sneha Iyer',
    dischargedAt: daysAgoAt(3, 14),
    dischargedBy: 'USR-ADMIN-001',
    dischargedByName: 'Aditi Sharma',
    feverFreeStreak: 5,
  },

  // P012 — Confirmed death (for management mortality metrics)
  {
    id: 'PAT-012',
    name: 'Balu Krishnaswamy',
    dateOfBirth: '1938-03-08',
    phone: '9000000023',
    emergencyContactName: 'Savithri Balu',
    emergencyContactPhone: '9000000024',
    bedNumber: 12,
    nurseId: 'STF-NURSE-001',
    nurseName: 'Priya Nair',
    doctorId: 'STF-DOC-003',
    doctorName: 'Dr. Kiran Rao',
    admittedAt: daysAgoAt(20),
    status: 'death_confirmed',
    deathDeclaredAt: daysAgoAt(5, 8),
    deathDeclaredBy: 'USR-DOC-003',
    deathDeclaredByName: 'Dr. Kiran Rao',
    deathNote: 'Acute respiratory failure following severe viral pneumonia.',
    deathConfirmedAt: daysAgoAt(5, 10),
    deathConfirmedBy: 'USR-ADMIN-001',
    deathConfirmedByName: 'Aditi Sharma',
    feverFreeStreak: 0,
  },

  // P013 — Another discharged patient
  {
    id: 'PAT-013',
    name: 'Padma Subramaniam',
    dateOfBirth: '1970-09-01',
    phone: '9000000025',
    emergencyContactName: 'Ramu Subramaniam',
    emergencyContactPhone: '9000000026',
    bedNumber: 13,
    nurseId: 'STF-NURSE-002',
    nurseName: 'Divya Menon',
    doctorId: 'STF-DOC-001',
    doctorName: 'Dr. Arjun Mehta',
    admittedAt: daysAgoAt(18),
    status: 'discharged',
    dischargeEligibleAt: daysAgoAt(7, 0),
    dischargeApprovedAt: daysAgoAt(6, 11),
    dischargeApprovedBy: 'USR-DOC-001',
    dischargeApprovedByName: 'Dr. Arjun Mehta',
    dischargedAt: daysAgoAt(6, 15),
    dischargedBy: 'USR-ADMIN-001',
    dischargedByName: 'Aditi Sharma',
    feverFreeStreak: 4,
  },

  // P014 — Normal active patient, has temp and visit today
  {
    id: 'PAT-014',
    name: 'Deepak Nambiar',
    dateOfBirth: '1983-11-11',
    phone: '9000000027',
    emergencyContactName: 'Shobha Nambiar',
    emergencyContactPhone: '9000000028',
    bedNumber: 14,
    nurseId: 'STF-NURSE-003',
    nurseName: 'Rekha Pillai',
    doctorId: 'STF-DOC-003',
    doctorName: 'Dr. Kiran Rao',
    admittedAt: daysAgoAt(3),
    status: 'active',
    feverFreeStreak: 0,
  },
];

// ---- TEMPERATURE READINGS ----

function makeReading(
  patientId: string,
  value: number,
  isoTimestamp: string,
  recordedBy: string,
  recordedByUserId: string,
  recordedByRole: 'nurse' | 'doctor',
  reason?: string
): TemperatureReading {
  return {
    id: generateId('TMP'),
    patientId,
    value,
    recordedAt: isoTimestamp,
    recordedBy,
    recordedByRole,
    recordedByUserId,
    isAmendment: false,
    reason,
  };
}

export const DEMO_READINGS: TemperatureReading[] = [
  // PAT-001 (eligible): 3 completed fever-free days (days -1, -2, -3)
  makeReading('PAT-001', 36.8, daysAgoAt(3, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-001', 37.0, daysAgoAt(2, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-001', 36.9, daysAgoAt(1, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-001', 36.7, todayAt(7, 30), 'Priya Nair', 'USR-NURSE-001', 'nurse'),

  // PAT-002 (discharge approved): 4 fever-free days
  makeReading('PAT-002', 37.1, daysAgoAt(4, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-002', 36.9, daysAgoAt(3, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-002', 36.8, daysAgoAt(2, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-002', 36.7, daysAgoAt(1, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-002', 36.9, todayAt(7, 45), 'Priya Nair', 'USR-NURSE-001', 'nurse'),

  // PAT-003 (fever): fever today at 38.2
  makeReading('PAT-003', 37.5, daysAgoAt(3, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-003', 37.8, daysAgoAt(2, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-003', 38.5, daysAgoAt(1, 8), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-003', 38.2, todayAt(7, 30), 'Priya Nair', 'USR-NURSE-001', 'nurse'),

  // PAT-004 (critical fever): 39.8 today
  makeReading('PAT-004', 37.0, daysAgoAt(4, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-004', 38.1, daysAgoAt(3, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-004', 39.2, daysAgoAt(2, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-004', 39.8, todayAt(8, 0), 'Divya Menon', 'USR-NURSE-002', 'nurse'),

  // PAT-005: NO reading today (awaiting)
  makeReading('PAT-005', 37.2, daysAgoAt(3, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-005', 37.4, daysAgoAt(2, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-005', 37.1, daysAgoAt(1, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),

  // PAT-006: has temp today, no visit yet
  makeReading('PAT-006', 36.9, daysAgoAt(5, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-006', 37.0, daysAgoAt(4, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-006', 36.8, daysAgoAt(3, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-006', 36.9, daysAgoAt(2, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-006', 37.1, daysAgoAt(1, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-006', 36.8, todayAt(8, 0), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),

  // PAT-007: duplicate readings today
  makeReading('PAT-007', 37.3, daysAgoAt(1, 9), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-007', 37.5, todayAt(7, 0), 'Priya Nair', 'USR-NURSE-001', 'nurse'),
  makeReading('PAT-007', 37.8, todayAt(13, 30), 'Priya Nair', 'USR-NURSE-001', 'nurse'),

  // PAT-008 (death declared): readings before declaration
  makeReading('PAT-008', 39.1, daysAgoAt(5, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-008', 40.2, daysAgoAt(4, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-008', 41.0, daysAgoAt(3, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-008', 40.5, daysAgoAt(2, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-008', 41.2, daysAgoAt(1, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),

  // PAT-009: 1 fever-free day
  makeReading('PAT-009', 38.4, daysAgoAt(4, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-009', 37.6, daysAgoAt(3, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-009', 37.8, daysAgoAt(2, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-009', 37.2, daysAgoAt(1, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-009', 37.0, todayAt(8, 15), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),

  // PAT-010: with treatment history, active
  makeReading('PAT-010', 38.9, daysAgoAt(5, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-010', 38.2, daysAgoAt(4, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-010', 37.8, daysAgoAt(3, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-010', 37.5, daysAgoAt(2, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-010', 37.3, daysAgoAt(1, 9), 'Divya Menon', 'USR-NURSE-002', 'nurse'),
  makeReading('PAT-010', 37.1, todayAt(8, 30), 'Divya Menon', 'USR-NURSE-002', 'nurse'),

  // PAT-014: normal, temp and visit done today
  makeReading('PAT-014', 37.0, daysAgoAt(2, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-014', 36.9, daysAgoAt(1, 9), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
  makeReading('PAT-014', 37.2, todayAt(7, 45), 'Rekha Pillai', 'USR-NURSE-003', 'nurse'),
];

// ---- DOCTOR VISITS ----

export const DEMO_VISITS: DoctorVisit[] = [
  // PAT-001 yesterday and today visit (eligible)
  { id: 'VIS-001', patientId: 'PAT-001', visitDate: dateStrDaysAgo(1), visitedAt: daysAgoAt(1, 10), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },
  { id: 'VIS-002', patientId: 'PAT-001', visitDate: TODAY, visitedAt: todayAt(9), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },

  // PAT-002 (approved discharge)
  { id: 'VIS-003', patientId: 'PAT-002', visitDate: dateStrDaysAgo(1), visitedAt: daysAgoAt(1, 10, 15), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },
  { id: 'VIS-004', patientId: 'PAT-002', visitDate: TODAY, visitedAt: todayAt(9, 30), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },

  // PAT-003 (fever): visit today
  { id: 'VIS-005', patientId: 'PAT-003', visitDate: TODAY, visitedAt: todayAt(9, 45), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },

  // PAT-004 (critical fever): visit before temp — NOTE
  { id: 'VIS-006', patientId: 'PAT-004', visitDate: TODAY, visitedAt: todayAt(7, 45), doctorId: 'STF-DOC-002', doctorName: 'Dr. Sneha Iyer', visitBeforeTemperature: true },

  // PAT-006: no visit today (visit pending)
  { id: 'VIS-007', patientId: 'PAT-006', visitDate: dateStrDaysAgo(1), visitedAt: daysAgoAt(1, 11), doctorId: 'STF-DOC-003', doctorName: 'Dr. Kiran Rao', visitBeforeTemperature: false },

  // PAT-007 (duplicate readings): visit today
  { id: 'VIS-008', patientId: 'PAT-007', visitDate: TODAY, visitedAt: todayAt(10), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },

  // PAT-009: visit today
  { id: 'VIS-009', patientId: 'PAT-009', visitDate: TODAY, visitedAt: todayAt(10, 30), doctorId: 'STF-DOC-003', doctorName: 'Dr. Kiran Rao', visitBeforeTemperature: false },

  // PAT-010: visit today
  { id: 'VIS-010', patientId: 'PAT-010', visitDate: TODAY, visitedAt: todayAt(11), doctorId: 'STF-DOC-001', doctorName: 'Dr. Arjun Mehta', visitBeforeTemperature: false },

  // PAT-014: visit today
  { id: 'VIS-011', patientId: 'PAT-014', visitDate: TODAY, visitedAt: todayAt(10, 15), doctorId: 'STF-DOC-003', doctorName: 'Dr. Kiran Rao', visitBeforeTemperature: false },
];

// ---- TREATMENTS ----

export const DEMO_TREATMENTS: Treatment[] = [
  {
    id: 'TRT-001',
    patientId: 'PAT-010',
    description: 'Paracetamol 500mg every 6 hours for fever management.',
    addedAt: daysAgoAt(5, 10),
    addedBy: 'Dr. Arjun Mehta',
    addedByUserId: 'USR-DOC-001',
  },
  {
    id: 'TRT-002',
    patientId: 'PAT-010',
    description: 'Oral rehydration therapy — 2L fluids per day.',
    addedAt: daysAgoAt(5, 10, 10),
    addedBy: 'Dr. Arjun Mehta',
    addedByUserId: 'USR-DOC-001',
  },
  {
    id: 'TRT-003',
    patientId: 'PAT-010',
    description: 'Oseltamivir 75mg twice daily for 5 days.',
    addedAt: daysAgoAt(4, 11),
    addedBy: 'Dr. Arjun Mehta',
    addedByUserId: 'USR-DOC-001',
  },
  {
    id: 'TRT-004',
    patientId: 'PAT-010',
    description: '[CORRECTION] Paracetamol dose revised to 1000mg every 8 hours per revised protocol.',
    addedAt: daysAgoAt(3, 9),
    addedBy: 'Dr. Arjun Mehta',
    addedByUserId: 'USR-DOC-001',
    isCorrectionOf: 'TRT-001',
    correctionReason: 'Initial dosage was insufficient for patient weight. Revised per senior physician guidance.',
  },
  {
    id: 'TRT-005',
    patientId: 'PAT-003',
    description: 'Antipyretics and bed rest. Monitor temperature every 4 hours.',
    addedAt: daysAgoAt(3, 10),
    addedBy: 'Dr. Arjun Mehta',
    addedByUserId: 'USR-DOC-001',
  },
  {
    id: 'TRT-006',
    patientId: 'PAT-004',
    description: 'IV fluids 1L/hr, antipyretics, oxygen support. Escalation to ICU assessment pending.',
    addedAt: daysAgoAt(4, 11),
    addedBy: 'Dr. Sneha Iyer',
    addedByUserId: 'USR-DOC-002',
  },
  {
    id: 'TRT-007',
    patientId: 'PAT-009',
    description: 'Rest, fluids, and paracetamol as needed.',
    addedAt: daysAgoAt(4, 10),
    addedBy: 'Dr. Kiran Rao',
    addedByUserId: 'USR-DOC-003',
  },
];

// ---- BEDS ----

export function buildInitialBeds(): Bed[] {
  const beds: Bed[] = Array.from({ length: 74 }, (_, i) => ({ number: i + 1 }));
  DEMO_PATIENTS.filter(
    (p) => p.status !== 'discharged' && p.status !== 'death_confirmed'
  ).forEach((p) => {
    const bed = beds[p.bedNumber - 1];
    if (bed) {
      bed.patientId = p.id;
      bed.patientName = p.name;
    }
  });
  return beds;
}

// ---- AUDIT LOG (initial) ----

export const DEMO_AUDIT: AuditEvent[] = [
  {
    id: 'AUD-001',
    action: 'PATIENT_CREATED',
    actingUserId: 'USR-ADMIN-001',
    actingUserName: 'Aditi Sharma',
    actingRole: 'admin',
    timestamp: daysAgoAt(10),
    patientId: 'PAT-001',
    details: { patientName: 'Ananya Krishnan', bed: 1 },
  },
  {
    id: 'AUD-002',
    action: 'DISCHARGE_APPROVED',
    actingUserId: 'USR-DOC-001',
    actingUserName: 'Dr. Arjun Mehta',
    actingRole: 'doctor',
    timestamp: daysAgoAt(1, 9),
    patientId: 'PAT-002',
    details: { patientName: 'Mohan Pillai', approvedAt: daysAgoAt(1, 9) },
  },
  {
    id: 'AUD-003',
    action: 'DISCHARGE_EXECUTED',
    actingUserId: 'USR-ADMIN-001',
    actingUserName: 'Aditi Sharma',
    actingRole: 'admin',
    timestamp: daysAgoAt(3, 14),
    patientId: 'PAT-011',
    details: { patientName: 'Meera Chandran', bed: 11 },
  },
  {
    id: 'AUD-004',
    action: 'DEATH_DECLARED',
    actingUserId: 'USR-DOC-002',
    actingUserName: 'Dr. Sneha Iyer',
    actingRole: 'doctor',
    timestamp: todayAt(6, 30),
    patientId: 'PAT-008',
    details: { patientName: 'Vijay Nair', note: 'Patient presented with multi-organ failure.' },
  },
  {
    id: 'AUD-005',
    action: 'DEATH_CONFIRMED',
    actingUserId: 'USR-ADMIN-001',
    actingUserName: 'Aditi Sharma',
    actingRole: 'admin',
    timestamp: daysAgoAt(5, 10),
    patientId: 'PAT-012',
    details: { patientName: 'Balu Krishnaswamy', bed: 12 },
  },
];

// ---- FULL SEED ----

export function createInitialState(): AppState {
  return {
    patients: DEMO_PATIENTS,
    staff: DEMO_STAFF,
    beds: buildInitialBeds(),
    temperatureReadings: DEMO_READINGS,
    doctorVisits: DEMO_VISITS,
    treatments: DEMO_TREATMENTS,
    auditLog: DEMO_AUDIT,
    seeded: true,
    lastReset: new Date().toISOString(),
  };
}
