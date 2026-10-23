// ============================================================
// CareFlow — localStorage persistence layer
// Handles read/write with graceful degradation for SSR and errors
// ============================================================

import type { AppState, Bed } from '@/types';
import { createInitialState } from './seed';

const STORAGE_KEY = 'careflow_state_v1';

const STATIC_SSR_STATE: AppState = {
  patients: [],
  staff: [],
  beds: Array.from({ length: 74 }, (_, i) => ({ number: i + 1 })),
  temperatureReadings: [],
  doctorVisits: [],
  treatments: [],
  auditLog: [],
  seeded: false,
};

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return STATIC_SSR_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    // Basic validation
    if (!parsed || !Array.isArray(parsed.patients) || !Array.isArray(parsed.beds)) {
      throw new Error('Invalid state structure');
    }
    // Ensure beds array always has exactly 74 entries
    if (parsed.beds.length !== 74) {
      // Rebuild beds from patient data
      const beds: Bed[] = Array.from({ length: 74 }, (_, i) => ({ number: i + 1 }));
      parsed.patients
        .filter((p) => p.status !== 'discharged' && p.status !== 'death_confirmed')
        .forEach((p) => {
          const bed = beds[p.bedNumber - 1];
          if (bed) {
            bed.patientId = p.id;
            bed.patientName = p.name;
          }
        });
      parsed.beds = beds;
    }
    return parsed;
  } catch (err) {
    console.warn('[CareFlow] Failed to load state from localStorage:', err);
    const initial = createInitialState();
    try {
      saveState(initial);
    } catch {
      // swallow storage errors
    }
    return initial;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[CareFlow] Failed to save state to localStorage:', err);
  }
}

export function resetState(): AppState {
  const initial = createInitialState();
  saveState(initial);
  return initial;
}
