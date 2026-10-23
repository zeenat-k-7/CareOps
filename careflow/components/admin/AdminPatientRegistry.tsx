'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient } from '@/types';
import {
  Search, UserPlus, AlertTriangle, CheckCircle, Clock,
  Thermometer, Stethoscope, ChevronUp, ChevronDown, X, Check, Info
} from 'lucide-react';
import { cn, calcAge, formatDateTime, today, generateId } from '@/lib/utils';
import { freeBeds, buildBeds, hasTempToday, hasVisitToday } from '@/lib/business';

type SortKey = 'name' | 'admittedAt' | 'bed' | 'status';
type SortDir = 'asc' | 'desc';

function statusLabel(p: Patient): { label: string; color: string } {
  switch (p.status) {
    case 'active': return { label: 'Active', color: 'bg-blue-100 text-blue-700' };
    case 'eligible': return { label: 'Eligible', color: 'bg-green-100 text-green-700' };
    case 'discharge_approved': return { label: 'Discharge Approved', color: 'bg-emerald-100 text-emerald-700' };
    case 'discharged': return { label: 'Discharged', color: 'bg-slate-100 text-slate-600' };
    case 'death_declared': return { label: 'Death Declared', color: 'bg-orange-100 text-orange-700' };
    case 'death_confirmed': return { label: 'Confirmed Death', color: 'bg-red-100 text-red-700' };
    default: return { label: p.status, color: 'bg-slate-100 text-slate-600' };
  }
}

export default function AdminPatientRegistry() {
  const { state, currentUser, registerPatient, state: appState } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('admittedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showRegister, setShowRegister] = useState(false);

  const todayStr = today();

  // Filtered + sorted list
  const patients = useMemo(() => {
    let list = [...state.patients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.nurseName.toLowerCase().includes(q) ||
          p.doctorName.toLowerCase().includes(q) ||
          String(p.bedNumber).includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break;
        case 'admittedAt': av = a.admittedAt; bv = b.admittedAt; break;
        case 'bed': av = a.bedNumber; bv = b.bedNumber; break;
        case 'status': av = a.status; bv = b.status; break;
        default: av = ''; bv = '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [state.patients, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-teal-600" />
      : <ChevronDown className="w-3 h-3 text-teal-600" />;
  }

  const free = freeBeds(appState);

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">{patients.length}</span> patients
          </div>
          <div className={cn(
            'text-xs px-2.5 py-1 rounded-full font-medium',
            free === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
          )}>
            {74 - free}/{74} beds occupied
          </div>
        </div>
        <button
          onClick={() => free === 0 ? null : setShowRegister(true)}
          disabled={free === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            free === 0
              ? 'bg-red-50 text-red-500 border border-red-200 cursor-not-allowed'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          )}
          title={free === 0 ? 'No beds available (0/74)' : 'Register new patient'}
        >
          <UserPlus className="w-4 h-4" />
          {free === 0 ? 'No beds available (0/74)' : 'Register Patient'}
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, ID, bed, nurse, doctor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="eligible">Eligible</option>
          <option value="discharge_approved">Discharge Approved</option>
          <option value="discharged">Discharged</option>
          <option value="death_declared">Death Declared</option>
          <option value="death_confirmed">Confirmed Death</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-900">
                    Patient <SortIcon k="name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort('admittedAt')} className="flex items-center gap-1 hover:text-slate-900">
                    Admitted <SortIcon k="admittedAt" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort('bed')} className="flex items-center gap-1 hover:text-slate-900">
                    Bed <SortIcon k="bed" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nurse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Doctor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-slate-900">
                    Status <SortIcon k="status" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Temp</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const { label, color } = statusLabel(p);
                  const isActive = ['active', 'eligible', 'discharge_approved', 'death_declared'].includes(p.status);
                  const hasTemp = hasTempToday(state.temperatureReadings, p.id);
                  const hasVisit = hasVisitToday(state.doctorVisits, p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{calcAge(p.dateOfBirth)}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{formatDateTime(p.admittedAt)}</td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="font-mono font-semibold text-slate-900">B{p.bedNumber}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{p.nurseName}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{p.doctorName}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', color)}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isActive ? (
                          <span className="text-slate-300">—</span>
                        ) : hasTemp ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isActive ? (
                          <span className="text-slate-300">—</span>
                        ) : hasVisit ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegister && (
        <RegisterPatientModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => setShowRegister(false)}
        />
      )}
    </div>
  );
}

// ---- Registration Modal ----

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
  const [showDupWarning, setShowDupWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeNurses = state.staff.filter((s) => s.role === 'nurse' && s.active);
  const activeDoctors = state.staff.filter((s) => s.role === 'doctor' && s.active);
  const beds = buildBeds(state);
  const vacantBeds = beds.filter((b) => !b.patientId);

  const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ\s''.-]{2,60}$/;
  const phoneRe = /^\d{10}$/;

  function validate(): boolean {
    const e: Record<string, string> = {};
    const f = form;

    if (!f.name.trim()) e.name = 'Name is required';
    else if (!nameRe.test(f.name.trim())) e.name = 'Name must be 2–60 characters, letters only';

    if (!f.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    else {
      const dob = new Date(f.dateOfBirth);
      if (dob > new Date()) e.dateOfBirth = 'Date of birth cannot be in the future';
      else {
        const age = calcAge(f.dateOfBirth);
        if (age < 0 || age > 120) e.dateOfBirth = 'Age must be between 0 and 120';
      }
    }

    if (!f.phone) e.phone = 'Phone is required';
    else if (!phoneRe.test(f.phone)) e.phone = 'Phone must be exactly 10 digits';

    if (!f.emergencyContactName.trim()) e.emergencyContactName = 'Emergency contact name is required';
    else if (!nameRe.test(f.emergencyContactName.trim())) e.emergencyContactName = 'Name must be 2–60 characters, letters only';

    if (!f.emergencyContactPhone) e.emergencyContactPhone = 'Emergency contact phone is required';
    else if (!phoneRe.test(f.emergencyContactPhone)) e.emergencyContactPhone = 'Phone must be exactly 10 digits';

    if (!f.bedNumber) e.bedNumber = 'Bed selection is required';

    if (!f.nurseId) e.nurseId = 'Nurse assignment is required';
    if (!f.doctorId) e.doctorId = 'Doctor assignment is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function checkDuplicate(): boolean {
    return state.patients.some(
      (p) =>
        p.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        p.dateOfBirth === form.dateOfBirth &&
        p.phone === form.phone
    );
  }

  function handleSubmit(confirmed = false) {
    if (!validate()) return;
    if (!confirmed && checkDuplicate()) {
      setShowDupWarning(true);
      return;
    }
    setShowDupWarning(false);
    setSaving(true);

    try {
      const nurse = state.staff.find((s) => s.id === form.nurseId)!;
      const doctor = state.staff.find((s) => s.id === form.doctorId)!;
      const patient = registerPatient({
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        phone: form.phone,
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone,
        bedNumber: parseInt(form.bedNumber),
        nurseId: nurse.id,
        nurseName: nurse.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        criticalFeverAlertSeen: false,
      });
      addNotification({
        type: 'success',
        title: 'Patient registered',
        message: `${patient.name} (${patient.id}) assigned to Bed ${patient.bedNumber}.`,
        patientId: patient.id,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      addNotification({ type: 'error', title: 'Registration failed', message: String(err) });
    } finally {
      setSaving(false);
    }
  }

  function Field({
    label, name, children, error, required
  }: {
    label: string; name: string; children: React.ReactNode; error?: string; required?: boolean;
  }) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  const inputCls = (err?: string) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400',
      err ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
    );

  const age = form.dateOfBirth ? calcAge(form.dateOfBirth) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Register Patient</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duplicate warning */}
        {showDupWarning && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800">Possible duplicate patient</p>
              <p className="text-xs text-amber-700 mt-1">
                A patient with the same name, date of birth, and phone number already exists.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSubmit(true)}
                  className="text-xs bg-amber-600 text-white px-3 py-1 rounded"
                >
                  Register anyway
                </button>
                <button
                  onClick={() => setShowDupWarning(false)}
                  className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <Field label="Full Name" name="name" error={errors.name} required>
            <input
              type="text"
              className={inputCls(errors.name)}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ananya Krishnan"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" name="dateOfBirth" error={errors.dateOfBirth} required>
              <input
                type="date"
                className={inputCls(errors.dateOfBirth)}
                value={form.dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
              {age !== null && (
                <p className="text-xs text-teal-600 mt-1">Age: {age} years</p>
              )}
            </Field>
            <Field label="Patient Phone" name="phone" error={errors.phone} required>
              <input
                type="tel"
                maxLength={10}
                className={inputCls(errors.phone)}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                placeholder="10-digit number"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Emergency Contact Name" name="emergencyContactName" error={errors.emergencyContactName} required>
              <input
                type="text"
                className={inputCls(errors.emergencyContactName)}
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                placeholder="Contact name"
              />
            </Field>
            <Field label="Emergency Contact Phone" name="emergencyContactPhone" error={errors.emergencyContactPhone} required>
              <input
                type="tel"
                maxLength={10}
                className={inputCls(errors.emergencyContactPhone)}
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value.replace(/\D/g, '') }))}
                placeholder="10-digit number"
              />
            </Field>
          </div>

          <Field label="Bed Number" name="bedNumber" error={errors.bedNumber} required>
            <select
              className={inputCls(errors.bedNumber)}
              value={form.bedNumber}
              onChange={(e) => setForm((f) => ({ ...f, bedNumber: e.target.value }))}
            >
              <option value="">Select vacant bed…</option>
              {vacantBeds.map((b) => (
                <option key={b.number} value={b.number}>Bed {b.number}</option>
              ))}
            </select>
            {vacantBeds.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No beds available (0/74)</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Assign Nurse" name="nurseId" error={errors.nurseId} required>
              <select
                className={inputCls(errors.nurseId)}
                value={form.nurseId}
                onChange={(e) => setForm((f) => ({ ...f, nurseId: e.target.value }))}
              >
                <option value="">Select nurse…</option>
                {activeNurses.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Assign Doctor" name="doctorId" error={errors.doctorId} required>
              <select
                className={inputCls(errors.doctorId)}
                value={form.doctorId}
                onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
              >
                <option value="">Select doctor…</option>
                {activeDoctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={saving}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Registering…' : 'Register Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}
