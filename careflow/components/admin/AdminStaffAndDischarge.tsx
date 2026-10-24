'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, StaffMember } from '@/types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserPlus,
  Power,
  PowerOff,
  UserCheck,
  Award,
  Users,
  HeartCrack,
  X,
  Phone,
  Shield,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

type TabType = 'staff' | 'discharge' | 'death';

export default function AdminStaffAndDischarge() {
  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const { state } = useApp();

  const approvedDischarges = state.patients.filter((p) => p.status === 'discharge_approved');
  const declaredDeaths = state.patients.filter((p) => p.status === 'death_declared');

  const tabs: { id: TabType; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'staff', label: 'Medical Staff Management', icon: Users },
    { id: 'discharge', label: 'Discharge Execution Queue', count: approvedDischarges.length, icon: Award },
    { id: 'death', label: 'Death Confirmations', count: declaredDeaths.length, icon: HeartCrack },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Modern Tabs Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-2xs flex flex-wrap gap-1.5 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                    isActive ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-800'
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'staff' && <StaffManagementPanel />}
      {activeTab === 'discharge' && <DischargeQueuePanel patients={approvedDischarges} />}
      {activeTab === 'death' && <DeathConfirmationsPanel patients={declaredDeaths} />}
    </div>
  );
}

// ============================================================
// 1. STAFF MANAGEMENT PANEL
// ============================================================

function StaffManagementPanel() {
  const { state, addStaff, deactivateStaff, activateStaff, addNotification } = useApp();
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'nurse' | 'doctor'>('all');
  const [blockedDeactivation, setBlockedDeactivation] = useState<{
    staffMember: StaffMember;
    patients: Patient[];
  } | null>(null);

  const filteredStaff = state.staff.filter(
    (s) => roleFilter === 'all' || s.role === roleFilter
  );

  function handleToggleStatus(s: StaffMember) {
    if (s.active) {
      const result = deactivateStaff(s.id);
      if (!result.success) {
        setBlockedDeactivation({
          staffMember: s,
          patients: result.blockedBy,
        });
      } else {
        addNotification({
          type: 'success',
          title: 'Staff Member Deactivated',
          message: `${s.name} (${s.role}) has been marked inactive.`,
        });
      }
    } else {
      activateStaff(s.id);
      addNotification({
        type: 'success',
        title: 'Staff Member Activated',
        message: `${s.name} is now active and eligible for patient assignment.`,
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Filter and Add Staff Button */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
          {(
            [
              { id: 'all', label: `All Staff (${state.staff.length})` },
              { id: 'doctor', label: `Physicians (${state.staff.filter((s) => s.role === 'doctor').length})` },
              { id: 'nurse', label: `Nurses (${state.staff.filter((s) => s.role === 'nurse').length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setRoleFilter(t.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                roleFilter === t.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddStaffModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Medical Staff</span>
        </button>
      </div>

      {/* Deactivation Blocked Alert Banner */}
      {blockedDeactivation && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-amber-900">
                  Deactivation Blocked — Active Patient Assignments Exist
                </p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  <strong>{blockedDeactivation.staffMember.name}</strong> cannot be deactivated while actively assigned to patients. Reassign the following {blockedDeactivation.patients.length} patient(s) first:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {blockedDeactivation.patients.map((p) => (
                    <span
                      key={p.id}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-[11px] font-semibold text-amber-900 shadow-2xs"
                    >
                      {p.name} (Bed {p.bedNumber} · {p.id})
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setBlockedDeactivation(null)}
              className="text-amber-500 hover:text-amber-800 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">ID Code</th>
              <th className="py-3 px-3">Phone</th>
              <th className="py-3 px-3">Active Patients</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map((staff) => {
              const activeAssignments = state.patients.filter(
                (p) =>
                  (p.doctorId === staff.id || p.nurseId === staff.id) &&
                  p.status !== 'discharged' &&
                  p.status !== 'death_confirmed'
              );

              return (
                <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{staff.name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{staff.role}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize inline-flex items-center gap-1',
                        staff.role === 'doctor'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      )}
                    >
                      {staff.role === 'doctor' ? (
                        <Stethoscope className="w-3 h-3 text-teal-600" />
                      ) : (
                        <HeartPulse className="w-3 h-3 text-rose-600" />
                      )}
                      {staff.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{staff.id}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{staff.phone}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800">{activeAssignments.length}</span>
                    <span className="text-slate-400 text-[11px]"> patient(s)</span>
                  </td>
                  <td className="py-3 px-3">
                    {staff.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {staff.active ? (
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 inline-flex items-center gap-1"
                      >
                        <PowerOff className="w-3 h-3" /> Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200 inline-flex items-center gap-1"
                      >
                        <Power className="w-3 h-3" /> Activate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddStaffModal && (
        <AddStaffModal
          onClose={() => setShowAddStaffModal(false)}
          onSuccess={() => setShowAddStaffModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// 2. DISCHARGE EXECUTION QUEUE PANEL
// ============================================================

function DischargeQueuePanel({ patients }: { patients: Patient[] }) {
  const { executeDischarge, addNotification } = useApp();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleConfirmExecution(p: Patient) {
    executeDischarge(p.id);
    addNotification({
      type: 'success',
      title: 'Discharge Executed',
      message: `${p.name} discharged. Bed ${p.bedNumber} has been freed and record locked.`,
      patientId: p.id,
    });
    setConfirmingId(null);
  }

  if (patients.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
        <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-slate-600 text-sm">Discharge Queue Empty</p>
        <p className="text-xs text-slate-400 mt-1">
          No patients are currently awaiting administrative discharge execution.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((patient) => {
        const approvedAt = patient.dischargeApprovedAt ? new Date(patient.dischargeApprovedAt) : null;
        const elapsedHours = approvedAt
          ? Math.max(0, ((Date.now() - approvedAt.getTime()) / 3_600_000)).toFixed(1)
          : null;

        const isConfirming = confirmingId === patient.id;

        return (
          <div
            key={patient.id}
            className="bg-white border border-teal-200/90 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-900 text-white">
                  Bed {patient.bedNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">{patient.name}</h3>
                <span className="font-mono text-xs text-slate-400">({patient.id})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Doctor Approved
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span>
                  Approving Physician: <strong>{patient.dischargeApprovedByName || patient.doctorName}</strong>
                </span>
                {patient.dischargeApprovedAt && (
                  <span>
                    Approved At: <strong>{formatDateTime(patient.dischargeApprovedAt)}</strong>
                  </span>
                )}
                {elapsedHours && (
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {elapsedHours} hours elapsed
                  </span>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              {isConfirming ? (
                <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 p-2 rounded-xl">
                  <span className="text-xs font-semibold text-teal-900">
                    Confirm Bed {patient.bedNumber} Release?
                  </span>
                  <button
                    onClick={() => handleConfirmExecution(patient)}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(patient.id)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Execute Discharge</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 3. DEATH CONFIRMATIONS PANEL
// ============================================================

function DeathConfirmationsPanel({ patients }: { patients: Patient[] }) {
  const { confirmDeath, addNotification } = useApp();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleConfirmDeath(p: Patient) {
    confirmDeath(p.id);
    addNotification({
      type: 'info',
      title: 'Death Confirmed by Admin',
      message: `${p.name}'s death confirmed. Bed ${p.bedNumber} freed and record permanently locked.`,
      patientId: p.id,
    });
    setConfirmingId(null);
  }

  if (patients.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
        <HeartCrack className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-slate-600 text-sm">No Pending Death Declarations</p>
        <p className="text-xs text-slate-400 mt-1">
          All deceased declarations have been processed and confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((patient) => {
        const isConfirming = confirmingId === patient.id;

        return (
          <div
            key={patient.id}
            className="bg-white border-2 border-red-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-red-600 text-white">
                  Bed {patient.bedNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">{patient.name}</h3>
                <span className="font-mono text-xs text-slate-400">({patient.id})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                  Doctor Declared Death
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span>
                  Declaring Physician: <strong>{patient.deathDeclaredByName || patient.doctorName}</strong>
                </span>
                {patient.deathDeclaredAt && (
                  <span>
                    Declaration Time: <strong>{formatDateTime(patient.deathDeclaredAt)}</strong>
                  </span>
                )}
              </div>

              {patient.deathNote && (
                <div className="mt-2.5 p-2.5 bg-red-50/50 border border-red-100 rounded-xl text-xs text-red-900 italic">
                  "{patient.deathNote}"
                </div>
              )}
            </div>

            <div className="flex-shrink-0">
              {isConfirming ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-2 rounded-xl">
                  <span className="text-xs font-semibold text-red-900">
                    Confirm death and free Bed {patient.bedNumber}?
                  </span>
                  <button
                    onClick={() => handleConfirmDeath(patient)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Confirm Death
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(patient.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <HeartCrack className="w-3.5 h-3.5" />
                  <span>Confirm Death & Free Bed</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// ADD MEDICAL STAFF MODAL
// ============================================================

function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { state, addStaff, addNotification } = useApp();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'nurse' as 'nurse' | 'doctor',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s''.-]{2,60}$/;
  const phoneRegex = /^\d{10}$/;

  function validate() {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) {
      errs.name = 'Staff name is required.';
    } else if (!nameRegex.test(form.name.trim())) {
      errs.name = 'Name must be 2–60 characters (letters only).';
    }

    if (!form.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(form.phone.trim())) {
      errs.phone = 'Phone must contain exactly 10 digits.';
    } else if (state.staff.some((s) => s.phone === form.phone.trim())) {
      errs.phone = 'This phone number is already registered to another staff member.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const newStaff = addStaff({
      name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      active: true,
    });

    addNotification({
      type: 'success',
      title: 'Medical Staff Added',
      message: `${newStaff.name} registered as active ${newStaff.role} (${newStaff.id}).`,
    });

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-base">Add Medical Staff Member</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Kavitha Reddy"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (errors.name) setErrors((e) => ({ ...e, name: '' }));
              }}
              className="w-full text-xs rounded-xl px-3 py-2 border border-slate-300"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1 font-medium">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number (10 digits) *
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
              className="w-full text-xs rounded-xl px-3 py-2 border border-slate-300 font-mono"
            />
            {errors.phone && <p className="text-xs text-red-600 mt-1 font-medium">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Clinical Role *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'nurse' | 'doctor' }))}
              className="w-full text-xs rounded-xl px-3 py-2.5 border border-slate-300 bg-white cursor-pointer"
            >
              <option value="nurse">Staff Nurse</option>
              <option value="doctor">Attending Physician</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
          >
            Add Staff Member
          </button>
        </div>
      </div>
    </div>
  );
}
