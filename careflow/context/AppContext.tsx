'use client';

// ============================================================
// CareFlow — Global App Context
// Single source of truth for all application state.
// All mutations go through this context.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  AppState,
  DemoUser,
  Patient,
  StaffMember,
  TemperatureReading,
  DoctorVisit,
  Treatment,
  AppNotification,
  PatientStatus,
} from '@/types';
import { loadState, saveState, resetState } from '@/lib/persistence';
import { generateId, today } from '@/lib/utils';
import {
  calcFeverFreeStreak,
  calcDischargeEligibility,
  createAuditEvent,
  readingsForDate,
  isCritical,
  isFever,
  buildBeds,
} from '@/lib/business';

// ---- Context value shape ----

interface AppContextValue {
  state: AppState;
  currentUser: DemoUser | null;
  notifications: AppNotification[];

  // Session
  login: (user: DemoUser) => void;
  logout: () => void;

  // Demo reset
  resetDemo: () => void;

  // Notifications
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Patient CRUD
  registerPatient: (data: Omit<Patient, 'id' | 'admittedAt' | 'status' | 'feverFreeStreak'>) => Patient;
  updatePatientAssignments: (
    patientId: string,
    updates: { nurseId?: string; nurseName?: string; doctorId?: string; doctorName?: string; bedNumber?: number }
  ) => void;

  // Temperature
  recordTemperature: (
    patientId: string,
    value: number,
    reason?: string
  ) => TemperatureReading;
  amendTemperature: (
    readingId: string,
    newValue: number,
    reason: string
  ) => TemperatureReading;

  // Visits
  markVisit: (patientId: string, visitBeforeTemperature: boolean) => DoctorVisit;

  // Treatments
  addTreatment: (patientId: string, description: string) => Treatment;
  correctTreatment: (originalId: string, description: string, reason: string) => Treatment;

  // Discharge workflow
  approveDischarge: (patientId: string) => void;
  cancelDischargeApproval: (patientId: string, reason: string) => void;
  executeDischarge: (patientId: string) => void;

  // Death workflow
  declareDepth: (patientId: string, note: string) => void;
  withdrawDeathDeclaration: (patientId: string) => void;
  confirmDeath: (patientId: string) => void;

  // Staff
  addStaff: (data: Omit<StaffMember, 'id' | 'createdAt'>) => StaffMember;
  deactivateStaff: (staffId: string) => { success: boolean; blockedBy: Patient[] };
  activateStaff: (staffId: string) => void;

  // Derived helpers
  getPatient: (id: string) => Patient | undefined;
  patientsForNurse: (nurseId: string) => Patient[];
  patientsForDoctor: (doctorId: string) => Patient[];

  // Mark critical alert seen
  markCriticalAlertSeen: (patientId: string) => void;

  // Recalculate all eligibility (call on load / day change)
  recalculateAllEligibility: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(() => loadState());
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const stateRef = useRef(state);

  // Keep ref in sync
  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      saveState(next);
      return next;
    });
  }, []);

  // On mount: recalculate eligibility
  useEffect(() => {
    setStateRaw((prev) => {
      const updated = recalcAll(prev);
      stateRef.current = updated;
      saveState(updated);
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inactivity timer
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      setCurrentUser(null);
      addNotificationDirect({
        type: 'warning',
        title: 'Session expired',
        message: 'You have been logged out due to 15 minutes of inactivity.',
      });
    }, 15 * 60 * 1000);
  }, []); // eslint-disable-line

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetInactivityTimer();
    if (currentUser) {
      events.forEach((e) => window.addEventListener(e, handler));
      resetInactivityTimer();
    }
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [currentUser, resetInactivityTimer]);

  // ---- Helpers ----

  function recalcAll(s: AppState): AppState {
    const updatedPatients = s.patients.map((p) => {
      if (p.status === 'discharged' || p.status === 'death_confirmed' || p.status === 'death_declared') {
        return p;
      }
      const streak = calcFeverFreeStreak(s.temperatureReadings, p.id, p.admittedAt);
      const eligible = calcDischargeEligibility(s.temperatureReadings, p.id, p.admittedAt);

      let status: PatientStatus = p.status;
      if (p.status === 'discharge_approved') {
        // If fever added, this gets cancelled separately; keep approved
        status = 'discharge_approved';
      } else if (eligible && p.status !== 'discharge_approved') {
        status = 'eligible';
      } else if (!eligible && (p.status === 'eligible')) {
        status = 'active';
      }

      return { ...p, feverFreeStreak: streak, status };
    });

    return { ...s, patients: updatedPatients };
  }

  function addNotificationDirect(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    setNotifications((prev) => [
      {
        ...n,
        id: generateId('NTF'),
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  }

  // ---- Session ----

  const login = useCallback((user: DemoUser) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  // ---- Demo reset ----

  const resetDemo = useCallback(() => {
    const initial = resetState();
    setStateRaw(initial);
    stateRef.current = initial;
    setNotifications([]);
  }, []);

  // ---- Notifications ----

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    addNotificationDirect(n);
  }, []); // eslint-disable-line

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ---- Patient CRUD ----

  const registerPatient = useCallback(
    (data: Omit<Patient, 'id' | 'admittedAt' | 'status' | 'feverFreeStreak'>): Patient => {
      if (!currentUser) throw new Error('Not authenticated');
      const id = generateId('PAT');
      const patient: Patient = {
        ...data,
        id,
        admittedAt: new Date().toISOString(),
        status: 'active',
        feverFreeStreak: 0,
      };
      const audit = createAuditEvent(
        'PATIENT_CREATED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { patientName: patient.name, bed: patient.bedNumber },
        id
      );
      setState((prev) => {
        const beds = prev.beds.map((b) =>
          b.number === patient.bedNumber
            ? { ...b, patientId: id, patientName: patient.name }
            : b
        );
        return {
          ...prev,
          patients: [...prev.patients, patient],
          beds,
          auditLog: [...prev.auditLog, audit],
        };
      });
      return patient;
    },
    [currentUser, setState]
  );

  const updatePatientAssignments = useCallback(
    (patientId: string, updates: { nurseId?: string; nurseName?: string; doctorId?: string; doctorName?: string; bedNumber?: number }) => {
      if (!currentUser) throw new Error('Not authenticated');
      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient) return prev;
        const updatedPatient = { ...patient, ...updates };
        let beds = prev.beds;
        if (updates.bedNumber !== undefined && updates.bedNumber !== patient.bedNumber) {
          beds = prev.beds.map((b) => {
            if (b.number === patient.bedNumber) return { number: b.number }; // free old bed
            if (b.number === updates.bedNumber) return { ...b, patientId, patientName: patient.name };
            return b;
          });
        }
        const audit = createAuditEvent(
          'PATIENT_ASSIGNMENT_CHANGED',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          { updates },
          patientId
        );
        return {
          ...prev,
          patients: prev.patients.map((p) => (p.id === patientId ? updatedPatient : p)),
          beds,
          auditLog: [...prev.auditLog, audit],
        };
      });
    },
    [currentUser, setState]
  );

  // ---- Temperature ----

  const recordTemperature = useCallback(
    (patientId: string, value: number, reason?: string): TemperatureReading => {
      if (!currentUser) throw new Error('Not authenticated');
      const reading: TemperatureReading = {
        id: generateId('TMP'),
        patientId,
        value,
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser.name,
        recordedByRole: currentUser.role,
        recordedByUserId: currentUser.id,
        isAmendment: false,
        reason,
      };
      const audit = createAuditEvent(
        'TEMPERATURE_RECORDED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { value, unit: 'C', patientId },
        patientId
      );

      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient) return prev;

        // Check if discharge approval needs cancellation
        let updatedPatients = prev.patients;
        const hasFever = isFever(value);
        if (hasFever && patient.status === 'discharge_approved') {
          updatedPatients = prev.patients.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  status: 'active' as PatientStatus,
                  dischargeApprovedAt: undefined,
                  dischargeApprovedBy: undefined,
                  dischargeApprovedByName: undefined,
                }
              : p
          );
          addNotificationDirect({
            type: 'warning',
            title: 'Discharge approval cancelled',
            message: `${patient.name}'s discharge approval has been cancelled due to a fever reading of ${value}°C.`,
            patientId,
          });
        }

        if (isCritical(value)) {
          // Critical fever alert
          updatedPatients = updatedPatients.map((p) =>
            p.id === patientId ? { ...p, criticalFeverAlertSeen: false } : p
          );
          addNotificationDirect({
            type: 'error',
            title: 'Critical fever alert',
            message: `${patient.name} (Bed ${patient.bedNumber}) has a critical temperature of ${value}°C.`,
            patientId,
          });
        } else if (hasFever) {
          addNotificationDirect({
            type: 'warning',
            title: 'Fever alert',
            message: `${patient.name} (Bed ${patient.bedNumber}) has fever at ${value}°C.`,
            patientId,
          });
        }

        // Recalculate streak and eligibility with new reading
        const newReadings = [...prev.temperatureReadings, reading];
        const streak = calcFeverFreeStreak(newReadings, patientId, patient.admittedAt);
        const eligible = calcDischargeEligibility(newReadings, patientId, patient.admittedAt);

        let newStatus: PatientStatus = patient.status;
        if (patient.status !== 'discharge_approved' && patient.status !== 'death_declared') {
          newStatus = eligible ? 'eligible' : 'active';
        }
        if (hasFever && patient.status === 'discharge_approved') {
          newStatus = 'active';
        }

        updatedPatients = updatedPatients.map((p) =>
          p.id === patientId ? { ...p, feverFreeStreak: streak, status: newStatus } : p
        );

        return {
          ...prev,
          patients: updatedPatients,
          temperatureReadings: newReadings,
          auditLog: [...prev.auditLog, audit],
        };
      });
      return reading;
    },
    [currentUser, setState]
  );

  const amendTemperature = useCallback(
    (readingId: string, newValue: number, reason: string): TemperatureReading => {
      if (!currentUser) throw new Error('Not authenticated');
      const amendment: TemperatureReading = {
        id: generateId('TMP'),
        patientId: '',
        value: newValue,
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser.name,
        recordedByRole: currentUser.role,
        recordedByUserId: currentUser.id,
        isAmendment: true,
        originalReadingId: readingId,
        amendmentReason: reason,
        reason,
      };
      setState((prev) => {
        const original = prev.temperatureReadings.find((r) => r.id === readingId);
        if (!original) return prev;
        amendment.patientId = original.patientId;
        const audit = createAuditEvent(
          'TEMPERATURE_AMENDED',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          { originalId: readingId, newValue, reason },
          original.patientId
        );
        const newReadings = [...prev.temperatureReadings, { ...amendment, patientId: original.patientId }];
        const patient = prev.patients.find((p) => p.id === original.patientId);
        if (!patient) return prev;

        const streak = calcFeverFreeStreak(newReadings, patient.id, patient.admittedAt);
        const eligible = calcDischargeEligibility(newReadings, patient.id, patient.admittedAt);
        let newStatus: PatientStatus = patient.status;
        if (patient.status !== 'discharge_approved' && patient.status !== 'death_declared') {
          newStatus = eligible ? 'eligible' : 'active';
        }

        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === patient.id ? { ...p, feverFreeStreak: streak, status: newStatus } : p
          ),
          temperatureReadings: newReadings,
          auditLog: [...prev.auditLog, audit],
        };
      });
      return amendment;
    },
    [currentUser, setState]
  );

  // ---- Visits ----

  const markVisit = useCallback(
    (patientId: string, visitBeforeTemperature: boolean): DoctorVisit => {
      if (!currentUser) throw new Error('Not authenticated');
      const visit: DoctorVisit = {
        id: generateId('VIS'),
        patientId,
        visitDate: today(),
        visitedAt: new Date().toISOString(),
        doctorId: currentUser.staffId || currentUser.id,
        doctorName: currentUser.name,
        visitBeforeTemperature,
      };
      const audit = createAuditEvent(
        'VISIT_COMPLETED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { visitBeforeTemperature },
        patientId
      );
      setState((prev) => ({
        ...prev,
        doctorVisits: [...prev.doctorVisits, visit],
        auditLog: [...prev.auditLog, audit],
      }));
      return visit;
    },
    [currentUser, setState]
  );

  // ---- Treatments ----

  const addTreatment = useCallback(
    (patientId: string, description: string): Treatment => {
      if (!currentUser) throw new Error('Not authenticated');
      const treatment: Treatment = {
        id: generateId('TRT'),
        patientId,
        description,
        addedAt: new Date().toISOString(),
        addedBy: currentUser.name,
        addedByUserId: currentUser.id,
      };
      const audit = createAuditEvent(
        'TREATMENT_ADDED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { description: description.slice(0, 80) },
        patientId
      );
      setState((prev) => ({
        ...prev,
        treatments: [...prev.treatments, treatment],
        auditLog: [...prev.auditLog, audit],
      }));
      return treatment;
    },
    [currentUser, setState]
  );

  const correctTreatment = useCallback(
    (originalId: string, description: string, reason: string): Treatment => {
      if (!currentUser) throw new Error('Not authenticated');
      const correction: Treatment = {
        id: generateId('TRT'),
        patientId: '',
        description,
        addedAt: new Date().toISOString(),
        addedBy: currentUser.name,
        addedByUserId: currentUser.id,
        isCorrectionOf: originalId,
        correctionReason: reason,
      };
      setState((prev) => {
        const original = prev.treatments.find((t) => t.id === originalId);
        if (!original) return prev;
        correction.patientId = original.patientId;
        const audit = createAuditEvent(
          'TREATMENT_CORRECTED',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          { originalId, reason },
          original.patientId
        );
        return {
          ...prev,
          treatments: [...prev.treatments, { ...correction, patientId: original.patientId }],
          auditLog: [...prev.auditLog, audit],
        };
      });
      return correction;
    },
    [currentUser, setState]
  );

  // ---- Discharge workflow ----

  const approveDischarge = useCallback(
    (patientId: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      const audit = createAuditEvent(
        'DISCHARGE_APPROVED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        {},
        patientId
      );
      setState((prev) => ({
        ...prev,
        patients: prev.patients.map((p) =>
          p.id === patientId
            ? {
                ...p,
                status: 'discharge_approved' as PatientStatus,
                dischargeApprovedAt: new Date().toISOString(),
                dischargeApprovedBy: currentUser.id,
                dischargeApprovedByName: currentUser.name,
              }
            : p
        ),
        auditLog: [...prev.auditLog, audit],
      }));
    },
    [currentUser, setState]
  );

  const cancelDischargeApproval = useCallback(
    (patientId: string, reason: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      const audit = createAuditEvent(
        'DISCHARGE_CANCELLED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { reason },
        patientId
      );
      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient) return prev;
        // Re-check eligibility
        const eligible = calcDischargeEligibility(prev.temperatureReadings, patientId, patient.admittedAt);
        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  status: eligible ? ('eligible' as PatientStatus) : ('active' as PatientStatus),
                  dischargeApprovedAt: undefined,
                  dischargeApprovedBy: undefined,
                  dischargeApprovedByName: undefined,
                }
              : p
          ),
          auditLog: [...prev.auditLog, audit],
        };
      });
    },
    [currentUser, setState]
  );

  const executeDischarge = useCallback(
    (patientId: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient) return prev;
        const beds = prev.beds.map((b) =>
          b.number === patient.bedNumber ? { number: b.number } : b
        );
        const audit = createAuditEvent(
          'DISCHARGE_EXECUTED',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          { bed: patient.bedNumber },
          patientId
        );
        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  status: 'discharged' as PatientStatus,
                  dischargedAt: new Date().toISOString(),
                  dischargedBy: currentUser.id,
                  dischargedByName: currentUser.name,
                }
              : p
          ),
          beds,
          auditLog: [...prev.auditLog, audit],
        };
      });
    },
    [currentUser, setState]
  );

  // ---- Death workflow ----

  const declareDepth = useCallback(
    (patientId: string, note: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      const audit = createAuditEvent(
        'DEATH_DECLARED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { note: note.slice(0, 80) },
        patientId
      );
      setState((prev) => ({
        ...prev,
        patients: prev.patients.map((p) =>
          p.id === patientId
            ? {
                ...p,
                status: 'death_declared' as PatientStatus,
                deathDeclaredAt: new Date().toISOString(),
                deathDeclaredBy: currentUser.id,
                deathDeclaredByName: currentUser.name,
                deathNote: note,
              }
            : p
        ),
        auditLog: [...prev.auditLog, audit],
      }));
    },
    [currentUser, setState]
  );

  const withdrawDeathDeclaration = useCallback(
    (patientId: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      const audit = createAuditEvent(
        'DEATH_WITHDRAWN',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        {},
        patientId
      );
      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient) return prev;
        const eligible = calcDischargeEligibility(prev.temperatureReadings, patientId, patient.admittedAt);
        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  status: eligible ? ('eligible' as PatientStatus) : ('active' as PatientStatus),
                  deathDeclaredAt: undefined,
                  deathDeclaredBy: undefined,
                  deathDeclaredByName: undefined,
                  deathNote: undefined,
                }
              : p
          ),
          auditLog: [...prev.auditLog, audit],
        };
      });
    },
    [currentUser, setState]
  );

  const confirmDeath = useCallback(
    (patientId: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient) return prev;
        const beds = prev.beds.map((b) =>
          b.number === patient.bedNumber ? { number: b.number } : b
        );
        const audit = createAuditEvent(
          'DEATH_CONFIRMED',
          currentUser.id,
          currentUser.name,
          currentUser.role,
          { bed: patient.bedNumber },
          patientId
        );
        return {
          ...prev,
          patients: prev.patients.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  status: 'death_confirmed' as PatientStatus,
                  deathConfirmedAt: new Date().toISOString(),
                  deathConfirmedBy: currentUser.id,
                  deathConfirmedByName: currentUser.name,
                }
              : p
          ),
          beds,
          auditLog: [...prev.auditLog, audit],
        };
      });
    },
    [currentUser, setState]
  );

  // ---- Staff ----

  const addStaff = useCallback(
    (data: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember => {
      if (!currentUser) throw new Error('Not authenticated');
      const staff: StaffMember = {
        ...data,
        id: generateId('STF'),
        createdAt: new Date().toISOString(),
      };
      const audit = createAuditEvent(
        'STAFF_CREATED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { name: staff.name, role: staff.role }
      );
      setState((prev) => ({
        ...prev,
        staff: [...prev.staff, staff],
        auditLog: [...prev.auditLog, audit],
      }));
      return staff;
    },
    [currentUser, setState]
  );

  const deactivateStaff = useCallback(
    (staffId: string): { success: boolean; blockedBy: Patient[] } => {
      if (!currentUser) throw new Error('Not authenticated');
      const assignedPatients = stateRef.current.patients.filter(
        (p) =>
          (p.status === 'active' || p.status === 'eligible' || p.status === 'discharge_approved' || p.status === 'death_declared') &&
          (p.nurseId === staffId || p.doctorId === staffId)
      );
      if (assignedPatients.length > 0) {
        return { success: false, blockedBy: assignedPatients };
      }
      const audit = createAuditEvent(
        'STAFF_DEACTIVATED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { staffId }
      );
      setState((prev) => ({
        ...prev,
        staff: prev.staff.map((s) => (s.id === staffId ? { ...s, active: false } : s)),
        auditLog: [...prev.auditLog, audit],
      }));
      return { success: true, blockedBy: [] };
    },
    [currentUser, setState]
  );

  const activateStaff = useCallback(
    (staffId: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      const audit = createAuditEvent(
        'STAFF_ACTIVATED',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        { staffId }
      );
      setState((prev) => ({
        ...prev,
        staff: prev.staff.map((s) => (s.id === staffId ? { ...s, active: true } : s)),
        auditLog: [...prev.auditLog, audit],
      }));
    },
    [currentUser, setState]
  );

  // ---- Derived helpers ----

  const getPatient = useCallback(
    (id: string) => state.patients.find((p) => p.id === id),
    [state.patients]
  );

  const patientsForNurse = useCallback(
    (nurseId: string) =>
      state.patients.filter(
        (p) =>
          p.nurseId === nurseId &&
          (p.status === 'active' || p.status === 'eligible' || p.status === 'discharge_approved')
      ),
    [state.patients]
  );

  const patientsForDoctor = useCallback(
    (doctorId: string) =>
      state.patients.filter(
        (p) =>
          p.doctorId === doctorId &&
          (p.status === 'active' || p.status === 'eligible' || p.status === 'discharge_approved')
      ),
    [state.patients]
  );

  const markCriticalAlertSeen = useCallback(
    (patientId: string) => {
      setState((prev) => ({
        ...prev,
        patients: prev.patients.map((p) =>
          p.id === patientId ? { ...p, criticalFeverAlertSeen: true } : p
        ),
      }));
    },
    [setState]
  );

  const recalculateAllEligibility = useCallback(() => {
    setState((prev) => recalcAll(prev));
  }, [setState]); // eslint-disable-line

  const value: AppContextValue = {
    state,
    currentUser,
    notifications,
    login,
    logout,
    resetDemo,
    addNotification,
    markNotificationRead,
    clearNotifications,
    registerPatient,
    updatePatientAssignments,
    recordTemperature,
    amendTemperature,
    markVisit,
    addTreatment,
    correctTreatment,
    approveDischarge,
    cancelDischargeApproval,
    executeDischarge,
    declareDepth,
    withdrawDeathDeclaration,
    confirmDeath,
    addStaff,
    deactivateStaff,
    activateStaff,
    getPatient,
    patientsForNurse,
    patientsForDoctor,
    markCriticalAlertSeen,
    recalculateAllEligibility,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
