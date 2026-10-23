// ============================================================
// CareFlow — Business Logic (centralized)
// ============================================================
// All eligibility, streak, occupancy, and metric calculations
// live here. Never duplicate these in components.
// ============================================================

import type {
  AppState,
  Patient,
  TemperatureReading,
  DoctorVisit,
  Bed,
  AuditEvent,
  AuditAction,
  Role,
} from '@/types';
import { toDateString, today, generateId } from './utils';

// ---- Calendar day helpers ----

/** Returns YYYY-MM-DD string for a given ISO timestamp, in local time. */
export function isoToLocalDateString(iso: string): string {
  return toDateString(new Date(iso));
}

/** Yesterday as YYYY-MM-DD in local time */
export function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

/** N days ago as YYYY-MM-DD */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

// ---- Temperature helpers ----

/** All readings for a specific patient on a specific YYYY-MM-DD */
export function readingsForDate(
  readings: TemperatureReading[],
  patientId: string,
  dateStr: string
): TemperatureReading[] {
  return readings.filter(
    (r) => r.patientId === patientId && isoToLocalDateString(r.recordedAt) === dateStr
  );
}

/**
 * Returns the "effective" (latest) reading for a patient on a given day.
 * Amendments supersede the originals. Returns undefined if none.
 */
export function effectiveReadingForDate(
  readings: TemperatureReading[],
  patientId: string,
  dateStr: string
): TemperatureReading | undefined {
  const dayReadings = readingsForDate(readings, patientId, dateStr);
  if (dayReadings.length === 0) return undefined;

  // Latest by recordedAt / amendedAt
  return dayReadings.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )[0];
}

/** All effective readings for a patient per day, sorted chronologically by date */
export function effectiveReadingsPerDay(
  readings: TemperatureReading[],
  patientId: string
): { date: string; reading: TemperatureReading }[] {
  const dateSet = new Set<string>();
  readings.filter((r) => r.patientId === patientId).forEach((r) => {
    dateSet.add(isoToLocalDateString(r.recordedAt));
  });

  return Array.from(dateSet)
    .sort()
    .map((date) => ({
      date,
      reading: effectiveReadingForDate(readings, patientId, date)!,
    }));
}

// ---- Fever logic ----

export const FEVER_THRESHOLD = 38.0;
export const CRITICAL_FEVER_THRESHOLD = 39.5;

export function isFever(temp: number): boolean {
  return temp >= FEVER_THRESHOLD;
}

export function isCritical(temp: number): boolean {
  return temp >= CRITICAL_FEVER_THRESHOLD;
}

/**
 * A day is "fever-free" if:
 * 1. It is a completed day (not today).
 * 2. At least one reading exists.
 * 3. All readings for that day are below FEVER_THRESHOLD.
 */
export function isDayFeverFree(
  readings: TemperatureReading[],
  patientId: string,
  dateStr: string
): boolean {
  const todayStr = today();
  if (dateStr >= todayStr) return false; // must be a completed day

  const dayReadings = readingsForDate(readings, patientId, dateStr);
  if (dayReadings.length === 0) return false;

  return dayReadings.every((r) => r.value < FEVER_THRESHOLD);
}

/**
 * Computes the fever-free streak for a patient as of right now.
 * Counts consecutive completed days (most recent first) all of which were fever-free.
 * A day with no reading resets the streak.
 */
export function calcFeverFreeStreak(
  readings: TemperatureReading[],
  patientId: string,
  admittedAt: string
): number {
  const admitDate = isoToLocalDateString(admittedAt);
  const todayStr = today();

  // Build set of dates that have at least one reading
  const readingDates = new Set(
    readings.filter((r) => r.patientId === patientId).map((r) => isoToLocalDateString(r.recordedAt))
  );

  let streak = 0;
  // Walk backwards from yesterday
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const dateStr = toDateString(cursor);
    if (dateStr < admitDate) break;

    if (!readingDates.has(dateStr)) {
      // No reading on this day → streak reset
      break;
    }

    if (!isDayFeverFree(readings, patientId, dateStr)) {
      break;
    }

    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * Discharge eligibility:
 * Patient must have ≥3 consecutive completed fever-free days.
 * Never overrides manual lock once status is discharged/confirmed.
 */
export function calcDischargeEligibility(
  readings: TemperatureReading[],
  patientId: string,
  admittedAt: string
): boolean {
  return calcFeverFreeStreak(readings, patientId, admittedAt) >= 3;
}

// ---- Visit helpers ----

export function visitForDate(
  visits: DoctorVisit[],
  patientId: string,
  dateStr: string
): DoctorVisit | undefined {
  return visits.find((v) => v.patientId === patientId && v.visitDate === dateStr);
}

export function hasVisitToday(visits: DoctorVisit[], patientId: string): boolean {
  return !!visitForDate(visits, patientId, today());
}

export function hasTempToday(readings: TemperatureReading[], patientId: string): boolean {
  return readingsForDate(readings, patientId, today()).length > 0;
}

// ---- Bed helpers ----

export function buildBeds(state: AppState): Bed[] {
  const beds: Bed[] = Array.from({ length: 74 }, (_, i) => ({ number: i + 1 }));
  state.patients
    .filter(
      (p) =>
        p.status !== 'discharged' &&
        p.status !== 'death_confirmed'
    )
    .forEach((p) => {
      const bed = beds.find((b) => b.number === p.bedNumber);
      if (bed) {
        bed.patientId = p.id;
        bed.patientName = p.name;
      }
    });
  return beds;
}

export function occupiedBeds(state: AppState): number {
  return state.patients.filter(
    (p) => p.status !== 'discharged' && p.status !== 'death_confirmed'
  ).length;
}

export function freeBeds(state: AppState): number {
  return 74 - occupiedBeds(state);
}

// ---- Audit helpers ----

export function createAuditEvent(
  action: AuditAction,
  actingUserId: string,
  actingUserName: string,
  actingRole: Role,
  details: Record<string, unknown>,
  patientId?: string
): AuditEvent {
  return {
    id: generateId('AUD'),
    action,
    actingUserId,
    actingUserName,
    actingRole,
    timestamp: new Date().toISOString(),
    patientId,
    details,
  };
}

// ---- Active patients ----

export function activePatients(patients: Patient[]): Patient[] {
  return patients.filter(
    (p) =>
      p.status === 'active' ||
      p.status === 'eligible' ||
      p.status === 'discharge_approved' ||
      p.status === 'death_declared'
  );
}

export function isPatientActive(p: Patient): boolean {
  return (
    p.status === 'active' ||
    p.status === 'eligible' ||
    p.status === 'discharge_approved' ||
    p.status === 'death_declared'
  );
}

// ---- Management metrics ----

export function closedCasesInRange(
  patients: Patient[],
  from: Date,
  to: Date
): Patient[] {
  return patients.filter((p) => {
    if (p.status === 'discharged' && p.dischargedAt) {
      const d = new Date(p.dischargedAt);
      return d >= from && d <= to;
    }
    if (p.status === 'death_confirmed' && p.deathConfirmedAt) {
      const d = new Date(p.deathConfirmedAt);
      return d >= from && d <= to;
    }
    return false;
  });
}

export function mortalityRate(patients: Patient[], from: Date, to: Date): number {
  const closed = closedCasesInRange(patients, from, to);
  if (closed.length === 0) return 0;
  const deaths = closed.filter((p) => p.status === 'death_confirmed').length;
  return (deaths / closed.length) * 100;
}

export function successRate(patients: Patient[], from: Date, to: Date): number {
  const closed = closedCasesInRange(patients, from, to);
  if (closed.length === 0) return 0;
  const discharged = closed.filter((p) => p.status === 'discharged').length;
  return (discharged / closed.length) * 100;
}

export function averageLengthOfStay(patients: Patient[], from: Date, to: Date): number {
  const closed = closedCasesInRange(patients, from, to).filter((p) => {
    const endDate = p.dischargedAt || p.deathConfirmedAt;
    return !!endDate;
  });
  if (closed.length === 0) return 0;
  const totalDays = closed.reduce((sum, p) => {
    const end = new Date(p.dischargedAt || p.deathConfirmedAt!);
    const start = new Date(p.admittedAt);
    return sum + (end.getTime() - start.getTime()) / 86_400_000;
  }, 0);
  return totalDays / closed.length;
}
