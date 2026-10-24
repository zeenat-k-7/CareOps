'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient } from '@/types';
import {
  Search,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  X,
  Building2,
  Filter,
  User,
  Phone,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { cn, calcAge, formatDateTime, today } from '@/lib/utils';
import { freeBeds, occupiedBeds, buildBeds, hasTempToday, hasVisitToday } from '@/lib/business';

type SortKey = 'name' | 'admittedAt' | 'bed' | 'status';
type SortDir = 'asc' | 'desc';

function getStatusBadge(status: Patient['status']) {
  switch (status) {
    case 'active':
      return { label: 'Active Care', bg: 'bg-blue-50 text-blue-700 border-blue-200/80' };
    case 'eligible':
      return { label: 'Discharge Eligible', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' };
    case 'discharge_approved':
      return { label: 'Discharge Approved', bg: 'bg-teal-50 text-teal-800 border-teal-200/80' };
    case 'discharged':
      return { label: 'Discharged (Cured)', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    case 'death_declared':
      return { label: 'Death Declared', bg: 'bg-orange-50 text-orange-800 border-orange-200/80' };
    case 'death_confirmed':
      return { label: 'Deceased (Confirmed)', bg: 'bg-red-50 text-red-700 border-red-200/80' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export default function AdminPatientRegistry() {
  const { state, registerPatient } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('admittedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null);

  const occupied = occupiedBeds(state);
  const free = freeBeds(state);
  const totalCapacity = 74;

  // Filtered and sorted patient records
  const filteredPatients = useMemo(() => {
    let list = [...state.patients];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.nurseName.toLowerCase().includes(q) ||
          p.doctorName.toLowerCase().includes(q) ||
          String(p.bedNumber).includes(q) ||
          p.phone.includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }

    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case 'name':
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case 'admittedAt':
          av = new Date(a.admittedAt).getTime();
          bv = new Date(b.admittedAt).getTime();
          break;
        case 'bed':
          av = a.bedNumber;
          bv = b.bedNumber;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = 0;
          bv = 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [state.patients, search, statusFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortHeader({ k, title }: { k: SortKey; title: string }) {
    const isCurrent = sortKey === k;
    return (
      <button
        onClick={() => handleSort(k)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 focus:outline-none"
      >
        <span>{title}</span>
        {isCurrent ? (
          sortDir === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-300" />
        )}
      </button>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Census Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Census Admitted</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{state.patients.length}</span>
            <span className="text-xs text-slate-400">Total Patient Files</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Active Bed Occupancy</span>
            <span className="text-xs font-bold text-teal-700">
              {Math.round((occupied / totalCapacity) * 100)}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{occupied}</span>
            <span className="text-xs text-slate-500">/ {totalCapacity} Occupied Beds</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Vacant Bed Reserves</span>
            <span className={cn('text-xs font-bold', free === 0 ? 'text-red-600' : 'text-emerald-700')}>
              {free === 0 ? 'Capacity Full' : 'Available'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', free === 0 ? 'text-red-600' : 'text-emerald-700')}>
              {free}
            </span>
            <span className="text-xs text-slate-500">Available Beds (out of {totalCapacity})</span>
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Filters, and Register Patient Button */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, ID (PAT-xxx), bed number, doctor, nurse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter and Register Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer border-none p-0 pr-2"
            >
              <option value="all">All Statuses ({state.patients.length})</option>
              <option value="active">Active Patients</option>
              <option value="eligible">Discharge Eligible</option>
              <option value="discharge_approved">Discharge Approved</option>
              <option value="discharged">Discharged (Cured)</option>
              <option value="death_declared">Death Declared</option>
              <option value="death_confirmed">Deceased (Confirmed)</option>
            </select>
          </div>

          <button
            onClick={() => (free === 0 ? null : setShowRegisterModal(true))}
            disabled={free === 0}
            title={free === 0 ? 'No beds available (0/74)' : 'Register new admission'}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all whitespace-nowrap',
              free === 0
                ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
            )}
          >
            <UserPlus className="w-4 h-4" />
            <span>{free === 0 ? 'No beds available (0/74)' : 'Register Patient'}</span>
          </button>
        </div>
      </div>

      {/* Main Patient Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">
                  <SortHeader k="name" title="Patient & ID" />
                </th>
                <th className="py-3 px-3">Age</th>
                <th className="py-3 px-3">
                  <SortHeader k="admittedAt" title="Admitted" />
                </th>
                <th className="py-3 px-3">
                  <SortHeader k="bed" title="Bed" />
                </th>
                <th className="py-3 px-3">Assigned Staff</th>
                <th className="py-3 px-3">
                  <SortHeader k="status" title="Workflow Status" />
                </th>
                <th className="py-3 px-3 text-center">Today's Temp</th>
                <th className="py-3 px-3 text-center">Today's Visit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No matching patient records</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search criteria or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const badge = getStatusBadge(patient.status);
                  const isClosed = patient.status === 'discharged' || patient.status === 'death_confirmed';
                  const hasTemp = hasTempToday(state.temperatureReadings, patient.id);
                  const hasVisit = hasVisitToday(state.doctorVisits, patient.id);

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {patient.id}
                        </div>
                      </td>

                      {/* Age */}
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                        <span className="font-medium">{calcAge(patient.dateOfBirth)}</span> yrs
                      </td>

                      {/* Admission date */}
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-[11px] text-slate-800">
                          {formatDateTime(patient.admittedAt)}
                        </div>
                      </td>

                      {/* Bed */}
                      <td className="py-3.5 px-3">
                        {!isClosed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200/60">
                            B{patient.bedNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3.5 px-3">
                        <div className="text-[11px] font-medium text-slate-800">
                          Dr. {patient.doctorName.replace('Dr. ', '')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Nurse: {patient.nurseName}
                        </div>
                      </td>

                      {/* Workflow Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block', badge.bg)}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Today's Temp status (Administrative view: status only, no clinical value) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isClosed ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : hasTemp ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Recorded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Today's Visit status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isClosed ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : hasVisit ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Visited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" /> Due
                          </span>
                        )}
                      </td>

                      {/* Row Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPatientForView(patient)}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filteredPatients.length}</strong> of <strong>{state.patients.length}</strong> total patients
          </span>
          <span className="text-[11px] text-slate-400">
            Administrative View · Clinical charts and readings restricted to Doctor & Nurse roles
          </span>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegisterModal && (
        <RegisterPatientModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => setShowRegisterModal(false)}
        />
      )}

      {/* ADMINISTRATIVE PATIENT DETAIL DRAWER */}
      {selectedPatientForView && (
        <AdminPatientDetailModal
          patient={selectedPatientForView}
          onClose={() => setSelectedPatientForView(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// REGISTER PATIENT MODAL WITH VALIDATION & DUPLICATE CHECK
// ============================================================

interface RegisterPatientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function RegisterPatientModal({ onClose, onSuccess }: RegisterPatientModalProps) {
  const { state, registerPatient, addNotification } = useApp();
  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bedNumber: '',
    nurseId: '',
    doctorId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeNurses = state.staff.filter((s) => s.role === 'nurse' && s.active);
  const activeDoctors = state.staff.filter((s) => s.role === 'doctor' && s.active);
  const beds = buildBeds(state);
  const vacantBeds = beds.filter((b) => !b.patientId);

  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s''.-]{2,60}$/;
  const phoneRegex = /^\d{10}$/;

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) {
      errs.name = 'Patient full name is required.';
    } else if (!nameRegex.test(form.name.trim())) {
      errs.name = 'Name must be 2–60 characters (letters, spaces, hyphens only).';
    }

    if (!form.dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required.';
    } else {
      const birthDate = new Date(form.dateOfBirth);
      const todayDate = new Date();
      if (birthDate > todayDate) {
        errs.dateOfBirth = 'Date of birth cannot be in the future.';
      } else {
        const age = calcAge(form.dateOfBirth);
        if (age < 0 || age > 120) {
          errs.dateOfBirth = 'Age must be between 0 and 120 years.';
        }
      }
    }

    if (!form.phone.trim()) {
      errs.phone = 'Patient phone number is required.';
    } else if (!phoneRegex.test(form.phone.trim())) {
      errs.phone = 'Phone number must contain exactly 10 digits.';
    }

    if (!form.emergencyContactName.trim()) {
      errs.emergencyContactName = 'Emergency contact name is required.';
    } else if (!nameRegex.test(form.emergencyContactName.trim())) {
      errs.emergencyContactName = 'Contact name must be 2–60 characters (letters only).';
    }

    if (!form.emergencyContactPhone.trim()) {
      errs.emergencyContactPhone = 'Emergency contact phone is required.';
    } else if (!phoneRegex.test(form.emergencyContactPhone.trim())) {
      errs.emergencyContactPhone = 'Phone must contain exactly 10 digits.';
    }

    if (!form.bedNumber) {
      errs.bedNumber = 'A vacant bed assignment is required.';
    }

    if (!form.nurseId) {
      errs.nurseId = 'An active assigned nurse is required.';
    }

    if (!form.doctorId) {
      errs.doctorId = 'An active assigned physician is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function checkDuplicate(): boolean {
    return state.patients.some(
      (p) =>
        p.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        p.dateOfBirth === form.dateOfBirth &&
        p.phone === form.phone
    );
  }

  function handleFormSubmit(confirmed = false) {
    if (!validate()) return;

    if (!confirmed && checkDuplicate()) {
      setShowDuplicateWarning(true);
      return;
    }

    setSubmitting(true);
    try {
      const assignedNurse = state.staff.find((s) => s.id === form.nurseId)!;
      const assignedDoctor = state.staff.find((s) => s.id === form.doctorId)!;

      const registered = registerPatient({
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        phone: form.phone.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        bedNumber: parseInt(form.bedNumber, 10),
        nurseId: assignedNurse.id,
        nurseName: assignedNurse.name,
        doctorId: assignedDoctor.id,
        doctorName: assignedDoctor.name,
        criticalFeverAlertSeen: false,
      });

      addNotification({
        type: 'success',
        title: 'Patient Admission Registered',
        message: `${registered.name} admitted and allocated to Bed ${registered.bedNumber}.`,
        patientId: registered.id,
      });

      onSuccess();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Registration Error',
        message: String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const calculatedAge = form.dateOfBirth ? calcAge(form.dateOfBirth) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">New Patient Admission</h3>
            <p className="text-xs text-slate-500">
              Quarantine Facility Admission · Requires Bed, Doctor, and Nurse Assignment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Warning Dialog Overlay */}
        {showDuplicateWarning && (
          <div className="p-4 mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              Possible Duplicate Patient Record Detected
            </div>
            <p className="text-amber-800 leading-relaxed">
              An active record with the identical name ({form.name}), date of birth ({form.dateOfBirth}), and phone number already exists in the registry.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleFormSubmit(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
              >
                Confirm & Register Duplicate
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateWarning(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs"
              >
                Cancel & Review
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Patient Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ananya Krishnan"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (errors.name) setErrors((e) => ({ ...e, name: '' }));
              }}
              className={cn(
                'w-full text-xs rounded-lg px-3 py-2 border',
                errors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
              )}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1 font-medium">{errors.name}</p>}
          </div>

          {/* DOB & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date of Birth *
                </label>
                {calculatedAge !== null && !isNaN(calculatedAge) && calculatedAge >= 0 && (
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Age: {calculatedAge} yrs
                  </span>
                )}
              </div>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={form.dateOfBirth}
                onChange={(e) => {
                  setForm((f) => ({ ...f, dateOfBirth: e.target.value }));
                  if (errors.dateOfBirth) setErrors((e) => ({ ...e, dateOfBirth: '' }));
                }}
                className={cn(
                  'w-full text-xs rounded-lg px-3 py-2 border',
                  errors.dateOfBirth ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                )}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.dateOfBirth}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Patient Phone (10 digits) *
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setForm((f) => ({ ...f, phone: cleaned }));
                  if (errors.phone) setErrors((e) => ({ ...e, phone: '' }));
                }}
                className={cn(
                  'w-full text-xs rounded-lg px-3 py-2 border font-mono',
                  errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                )}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1 font-medium">{errors.phone}</p>}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Contact Name *
              </label>
              <input
                type="text"
                placeholder="Contact relative / guardian"
                value={form.emergencyContactName}
                onChange={(e) => {
                  setForm((f) => ({ ...f, emergencyContactName: e.target.value }));
                  if (errors.emergencyContactName) setErrors((e) => ({ ...e, emergencyContactName: '' }));
                }}
                className={cn(
                  'w-full text-xs rounded-lg px-3 py-2 border',
                  errors.emergencyContactName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                )}
              />
              {errors.emergencyContactName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.emergencyContactName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Contact Phone *
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={form.emergencyContactPhone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setForm((f) => ({ ...f, emergencyContactPhone: cleaned }));
                  if (errors.emergencyContactPhone) setErrors((e) => ({ ...e, emergencyContactPhone: '' }));
                }}
                className={cn(
                  'w-full text-xs rounded-lg px-3 py-2 border font-mono',
                  errors.emergencyContactPhone ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                )}
              />
              {errors.emergencyContactPhone && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.emergencyContactPhone}</p>
              )}
            </div>
          </div>

          {/* Bed Allocation Selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Bed Allocation (Vacant Beds Only) *
              </label>
              <span className="text-[11px] text-slate-500">
                {vacantBeds.length} vacant bed{vacantBeds.length === 1 ? '' : 's'} available
              </span>
            </div>
            <select
              value={form.bedNumber}
              onChange={(e) => {
                setForm((f) => ({ ...f, bedNumber: e.target.value }));
                if (errors.bedNumber) setErrors((e) => ({ ...e, bedNumber: '' }));
              }}
              className={cn(
                'w-full text-xs rounded-lg px-3 py-2 border bg-white cursor-pointer font-mono',
                errors.bedNumber ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
              )}
            >
              <option value="">-- Choose a vacant bed (1–74) --</option>
              {vacantBeds.map((b) => (
                <option key={b.number} value={b.number}>
                  Bed {b.number} (Vacant)
                </option>
              ))}
            </select>
            {errors.bedNumber && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.bedNumber}</p>
            )}
            {vacantBeds.length === 0 && (
              <p className="text-xs text-red-600 mt-1 font-bold">
                No beds available (0/74)
              </p>
            )}
          </div>

          {/* Staff Assignments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assign Attending Physician *
              </label>
              <select
                value={form.doctorId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, doctorId: e.target.value }));
                  if (errors.doctorId) setErrors((e) => ({ ...e, doctorId: '' }));
                }}
                className={cn(
                  'w-full text-xs rounded-lg px-3 py-2 border bg-white cursor-pointer',
                  errors.doctorId ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                )}
              >
                <option value="">-- Select active physician --</option>
                {activeDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
              {errors.doctorId && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.doctorId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assign Staff Nurse *
              </label>
              <select
                value={form.nurseId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, nurseId: e.target.value }));
                  if (errors.nurseId) setErrors((e) => ({ ...e, nurseId: '' }));
                }}
                className={cn(
                  'w-full text-xs rounded-lg px-3 py-2 border bg-white cursor-pointer',
                  errors.nurseId ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                )}
              >
                <option value="">-- Select active nurse --</option>
                {activeNurses.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.phone})
                  </option>
                ))}
              </select>
              {errors.nurseId && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.nurseId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            * All fields are required for clinical validation
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || vacantBeds.length === 0}
              onClick={() => handleFormSubmit(false)}
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMINISTRATIVE DETAIL MODAL (No clinical details exposed to Admin)
// ============================================================

function AdminPatientDetailModal({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const badge = getStatusBadge(patient.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">{patient.name}</h3>
              <span className="font-mono text-xs text-slate-300">({patient.id})</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Administrative Record · Bed {patient.bedNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block mt-1', badge.bg)}>
                {badge.label}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Bed Assignment</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                Bed {patient.bedNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Age & DOB</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {calcAge(patient.dateOfBirth)} years ({patient.dateOfBirth})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Phone</span>
              <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                {patient.phone}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Assigned Physician:</span>
              <span className="font-semibold text-slate-800">{patient.doctorName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Assigned Nurse:</span>
              <span className="font-semibold text-slate-800">{patient.nurseName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Emergency Contact:</span>
              <span className="font-semibold text-slate-800">
                {patient.emergencyContactName} ({patient.emergencyContactPhone})
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Admission Timestamp:</span>
              <span className="font-semibold text-slate-800">{formatDateTime(patient.admittedAt)}</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
            <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              Administrative confidentiality active. Detailed clinical temperature charts and prescriptions are strictly restricted to medical staff.
            </p>
          </div>
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
