'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, TemperatureReading, Treatment, DoctorVisit } from '@/types';
import {
  Stethoscope,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Edit2,
  Check,
  X,
  ShieldAlert,
  Flame,
  Award,
  ArrowRight,
  TrendingUp,
  HeartCrack,
  Undo2,
  Calendar,
  Building2,
  Activity,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { cn, formatDateTime, formatTime, today, calcAge } from '@/lib/utils';
import {
  readingsForDate,
  effectiveReadingForDate,
  isFever,
  isCritical,
  hasTempToday,
  hasVisitToday,
  visitForDate,
  FEVER_THRESHOLD,
  CRITICAL_FEVER_THRESHOLD,
} from '@/lib/business';

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
  const { state, currentUser, markCriticalAlertSeen } = useApp();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'fever' | 'eligible' | 'pendingVisit'>('all');
  const [search, setSearch] = useState('');

  const todayStr = today();
  const doctorId =
    currentUser?.staffId ||
    state.staff.find((s) => s.role === 'doctor' && s.name === currentUser?.name)?.id;
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

    if (search.trim()) {
      const q = search.trim().toLowerCase();
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

  const totalCount = assignedPatients.length;
  const measuredCount = assignedPatients.filter((p) =>
    hasTempToday(state.temperatureReadings, p.id)
  ).length;
  const visitedCount = assignedPatients.filter((p) =>
    hasVisitToday(state.doctorVisits, p.id)
  ).length;

  const unseenCriticalPatients = assignedPatients.filter((p) => {
    const eff = effectiveReadingForDate(state.temperatureReadings, p.id, todayStr);
    return eff && isCritical(eff.value) && p.criticalFeverAlertSeen !== true;
  });

  function handleOpenPatient(patient: Patient) {
    markCriticalAlertSeen(patient.id);
    const fresh = state.patients.find((p) => p.id === patient.id) || patient;
    setSelectedPatient(fresh);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* PERSISTENT CRITICAL FEVER ALERT BANNER */}
      {unseenCriticalPatients.length > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-xs uppercase tracking-wider">
                URGENT CRITICAL FEVER ALERT — IMMEDIATE CLINICAL ACTION REQUIRED ({unseenCriticalPatients.length})
              </p>
              <p className="text-xs text-red-100 mt-0.5">
                Critical temperature (≥39.5°C) recorded today for:{' '}
                {unseenCriticalPatients.map((p) => `${p.name} (Bed ${p.bedNumber})`).join(', ')}.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenPatient(unseenCriticalPatients[0])}
            className="px-4 py-2 bg-white text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl whitespace-nowrap shadow-xs transition-colors"
          >
            Review Case File
          </button>
        </div>
      )}

      {/* Rounds Status Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                Physician Station
              </span>
              <span className="text-xs text-slate-500 font-medium">CareFlow Isolation Ward</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Physician Rounds & Clinical Worklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Attending Physician: <strong className="text-slate-800">{doctorName}</strong> · Triage sorted by clinical acuity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Measured Counter */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 min-w-[130px] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Temperature</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                {measuredCount} / {totalCount}
              </span>
              <span className="text-[10px] text-teal-700 font-semibold block mt-0.5">
                {totalCount ? Math.round((measuredCount / totalCount) * 100) : 0}% Measured
              </span>
            </div>

            {/* Visited Counter */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 min-w-[130px] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Doctor Visits</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                {visitedCount} / {totalCount}
              </span>
              <span className="text-[10px] text-teal-700 font-semibold block mt-0.5">
                {totalCount ? Math.round((visitedCount / totalCount) * 100) : 0}% Completed
              </span>
            </div>
          </div>
        </div>

        {/* Triage Priority Legend */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-bold text-slate-700">Triage Priority:</span>
          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-md font-semibold">1. Critical (≥39.5°C)</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-semibold">2. Fever (≥38.0°C)</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold">3. Eligible</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">4. Temp Pending</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-semibold">5. Visit Pending</span>
          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md font-semibold">6. Completed</span>
        </div>
      </div>

      {/* Control Bar: Search & Acuity Filter Pills */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search patient, bed number, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70 overflow-x-auto">
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

      {/* Patient Priority Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPatients.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No matching patients</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your filter parameters.</p>
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
                  'bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-2xs',
                  critical
                    ? 'border-red-300 bg-red-50/20'
                    : fever
                    ? 'border-amber-300 bg-amber-50/20'
                    : isEligible
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : 'border-slate-200/90'
                )}
              >
                <div>
                  {/* Bed Badge & Status Tags */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg shadow-2xs">
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

                  {/* Name & Nurse Assignment */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{patient.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assigned Nurse: <span className="font-semibold text-slate-700">{patient.nurseName}</span>
                    </p>
                  </div>

                  {/* Clinical Readout Box */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 text-xs mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Temp</span>
                      {effReading ? (
                        <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                          {effReading.value}°C
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> Not measured
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Visit</span>
                      {visit ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done ({formatTime(visit.visitedAt)})
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" /> Due
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Fever-Free Streak:</span>
                      <span className="font-bold text-slate-800">
                        {streak} / 3 days required
                      </span>
                    </div>
                  </div>
                </div>

                {/* Open Patient Details Action */}
                <button
                  onClick={() => handleOpenPatient(patient)}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Open Clinical File & Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* FULL PATIENT CLINICAL FILE MODAL */}
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
// DOCTOR PATIENT DETAIL MODAL (CLINICAL SUITE)
// ============================================================

interface DoctorPatientDetailModalProps {
  patient: Patient;
  onClose: () => void;
}

function DoctorPatientDetailModal({ patient, onClose }: DoctorPatientDetailModalProps) {
  const {
    state,
    recordTemperature,
    markVisit,
    approveDischarge,
    withdrawDeathDeclaration,
    addNotification,
  } = useApp();

  const todayStr = today();
  const effReading = effectiveReadingForDate(state.temperatureReadings, patient.id, todayStr);
  const todayVisit = visitForDate(state.doctorVisits, patient.id, todayStr);
  const patientTreatments = state.treatments.filter((t) => t.patientId === patient.id);
  const streak = patient.feverFreeStreak ?? 0;
  const isEligible = patient.status === 'eligible';

  // Submodals
  const [showDoctorTempModal, setShowDoctorTempModal] = useState(false);
  const [showVisitConfirmModal, setShowVisitConfirmModal] = useState(false);
  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [correctingTreatment, setCorrectingTreatment] = useState<Treatment | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [showWithdrawDeathConfirm, setShowWithdrawDeathConfirm] = useState(false);

  // Chronological readings for LineChart
  const chartData = useMemo(() => {
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
    if (todayVisit) return;

    if (!effReading) {
      setShowVisitConfirmModal(true);
      return;
    }

    markVisit(patient.id, false);
    addNotification({
      type: 'success',
      title: 'Physician Visit Logged',
      message: `Doctor rounds completed for ${patient.name} (Bed ${patient.bedNumber}).`,
      patientId: patient.id,
    });
  }

  function handleApproveDischarge() {
    approveDischarge(patient.id);
    addNotification({
      type: 'success',
      title: 'Discharge Approved by Physician',
      message: `${patient.name} approved for discharge. Queued for administrative execution.`,
      patientId: patient.id,
    });
    setShowApproveConfirm(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 font-mono font-bold text-white text-base flex items-center justify-center">
              B{patient.bedNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{patient.name}</h2>
                <span className="font-mono text-xs text-slate-300">({patient.id})</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-teal-900 text-teal-200 border border-teal-700 uppercase">
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Status and Actions Ribbon */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Temp</span>
                {effReading ? (
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{effReading.value}°C</span>
                ) : (
                  <span className="text-amber-700 font-bold block mt-0.5">Not measured</span>
                )}
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Visit Status</span>
                {todayVisit ? (
                  <span className="text-emerald-700 font-bold block mt-0.5">Visited ({formatTime(todayVisit.visitedAt)})</span>
                ) : (
                  <span className="text-slate-500 font-medium block mt-0.5">Pending visit</span>
                )}
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fever-Free Streak</span>
                <span className="font-bold text-slate-900 block mt-0.5">{streak} / 3 days required</span>
              </div>
            </div>

            {/* Action Buttons Cluster */}
            <div className="flex flex-wrap items-center gap-2">
              {!effReading && (
                <button
                  onClick={() => setShowDoctorTempModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Missing Temp
                </button>
              )}

              <button
                disabled={!!todayVisit}
                onClick={handleMarkVisit}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors',
                  todayVisit
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                )}
              >
                <Check className="w-3.5 h-3.5" />
                {todayVisit ? `Visit Done (${formatTime(todayVisit.visitedAt)})` : 'Mark Today\'s Visit Complete'}
              </button>

              <button
                onClick={() => setShowAddTreatmentModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Treatment
              </button>

              {patient.status === 'eligible' && (
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" /> Approve Discharge
                </button>
              )}

              {patient.status !== 'death_declared' && patient.status !== 'death_confirmed' && (
                <button
                  onClick={() => setShowDeathModal(true)}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-xs flex items-center gap-1"
                >
                  <HeartCrack className="w-3.5 h-3.5" /> Declare Death
                </button>
              )}

              {patient.status === 'death_declared' && (
                <button
                  onClick={() => setShowWithdrawDeathConfirm(true)}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Withdraw Declaration
                </button>
              )}
            </div>
          </div>

          {/* Temperature Trajectory Chart & Discharge Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" /> Temperature Trajectory Chart
                </h3>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> 38.0°C Fever Line
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> 39.5°C Critical Line
                  </span>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-400">
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

            {/* Biological Readiness Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Discharge Biological Criteria
                </h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl mb-3">
                  <span className="text-[11px] text-slate-500 block font-medium">Completed Fever-Free Days:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-slate-900">{streak}</span>
                    <span className="text-xs text-slate-500">/ 3 completed days</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    {streak >= 3 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={streak >= 3 ? 'text-emerald-800 font-semibold' : 'text-slate-600'}>
                      3+ consecutive fever-free days
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-600">Daily readings verified</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                {isEligible ? (
                  <p className="text-[11px] text-emerald-800 font-bold">
                    ✓ Patient meets all biological discharge criteria. Physician may approve discharge.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Active quarantine isolation required until 3 consecutive completed fever-free days are verified.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Treatment Orders Section */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">Clinical Treatment Regimen & Orders</h3>
              <button
                onClick={() => setShowAddTreatmentModal(true)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Prescribe Treatment
              </button>
            </div>

            <div className="space-y-3">
              {patientTreatments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed rounded-xl">
                  No treatments prescribed yet.
                </div>
              ) : (
                patientTreatments.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3',
                      t.isCorrectionOf ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-800">{t.addedBy}</span>
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
                        <p className="text-[11px] text-amber-900 italic mt-1.5">
                          <strong>Correction reason:</strong> {t.correctionReason}
                        </p>
                      )}
                    </div>

                    {!t.isCorrectionOf && (
                      <button
                        onClick={() => setCorrectingTreatment(t)}
                        className="self-start md:self-auto px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
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
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Emergency Contact: {patient.emergencyContactName} ({patient.emergencyContactPhone})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            Close Clinical File
          </button>
        </div>
      </div>

      {/* SUBMODALS */}
      {showDoctorTempModal && (
        <DoctorRecordTemperatureModal
          patient={patient}
          onClose={() => setShowDoctorTempModal(false)}
          onSuccess={() => setShowDoctorTempModal(false)}
        />
      )}

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

      {showAddTreatmentModal && (
        <AddTreatmentModal
          patient={patient}
          onClose={() => setShowAddTreatmentModal(false)}
          onSuccess={() => setShowAddTreatmentModal(false)}
        />
      )}

      {correctingTreatment && (
        <CorrectTreatmentModal
          originalTreatment={correctingTreatment}
          onClose={() => setCorrectingTreatment(null)}
          onSuccess={() => setCorrectingTreatment(null)}
        />
      )}

      {showApproveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
              <Award className="w-5 h-5 text-emerald-600" />
              Approve Biological Discharge
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that <strong>{patient.name}</strong> meets all discharge safety rules (3 consecutive completed fever-free days).
              Record will queue for administrative discharge execution and bed release.
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

      {showDeathModal && (
        <DeclareDeathModal
          patient={patient}
          onClose={() => setShowDeathModal(false)}
          onSuccess={() => {
            setShowDeathModal(false);
            onClose();
          }}
        />
      )}

      {showWithdrawDeathConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">Withdraw Death Declaration</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Withdraw death declaration for <strong>{patient.name}</strong>? Patient will be restored to active clinical care.
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
                    message: `Restored ${patient.name} to active rounds.`,
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
  const { recordTemperature } = useApp();
  const [valStr, setValStr] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const v = parseFloat(valStr);
    if (isNaN(v) || v < 34.0 || v > 42.0) {
      setError('Enter a valid temperature between 34.0°C and 42.0°C.');
      return;
    }
    const parts = valStr.trim().split('.');
    if (parts.length > 1 && parts[1].length > 1) {
      setError('Maximum 1 decimal place allowed.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5 || reason.trim().length > 200) {
      setError('A mandatory clinical rationale of 5–200 characters is required for doctor entry.');
      return;
    }

    recordTemperature(patient.id, v, reason.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Physician Temperature Entry</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <p className="text-slate-500">
          Entering measurement for <strong>{patient.name}</strong> (Bed {patient.bedNumber}). Nurse worklist will update immediately.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Temperature (°C) *
          </label>
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
            className="w-full text-2xl font-bold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400 font-mono"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Mandatory Clinical Rationale (5–200 chars) *
          </label>
          <textarea
            rows={3}
            maxLength={200}
            placeholder="e.g. Verified during clinical rounds following patient report of chills."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400"
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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          Visit Before Temperature Warning
        </div>
        <p className="text-slate-600 leading-relaxed">
          Today's temperature has <strong>not been measured yet</strong> for{' '}
          <strong>{patient.name}</strong> (Bed {patient.bedNumber}).
        </p>
        <p className="text-slate-600 leading-relaxed">
          Best clinical practice requires evaluating temperature before clinical rounding. You may record the temperature now, or proceed with the visit (which will be logged as <strong className="font-mono text-amber-700">"Visit before temperature"</strong> for hospital audit).
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
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg text-center"
          >
            Measure Temperature Now
          </button>
          <button
            onClick={onConfirmVisit}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg text-center"
          >
            Proceed with Visit
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
      setError('Treatment description must be between 3 and 500 characters.');
      return;
    }
    addTreatment(patient.id, desc.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Prescribe Treatment</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <p className="text-slate-500">
          Patient: <strong>{patient.name}</strong> (Bed {patient.bedNumber})
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Treatment Prescription & Orders (3–500 chars) *
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
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400"
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
      setError('Description must be between 3 and 500 characters.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('A mandatory reason of at least 5 characters is required.');
      return;
    }
    correctTreatment(originalTreatment.id, desc.trim(), reason.trim());
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-base">Treatment Correction</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
          <span className="font-semibold text-slate-700 block mb-0.5">Original Prescription:</span>
          <p className="italic">{originalTreatment.description}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Mandatory Rationale for Correction *
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
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400"
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
      setError('A mandatory clinical declaration note between 5 and 500 characters is required.');
      return;
    }
    declareDepth(patient.id, note.trim());
    addNotification({
      type: 'warning',
      title: 'Death Declared by Physician',
      message: `Death declared for ${patient.name} (Bed ${patient.bedNumber}). Transferred to Admin for confirmation.`,
      patientId: patient.id,
    });
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border-2 border-red-300 text-xs">
        <div className="flex items-center gap-2 text-red-700 font-bold text-base border-b pb-3">
          <HeartCrack className="w-5 h-5 text-red-600" />
          Declare Patient Death
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 leading-relaxed">
          <p className="font-bold mb-1">Clinical Protocol Notice:</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>Patient will immediately be removed from Nurse & Doctor daily worklists.</li>
            <li>Bed {patient.bedNumber} will remain occupied until an Admin confirms the declaration.</li>
            <li>Once confirmed by Admin, the record is permanently locked and counted toward facility mortality.</li>
          </ul>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Mandatory Clinical Declaration Note (5–500 chars) *
          </label>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="Clinical details, time of circulatory cessation, CPR attempts, and underlying cause of death."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-400"
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
