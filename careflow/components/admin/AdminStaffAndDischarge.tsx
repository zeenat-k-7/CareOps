'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { Patient, StaffMember } from '@/types';
import {
  CheckCircle2, Clock, AlertTriangle, UserPlus, Power, PowerOff,
  ChevronDown, ChevronUp, X, Users, ClipboardCheck
} from 'lucide-react';
import { cn, formatDateTime, generateId } from '@/lib/utils';

type TabId = 'staff' | 'discharge' | 'death';

export default function AdminStaffAndDischarge() {
  const [activeTab, setActiveTab] = useState<TabId>('staff');
  const { state, executeDischarge, confirmDeath, addNotification } = useApp();

  const approvedDischarges = state.patients.filter((p) => p.status === 'discharge_approved');
  const declaredDeaths = state.patients.filter((p) => p.status === 'death_declared');

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'staff', label: 'Staff Management' },
    { id: 'discharge', label: 'Discharge Queue', count: approvedDischarges.length },
    { id: 'death', label: 'Death Confirmations', count: declaredDeaths.length },
  ];

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
              activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="bg-teal-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && <StaffManagement />}
      {activeTab === 'discharge' && <DischargeQueue patients={approvedDischarges} />}
      {activeTab === 'death' && <DeathConfirmations patients={declaredDeaths} />}
    </div>
  );
}

// ---- Staff Management ----

function StaffManagement() {
  const { state, addStaff, deactivateStaff, activateStaff, addNotification } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'nurse' | 'doctor'>('all');
  const [blockInfo, setBlockInfo] = useState<{ staffId: string; patients: Patient[] } | null>(null);

  const staff = state.staff.filter(
    (s) => roleFilter === 'all' || s.role === roleFilter
  );

  function handleDeactivate(s: StaffMember) {
    const result = deactivateStaff(s.id);
    if (!result.success) {
      setBlockInfo({ staffId: s.id, patients: result.blockedBy });
    } else {
      addNotification({ type: 'success', title: 'Staff deactivated', message: `${s.name} has been deactivated.` });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['all', 'nurse', 'doctor'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg capitalize',
                roleFilter === r ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {r === 'all' ? 'All Staff' : r === 'nurse' ? 'Nurses' : 'Doctors'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {blockInfo && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Deactivation blocked
              </p>
              <p className="text-xs text-amber-700 mt-1">
                This staff member is assigned to active patients:
              </p>
              <ul className="mt-2 space-y-1">
                {blockInfo.patients.map((p) => (
                  <li key={p.id} className="text-xs text-amber-700">
                    • {p.name} (Bed {p.bedNumber}, {p.id})
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setBlockInfo(null)} className="text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{s.id}</td>
                <td className="px-4 py-3 text-slate-600">{s.phone}</td>
                <td className="px-4 py-3 capitalize">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    s.role === 'nurse' ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                  )}>
                    {s.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {s.active ? (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.active ? (
                    <button
                      onClick={() => handleDeactivate(s)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                    >
                      <PowerOff className="w-3 h-3" /> Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => activateStaff(s.id)}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
                    >
                      <Power className="w-3 h-3" /> Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ---- Discharge Queue ----

function DischargeQueue({ patients }: { patients: Patient[] }) {
  const { executeDischarge, addNotification } = useApp();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function handleExecute(p: Patient) {
    if (confirmId !== p.id) {
      setConfirmId(p.id);
      return;
    }
    executeDischarge(p.id);
    addNotification({
      type: 'success',
      title: 'Discharge executed',
      message: `${p.name} has been discharged. Bed ${p.bedNumber} is now free.`,
      patientId: p.id,
    });
    setConfirmId(null);
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No discharges awaiting execution</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((p) => {
        const elapsed = p.dischargeApprovedAt
          ? ((Date.now() - new Date(p.dischargeApprovedAt).getTime()) / 3_600_000).toFixed(1)
          : null;
        const isConfirming = confirmId === p.id;
        return (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.id} · Bed {p.bedNumber}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  <span>Doctor: {p.doctorName}</span>
                  {p.dischargeApprovedAt && (
                    <span>Approved: {formatDateTime(p.dischargeApprovedAt)}</span>
                  )}
                  {elapsed && <span className="text-amber-600">{elapsed}h elapsed</span>}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-700">Confirm discharge?</span>
                    <button
                      onClick={() => handleExecute(p)}
                      className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleExecute(p)}
                    className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
                  >
                    Execute Discharge
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Death Confirmations ----

function DeathConfirmations({ patients }: { patients: Patient[] }) {
  const { confirmDeath, addNotification } = useApp();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function handleConfirm(p: Patient) {
    if (confirmId !== p.id) {
      setConfirmId(p.id);
      return;
    }
    confirmDeath(p.id);
    addNotification({
      type: 'info',
      title: 'Death confirmed',
      message: `${p.name}'s death has been confirmed. Bed ${p.bedNumber} is now free.`,
      patientId: p.id,
    });
    setConfirmId(null);
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No pending death confirmations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((p) => {
        const isConfirming = confirmId === p.id;
        return (
          <div key={p.id} className="bg-white border border-orange-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.id} · Bed {p.bedNumber}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  <span>Declared by: {p.deathDeclaredByName}</span>
                  {p.deathDeclaredAt && <span>{formatDateTime(p.deathDeclaredAt)}</span>}
                </div>
                {p.deathNote && (
                  <p className="mt-2 text-xs text-slate-600 italic border-l-2 border-orange-300 pl-2">
                    "{p.deathNote}"
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-700">Confirm death? Bed will be freed.</span>
                    <button
                      onClick={() => handleConfirm(p)}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirm(p)}
                    className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Confirm Death
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Add Staff Modal ----

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const { state, addStaff, addNotification } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', role: 'nurse' as 'nurse' | 'doctor' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ\s''.-]{2,60}$/;
  const phoneRe = /^\d{10}$/;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (!nameRe.test(form.name.trim())) e.name = 'Name: 2–60 characters, letters only';

    if (!form.phone) e.phone = 'Phone is required';
    else if (!phoneRe.test(form.phone)) e.phone = 'Phone must be exactly 10 digits';
    else if (state.staff.some((s) => s.phone === form.phone))
      e.phone = 'This phone number is already registered to another staff member';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const staff = addStaff({ name: form.name.trim(), phone: form.phone, role: form.role, active: true });
    addNotification({ type: 'success', title: 'Staff added', message: `${staff.name} (${staff.id}) added as ${staff.role}.` });
    onClose();
  }

  const inputCls = (err?: string) =>
    cn('w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400',
      err ? 'border-red-400 bg-red-50' : 'border-slate-200');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Add Staff Member</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              className={inputCls(errors.name)}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone (10 digits) *</label>
            <input
              type="tel"
              maxLength={10}
              className={inputCls(errors.phone)}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
            <select
              className={inputCls()}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'nurse' | 'doctor' }))}
            >
              <option value="nurse">Nurse</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">Add Staff</button>
        </div>
      </div>
    </div>
  );
}
