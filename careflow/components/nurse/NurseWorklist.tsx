'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, TemperatureReading } from '@/types';
import {
  Thermometer, AlertCircle, AlertTriangle, CheckCircle, Clock,
  FileText, History, Edit3, Plus, X, Search, User, Sparkles
} from 'lucide-react';
import { cn, formatDateTime, formatTime, today } from '@/lib/utils';
import {
  readingsForDate, effectiveReadingForDate, isFever, isCritical,
  hasTempToday
} from '@/lib/business';

export default function NurseWorklist() {
  const { state, currentUser, recordTemperature, amendTemperature, addNotification } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'measured' | 'fever'>('all');

  // Modal states
  const [tempModalPatient, setTempModalPatient] = useState<Patient | null>(null);
  const [treatmentModalPatient, setTreatmentModalPatient] = useState<Patient | null>(null);
  const [historyModalPatient, setHistoryModalPatient] = useState<Patient | null>(null);
  const [amendReading, setAmendReading] = useState<TemperatureReading | null>(null);

  const nurseId = currentUser?.staffId || state.staff.find(s => s.role === 'nurse' && s.name === currentUser?.name)?.id;
  const nurseName = currentUser?.name || 'Nurse';

  // Active assigned patients
  const assignedPatients = useMemo(() => {
    return state.patients.filter(
      (p) =>
        (p.nurseId === nurseId || p.nurseName === nurseName) &&
        (p.status === 'active' || p.status === 'eligible' || p.status === 'discharge_approved')
    );
  }, [state.patients, nurseId, nurseName]);

  const todayStr = today();

  // Highlight tier based on current facility local time
  const currentHour = new Date().getHours();
  const urgencyTier: 'normal' | 'amber' | 'red' =
    currentHour >= 16 ? 'red' : currentHour >= 12 ? 'amber' : 'normal';

  // Progress stats
  const totalCount = assignedPatients.length;
  const measuredCount = assignedPatients.filter((p) =>
    hasTempToday(state.temperatureReadings, p.id)
  ).length;

  // Filtered and sorted patients (pending first!)
  const sortedPatients = useMemo(() => {
    let list = [...assignedPatients];

    if (search) {
      const q = search.toLowerCase();
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
      if (aDone !== bDone) return aDone - bDone; // 0 (pending) comes before 1 (measured)
      return a.bedNumber - b.bedNumber;
    });
  }, [assignedPatients, state.temperatureReadings, search, filter, todayStr]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Progress Counter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 uppercase tracking-wider">
                Nurse Station
              </span>
              <span className="text-xs text-slate-500">Care Unit A</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Assigned Patients Worklist
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Nurse: <span className="font-medium text-slate-800">{nurseName}</span> · Protocol: measure every patient daily.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 uppercase">Today's Progress</span>
              <span className="text-sm font-bold text-slate-900">
                {measuredCount}/{totalCount} Measured
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${totalCount ? (measuredCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
              <span>{totalCount - measuredCount} remaining</span>
              <span>{Math.round(totalCount ? (measuredCount / totalCount) * 100 : 0)}% completed</span>
            </p>
          </div>
        </div>

        {/* Time-based pending urgency alert */}
        {totalCount > measuredCount && (
          <div
            className={cn(
              'mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs',
              urgencyTier === 'red'
                ? 'bg-red-50 border-red-200 text-red-800'
                : urgencyTier === 'amber'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
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
              <span className="font-semibold uppercase tracking-wider">
                {urgencyTier === 'red'
                  ? 'Late Evening Alert (Past 16:00):'
                  : urgencyTier === 'amber'
                  ? 'Afternoon Schedule Alert (Past 12:00):'
                  : 'Morning Schedule Window (Pre-12:00):'}
              </span>{' '}
              {totalCount - measuredCount} patient{totalCount - measuredCount === 1 ? '' : 's'} still pending today's temperature check.
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, bed, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: `Pending (${totalCount - measuredCount})` },
            { id: 'measured', label: `Measured (${measuredCount})` },
            { id: 'fever', label: 'Fever Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                filter === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPatients.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No matching patients</p>
            <p className="text-xs text-slate-400 mt-1">No patients match the selected filter criteria</p>
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
                  'bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs',
                  !hasRecorded
                    ? urgencyTier === 'red'
                      ? 'border-red-300 bg-red-50/20 shadow-red-500/5'
                      : urgencyTier === 'amber'
                      ? 'border-amber-300 bg-amber-50/20 shadow-amber-500/5'
                      : 'border-slate-200 hover:border-slate-300'
                    : critical
                    ? 'border-red-400 bg-red-50/30'
                    : fever
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                )}
              >
                <div>
                  {/* Card Header: Bed & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg">
                        Bed {patient.bedNumber}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{patient.id}</span>
                    </div>

                    {/* Status badge */}
                    {critical ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <AlertCircle className="w-3 h-3 text-red-600" /> Critical ({latestReading?.value}°C)
                      </span>
                    ) : fever ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Fever ({latestReading?.value}°C)
                      </span>
                    ) : hasRecorded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> {latestReading?.value}°C
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                          urgencyTier === 'red'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : urgencyTier === 'amber'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        {urgencyTier === 'red' ? 'Overdue' : urgencyTier === 'amber' ? 'Due' : 'Not measured'}
                      </span>
                    )}
                  </div>

                  {/* Patient Name & Details */}
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{patient.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doctor: <span className="text-slate-700 font-medium">{patient.doctorName}</span>
                    </p>
                  </div>

                  {/* Temperature readout info */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                    {latestReading ? (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Today's Temperature:</span>
                          <span className="font-bold text-slate-900">{latestReading.value}°C</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Recorded at {formatTime(latestReading.recordedAt)} by {latestReading.recordedBy}
                          {latestReading.isAmendment && ' (amended)'}
                        </p>
                        {todayReadings.length > 1 && (
                          <p className="text-[10px] text-teal-600 font-medium mt-1">
                            ℹ {todayReadings.length} readings recorded today
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Thermometer className="w-4 h-4 text-slate-400" />
                        <span>No reading recorded today</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setTempModalPatient(patient)}
                    className={cn(
                      'w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                      !hasRecorded
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    {hasRecorded ? 'Record Another Temperature' : 'Record Temperature'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTreatmentModalPatient(patient)}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-slate-400" />
                      Plan (View)
                    </button>
                    <button
                      onClick={() => setHistoryModalPatient(patient)}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <History className="w-3 h-3 text-slate-400" />
                      Temp Log
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

      {/* MODAL 2: TREATMENT PLAN VIEW (READ ONLY) */}
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
  const { state, currentUser, recordTemperature, addNotification } = useApp();
  const [tempInput, setTempInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayStr = today();
  const existingReadings = readingsForDate(state.temperatureReadings, patient.id, todayStr);
  const hasExisting = existingReadings.length > 0;
  const latestExisting = existingReadings[existingReadings.length - 1];

  function validate(valStr: string): number | null {
    if (!valStr.trim()) {
      setError('Temperature reading is required');
      return null;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setError('Please enter a valid numeric temperature');
      return null;
    }
    // Check precision: max 1 decimal place
    const parts = valStr.trim().split('.');
    if (parts.length > 1 && parts[1].length > 1) {
      setError('Maximum 1 decimal place allowed (e.g. 37.2)');
      return null;
    }
    if (val < 34.0 || val > 42.0) {
      setError('Temperature must be between 34.0°C and 42.0°C');
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

    setSaving(true);
    try {
      recordTemperature(patient.id, val);
      onSuccess();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const numericVal = parseFloat(tempInput);
  const isHighFever = !isNaN(numericVal) && numericVal >= 39.5;
  const isModerateFever = !isNaN(numericVal) && numericVal >= 38.0 && numericVal < 39.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
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

        <div className="p-6 space-y-4">
          {/* Duplicate warning box */}
          {hasExisting && !showDuplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice: Reading already recorded today</p>
                <p className="mt-0.5 text-amber-700">
                  Recorded at {formatTime(latestExisting.recordedAt)} by {latestExisting.recordedBy} ({latestExisting.value}°C).
                </p>
              </div>
            </div>
          )}

          {showDuplicateWarning && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Confirm Duplicate Temperature Entry
              </div>
              <p>
                A reading of <span className="font-bold">{latestExisting.value}°C</span> was already recorded today at{' '}
                <span className="font-semibold">{formatTime(latestExisting.recordedAt)}</span> by{' '}
                <span className="font-semibold">{latestExisting.recordedBy}</span>.
              </p>
              <p className="text-amber-700">
                Are you sure you want to log an additional reading? This will be retained in clinical history and counted in management analytics.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 text-xs"
                >
                  Confirm & Save Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Form input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Temperature (°C) *
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
                  'w-full text-2xl font-bold px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400',
                  error ? 'border-red-400 bg-red-50 text-red-900' : 'border-slate-200 text-slate-900'
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

          {/* Dynamic alerts preview */}
          {isHighFever && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600" /> Critical Fever Alert (≥39.5°C)
              </div>
              <p>Will trigger an urgent red critical banner on Dr. {patient.doctorName}'s dashboard.</p>
              {patient.feverFreeStreak && patient.feverFreeStreak > 0 ? (
                <p className="text-red-700 font-semibold">
                  ⚠️ Fever-free streak ({patient.feverFreeStreak} days) will be RESET to 0.
                </p>
              ) : null}
            </div>
          )}

          {isModerateFever && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Fever Alert (≥38.0°C)
              </div>
              <p>Patient will be marked as having fever today and flagged for the doctor.</p>
              {patient.feverFreeStreak && patient.feverFreeStreak > 0 ? (
                <p className="text-amber-700 font-semibold">
                  ⚠️ Fever-free streak ({patient.feverFreeStreak} days) will be RESET to 0.
                </p>
              ) : null}
            </div>
          )}

          {/* Metadata preview */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Author:</span>
              <span className="font-medium text-slate-700">{currentUser?.name} ({currentUser?.role})</span>
            </div>
            <div className="flex justify-between">
              <span>Timestamp:</span>
              <span className="font-medium text-slate-700">{new Date().toLocaleTimeString()} (auto-generated)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || showDuplicateWarning}
            onClick={() => handleSave(false)}
            className="px-5 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {saving ? 'Saving…' : 'Save Reading'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// READ-ONLY TREATMENT PLAN MODAL
// ============================================================

function TreatmentPlanModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { state } = useApp();
  const treatments = state.treatments.filter((t) => t.patientId === patient.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Treatment Plan</h3>
              <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Read-only for Nurse
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.name} · Bed {patient.bedNumber} ({patient.id})
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {treatments.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No treatments prescribed yet by Dr. {patient.doctorName}.
            </div>
          ) : (
            treatments.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'p-4 rounded-xl border text-xs',
                  t.isCorrectionOf ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="font-medium text-slate-600">{t.addedBy}</span>
                  <span>{formatDateTime(t.addedAt)}</span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">{t.description}</p>
                {t.correctionReason && (
                  <div className="mt-2 pt-2 border-t border-amber-200 text-amber-800">
                    <span className="font-semibold">Correction note:</span> {t.correctionReason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPERATURE HISTORY MODAL
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Temperature History Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.name} · Bed {patient.bedNumber} ({patient.id})
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
          {allReadings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No temperature logs recorded yet.
            </div>
          ) : (
            allReadings.map((r) => {
              const isToday = r.recordedAt.startsWith(todayStr);
              // Nurses can amend ONLY their own readings on the same day
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
                    'p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs',
                    critical
                      ? 'bg-red-50 border-red-200'
                      : fever
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{r.value}°C</span>
                      {critical && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">
                          Critical
                        </span>
                      )}
                      {fever && !critical && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          Fever
                        </span>
                      )}
                      {r.isAmendment && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-medium rounded">
                          Amended
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatDateTime(r.recordedAt)} by <span className="font-medium text-slate-700">{r.recordedBy}</span> ({r.recordedByRole})
                    </p>
                    {r.amendmentReason && (
                      <p className="text-[11px] text-purple-700 italic mt-1">
                        Reason: {r.amendmentReason}
                      </p>
                    )}
                  </div>

                  {canNurseAmend && (
                    <button
                      onClick={() => onAmend(r)}
                      className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
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

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
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
      setError('Please enter a valid temperature between 34.0°C and 42.0°C');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('A mandatory reason of at least 5 characters is required');
      return;
    }
    amendTemperature(reading.id, val, reason.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Amend Temperature Reading</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Original reading:</span>
            <span className="font-bold line-through text-slate-500">{reading.value}°C</span>
          </div>
          <div className="flex justify-between">
            <span>Recorded at:</span>
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
            className="w-full text-xl font-bold px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mandatory Reason for Amendment (5–200 chars) *
          </label>
          <textarea
            rows={3}
            maxLength={200}
            placeholder="e.g. Digit transposed in initial entry; verified with standard thermometer."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleAmend}
            className="px-5 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-xs"
          >
            Save Amendment
          </button>
        </div>
      </div>
    </div>
  );
}
