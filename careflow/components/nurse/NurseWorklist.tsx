'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, TemperatureReading } from '@/types';
import {
  Thermometer,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Edit3,
  X,
  Search,
  User,
  HeartPulse,
  Flame,
  Check,
  Calendar,
} from 'lucide-react';
import { cn, formatDateTime, formatTime, today } from '@/lib/utils';
import {
  readingsForDate,
  effectiveReadingForDate,
  isFever,
  isCritical,
  hasTempToday,
} from '@/lib/business';

export default function NurseWorklist() {
  const { state, currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'measured' | 'fever'>('all');
  const [currentHour, setCurrentHour] = useState(10);

  // Modals state
  const [tempModalPatient, setTempModalPatient] = useState<Patient | null>(null);
  const [treatmentModalPatient, setTreatmentModalPatient] = useState<Patient | null>(null);
  const [historyModalPatient, setHistoryModalPatient] = useState<Patient | null>(null);
  const [amendReading, setAmendReading] = useState<TemperatureReading | null>(null);

  useEffect(() => {
    try {
      setCurrentHour(new Date().getHours());
    } catch {
      // fallback
    }
  }, []);

  const nurseId =
    currentUser?.staffId ||
    state.staff.find((s) => s.role === 'nurse' && s.name === currentUser?.name)?.id;
  const nurseName = currentUser?.name || 'Nurse Priya Nair';

  // Active assigned patients
  const assignedPatients = useMemo(() => {
    return state.patients.filter(
      (p) =>
        (p.nurseId === nurseId || p.nurseName === nurseName) &&
        (p.status === 'active' || p.status === 'eligible' || p.status === 'discharge_approved')
    );
  }, [state.patients, nurseId, nurseName]);

  const todayStr = today();

  // Schedule tier based on facility local time
  const urgencyTier: 'normal' | 'amber' | 'red' =
    currentHour >= 16 ? 'red' : currentHour >= 12 ? 'amber' : 'normal';

  const totalCount = assignedPatients.length;
  const measuredCount = assignedPatients.filter((p) =>
    hasTempToday(state.temperatureReadings, p.id)
  ).length;
  const pendingCount = totalCount - measuredCount;
  const completionPct = totalCount > 0 ? Math.round((measuredCount / totalCount) * 100) : 0;

  // Filtered and sorted patients (PENDING FIRST!)
  const sortedPatients = useMemo(() => {
    let list = [...assignedPatients];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          String(p.bedNumber).includes(q)
      );
    }

    if (filter === 'pending') {
      list = list.filter((p) => !hasTempToday(state.temperatureReadings, p.id));
    } else if (filter === 'measured') {
      list = list.filter((p) => hasTempToday(state.temperatureReadings, p.id));
    } else if (filter === 'fever') {
      list = list.filter((p) => {
        const eff = effectiveReadingForDate(state.temperatureReadings, p.id, todayStr);
        return eff ? isFever(eff.value) : false;
      });
    }

    // Sort: patients with NO reading today come FIRST
    return list.sort((a, b) => {
      const aDone = hasTempToday(state.temperatureReadings, a.id) ? 1 : 0;
      const bDone = hasTempToday(state.temperatureReadings, b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.bedNumber - b.bedNumber;
    });
  }, [assignedPatients, state.temperatureReadings, search, filter, todayStr]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Shift Progress Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                Nursing Station
              </span>
              <span className="text-xs text-slate-500 font-medium">Care Unit Alpha</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Daily Patient Vitals & Temperatures
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Nurse: <strong className="text-slate-800">{nurseName}</strong> · Mandatory once-daily temperature protocol for all assigned patients.
            </p>
          </div>

          {/* Shift Progress Counter */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 min-w-[260px]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-600">Shift Progress</span>
              <span className="font-bold text-slate-900">
                {measuredCount} of {totalCount} Measured ({completionPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
              <span>{pendingCount} remaining</span>
              <span className="font-medium text-teal-700">{measuredCount} completed</span>
            </p>
          </div>
        </div>

        {/* Schedule Window Urgency Alert */}
        {pendingCount > 0 && (
          <div
            className={cn(
              'mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs',
              urgencyTier === 'red'
                ? 'bg-red-50 border-red-200 text-red-900'
                : urgencyTier === 'amber'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            )}
          >
            {urgencyTier === 'red' ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : urgencyTier === 'amber' ? (
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold uppercase tracking-wider">
                {urgencyTier === 'red'
                  ? 'Late Evening Alert (Past 16:00):'
                  : urgencyTier === 'amber'
                  ? 'Afternoon Schedule Alert (Past 12:00):'
                  : 'Morning Schedule Window (Pre-12:00):'}
              </span>{' '}
              {pendingCount} patient{pendingCount === 1 ? '' : 's'} awaiting scheduled temperature measurement today.
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Search & Quick Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bed number, patient name, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70 overflow-x-auto">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'measured', label: `Measured (${measuredCount})` },
            { id: 'fever', label: 'Fever Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPatients.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No matching patients</p>
            <p className="text-xs text-slate-400 mt-1">No patients match the selected filter criteria.</p>
          </div>
        ) : (
          sortedPatients.map((patient) => {
            const todayReadings = readingsForDate(state.temperatureReadings, patient.id, todayStr);
            const latestReading = effectiveReadingForDate(state.temperatureReadings, patient.id, todayStr);
            const hasRecorded = todayReadings.length > 0;
            const fever = latestReading ? isFever(latestReading.value) : false;
            const critical = latestReading ? isCritical(latestReading.value) : false;

            return (
              <div
                key={patient.id}
                className={cn(
                  'bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-2xs',
                  !hasRecorded
                    ? urgencyTier === 'red'
                      ? 'border-red-300 bg-red-50/20'
                      : urgencyTier === 'amber'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                    : critical
                    ? 'border-red-300 bg-red-50/30'
                    : fever
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200/90'
                )}
              >
                <div>
                  {/* Card Header: Bed Badge & Clinical Alert Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg shadow-2xs">
                        Bed {patient.bedNumber}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{patient.id}</span>
                    </div>

                    {critical ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        Critical ({latestReading?.value}°C)
                      </span>
                    ) : fever ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Fever ({latestReading?.value}°C)
                      </span>
                    ) : hasRecorded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Normal ({latestReading?.value}°C)
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                          urgencyTier === 'red'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : urgencyTier === 'amber'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        {urgencyTier === 'red' ? 'Overdue' : urgencyTier === 'amber' ? 'Due Now' : 'Not measured'}
                      </span>
                    )}
                  </div>

                  {/* Patient Name & Details */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{patient.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Attending: <span className="font-semibold text-slate-700">{patient.doctorName}</span>
                    </p>
                  </div>

                  {/* Temperature Readout Box */}
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 mb-4 text-xs">
                    {latestReading ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-500 font-medium">Latest Temperature Today:</span>
                          <span className="text-base font-bold text-slate-900">{latestReading.value}°C</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Measured at <strong>{formatTime(latestReading.recordedAt)}</strong> by {latestReading.recordedBy}
                          {latestReading.isAmendment && ' (amended)'}
                        </p>
                        {todayReadings.length > 1 && (
                          <p className="text-[10px] text-teal-700 font-semibold mt-1">
                            ℹ {todayReadings.length} readings recorded today
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 py-1">
                        <Thermometer className="w-4 h-4 text-slate-400" />
                        <span>No temperature recorded today</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setTempModalPatient(patient)}
                    className={cn(
                      'w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs',
                      !hasRecorded
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>{hasRecorded ? 'Record Another Reading' : 'Record Temperature'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTreatmentModalPatient(patient)}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Care Plan</span>
                    </button>
                    <button
                      onClick={() => setHistoryModalPatient(patient)}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Temp Log</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: TEMPERATURE ENTRY MODAL */}
      {tempModalPatient && (
        <NurseTemperatureModal
          patient={tempModalPatient}
          onClose={() => setTempModalPatient(null)}
          onSuccess={() => setTempModalPatient(null)}
        />
      )}

      {/* MODAL 2: TREATMENT PLAN MODAL (READ ONLY) */}
      {treatmentModalPatient && (
        <TreatmentPlanModal
          patient={treatmentModalPatient}
          onClose={() => setTreatmentModalPatient(null)}
        />
      )}

      {/* MODAL 3: TEMPERATURE HISTORY MODAL */}
      {historyModalPatient && (
        <TemperatureHistoryModal
          patient={historyModalPatient}
          onClose={() => setHistoryModalPatient(null)}
          onAmend={(reading) => {
            setHistoryModalPatient(null);
            setAmendReading(reading);
          }}
        />
      )}

      {/* MODAL 4: AMEND TEMPERATURE MODAL */}
      {amendReading && (
        <AmendTemperatureModal
          reading={amendReading}
          onClose={() => setAmendReading(null)}
          onSuccess={() => setAmendReading(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// NURSE TEMPERATURE ENTRY MODAL (SCREEN 6)
// ============================================================

interface NurseTemperatureModalProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

function NurseTemperatureModal({ patient, onClose, onSuccess }: NurseTemperatureModalProps) {
  const { state, currentUser, recordTemperature } = useApp();
  const [tempInput, setTempInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = today();
  const existingReadings = readingsForDate(state.temperatureReadings, patient.id, todayStr);
  const hasExisting = existingReadings.length > 0;
  const latestExisting = existingReadings[existingReadings.length - 1];

  function validate(valStr: string): number | null {
    if (!valStr.trim()) {
      setError('Temperature reading is required.');
      return null;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setError('Please enter a valid numeric temperature.');
      return null;
    }
    const parts = valStr.trim().split('.');
    if (parts.length > 1 && parts[1].length > 1) {
      setError('Maximum 1 decimal place allowed (e.g. 37.4).');
      return null;
    }
    if (val < 34.0 || val > 42.0) {
      setError('Clinical range must be between 34.0°C and 42.0°C.');
      return null;
    }
    setError(null);
    return val;
  }

  function handleSave(confirmedDuplicate = false) {
    const val = validate(tempInput);
    if (val === null) return;

    if (hasExisting && !confirmedDuplicate) {
      setShowDuplicateWarning(true);
      return;
    }

    setSubmitting(true);
    try {
      recordTemperature(patient.id, val);
      onSuccess();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const numericVal = parseFloat(tempInput);
  const isHighFever = !isNaN(numericVal) && numericVal >= 39.5;
  const isModerateFever = !isNaN(numericVal) && numericVal >= 38.0 && numericVal < 39.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Record Temperature</h3>
            <p className="text-xs text-slate-300">
              {patient.name} · Bed {patient.bedNumber} ({patient.id})
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Duplicate Warning Dialog Box */}
          {showDuplicateWarning && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Confirm Duplicate Temperature Entry
              </div>
              <p>
                A reading of <strong>{latestExisting.value}°C</strong> was already recorded today at{' '}
                <strong>{formatTime(latestExisting.recordedAt)}</strong> by{' '}
                <strong>{latestExisting.recordedBy}</strong>.
              </p>
              <p className="text-amber-800">
                Are you sure you want to log an additional reading? This will be retained in clinical history and counted in quality metrics.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
                >
                  Confirm & Save Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Form Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Temperature Value (°C) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="34.0"
                max="42.0"
                placeholder="e.g. 37.2"
                value={tempInput}
                onChange={(e) => {
                  setTempInput(e.target.value);
                  setError(null);
                }}
                className={cn(
                  'w-full text-2xl font-bold px-4 py-3 border rounded-xl focus:outline-none font-mono',
                  error ? 'border-red-400 bg-red-50 text-red-900' : 'border-slate-300 text-slate-900'
                )}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                °C
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Valid range: 34.0°C – 42.0°C (1 decimal place)</p>
            {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
          </div>

          {/* Alert Preview Banners */}
          {isHighFever && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-900">
              <div className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Critical Fever Alert (≥39.5°C)
              </div>
              <p>Will trigger an urgent priority escalation on Dr. {patient.doctorName}'s worklist.</p>
              {patient.feverFreeStreak && patient.feverFreeStreak > 0 ? (
                <p className="text-red-700 font-semibold">
                  ⚠️ Fever-free streak ({patient.feverFreeStreak} days) will be RESET to 0.
                </p>
              ) : null}
            </div>
          )}

          {isModerateFever && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Fever Alert (≥38.0°C)
              </div>
              <p>Patient will be flagged for fever today on rounds.</p>
              {patient.feverFreeStreak && patient.feverFreeStreak > 0 ? (
                <p className="text-amber-700 font-semibold">
                  ⚠️ Fever-free streak ({patient.feverFreeStreak} days) will be RESET to 0.
                </p>
              ) : null}
            </div>
          )}

          {/* Attribution Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-500">
            <div className="flex justify-between">
              <span>Author:</span>
              <strong className="text-slate-800">{currentUser?.name} ({currentUser?.role})</strong>
            </div>
            <div className="flex justify-between">
              <span>Timestamp:</span>
              <strong className="text-slate-800">Auto-generated upon save</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || showDuplicateWarning}
            onClick={() => handleSave(false)}
            className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Temperature'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// READ-ONLY TREATMENT PLAN MODAL FOR NURSE
// ============================================================

function TreatmentPlanModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { state } = useApp();
  const treatments = state.treatments.filter((t) => t.patientId === patient.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">Prescribed Treatment Regimen</h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {patient.name} · Bed {patient.bedNumber} ({patient.id})
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {treatments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No treatments prescribed yet</p>
              <p className="text-[11px] mt-0.5">Attending physician has not logged any orders for this patient.</p>
            </div>
          ) : (
            treatments.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'p-4 rounded-xl border',
                  t.isCorrectionOf ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-bold text-slate-800">{t.addedBy}</span>
                  <span>{formatDateTime(t.addedAt)}</span>
                </div>
                <p className="text-slate-900 font-medium leading-relaxed">{t.description}</p>
                {t.correctionReason && (
                  <div className="mt-2 pt-2 border-t border-amber-200 text-amber-900">
                    <strong>Correction Note:</strong> {t.correctionReason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPERATURE HISTORY MODAL WITH NURSE SAME-DAY AMENDMENT
// ============================================================

function TemperatureHistoryModal({
  patient,
  onClose,
  onAmend,
}: {
  patient: Patient;
  onClose: () => void;
  onAmend: (r: TemperatureReading) => void;
}) {
  const { state, currentUser } = useApp();
  const allReadings = state.temperatureReadings
    .filter((r) => r.patientId === patient.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const todayStr = today();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Temperature Log</h3>
            <p className="text-xs text-slate-300">
              {patient.name} · Bed {patient.bedNumber} ({patient.id})
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 text-xs">
          {allReadings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No temperature records yet</p>
            </div>
          ) : (
            allReadings.map((r) => {
              const isToday = r.recordedAt.startsWith(todayStr);
              const canNurseAmend =
                isToday &&
                !r.isAmendment &&
                (r.recordedByUserId === currentUser?.id || r.recordedBy === currentUser?.name);

              const fever = isFever(r.value);
              const critical = isCritical(r.value);

              return (
                <div
                  key={r.id}
                  className={cn(
                    'p-3.5 rounded-xl border flex items-center justify-between gap-3',
                    critical
                      ? 'bg-red-50 border-red-200'
                      : fever
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 font-mono">{r.value}°C</span>
                      {critical && (
                        <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                          Critical
                        </span>
                      )}
                      {fever && !critical && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          Fever
                        </span>
                      )}
                      {r.isAmendment && (
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-medium rounded">
                          Amended
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatDateTime(r.recordedAt)} by <strong>{r.recordedBy}</strong> ({r.recordedByRole})
                    </p>
                    {r.amendmentReason && (
                      <p className="text-[11px] text-purple-800 italic mt-1">
                        Reason: {r.amendmentReason}
                      </p>
                    )}
                  </div>

                  {canNurseAmend && (
                    <button
                      onClick={() => onAmend(r)}
                      className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <Edit3 className="w-3 h-3 text-slate-500" />
                      Amend
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AMEND TEMPERATURE MODAL
// ============================================================

function AmendTemperatureModal({
  reading,
  onClose,
  onSuccess,
}: {
  reading: TemperatureReading;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { amendTemperature } = useApp();
  const [newValue, setNewValue] = useState(String(reading.value));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAmend() {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 34.0 || val > 42.0) {
      setError('Please enter a valid temperature between 34.0°C and 42.0°C.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('A mandatory reason of at least 5 characters is required.');
      return;
    }
    amendTemperature(reading.id, val, reason.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Amend Temperature Reading</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-600 border border-slate-200">
          <div className="flex justify-between">
            <span>Original Reading:</span>
            <span className="font-bold line-through text-slate-500">{reading.value}°C</span>
          </div>
          <div className="flex justify-between">
            <span>Recorded At:</span>
            <span>{formatDateTime(reading.recordedAt)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Corrected Temperature (°C) *
          </label>
          <input
            type="number"
            step="0.1"
            min="34.0"
            max="42.0"
            value={newValue}
            onChange={(e) => {
              setNewValue(e.target.value);
              setError(null);
            }}
            className="w-full text-xl font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mandatory Reason for Amendment (5–200 chars) *
          </label>
          <textarea
            rows={3}
            maxLength={200}
            placeholder="e.g. Digit transposed in initial entry; re-checked with calibrated unit."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Min 5 chars</span>
            <span>{reason.length}/200</span>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleAmend}
            className="px-5 py-2 text-xs font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-xs"
          >
            Save Amendment
          </button>
        </div>
      </div>
    </div>
  );
}
