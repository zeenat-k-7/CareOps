'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { Bed as BedType, Patient } from '@/types';
import { buildBeds, occupiedBeds, freeBeds } from '@/lib/business';
import { cn } from '@/lib/utils';
import {
  Search,
  Grid3X3,
  List,
  Building2,
  Bed,
  CheckCircle2,
  User,
  ArrowRightLeft,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';

type FilterType = 'all' | 'occupied' | 'vacant';

export default function AdminBedBoard() {
  const { state, updatePatientAssignments, addNotification } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [reassignBed, setReassignBed] = useState<{ bedNumber: number; patient: Patient } | null>(null);

  const beds = useMemo(() => buildBeds(state), [state]);
  const occupied = occupiedBeds(state);
  const free = freeBeds(state);
  const totalBeds = 74;
  const occupancyPct = Math.round((occupied / totalBeds) * 100);

  const vacantBeds = useMemo(() => beds.filter((b) => !b.patientId), [beds]);

  const displayBeds = useMemo(() => {
    let list = beds;

    if (filter === 'occupied') {
      list = list.filter((b) => b.patientId);
    } else if (filter === 'vacant') {
      list = list.filter((b) => !b.patientId);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          String(b.number).includes(q) ||
          (b.patientName && b.patientName.toLowerCase().includes(q)) ||
          (b.patientId && b.patientId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [beds, filter, search]);

  function handleReassignClick(bed: BedType) {
    if (!bed.patientId) return;
    const patient = state.patients.find((p) => p.id === bed.patientId);
    if (patient) {
      setReassignBed({ bedNumber: bed.number, patient });
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Occupancy KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Facility Bed Capacity</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalBeds}</span>
            <span className="text-xs text-slate-500">Fixed Capacity</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Occupied Beds</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{occupied}</span>
            <span className="text-xs text-slate-500">Beds Occupied</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Available Reserves</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded', free === 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
              {free === 0 ? 'Full' : 'Ready'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', free === 0 ? 'text-red-600' : 'text-emerald-700')}>
              {free}
            </span>
            <span className="text-xs text-slate-500">Vacant Beds</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Occupancy Rate</span>
            <span className="text-xs font-bold text-teal-700">{occupancyPct}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-1">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                occupancyPct >= 90 ? 'bg-red-500' : occupancyPct >= 75 ? 'bg-amber-500' : 'bg-teal-600'
              )}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {occupied} of {totalBeds} beds currently allocated
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, View Modes */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bed number (e.g. 14) or patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            {(
              [
                { id: 'all', label: `All (${totalBeds})` },
                { id: 'occupied', label: `Occupied (${occupied})` },
                { id: 'vacant', label: `Vacant (${free})` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  filter === t.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Grid vs Table View Switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid layout"
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              aria-label="List layout"
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'table' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout View (All 74 Beds) */}
      {viewMode === 'grid' ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Occupied
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Vacant
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Click any occupied bed to reassign patient
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
            {displayBeds.map((bed) => {
              const isOccupied = !!bed.patientId;
              return (
                <div
                  key={bed.number}
                  onClick={() => isOccupied && handleReassignClick(bed)}
                  role={isOccupied ? 'button' : undefined}
                  tabIndex={isOccupied ? 0 : undefined}
                  className={cn(
                    'relative rounded-xl border p-2.5 flex flex-col justify-between transition-all select-none',
                    isOccupied
                      ? 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:shadow-2xs cursor-pointer'
                      : 'border-slate-200/80 bg-slate-50/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-mono font-bold',
                        isOccupied ? 'text-blue-900' : 'text-slate-400'
                      )}
                    >
                      B{bed.number}
                    </span>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isOccupied ? 'bg-blue-600' : 'bg-emerald-500'
                      )}
                    />
                  </div>

                  <div className="mt-2 min-h-[32px] flex flex-col justify-end">
                    {isOccupied ? (
                      <div>
                        <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                          {bed.patientName}
                        </p>
                        <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                          {bed.patientId}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-medium text-emerald-700">Vacant</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Table Layout View */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Bed Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Patient</th>
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayBeds.map((bed) => {
                const isOccupied = !!bed.patientId;
                return (
                  <tr key={bed.number} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">Bed {bed.number}</td>
                    <td className="py-3 px-4">
                      {isOccupied ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Occupied
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Vacant
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {bed.patientName || <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {bed.patientId || <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isOccupied && (
                        <button
                          onClick={() => handleReassignClick(bed)}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200 inline-flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Reassign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* REASSIGN BED MODAL */}
      {reassignBed && (
        <ReassignBedModal
          currentBed={reassignBed.bedNumber}
          patient={reassignBed.patient}
          vacantBeds={vacantBeds}
          onClose={() => setReassignBed(null)}
          onSuccess={() => {
            setReassignBed(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// BED REASSIGNMENT MODAL
// ============================================================

interface ReassignBedModalProps {
  currentBed: number;
  patient: Patient;
  vacantBeds: BedType[];
  onClose: () => void;
  onSuccess: () => void;
}

function ReassignBedModal({
  currentBed,
  patient,
  vacantBeds,
  onClose,
  onSuccess,
}: ReassignBedModalProps) {
  const { updatePatientAssignments, addNotification } = useApp();
  const [targetBed, setTargetBed] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  function handleReassign() {
    if (!targetBed) return;
    const newBedNum = parseInt(targetBed, 10);

    setSubmitting(true);
    try {
      updatePatientAssignments(patient.id, {
        bedNumber: newBedNum,
      });

      addNotification({
        type: 'info',
        title: 'Bed Reassignment Completed',
        message: `${patient.name} moved from Bed ${currentBed} to Bed ${newBedNum}.`,
        patientId: patient.id,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Reassign Patient Bed</h3>
            <p className="text-xs text-slate-300">
              {patient.name} ({patient.id}) · Currently in Bed {currentBed}
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
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Patient:</span>
              <span className="font-bold text-slate-800">{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Current Allocation:</span>
              <span className="font-mono font-bold text-slate-800">Bed {currentBed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Attending Physician:</span>
              <span className="text-slate-800">{patient.doctorName}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select New Vacant Bed (1–74) *
            </label>
            <select
              value={targetBed}
              onChange={(e) => setTargetBed(e.target.value)}
              className="w-full text-xs rounded-xl px-3 py-2.5 border border-slate-300 bg-white cursor-pointer font-mono font-semibold"
            >
              <option value="">-- Choose destination vacant bed --</option>
              {vacantBeds.map((b) => (
                <option key={b.number} value={b.number}>
                  Bed {b.number} (Vacant)
                </option>
              ))}
            </select>
            {vacantBeds.length === 0 && (
              <p className="text-xs text-red-600 mt-1 font-bold">
                No vacant beds available to reassign.
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800">
            Atomic transfer: Bed {currentBed} will be immediately freed and the new bed occupied in a single state transition.
          </div>
        </div>

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
            disabled={!targetBed || submitting}
            onClick={handleReassign}
            className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Transferring...' : 'Confirm Reassignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
