'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, TemperatureReading, Treatment, DoctorVisit } from '@/types';
import {
  Stethoscope, AlertCircle, AlertTriangle, CheckCircle, Clock,
  Calendar, Activity, User, Plus, Edit2, Check, X, ShieldAlert,
  Flame, Award, ArrowRight, TrendingUp, HeartCrack, Undo2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from 'recharts';
import { cn, formatDateTime, formatTime, today, calcAge } from '@/lib/utils';
import {
  readingsForDate, effectiveReadingForDate, isFever, isCritical,
  hasTempToday, hasVisitToday, visitForDate, FEVER_THRESHOLD,
  CRITICAL_FEVER_THRESHOLD
} from '@/lib/business';

// Priority sorting tiers as specified:
// 1. Critical fever (>= 39.5°C today)
// 2. Fever (>= 38.0°C today)
// 3. Eligible for discharge
// 4. Temperature pending
// 5. Visit pending
// 6. Completed patients
function getDoctorPriorityTier(
  p: Patient,
  readings: TemperatureReading[],
  visits: DoctorVisit[],
  todayStr: string
): number {
  const eff = effectiveReadingForDate(readings, p.id, todayStr);
  const tempDone = !!eff;
  const visitDone = hasVisitToday(visits, p.id);

  if (eff && isCritical(eff.value)) return 1;
  if (eff && isFever(eff.value)) return 2;
  if (p.status === 'eligible') return 3;
  if (!tempDone) return 4;
  if (!visitDone) return 5;
  return 6;
}

export default function DoctorWorklist() {
  const {
    state,
    currentUser,
    markCriticalAlertSeen,
  } = useApp();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'fever' | 'eligible' | 'pendingVisit'>('all');
  const [search, setSearch] = useState('');

  const todayStr = today();
  const doctorId = currentUser?.staffId || state.staff.find(s => s.role === 'doctor' && s.name === currentUser?.name)?.id;
  const doctorName = currentUser?.name || 'Dr. Arjun Mehta';

  // Active assigned patients
  const assignedPatients = useMemo(() => {
    return state.patients.filter(
      (p) =>
        (p.doctorId === doctorId || p.doctorName === doctorName) &&
        (p.status === 'active' || p.status === 'eligible' || p.status === 'discharge_approved')
    );
  }, [state.patients, doctorId, doctorName]);

  // Priority sorted patients
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

    if (filter === 'critical') {
      list = list.filter((p) => {
        const eff = effectiveReadingForDate(state.temperatureReadings, p.id, todayStr);
        return eff ? isCritical(eff.value) : false;
      });
    } else if (filter === 'fever') {
      list = list.filter((p) => {
        const eff = effectiveReadingForDate(state.temperatureReadings, p.id, todayStr);
        return eff ? isFever(eff.value) && !isCritical(eff.value) : false;
      });
    } else if (filter === 'eligible') {
      list = list.filter((p) => p.status === 'eligible');
    } else if (filter === 'pendingVisit') {
      list = list.filter((p) => !hasVisitToday(state.doctorVisits, p.id));
    }

    return list.sort((a, b) => {
      const tierA = getDoctorPriorityTier(a, state.temperatureReadings, state.doctorVisits, todayStr);
      const tierB = getDoctorPriorityTier(b, state.temperatureReadings, state.doctorVisits, todayStr);
      if (tierA !== tierB) return tierA - tierB;
      return a.bedNumber - b.bedNumber;
    });
  }, [assignedPatients, state.temperatureReadings, state.doctorVisits, search, filter, todayStr]);

  // Overall statistics
  const totalCount = assignedPatients.length;
  const measuredCount = assignedPatients.filter((p) =>
    hasTempToday(state.temperatureReadings, p.id)
  ).length;
  const visitedCount = assignedPatients.filter((p) =>
    hasVisitToday(state.doctorVisits, p.id)
  ).length;

  // Unseen critical fever patients for persistent banner
  const unseenCriticalPatients = assignedPatients.filter((p) => {
    const eff = effectiveReadingForDate(state.temperatureReadings, p.id, todayStr);
    return eff && isCritical(eff.value) && p.criticalFeverAlertSeen !== true;
  });

  function handleOpenPatient(patient: Patient) {
    markCriticalAlertSeen(patient.id);
    // Find freshest record
    const fresh = state.patients.find((p) => p.id === patient.id) || patient;
    setSelectedPatient(fresh);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* PERSISTENT CRITICAL FEVER BANNER */}
      {unseenCriticalPatients.length > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-wide uppercase">
                URGENT CRITICAL FEVER ALERT ({unseenCriticalPatients.length} patient{unseenCriticalPatients.length > 1 ? 's' : ''})
              </p>
              <p className="text-xs text-red-100 mt-0.5">
                Immediate clinical review required for:{' '}
                {unseenCriticalPatients.map((p) => `${p.name} (Bed ${p.bedNumber})`).join(', ')}.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenPatient(unseenCriticalPatients[0])}
            className="px-4 py-2 bg-white text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl whitespace-nowrap shadow-xs transition-colors"
          >
            Open First Case
          </button>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 uppercase tracking-wider">
                Physician Station
              </span>
              <span className="text-xs text-slate-500">CareFlow Isolation Ward</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Doctor Patient Worklist
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Assigned Physician: <span className="font-semibold text-slate-800">{doctorName}</span> · Prioritized by clinical acuity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Measured Counter */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[140px] text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Temperature</span>
              <span className="text-lg font-bold text-slate-900">
                {measuredCount} / {totalCount}
              </span>
              <span className="text-[10px] text-teal-600 font-medium block mt-0.5">
                {totalCount ? Math.round((measuredCount / totalCount) * 100) : 0}% measured
              </span>
            </div>

            {/* Visited Counter */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[140px] text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Doctor Visits</span>
              <span className="text-lg font-bold text-slate-900">
                {visitedCount} / {totalCount}
              </span>
              <span className="text-[10px] text-teal-600 font-medium block mt-0.5">
                {totalCount ? Math.round((visitedCount / totalCount) * 100) : 0}% visited
              </span>
            </div>
          </div>
        </div>

        {/* Priority legend */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">Triage Order:</span>
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">1. Critical Fever (≥39.5°C)</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">2. Fever (≥38.0°C)</span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">3. Discharge Eligible</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">4. Temp Pending</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">5. Visit Pending</span>
          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded font-medium">6. Completed</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
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
            { id: 'all', label: `All (${totalCount})` },
            { id: 'critical', label: 'Critical Fever' },
            { id: 'fever', label: 'Fever' },
            { id: 'eligible', label: 'Eligible for Discharge' },
            { id: 'pendingVisit', label: 'Visit Pending' },
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

      {/* Patient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPatients.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No matching patients</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your search or filter parameters</p>
          </div>
        ) : (
          sortedPatients.map((patient) => {
            const effReading = effectiveReadingForDate(state.temperatureReadings, patient.id, todayStr);
            const visit = visitForDate(state.doctorVisits, patient.id, todayStr);
            const critical = effReading ? isCritical(effReading.value) : false;
            const fever = effReading ? isFever(effReading.value) : false;
            const isEligible = patient.status === 'eligible';
            const streak = patient.feverFreeStreak ?? 0;

            return (
              <div
                key={patient.id}
                className={cn(
                  'bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs',
                  critical
                    ? 'border-red-400 bg-red-50/20 shadow-red-500/5'
                    : fever
                    ? 'border-amber-400 bg-amber-50/20'
                    : isEligible
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div>
                  {/* Card Header: Bed & Status Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg">
                        Bed {patient.bedNumber}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{patient.id}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 justify-end">
                      {critical && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-600" /> Critical ({effReading?.value}°C)
                        </span>
                      )}
                      {fever && !critical && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-600" /> Fever ({effReading?.value}°C)
                        </span>
                      )}
                      {isEligible && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Award className="w-3 h-3 text-emerald-600" /> Eligible
                        </span>
                      )}
                      {patient.status === 'discharge_approved' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient Name */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-slate-900">{patient.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nurse: <span className="text-slate-700 font-medium">{patient.nurseName}</span>
                    </p>
                  </div>

                  {/* Quick Status Pillbox */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Today's Temp</span>
                      {effReading ? (
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          {effReading.value}°C
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> Not measured
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Today's Visit</span>
                      {visit ? (
                        <span className="text-green-700 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Done at {formatTime(visit.visitedAt)}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" /> Pending visit
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Fever-free streak:</span>
                      <span className="font-bold text-slate-800">
                        {streak} completed day{streak === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Open Patient Details Action */}
                <button
                  onClick={() => handleOpenPatient(patient)}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  Open Clinical File & Actions
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* FULL PATIENT CLINICAL DETAIL MODAL */}
      {selectedPatient && (
        <DoctorPatientDetailModal
          patient={state.patients.find((p) => p.id === selectedPatient.id) || selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// DOCTOR PATIENT DETAIL MODAL (CLINICAL WORKFLOW SUITE)
// ============================================================

interface DoctorPatientDetailModalProps {
  patient: Patient;
  onClose: () => void;
}

function DoctorPatientDetailModal({ patient, onClose }: DoctorPatientDetailModalProps) {
  const {
    state,
    currentUser,
    recordTemperature,
    amendTemperature,
    markVisit,
    addTreatment,
    correctTreatment,
    approveDischarge,
    declareDepth,
    withdrawDeathDeclaration,
    addNotification,
  } = useApp();

  const todayStr = today();
  const effReading = effectiveReadingForDate(state.temperatureReadings, patient.id, todayStr);
  const patientVisits = state.doctorVisits.filter((v) => v.patientId === patient.id);
  const todayVisit = visitForDate(state.doctorVisits, patient.id, todayStr);
  const patientTreatments = state.treatments.filter((t) => t.patientId === patient.id);
  const streak = patient.feverFreeStreak ?? 0;
  const isEligible = patient.status === 'eligible';

  // Sub-modal triggers
  const [showDoctorTempModal, setShowDoctorTempModal] = useState(false);
  const [showVisitConfirmModal, setShowVisitConfirmModal] = useState(false);
  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [correctingTreatment, setCorrectingTreatment] = useState<Treatment | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [showWithdrawDeathConfirm, setShowWithdrawDeathConfirm] = useState(false);

  // Temperature chart data
  const chartData = useMemo(() => {
    // Sort all readings chronologically
    const readings = [...state.temperatureReadings]
      .filter((r) => r.patientId === patient.id)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    return readings.map((r) => ({
      time: formatDateTime(r.recordedAt),
      temp: r.value,
      isFever: r.value >= FEVER_THRESHOLD,
      isCritical: r.value >= CRITICAL_FEVER_THRESHOLD,
    }));
  }, [state.temperatureReadings, patient.id]);

  function handleMarkVisit() {
    if (todayVisit) return; // already done

    if (!effReading) {
      // Temperature pending warning!
      setShowVisitConfirmModal(true);
      return;
    }

    markVisit(patient.id, false);
    addNotification({
      type: 'success',
      title: 'Visit Completed',
      message: `Doctor visit logged for ${patient.name} (Bed ${patient.bedNumber}).`,
      patientId: patient.id,
    });
  }

  function handleApproveDischarge() {
    approveDischarge(patient.id);
    addNotification({
      type: 'success',
      title: 'Discharge Approved',
      message: `${patient.name} has been approved for discharge. Queued for admin execution.`,
      patientId: patient.id,
    });
    setShowApproveConfirm(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-white">
              B{patient.bedNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{patient.name}</h2>
                <span className="text-xs font-mono text-slate-300">({patient.id})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800 text-teal-200 uppercase">
                  {patient.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Age: {calcAge(patient.dateOfBirth)} yrs · Admitted: {formatDateTime(patient.admittedAt)} · Nurse: {patient.nurseName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TOP QUICK ACTION STRIP */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Today's Temp</span>
                {effReading ? (
                  <span className="font-bold text-slate-900 text-sm">{effReading.value}°C</span>
                ) : (
                  <span className="text-amber-600 font-semibold">Not measured</span>
                )}
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Visit Status</span>
                {todayVisit ? (
                  <span className="text-green-700 font-semibold">Visited ({formatTime(todayVisit.visitedAt)})</span>
                ) : (
                  <span className="text-slate-500">Pending visit</span>
                )}
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Fever-Free Streak</span>
                <span className="font-bold text-slate-800">{streak} / 3 days required</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Record Temp as Doctor (if missing) */}
              {!effReading && (
                <button
                  onClick={() => setShowDoctorTempModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Missing Temp
                </button>
              )}

              {/* Complete Visit */}
              <button
                disabled={!!todayVisit}
                onClick={handleMarkVisit}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors',
                  todayVisit
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                )}
              >
                <Check className="w-3.5 h-3.5" />
                {todayVisit ? `Visit Completed at ${formatTime(todayVisit.visitedAt)}` : 'Mark Today\'s Visit Complete'}
              </button>

              {/* Prescribe Treatment */}
              <button
                onClick={() => setShowAddTreatmentModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Treatment
              </button>

              {/* Approve Discharge (Disabled if not eligible) */}
              {patient.status === 'eligible' && (
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" /> Approve Discharge
                </button>
              )}

              {/* Declare Death */}
              {patient.status !== 'death_declared' && patient.status !== 'death_confirmed' && (
                <button
                  onClick={() => setShowDeathModal(true)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <HeartCrack className="w-3.5 h-3.5" /> Declare Death
                </button>
              )}

              {/* Withdraw Death Declaration */}
              {patient.status === 'death_declared' && (
                <button
                  onClick={() => setShowWithdrawDeathConfirm(true)}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Withdraw Declaration
                </button>
              )}
            </div>
          </div>

          {/* SECTION 1: TEMPERATURE TRAJECTORY CHART & LOG */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" /> Temperature Trajectory Chart
                </h3>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> 38.0°C Fever
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> 39.5°C Critical
                  </span>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  No readings available to chart
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} />
                      <YAxis domain={[35, 42]} tick={{ fontSize: 9 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        formatter={(val: unknown) => [`${val}°C`, 'Temperature']}
                      />
                      <ReferenceLine y={FEVER_THRESHOLD} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '38°C', fill: '#f59e0b', fontSize: 10 }} />
                      <ReferenceLine y={CRITICAL_FEVER_THRESHOLD} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '39.5°C', fill: '#ef4444', fontSize: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="temp"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0d9488' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* DISCHARGE ELIGIBILITY SUMMARY */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Discharge Readiness Assessment
                </h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl mb-3">
                  <span className="text-xs text-slate-500 block">Consecutive Fever-Free Days:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900">{streak}</span>
                    <span className="text-xs text-slate-500">/ 3 completed days required</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {streak >= 3 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={streak >= 3 ? 'text-emerald-800 font-semibold' : 'text-slate-600'}>
                      3+ consecutive fever-free days
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-600">Daily readings recorded</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                {isEligible ? (
                  <p className="text-xs text-emerald-800 font-medium">
                    ✓ Patient meets all biological discharge criteria. Physician may approve discharge.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Patient remains under active isolation until 3 consecutive completed fever-free days are verified.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: TREATMENTS HISTORY & ADD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">Clinical Treatment Regimen</h3>
              <button
                onClick={() => setShowAddTreatmentModal(true)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Treatment
              </button>
            </div>

            <div className="space-y-3">
              {patientTreatments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No treatments prescribed yet.
                </div>
              ) : (
                patientTreatments.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'p-4 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3',
                      t.isCorrectionOf ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-700">{t.addedBy}</span>
                        <span>·</span>
                        <span>{formatDateTime(t.addedAt)}</span>
                        {t.isCorrectionOf && (
                          <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 font-bold rounded text-[10px]">
                            Correction
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 font-medium leading-relaxed">{t.description}</p>
                      {t.correctionReason && (
                        <p className="text-[11px] text-amber-800 italic mt-1.5">
                          Correction reason: {t.correctionReason}
                        </p>
                      )}
                    </div>

                    {!t.isCorrectionOf && (
                      <button
                        onClick={() => setCorrectingTreatment(t)}
                        className="self-start md:self-auto px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" /> Correct
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Assigned: Dr. {patient.doctorName} · Emergency Contact: {patient.emergencyContactName} ({patient.emergencyContactPhone})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold rounded-xl"
          >
            Close Clinical File
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: DOCTOR RECORD TEMPERATURE MODAL (MANDATORY REASON) */}
      {showDoctorTempModal && (
        <DoctorRecordTemperatureModal
          patient={patient}
          onClose={() => setShowDoctorTempModal(false)}
          onSuccess={() => setShowDoctorTempModal(false)}
        />
      )}

      {/* SUB-MODAL 2: VISIT BEFORE TEMPERATURE WARNING */}
      {showVisitConfirmModal && (
        <VisitBeforeTempWarningModal
          patient={patient}
          onRecordTemp={() => {
            setShowVisitConfirmModal(false);
            setShowDoctorTempModal(true);
          }}
          onConfirmVisit={() => {
            setShowVisitConfirmModal(false);
            markVisit(patient.id, true);
            addNotification({
              type: 'warning',
              title: 'Visit Logged Before Temperature',
              message: `Doctor visit recorded prior to daily temperature for ${patient.name}. Flagged for audit.`,
              patientId: patient.id,
            });
          }}
          onCancel={() => setShowVisitConfirmModal(false)}
        />
      )}

      {/* SUB-MODAL 3: ADD TREATMENT MODAL */}
      {showAddTreatmentModal && (
        <AddTreatmentModal
          patient={patient}
          onClose={() => setShowAddTreatmentModal(false)}
          onSuccess={() => setShowAddTreatmentModal(false)}
        />
      )}

      {/* SUB-MODAL 4: CORRECT TREATMENT MODAL */}
      {correctingTreatment && (
        <CorrectTreatmentModal
          originalTreatment={correctingTreatment}
          onClose={() => setCorrectingTreatment(null)}
          onSuccess={() => setCorrectingTreatment(null)}
        />
      )}

      {/* SUB-MODAL 5: APPROVE DISCHARGE CONFIRMATION */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
              <Award className="w-5 h-5 text-emerald-600" />
              Approve Patient Discharge
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that <span className="font-bold">{patient.name}</span> has met the required clinical criteria (3 completed fever-free days).
              Upon approval, this record will transition to the Admin Discharge Execution Queue. The patient continues to occupy Bed {patient.bedNumber} until an admin executes discharge.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveDischarge}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 6: DECLARE DEATH MODAL */}
      {showDeathModal && (
        <DeclareDeathModal
          patient={patient}
          onClose={() => setShowDeathModal(false)}
          onSuccess={() => {
            setShowDeathModal(false);
            onClose(); // close clinical file
          }}
        />
      )}

      {/* SUB-MODAL 7: WITHDRAW DEATH CONFIRMATION */}
      {showWithdrawDeathConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">Withdraw Death Declaration</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to withdraw the death declaration for <span className="font-bold">{patient.name}</span>?
              The patient will be restored to active clinical monitoring.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowWithdrawDeathConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  withdrawDeathDeclaration(patient.id);
                  setShowWithdrawDeathConfirm(false);
                  addNotification({
                    type: 'info',
                    title: 'Death Declaration Withdrawn',
                    message: `Death declaration withdrawn for ${patient.name}. Patient restored to active worklists.`,
                    patientId: patient.id,
                  });
                }}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs"
              >
                Withdraw Declaration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DOCTOR RECORD TEMPERATURE MODAL (MANDATORY REASON)
// ============================================================

function DoctorRecordTemperatureModal({
  patient,
  onClose,
  onSuccess,
}: {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { recordTemperature, currentUser } = useApp();
  const [valStr, setValStr] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const v = parseFloat(valStr);
    if (isNaN(v) || v < 34.0 || v > 42.0) {
      setError('Please enter a valid temperature between 34.0°C and 42.0°C');
      return;
    }
    const parts = valStr.trim().split('.');
    if (parts.length > 1 && parts[1].length > 1) {
      setError('Maximum 1 decimal place allowed');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5 || reason.trim().length > 200) {
      setError('A mandatory clinical reason of 5–200 characters is required for doctor entry');
      return;
    }

    recordTemperature(patient.id, v, reason.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Physician Temperature Entry</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="text-xs text-slate-500">
          Entering reading for <span className="font-bold text-slate-700">{patient.name}</span> (Bed {patient.bedNumber}).
          Nurse's worklist will update immediately.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Temperature (°C) *</label>
          <input
            type="number"
            step="0.1"
            min="34.0"
            max="42.0"
            placeholder="e.g. 37.4"
            value={valStr}
            onChange={(e) => {
              setValStr(e.target.value);
              setError(null);
            }}
            className="w-full text-2xl font-bold p-3 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mandatory Clinical Reason (5–200 chars) *
          </label>
          <textarea
            rows={3}
            maxLength={200}
            placeholder="e.g. Patient evaluated in rounds; reading measured directly due to acute symptom report."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Required for doctor entries</span>
            <span>{reason.length}/200</span>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs"
          >
            Save Temperature
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VISIT BEFORE TEMPERATURE WARNING MODAL
// ============================================================

function VisitBeforeTempWarningModal({
  patient,
  onRecordTemp,
  onConfirmVisit,
  onCancel,
}: {
  patient: Patient;
  onRecordTemp: () => void;
  onConfirmVisit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          Visit Before Temperature Warning
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Today's temperature has <span className="font-bold text-slate-900">not been recorded</span> for{' '}
          <span className="font-semibold">{patient.name}</span> (Bed {patient.bedNumber}).
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          It is recommended to evaluate patients after temperature measurement. You may measure the temperature now, or proceed with the visit (which will be logged as <span className="font-mono text-amber-700 font-semibold">"Visit before temperature"</span> for audit and analytics).
        </p>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg text-center"
          >
            Cancel
          </button>
          <button
            onClick={onRecordTemp}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg text-center"
          >
            Record Temperature Now
          </button>
          <button
            onClick={onConfirmVisit}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg text-center"
          >
            Proceed with Visit Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADD TREATMENT MODAL
// ============================================================

function AddTreatmentModal({
  patient,
  onClose,
  onSuccess,
}: {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { addTreatment } = useApp();
  const [desc, setDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!desc.trim() || desc.trim().length < 3 || desc.trim().length > 500) {
      setError('Treatment description must be between 3 and 500 characters');
      return;
    }
    addTreatment(patient.id, desc.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Prescribe Treatment</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <p className="text-xs text-slate-500">
          Patient: <span className="font-semibold text-slate-800">{patient.name}</span> (Bed {patient.bedNumber})
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Treatment Description (3–500 chars) *
          </label>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="e.g. Paracetamol 500mg PO Q6H PRN for temperature >38.0°C; maintain IV hydration 100mL/hr."
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
            autoFocus
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Min 3 chars</span>
            <span>{desc.length}/500</span>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs"
          >
            Save Treatment
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CORRECT TREATMENT MODAL
// ============================================================

function CorrectTreatmentModal({
  originalTreatment,
  onClose,
  onSuccess,
}: {
  originalTreatment: Treatment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { correctTreatment } = useApp();
  const [desc, setDesc] = useState(originalTreatment.description);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!desc.trim() || desc.trim().length < 3 || desc.trim().length > 500) {
      setError('Description must be between 3 and 500 characters');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('A mandatory reason of at least 5 characters is required');
      return;
    }
    correctTreatment(originalTreatment.id, desc.trim(), reason.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Treatment Correction</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <span className="font-semibold text-slate-700 block mb-0.5">Original Prescription:</span>
          <p className="italic">{originalTreatment.description}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Corrected Description *
          </label>
          <textarea
            rows={3}
            maxLength={500}
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mandatory Reason for Correction *
          </label>
          <textarea
            rows={2}
            maxLength={200}
            placeholder="e.g. Dose adjusted following renal function lab panel results."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none"
          />
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs"
          >
            Submit Correction
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DECLARE DEATH MODAL
// ============================================================

function DeclareDeathModal({
  patient,
  onClose,
  onSuccess,
}: {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { declareDepth, addNotification } = useApp();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleDeclare() {
    if (!note.trim() || note.trim().length < 5 || note.trim().length > 500) {
      setError('A mandatory clinical note between 5 and 500 characters is required');
      return;
    }
    declareDepth(patient.id, note.trim());
    addNotification({
      type: 'warning',
      title: 'Death Declared',
      message: `Death declared for ${patient.name} (Bed ${patient.bedNumber}). Transferred to Admin for final confirmation.`,
      patientId: patient.id,
    });
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border-2 border-red-300">
        <div className="flex items-center gap-2 text-red-700 font-bold text-base border-b pb-3">
          <HeartCrack className="w-5 h-5 text-red-600" />
          Declare Patient Death
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed">
          <p className="font-bold mb-1">Important Workflow Notice:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Patient will be removed immediately from Nurse and Doctor active worklists.</li>
            <li>Bed {patient.bedNumber} will remain occupied until an Admin confirms the declaration.</li>
            <li>Once confirmed by Admin, the record is permanently locked and counted toward facility mortality.</li>
          </ul>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mandatory Clinical Declaration Note (5–500 chars) *
          </label>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="Clinical details, time of circulatory/respiratory cessation, CPR attempts, and underlying cause of death."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none"
            autoFocus
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Min 5 chars</span>
            <span>{note.length}/500</span>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleDeclare}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs"
          >
            Declare Death
          </button>
        </div>
      </div>
    </div>
  );
}
