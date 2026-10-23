'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { buildBeds, occupiedBeds, freeBeds } from '@/lib/business';
import { cn } from '@/lib/utils';
import { Search, Grid3X3, List } from 'lucide-react';

type Filter = 'all' | 'occupied' | 'vacant';

export default function AdminBedBoard() {
  const { state } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const beds = buildBeds(state);
  const occupied = occupiedBeds(state);
  const free = freeBeds(state);
  const occupancyPct = Math.round((occupied / 74) * 100);

  const displayBeds = useMemo(() => {
    let list = beds;
    if (filter === 'occupied') list = list.filter((b) => b.patientId);
    if (filter === 'vacant') list = list.filter((b) => !b.patientId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          String(b.number).includes(q) ||
          (b.patientName && b.patientName.toLowerCase().includes(q)) ||
          (b.patientId && b.patientId.toLowerCase().includes(q))
      );
    }
    return list;
  }, [beds, filter, search]);

  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Beds" value="74" color="text-slate-900" />
        <StatCard label="Occupied" value={String(occupied)} sub={`${occupancyPct}%`} color="text-blue-700" bg="bg-blue-50" />
        <StatCard label="Vacant" value={String(free)} sub={`${100 - occupancyPct}%`} color="text-green-700" bg="bg-green-50" />
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-2">Occupancy</p>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-1">{occupancyPct}% occupied</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bed or patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {(['all', 'occupied', 'vacant'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize transition-colors',
                filter === f ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={cn('p-2', view === 'grid' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-50')}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('p-2', view === 'list' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-50')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bed display */}
      {view === 'grid' ? (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {displayBeds.map((bed) => (
            <div
              key={bed.number}
              className={cn(
                'relative rounded-xl border-2 p-2 text-center transition-all',
                bed.patientId
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-white'
              )}
            >
              <p className={cn('text-xs font-bold', bed.patientId ? 'text-blue-700' : 'text-slate-400')}>
                {bed.number}
              </p>
              {bed.patientId ? (
                <div className="mt-1">
                  <div className="w-4 h-4 mx-auto bg-blue-200 rounded-full" title={bed.patientName} />
                  <p className="text-[9px] text-blue-600 mt-0.5 truncate leading-tight" title={bed.patientName}>
                    {bed.patientName?.split(' ')[0]}
                  </p>
                </div>
              ) : (
                <p className="text-[9px] text-slate-300 mt-1">vacant</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayBeds.map((bed) => (
                <tr key={bed.number} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">B{bed.number}</td>
                  <td className="px-4 py-2.5">
                    {bed.patientId ? (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Occupied</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Vacant</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{bed.patientName || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{bed.patientId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, bg }: {
  label: string; value: string; sub?: string; color?: string; bg?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200 p-4', bg || 'bg-white')}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color || 'text-slate-900')}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
